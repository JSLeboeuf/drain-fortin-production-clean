import { WebSocketMessage, SecureWebSocketConfig, WebSocketAuthToken } from "@/types";
import { logger } from "@/lib/logger";
import { sanitizeInput } from "./sanitize";

/**
 * WebSocket Client sécurisé avec authentification et validation
 */
export class SecureWebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private authToken: WebSocketAuthToken | null = null;
  private isAuthenticated = false;
  private heartbeatInterval: NodeJS.Timer | null = null;
  private lastMessageTime = 0;
  private messageQueue: WebSocketMessage[] = [];
  
  private readonly config: SecureWebSocketConfig = {
    maxMessageSize: 64 * 1024, // 64KB max par message
    rateLimitMs: 100, // Minimum 100ms entre les messages
    heartbeatIntervalMs: 30000, // Ping toutes les 30s
    authTimeoutMs: 10000, // Timeout auth 10s
    maxReconnectAttempts: 5
  };

  constructor(authTokenProvider?: () => Promise<WebSocketAuthToken | null>) {
    this.getAuthToken = authTokenProvider || (() => Promise.resolve(null));
  }

  private getAuthToken: () => Promise<WebSocketAuthToken | null>;

  /**
   * Connexion sécurisée avec authentification
   */
  async connect(): Promise<void> {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      // Récupérer le token d'authentification
      this.authToken = await this.getAuthToken();
      
      this.ws = new WebSocket(wsUrl);
      this.setupSecureEventListeners();
      
      // Timeout pour l'authentification
      setTimeout(() => {
        if (!this.isAuthenticated && this.ws?.readyState === WebSocket.OPEN) {
          logger.warn('WebSocket authentication timeout');
          this.disconnect();
        }
      }, this.config.authTimeoutMs);
      
    } catch (error) {
      logger.error("Failed to connect to secure WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private setupSecureEventListeners() {
    if (!this.ws) return;

    this.ws.onopen = async () => {
      if (import.meta.env.DEV) {
        logger.info("Secure WebSocket connected - authenticating...");
      }
      
      // Envoyer l'authentification immédiatement
      await this.authenticate();
    };

    this.ws.onmessage = (event) => {
      try {
        // Validation de la taille du message
        if (event.data.length > this.config.maxMessageSize) {
          logger.warn('Message exceeds maximum size, ignoring');
          return;
        }

        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Validation et sanitisation du message
        if (!this.validateMessage(message)) {
          logger.warn('Invalid message received, ignoring');
          return;
        }

        // Traiter les messages système
        if (message.type === 'auth:success') {
          this.handleAuthSuccess(message.data);
          return;
        } else if (message.type === 'auth:failed') {
          this.handleAuthFailure(message.data);
          return;
        } else if (message.type === 'pong') {
          this.handlePong();
          return;
        }

        // Messages normaux seulement si authentifié
        if (!this.isAuthenticated) {
          logger.warn('Received message before authentication, ignoring');
          return;
        }

        this.notifyListeners(message.type, message.data);
        
      } catch (error) {
        logger.error("Failed to parse secure WebSocket message:", error);
      }
    };

    this.ws.onclose = (event) => {
      this.isAuthenticated = false;
      this.stopHeartbeat();
      
      if (import.meta.env.DEV) {
        logger.info(`Secure WebSocket disconnected (code: ${event.code})`);
      }
      
      // Reconnecter seulement si pas fermé intentionnellement
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      logger.error("Secure WebSocket error:", error);
      this.isAuthenticated = false;
    };
  }

  /**
   * Authentification sécurisée
   */
  private async authenticate(): Promise<void> {
    if (!this.authToken || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const authMessage: WebSocketMessage = {
      type: 'auth:request',
      data: {
        token: this.authToken.token,
        timestamp: Date.now(),
        clientInfo: {
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      },
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    this.sendRawMessage(authMessage);
  }

  /**
   * Validation sécurisée des messages entrants
   */
  private validateMessage(message: any): message is WebSocketMessage {
    if (typeof message !== 'object' || message === null) {
      return false;
    }

    // Validation de la structure
    if (typeof message.type !== 'string' || !message.timestamp || !message.id) {
      return false;
    }

    // Sanitisation des champs texte
    message.type = sanitizeInput(message.type, 'text');
    
    // Validation de la timestamp (pas trop ancienne, pas dans le futur)
    const now = Date.now();
    const messageTime = Number(message.timestamp);
    
    if (messageTime < now - 60000 || messageTime > now + 5000) {
      logger.warn('Message timestamp is suspicious');
      return false;
    }

    return true;
  }

  private handleAuthSuccess(data: any) {
    this.isAuthenticated = true;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
    
    // Traiter les messages en attente
    this.processQueuedMessages();
    
    if (import.meta.env.DEV) {
      logger.info('WebSocket authenticated successfully');
    }
    
    this.notifyListeners('auth:success', data);
  }

  private handleAuthFailure(data: any) {
    logger.error('WebSocket authentication failed:', data);
    this.isAuthenticated = false;
    this.disconnect();
    this.notifyListeners('auth:failed', data);
  }

  private handlePong() {
    // Heartbeat reçu, connexion OK
  }

  /**
   * Système de heartbeat pour maintenir la connexion
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.sendRawMessage({
          type: 'ping',
          data: {},
          timestamp: Date.now(),
          id: this.generateMessageId()
        });
      }
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Envoi sécurisé de messages avec rate limiting
   */
  sendMessage(type: string, data: any): boolean {
    const now = Date.now();
    
    // Rate limiting
    if (now - this.lastMessageTime < this.config.rateLimitMs) {
      logger.warn('Message rate limit exceeded');
      return false;
    }
    
    if (!this.isAuthenticated) {
      // Mettre en file d'attente si pas encore authentifié
      this.messageQueue.push({
        type: sanitizeInput(type, 'text'),
        data,
        timestamp: now,
        id: this.generateMessageId()
      });
      return true;
    }

    const message: WebSocketMessage = {
      type: sanitizeInput(type, 'text'),
      data,
      timestamp: now,
      id: this.generateMessageId()
    };

    return this.sendRawMessage(message);
  }

  private sendRawMessage(message: WebSocketMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const serialized = JSON.stringify(message);
      
      // Vérifier la taille du message
      if (serialized.length > this.config.maxMessageSize) {
        logger.error('Message too large to send');
        return false;
      }

      this.ws.send(serialized);
      this.lastMessageTime = Date.now();
      return true;
      
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  private processQueuedMessages() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendRawMessage(message);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      const delay = this.config.rateLimitMs * Math.pow(2, this.reconnectAttempts);
      
      setTimeout(() => {
        this.reconnectAttempts++;
        if (import.meta.env.DEV) {
          logger.info(`Attempting secure reconnection (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
        }
        this.connect();
      }, delay);
    } else {
      logger.error('Max reconnection attempts reached');
      this.notifyListeners('connection:failed', { reason: 'max_attempts_reached' });
    }
  }

  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * API publique pour les listeners
   */
  on(event: string, callback: (data: any) => void) {
    const sanitizedEvent = sanitizeInput(event, 'text');
    if (!this.listeners.has(sanitizedEvent)) {
      this.listeners.set(sanitizedEvent, []);
    }
    this.listeners.get(sanitizedEvent)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const sanitizedEvent = sanitizeInput(event, 'text');
    const eventListeners = this.listeners.get(sanitizedEvent);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error('Error in WebSocket event listener:', error);
        }
      });
    }
  }

  disconnect() {
    this.isAuthenticated = false;
    this.stopHeartbeat();
    this.messageQueue = [];
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return this.isAuthenticated ? 'connecting' : 'authenticating';
      case WebSocket.OPEN:
        return this.isAuthenticated ? 'connected' : 'authenticating';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
}

// Export d'instance sécurisée par défaut
export const secureWsClient = new SecureWebSocketClient();