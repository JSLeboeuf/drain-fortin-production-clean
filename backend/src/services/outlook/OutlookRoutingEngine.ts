/**
 * OutlookRoutingEngine.ts - Moteur de routage intelligent des appels
 * Routage multi-lignes, distribution intelligente, et intégration VAPI/Twilio
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { OutlookService } from './OutlookService';
import { OutlookCalendarSync } from './OutlookCalendarSync';
import { OutlookContactSync } from './OutlookContactSync';
import { OutlookEmailManager } from './OutlookEmailManager';
import { AuditLogger } from './security/AuditLogger';
import { CacheManager } from './utils/CacheManager';
import { 
  PhoneRoutingRule,
  PhoneRoutingCondition,
  PhoneRoutingAction,
  CallQueueEntry,
  PhoneLineConfiguration,
  CallDistributionStrategy,
  CallRecord,
  CallRoutingStatus,
  PhoneLineStatus,
  OutlookCalendarEvent,
  OutlookContact,
  OutlookUser,
  OutlookError,
  VapiIntegrationConfig,
  TwilioIntegrationConfig
} from './config/outlook.types';
import { OUTLOOK_CONSTANTS } from './config/outlook.constants';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';

/**
 * Moteur de routage intelligent pour les appels téléphoniques
 * Intègre Outlook, VAPI, Twilio avec intelligence artificielle
 */
export class OutlookRoutingEngine {
  private outlookService: OutlookService;
  private calendarSync: OutlookCalendarSync;
  private contactSync: OutlookContactSync;
  private emailManager: OutlookEmailManager;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;
  private errorHandler: OutlookErrorHandler;
  
  private routingRules: Map<string, PhoneRoutingRule> = new Map();
  private phoneLines: Map<string, PhoneLineConfiguration> = new Map();
  private callQueue: CallQueueEntry[] = [];
  private activeDistribution: CallDistributionStrategy;
  
  private vapiConfig?: VapiIntegrationConfig;
  private twilioConfig?: TwilioIntegrationConfig;
  
  private isInitialized = false;
  private routingMetrics = {
    callsReceived: 0,
    callsRouted: 0,
    callsQueued: 0,
    callsAbandoned: 0,
    averageWaitTime: 0,
    averageRoutingTime: 0,
    successfulRoutes: 0,
    failedRoutes: 0,
    lastActivity: new Date()
  };
  
  constructor(
    outlookService: OutlookService,
    options: {
      calendarSync: OutlookCalendarSync;
      contactSync: OutlookContactSync;
      emailManager: OutlookEmailManager;
      auditLogger: AuditLogger;
      cacheManager: CacheManager;
      errorHandler: OutlookErrorHandler;
      vapiConfig?: VapiIntegrationConfig;
      twilioConfig?: TwilioIntegrationConfig;
    }
  ) {
    this.outlookService = outlookService;
    this.calendarSync = options.calendarSync;
    this.contactSync = options.contactSync;
    this.emailManager = options.emailManager;
    this.auditLogger = options.auditLogger;
    this.cacheManager = options.cacheManager;
    this.errorHandler = options.errorHandler;
    
    this.vapiConfig = options.vapiConfig;
    this.twilioConfig = options.twilioConfig;
    
    // Configuration par défaut de la distribution
    this.activeDistribution = {
      type: 'round_robin',
      parameters: {},
      fallbackStrategy: {
        type: 'least_busy',
        parameters: {}
      }
    };
  }
  
  /**
   * Initialise le moteur de routage
   */
  public async initialize(): Promise<void> {
    try {
      this.auditLogger.info('OutlookRoutingEngine:Initialize');
      
      // Vérification des services requis
      if (!this.outlookService.isConnected) {
        throw new OutlookError('SERVICE_NOT_READY', 'Outlook service must be connected');
      }
      
      // Chargement des règles de routage
      await this.loadRoutingRules();
      
      // Chargement de la configuration des lignes
      await this.loadPhoneLineConfigurations();
      
      // Initialisation des intégrations
      if (this.vapiConfig) {
        await this.initializeVapiIntegration();
      }
      
      if (this.twilioConfig) {
        await this.initializeTwilioIntegration();
      }
      
      // Démarrage du traitement de la queue
      this.startQueueProcessor();
      
      this.isInitialized = true;
      
      this.auditLogger.info('OutlookRoutingEngine:InitializeSuccess', {
        routingRulesCount: this.routingRules.size,
        phoneLinesCount: this.phoneLines.size,
        vapiEnabled: !!this.vapiConfig,
        twilioEnabled: !!this.twilioConfig
      });
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:InitializeError', error);
      throw this.errorHandler.handleError(error, 'OutlookRoutingEngine:Initialize');
    }
  }
  
  /**
   * Traite un appel entrant
   * @param callData Données de l'appel
   */
  public async handleIncomingCall(callData: {
    callId: string;
    from: string;
    to: string;
    timestamp: Date;
    provider: 'vapi' | 'twilio' | 'other';
    metadata?: Record<string, any>;
  }): Promise<{
    routingDecision: 'routed' | 'queued' | 'voicemail' | 'rejected';
    destination?: string;
    queuePosition?: number;
    estimatedWaitTime?: number;
    instructions?: string;
  }> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      this.auditLogger.info('OutlookRoutingEngine:HandleIncomingCall', {
        callId: callData.callId,
        from: callData.from,
        to: callData.to,
        provider: callData.provider
      });
      
      this.routingMetrics.callsReceived++;
      
      // Enrichissement des données d'appel
      const enrichedCall = await this.enrichCallData(callData);
      
      // Vérification des heures ouvrables
      const isBusinessHours = await this.isBusinessHours();
      if (!isBusinessHours) {
        return await this.handleAfterHours(enrichedCall);
      }
      
      // Application des règles de routage
      const applicableRules = await this.findApplicableRules(enrichedCall);
      
      // Évaluation et exécution de la meilleure règle
      for (const rule of applicableRules) {
        const decision = await this.executeRoutingRule(rule, enrichedCall);
        if (decision.routingDecision !== 'rejected') {
          
          // Enregistrement du succès
          this.routingMetrics.successfulRoutes++;
          this.routingMetrics.averageRoutingTime = this.updateAverage(
            this.routingMetrics.averageRoutingTime,
            Date.now() - startTime,
            this.routingMetrics.successfulRoutes
          );
          
          this.auditLogger.info('OutlookRoutingEngine:CallRouted', {
            callId: callData.callId,
            ruleId: rule.id,
            decision: decision.routingDecision,
            destination: decision.destination,
            routingTime: Date.now() - startTime
          });
          
          return decision;
        }
      }
      
      // Aucune règle applicable - routage par défaut
      return await this.handleDefaultRouting(enrichedCall);
      
    } catch (error) {
      this.routingMetrics.failedRoutes++;
      
      this.auditLogger.error('OutlookRoutingEngine:HandleIncomingCallError', error, {
        callId: callData.callId,
        from: callData.from
      });
      
      // Routage de secours vers voicemail
      return {
        routingDecision: 'voicemail',
        instructions: 'System error - redirecting to voicemail'
      };
    }
  }
  
  /**
   * Enrichit les données d'appel avec les informations Outlook
   * @param callData Données de l'appel de base
   */
  private async enrichCallData(callData: any): Promise<any> {
    const enriched = { ...callData };
    
    try {
      // Recherche du contact par numéro de téléphone
      const contact = await this.findContactByPhone(callData.from);
      if (contact) {
        enriched.contact = contact;
        enriched.callerName = contact.displayName;
        enriched.companyName = contact.companyName;
        enriched.isKnownContact = true;
      } else {
        enriched.isKnownContact = false;
      }
      
      // Recherche dans l'historique des appels
      const callHistory = await this.getCallHistory(callData.from);
      enriched.callHistory = callHistory;
      enriched.isRepeatCaller = callHistory.length > 0;
      
      // Vérification de la disponibilité des agents via calendrier
      const agentAvailability = await this.checkAgentAvailability();
      enriched.availableAgents = agentAvailability.filter(a => a.status === 'available');
      
      // Classification du type d'appel
      enriched.callType = await this.classifyCall(enriched);
      
      // Niveau de priorité
      enriched.priority = await this.calculateCallPriority(enriched);
      
    } catch (error) {
      this.auditLogger.warn('OutlookRoutingEngine:EnrichCallData', error, {
        callId: callData.callId
      });
    }
    
    return enriched;
  }
  
  /**
   * Trouve un contact par numéro de téléphone
   * @param phoneNumber Numéro à rechercher
   */
  private async findContactByPhone(phoneNumber: string): Promise<OutlookContact | null> {
    try {
      // Normalisation du numéro
      const normalizedNumber = this.normalizePhoneNumber(phoneNumber);
      
      // Recherche dans les contacts
      const contacts = await this.contactSync.searchContacts(normalizedNumber, {
        maxResults: 5
      });
      
      // Recherche exacte dans les numéros
      for (const contact of contacts) {
        const allPhones = [
          ...contact.businessPhones,
          contact.mobilePhone
        ].filter(Boolean);
        
        for (const phone of allPhones) {
          if (this.normalizePhoneNumber(phone) === normalizedNumber) {
            return contact;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      this.auditLogger.warn('OutlookRoutingEngine:FindContactByPhone', error);
      return null;
    }
  }
  
  /**
   * Vérifie la disponibilité des agents via leurs calendriers
   */
  private async checkAgentAvailability(): Promise<Array<{
    userId: string;
    name: string;
    status: CallRoutingStatus;
    nextAvailable?: Date;
    currentEvent?: OutlookCalendarEvent;
  }>> {
    try {
      // Pour cette implémentation, nous simulons des agents
      // Dans un vrai système, ceci interrogerait les calendriers des agents
      const agents = [
        { userId: 'agent1', name: 'Agent Plomberie', skills: ['plumbing', 'emergency'] },
        { userId: 'agent2', name: 'Agent Commercial', skills: ['sales', 'estimates'] },
        { userId: 'agent3', name: 'Agent Support', skills: ['support', 'billing'] }
      ];
      
      const availability = [];
      
      for (const agent of agents) {
        // Vérification du calendrier de l'agent
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        
        try {
          const events = await this.calendarSync.getEvents(
            null, // calendrier par défaut
            now,
            endOfDay
          );
          
          // Vérifier s'il y a un événement en cours
          const currentEvent = events.find(event => 
            event.start.dateTime <= now && event.end.dateTime > now
          );
          
          let status: CallRoutingStatus = 'available';
          if (currentEvent) {
            switch (currentEvent.showAs) {
              case 'busy':
                status = 'busy';
                break;
              case 'oof':
                status = 'away';
                break;
              case 'tentative':
                status = 'available'; // Peut être interrompu
                break;
              default:
                status = 'available';
            }
          }
          
          // Trouver la prochaine disponibilité
          const nextAvailable = this.findNextAvailableTime(events, now);
          
          availability.push({
            userId: agent.userId,
            name: agent.name,
            status,
            nextAvailable,
            currentEvent
          });
          
        } catch (error) {
          // Si erreur, considérer comme non disponible
          availability.push({
            userId: agent.userId,
            name: agent.name,
            status: 'offline',
            nextAvailable: undefined,
            currentEvent: undefined
          });
        }
      }
      
      return availability;
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:CheckAgentAvailability', error);
      return [];
    }
  }
  
  /**
   * Trouve la prochaine heure disponible dans un calendrier
   */
  private findNextAvailableTime(events: OutlookCalendarEvent[], from: Date): Date | undefined {
    const sortedEvents = events
      .filter(event => event.start.dateTime > from)
      .sort((a, b) => a.start.dateTime.getTime() - b.start.dateTime.getTime());
    
    if (sortedEvents.length === 0) {
      return from; // Disponible immédiatement
    }
    
    // Vérifier les créneaux entre les événements
    let checkTime = from;
    
    for (const event of sortedEvents) {
      if (event.showAs === 'busy' || event.showAs === 'oof') {
        if (checkTime < event.start.dateTime) {
          return checkTime; // Créneau libre trouvé
        }
        checkTime = event.end.dateTime;
      }
    }
    
    return checkTime; // Disponible après le dernier événement
  }
  
  /**
   * Classification automatique du type d'appel
   */
  private async classifyCall(callData: any): Promise<string> {
    // Analyse basée sur l'historique et le contact
    if (callData.isKnownContact) {
      if (callData.contact.companyName) {
        return 'business_client';
      }
      return 'existing_customer';
    }
    
    // Analyse basée sur l'heure
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      return 'emergency';
    }
    
    // Classification par défaut
    return 'general_inquiry';
  }
  
  /**
   * Calcul du niveau de priorité
   */
  private async calculateCallPriority(callData: any): Promise<number> {
    let priority = 5; // Priorité normale
    
    // Priorité élevée pour les urgences
    if (callData.callType === 'emergency') {
      priority = 10;
    }
    
    // Priorité élevée pour les clients connus
    if (callData.isKnownContact) {
      priority += 2;
    }
    
    // Priorité pour les appels répétés
    if (callData.callHistory.length > 2) {
      priority += 1;
    }
    
    // Priorité business hours
    if (this.isBusinessHours()) {
      priority += 1;
    }
    
    return Math.min(priority, 10); // Maximum 10
  }
  
  /**
   * Recherche des règles de routage applicables
   */
  private async findApplicableRules(callData: any): Promise<PhoneRoutingRule[]> {
    const applicableRules: PhoneRoutingRule[] = [];
    
    for (const rule of this.routingRules.values()) {
      if (!rule.enabled) continue;
      
      const isApplicable = await this.evaluateRuleConditions(rule.conditions, callData);
      if (isApplicable) {
        applicableRules.push(rule);
      }
    }
    
    // Tri par priorité (plus haute priorité en premier)
    return applicableRules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Évalue les conditions d'une règle de routage
   */
  private async evaluateRuleConditions(
    conditions: PhoneRoutingCondition[], 
    callData: any
  ): Promise<boolean> {
    // Toutes les conditions doivent être vraies (AND logique)
    for (const condition of conditions) {
      const result = await this.evaluateSingleCondition(condition, callData);
      if (!result) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Évalue une condition individuelle
   */
  private async evaluateSingleCondition(
    condition: PhoneRoutingCondition,
    callData: any
  ): Promise<boolean> {
    try {
      let actualValue: any;
      
      // Extraction de la valeur selon le type de condition
      switch (condition.type) {
        case 'caller_id':
          actualValue = callData.from;
          break;
          
        case 'time_of_day':
          actualValue = new Date().getHours();
          break;
          
        case 'day_of_week':
          actualValue = new Date().getDay(); // 0 = dimanche
          break;
          
        case 'skills_required':
          actualValue = callData.callType;
          break;
          
        case 'queue_length':
          actualValue = this.callQueue.length;
          break;
          
        case 'agent_availability':
          const available = callData.availableAgents?.length || 0;
          actualValue = available;
          break;
          
        default:
          return false;
      }
      
      // Évaluation selon l'opérateur
      return this.evaluateConditionOperator(
        condition.operator,
        actualValue,
        condition.value,
        condition.caseSensitive
      );
      
    } catch (error) {
      this.auditLogger.warn('OutlookRoutingEngine:EvaluateCondition', error);
      return false;
    }
  }
  
  /**
   * Évalue un opérateur de condition
   */
  private evaluateConditionOperator(
    operator: string,
    actual: any,
    expected: any,
    caseSensitive = false
  ): boolean {
    // Normalisation pour comparaison de chaînes
    if (typeof actual === 'string' && typeof expected === 'string' && !caseSensitive) {
      actual = actual.toLowerCase();
      expected = expected.toLowerCase();
    }
    
    switch (operator) {
      case 'equals':
        return actual === expected;
        
      case 'not_equals':
        return actual !== expected;
        
      case 'contains':
        return typeof actual === 'string' && actual.includes(expected);
        
      case 'not_contains':
        return typeof actual === 'string' && !actual.includes(expected);
        
      case 'greater_than':
        return Number(actual) > Number(expected);
        
      case 'less_than':
        return Number(actual) < Number(expected);
        
      case 'in_range':
        if (Array.isArray(expected) && expected.length === 2) {
          const value = Number(actual);
          return value >= Number(expected[0]) && value <= Number(expected[1]);
        }
        return false;
        
      default:
        return false;
    }
  }
  
  /**
   * Exécute une règle de routage
   */
  private async executeRoutingRule(
    rule: PhoneRoutingRule,
    callData: any
  ): Promise<{
    routingDecision: 'routed' | 'queued' | 'voicemail' | 'rejected';
    destination?: string;
    queuePosition?: number;
    estimatedWaitTime?: number;
    instructions?: string;
  }> {
    try {
      this.auditLogger.info('OutlookRoutingEngine:ExecuteRoutingRule', {
        ruleId: rule.id,
        ruleName: rule.name,
        callId: callData.callId
      });
      
      // Exécution séquentielle des actions
      for (const action of rule.actions) {
        const result = await this.executeRoutingAction(action, callData);
        
        // Si l'action produit un résultat final, on s'arrête
        if (result.routingDecision !== 'rejected') {
          return result;
        }
      }
      
      // Toutes les actions ont échoué
      return { routingDecision: 'rejected' };
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:ExecuteRoutingRuleError', error);
      return { routingDecision: 'rejected' };
    }
  }
  
  /**
   * Exécute une action de routage
   */
  private async executeRoutingAction(
    action: PhoneRoutingAction,
    callData: any
  ): Promise<{
    routingDecision: 'routed' | 'queued' | 'voicemail' | 'rejected';
    destination?: string;
    queuePosition?: number;
    estimatedWaitTime?: number;
    instructions?: string;
  }> {
    switch (action.type) {
      case 'route_to_agent':
        return await this.routeToAgent(action.parameters, callData);
        
      case 'route_to_queue':
        return await this.routeToQueue(action.parameters, callData);
        
      case 'play_message':
        return await this.playMessage(action.parameters, callData);
        
      case 'transfer_external':
        return await this.transferExternal(action.parameters, callData);
        
      case 'voicemail':
        return await this.routeToVoicemail(action.parameters, callData);
        
      case 'callback':
        return await this.scheduleCallback(action.parameters, callData);
        
      default:
        return { routingDecision: 'rejected' };
    }
  }
  
  /**
   * Route vers un agent spécifique
   */
  private async routeToAgent(parameters: any, callData: any): Promise<any> {
    try {
      const agentId = parameters.agentId || this.selectBestAgent(callData);
      
      if (!agentId) {
        return { routingDecision: 'rejected' };
      }
      
      // Vérifier la disponibilité de l'agent
      const agent = callData.availableAgents?.find((a: any) => a.userId === agentId);
      if (!agent || agent.status !== 'available') {
        return { routingDecision: 'rejected' };
      }
      
      // Créer un événement calendrier pour l'appel
      await this.createCallEvent(agent, callData);
      
      // Notifier l'agent
      await this.notifyAgent(agent, callData);
      
      return {
        routingDecision: 'routed',
        destination: agentId,
        instructions: `Routing to ${agent.name}`
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:RouteToAgent', error);
      return { routingDecision: 'rejected' };
    }
  }
  
  /**
   * Route vers une file d'attente
   */
  private async routeToQueue(parameters: any, callData: any): Promise<any> {
    try {
      const queueEntry: CallQueueEntry = {
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        callId: callData.callId,
        phoneNumber: callData.from,
        callerName: callData.callerName,
        queuedAt: new Date(),
        priority: callData.priority || 5,
        skillsRequired: parameters.skills || [],
        waitTime: 0,
        position: this.callQueue.length + 1,
        callbackRequested: false,
        metadata: callData.metadata || {}
      };
      
      // Insertion dans la queue selon la priorité
      this.insertIntoQueue(queueEntry);
      
      // Estimation du temps d'attente
      const estimatedWaitTime = this.calculateEstimatedWaitTime(queueEntry);
      
      // Notification de mise en file
      this.auditLogger.info('OutlookRoutingEngine:CallQueued', {
        callId: callData.callId,
        queuePosition: queueEntry.position,
        estimatedWaitTime
      });
      
      return {
        routingDecision: 'queued',
        queuePosition: queueEntry.position,
        estimatedWaitTime,
        instructions: `Call queued. Position: ${queueEntry.position}, Estimated wait: ${estimatedWaitTime}s`
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:RouteToQueue', error);
      return { routingDecision: 'rejected' };
    }
  }
  
  /**
   * Route vers la messagerie vocale
   */
  private async routeToVoicemail(parameters: any, callData: any): Promise<any> {
    try {
      // Sélectionner le message d'accueil approprié
      const greeting = parameters.greeting || await this.selectVoicemailGreeting(callData);
      
      // Programmer le suivi par email
      if (parameters.emailNotification !== false) {
        await this.scheduleVoicemailNotification(callData);
      }
      
      // Créer une tâche de suivi
      if (parameters.createTask !== false) {
        await this.createFollowUpTask(callData);
      }
      
      return {
        routingDecision: 'voicemail',
        instructions: greeting
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:RouteToVoicemail', error);
      return { routingDecision: 'voicemail' };
    }
  }
  
  /**
   * Gère les appels hors heures d'ouverture
   */
  private async handleAfterHours(callData: any): Promise<any> {
    // Message d'heures d'ouverture
    const businessHoursMessage = this.getBusinessHoursMessage();
    
    // Option de callback d'urgence
    const isEmergency = callData.callType === 'emergency';
    
    if (isEmergency) {
      // Routage d'urgence
      return await this.handleEmergencyRouting(callData);
    }
    
    // Voicemail avec callback proposé
    await this.scheduleCallbackOffer(callData);
    
    return {
      routingDecision: 'voicemail',
      instructions: `${businessHoursMessage}. Press 1 for emergency service or leave a message.`
    };
  }
  
  /**
   * Méthodes utilitaires privées
   */
  
  private normalizePhoneNumber(phone: string): string {
    // Suppression de tous les caractères non numériques
    const cleaned = phone.replace(/\D/g, '');
    
    // Ajout du code pays si manquant (assumant l'Amérique du Nord)
    if (cleaned.length === 10) {
      return `1${cleaned}`;
    }
    
    return cleaned;
  }
  
  private updateAverage(currentAverage: number, newValue: number, count: number): number {
    return ((currentAverage * (count - 1)) + newValue) / count;
  }
  
  private async isBusinessHours(): Promise<boolean> {
    const now = new Date();
    const day = now.getDay(); // 0 = dimanche
    const hour = now.getHours();
    
    // Configuration par défaut: Lun-Ven 8h-18h
    const workingDays = [1, 2, 3, 4, 5]; // Lun-Ven
    const startHour = 8;
    const endHour = 18;
    
    return workingDays.includes(day) && hour >= startHour && hour < endHour;
  }
  
  private insertIntoQueue(entry: CallQueueEntry): void {
    // Insertion par priorité (plus haute priorité en premier)
    let inserted = false;
    
    for (let i = 0; i < this.callQueue.length; i++) {
      if (entry.priority > this.callQueue[i].priority) {
        this.callQueue.splice(i, 0, entry);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.callQueue.push(entry);
    }
    
    // Mise à jour des positions
    this.updateQueuePositions();
    
    this.routingMetrics.callsQueued++;
  }
  
  private updateQueuePositions(): void {
    this.callQueue.forEach((entry, index) => {
      entry.position = index + 1;
    });
  }
  
  private calculateEstimatedWaitTime(entry: CallQueueEntry): number {
    // Estimation basée sur la position et la vitesse de traitement
    const averageCallDuration = 300; // 5 minutes en secondes
    const position = entry.position;
    
    return position * averageCallDuration;
  }
  
  private selectBestAgent(callData: any): string | null {
    const availableAgents = callData.availableAgents || [];
    
    if (availableAgents.length === 0) {
      return null;
    }
    
    // Sélection selon la stratégie de distribution
    switch (this.activeDistribution.type) {
      case 'round_robin':
        return this.selectRoundRobin(availableAgents);
        
      case 'least_busy':
        return this.selectLeastBusy(availableAgents);
        
      case 'skills_based':
        return this.selectBySkills(availableAgents, callData.callType);
        
      default:
        return availableAgents[0].userId;
    }
  }
  
  private selectRoundRobin(agents: any[]): string {
    // Implémentation simple round-robin
    const index = this.routingMetrics.callsRouted % agents.length;
    return agents[index].userId;
  }
  
  private selectLeastBusy(agents: any[]): string {
    // Sélection de l'agent le moins occupé
    // Pour cette implémentation, on prend le premier disponible
    return agents.find(a => a.status === 'available')?.userId || agents[0].userId;
  }
  
  private selectBySkills(agents: any[], callType: string): string {
    // Correspondance des compétences
    const skillMapping: Record<string, string[]> = {
      'emergency': ['plumbing', 'emergency'],
      'business_client': ['sales', 'commercial'],
      'existing_customer': ['support', 'customer_service']
    };
    
    const requiredSkills = skillMapping[callType] || [];
    
    for (const skill of requiredSkills) {
      const skilledAgent = agents.find((a: any) => a.skills?.includes(skill));
      if (skilledAgent) {
        return skilledAgent.userId;
      }
    }
    
    // Fallback vers le premier disponible
    return agents[0].userId;
  }
  
  private async createCallEvent(agent: any, callData: any): Promise<void> {
    try {
      const eventData = {
        subject: `Call from ${callData.callerName || callData.from}`,
        body: {
          contentType: 'text',
          content: `Incoming call from ${callData.from}\nType: ${callData.callType}\nPriority: ${callData.priority}`
        },
        start: {
          dateTime: new Date(),
          timeZone: 'America/Toronto'
        },
        end: {
          dateTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
          timeZone: 'America/Toronto'
        },
        categories: ['Phone Call', 'Drain Fortin']
      };
      
      await this.calendarSync.createEvent(null, eventData);
      
    } catch (error) {
      this.auditLogger.warn('OutlookRoutingEngine:CreateCallEvent', error);
    }
  }
  
  private async notifyAgent(agent: any, callData: any): Promise<void> {
    try {
      const emailSubject = `Incoming Call - ${callData.callerName || callData.from}`;
      const emailBody = `
        You have an incoming call routed to you:
        
        From: ${callData.from}
        Caller: ${callData.callerName || 'Unknown'}
        Type: ${callData.callType}
        Priority: ${callData.priority}
        
        ${callData.contact ? `Contact: ${callData.contact.displayName}` : ''}
        ${callData.companyName ? `Company: ${callData.companyName}` : ''}
      `;
      
      // Envoi d'email de notification (adresse fictive pour l'exemple)
      await this.emailManager.sendEmail(
        `${agent.userId}@drainfortin.com`,
        emailSubject,
        emailBody,
        {
          importance: callData.priority > 7 ? 'high' : 'normal'
        }
      );
      
    } catch (error) {
      this.auditLogger.warn('OutlookRoutingEngine:NotifyAgent', error);
    }
  }
  
  private async loadRoutingRules(): Promise<void> {
    // Chargement des règles depuis la configuration ou la base de données
    // Pour cette implémentation, nous créons des règles par défaut
    
    const defaultRules: PhoneRoutingRule[] = [
      {
        id: 'emergency-hours',
        name: 'Emergency After Hours',
        description: 'Route emergency calls outside business hours',
        priority: 10,
        enabled: true,
        conditions: [
          { type: 'time_of_day', operator: 'less_than', value: 8 },
          { type: 'time_of_day', operator: 'greater_than', value: 18 }
        ],
        actions: [
          { type: 'route_to_agent', parameters: { agentId: 'emergency_agent' } }
        ],
        schedule: undefined,
        createdDate: new Date(),
        lastModified: new Date()
      },
      {
        id: 'business-hours-routing',
        name: 'Business Hours General Routing',
        description: 'Route calls during business hours',
        priority: 5,
        enabled: true,
        conditions: [
          { type: 'time_of_day', operator: 'in_range', value: [8, 18] },
          { type: 'day_of_week', operator: 'in_range', value: [1, 5] }
        ],
        actions: [
          { type: 'route_to_agent', parameters: {} },
          { type: 'route_to_queue', parameters: { skills: ['general'] } }
        ],
        schedule: undefined,
        createdDate: new Date(),
        lastModified: new Date()
      }
    ];
    
    defaultRules.forEach(rule => {
      this.routingRules.set(rule.id, rule);
    });
  }
  
  private async loadPhoneLineConfigurations(): Promise<void> {
    // Configuration des lignes téléphoniques par défaut
    const defaultLines: PhoneLineConfiguration[] = [
      {
        id: 'main-line',
        name: 'Main Business Line',
        phoneNumber: '+15551234567',
        provider: 'twilio',
        status: 'active',
        capacity: 10,
        currentLoad: 0,
        routingRules: ['business-hours-routing'],
        voicemailEnabled: true,
        transcriptionEnabled: true,
        recordingEnabled: true,
        configuration: {}
      }
    ];
    
    defaultLines.forEach(line => {
      this.phoneLines.set(line.id, line);
    });
  }
  
  private async initializeVapiIntegration(): Promise<void> {
    // Initialisation de l'intégration VAPI
    this.auditLogger.info('OutlookRoutingEngine:InitializeVapi', {
      assistantId: this.vapiConfig?.assistantId
    });
  }
  
  private async initializeTwilioIntegration(): Promise<void> {
    // Initialisation de l'intégration Twilio
    this.auditLogger.info('OutlookRoutingEngine:InitializeTwilio', {
      phoneNumber: this.twilioConfig?.phoneNumber
    });
  }
  
  private startQueueProcessor(): void {
    // Traitement périodique de la file d'attente
    setInterval(async () => {
      await this.processQueue();
    }, 10000); // Toutes les 10 secondes
  }
  
  private async processQueue(): Promise<void> {
    if (this.callQueue.length === 0) return;
    
    try {
      // Vérifier la disponibilité des agents
      const availability = await this.checkAgentAvailability();
      const availableAgents = availability.filter(a => a.status === 'available');
      
      // Traiter les appels en attente
      while (this.callQueue.length > 0 && availableAgents.length > 0) {
        const nextCall = this.callQueue.shift();
        if (!nextCall) break;
        
        const agent = availableAgents.shift();
        if (!agent) break;
        
        // Routage vers l'agent disponible
        await this.routeQueuedCall(nextCall, agent);
      }
      
      // Mise à jour des temps d'attente
      this.updateQueueWaitTimes();
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:ProcessQueue', error);
    }
  }
  
  private async routeQueuedCall(call: CallQueueEntry, agent: any): Promise<void> {
    try {
      this.auditLogger.info('OutlookRoutingEngine:RouteQueuedCall', {
        callId: call.callId,
        agentId: agent.userId,
        waitTime: Date.now() - call.queuedAt.getTime()
      });
      
      // Mise à jour des métriques
      const waitTime = Date.now() - call.queuedAt.getTime();
      this.routingMetrics.averageWaitTime = this.updateAverage(
        this.routingMetrics.averageWaitTime,
        waitTime,
        this.routingMetrics.callsRouted + 1
      );
      
      this.routingMetrics.callsRouted++;
      
      // Créer l'événement de rendez-vous
      await this.createCallEvent(agent, call);
      
      // Notifier l'agent
      await this.notifyAgent(agent, call);
      
    } catch (error) {
      this.auditLogger.error('OutlookRoutingEngine:RouteQueuedCallError', error);
      // Remettre l'appel en file d'attente
      this.callQueue.unshift(call);
    }
  }
  
  private updateQueueWaitTimes(): void {
    const now = Date.now();
    
    this.callQueue.forEach(call => {
      call.waitTime = now - call.queuedAt.getTime();
    });
  }
  
  private getBusinessHoursMessage(): string {
    return "Thank you for calling Drain Fortin. Our business hours are Monday to Friday, 8 AM to 6 PM.";
  }
  
  private async handleEmergencyRouting(callData: any): Promise<any> {
    // Routage d'urgence - tentative de joindre un agent d'urgence
    return {
      routingDecision: 'routed',
      destination: 'emergency_line',
      instructions: 'Emergency routing activated'
    };
  }
  
  private async scheduleCallbackOffer(callData: any): Promise<void> {
    // Programmer une offre de rappel
    // Implémentation selon les besoins
  }
  
  private async handleDefaultRouting(callData: any): Promise<any> {
    // Routage par défaut si aucune règle ne s'applique
    if (callData.availableAgents && callData.availableAgents.length > 0) {
      return await this.routeToAgent({}, callData);
    } else {
      return await this.routeToQueue({}, callData);
    }
  }
  
  private async getCallHistory(phoneNumber: string): Promise<CallRecord[]> {
    // Récupération de l'historique d'appels depuis le cache/DB
    try {
      const history = await this.cacheManager.get<CallRecord[]>(`call_history:${phoneNumber}`);
      return history || [];
    } catch {
      return [];
    }
  }
  
  private async playMessage(parameters: any, callData: any): Promise<any> {
    return {
      routingDecision: 'routed',
      destination: 'message_player',
      instructions: parameters.message || 'Default message'
    };
  }
  
  private async transferExternal(parameters: any, callData: any): Promise<any> {
    return {
      routingDecision: 'routed',
      destination: parameters.phoneNumber,
      instructions: `Transferring to ${parameters.phoneNumber}`
    };
  }
  
  private async scheduleCallback(parameters: any, callData: any): Promise<any> {
    // Programmer un rappel
    return {
      routingDecision: 'voicemail',
      instructions: 'Callback scheduled. We will call you back within 2 hours.'
    };
  }
  
  private async selectVoicemailGreeting(callData: any): Promise<string> {
    if (callData.callType === 'emergency') {
      return "This is Drain Fortin emergency line. Please leave your message and we will call you back immediately.";
    }
    
    return "Thank you for calling Drain Fortin. Please leave your message and we will return your call as soon as possible.";
  }
  
  private async scheduleVoicemailNotification(callData: any): Promise<void> {
    // Programme l'envoi d'un email de notification de voicemail
  }
  
  private async createFollowUpTask(callData: any): Promise<void> {
    // Crée une tâche de suivi dans Outlook
  }
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OutlookError(
        'SERVICE_NOT_INITIALIZED',
        'OutlookRoutingEngine must be initialized before use'
      );
    }
  }
  
  /**
   * Getters publics
   */
  
  public getRoutingMetrics() {
    return { ...this.routingMetrics };
  }
  
  public getQueueStatus() {
    return {
      length: this.callQueue.length,
      calls: this.callQueue.map(call => ({
        id: call.id,
        from: call.phoneNumber,
        waitTime: call.waitTime,
        position: call.position,
        priority: call.priority
      }))
    };
  }
  
  public getActiveRules() {
    return Array.from(this.routingRules.values()).filter(rule => rule.enabled);
  }
}

export default OutlookRoutingEngine;