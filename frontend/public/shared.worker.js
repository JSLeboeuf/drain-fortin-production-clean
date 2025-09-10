/**
 * SharedWorker for Multi-Tab Synchronization
 * Enables real-time state sharing across browser tabs
 */

// Connected ports (tabs)
const ports = new Set();
const state = new Map();
const subscriptions = new Map();

// Message types
const MSG_TYPES = {
  CONNECT: 'CONNECT',
  DISCONNECT: 'DISCONNECT',
  STATE_UPDATE: 'STATE_UPDATE',
  STATE_REQUEST: 'STATE_REQUEST',
  SUBSCRIBE: 'SUBSCRIBE',
  UNSUBSCRIBE: 'UNSUBSCRIBE',
  BROADCAST: 'BROADCAST',
  PING: 'PING',
  PONG: 'PONG'
};

// Broadcast message to all connected tabs except sender
function broadcast(message, senderPort) {
  const serialized = JSON.stringify(message);
  
  ports.forEach(port => {
    if (port !== senderPort && port.readyState === port.OPEN) {
      try {
        port.postMessage(serialized);
      } catch (error) {
        console.error('Failed to broadcast to port:', error);
        ports.delete(port);
      }
    }
  });
}

// Broadcast to subscribers of a specific key
function broadcastToSubscribers(key, value, senderPort) {
  const subscribers = subscriptions.get(key) || new Set();
  
  const message = {
    type: MSG_TYPES.STATE_UPDATE,
    key,
    value,
    timestamp: Date.now()
  };
  
  subscribers.forEach(port => {
    if (port !== senderPort && ports.has(port)) {
      try {
        port.postMessage(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to notify subscriber:', error);
        subscribers.delete(port);
        ports.delete(port);
      }
    }
  });
}

// Handle port connection
function handleConnect(port) {
  console.log('New tab connected to SharedWorker');
  ports.add(port);
  
  // Send current state to new connection
  const currentState = {};
  state.forEach((value, key) => {
    currentState[key] = value;
  });
  
  port.postMessage(JSON.stringify({
    type: MSG_TYPES.CONNECT,
    state: currentState,
    tabCount: ports.size
  }));
  
  // Notify other tabs about new connection
  broadcast({
    type: MSG_TYPES.BROADCAST,
    event: 'TAB_CONNECTED',
    tabCount: ports.size
  }, port);
}

// Handle port disconnection
function handleDisconnect(port) {
  console.log('Tab disconnected from SharedWorker');
  ports.delete(port);
  
  // Remove from all subscriptions
  subscriptions.forEach(subscribers => {
    subscribers.delete(port);
  });
  
  // Notify other tabs
  broadcast({
    type: MSG_TYPES.BROADCAST,
    event: 'TAB_DISCONNECTED',
    tabCount: ports.size
  }, port);
}

// Handle incoming messages
function handleMessage(event, port) {
  let message;
  
  try {
    message = typeof event.data === 'string' 
      ? JSON.parse(event.data) 
      : event.data;
  } catch (error) {
    console.error('Failed to parse message:', error);
    return;
  }
  
  switch (message.type) {
    case MSG_TYPES.STATE_UPDATE:
      // Update shared state
      const { key, value } = message;
      
      if (key) {
        state.set(key, value);
        
        // Notify subscribers
        broadcastToSubscribers(key, value, port);
        
        // Log for debugging
        console.log(`State updated: ${key}`, value);
      }
      break;
      
    case MSG_TYPES.STATE_REQUEST:
      // Send specific state value
      const requestedKey = message.key;
      
      if (requestedKey) {
        const value = state.get(requestedKey);
        port.postMessage(JSON.stringify({
          type: MSG_TYPES.STATE_UPDATE,
          key: requestedKey,
          value
        }));
      } else {
        // Send all state
        const allState = {};
        state.forEach((v, k) => {
          allState[k] = v;
        });
        port.postMessage(JSON.stringify({
          type: MSG_TYPES.STATE_UPDATE,
          state: allState
        }));
      }
      break;
      
    case MSG_TYPES.SUBSCRIBE:
      // Subscribe to state changes
      const subKey = message.key;
      
      if (subKey) {
        if (!subscriptions.has(subKey)) {
          subscriptions.set(subKey, new Set());
        }
        subscriptions.get(subKey).add(port);
        
        // Send current value
        const currentValue = state.get(subKey);
        if (currentValue !== undefined) {
          port.postMessage(JSON.stringify({
            type: MSG_TYPES.STATE_UPDATE,
            key: subKey,
            value: currentValue
          }));
        }
      }
      break;
      
    case MSG_TYPES.UNSUBSCRIBE:
      // Unsubscribe from state changes
      const unsubKey = message.key;
      
      if (unsubKey && subscriptions.has(unsubKey)) {
        subscriptions.get(unsubKey).delete(port);
      }
      break;
      
    case MSG_TYPES.BROADCAST:
      // Broadcast custom message to all tabs
      broadcast({
        type: MSG_TYPES.BROADCAST,
        ...message.data
      }, port);
      break;
      
    case MSG_TYPES.PING:
      // Respond to ping
      port.postMessage(JSON.stringify({
        type: MSG_TYPES.PONG,
        timestamp: Date.now()
      }));
      break;
      
    case MSG_TYPES.DISCONNECT:
      // Handle explicit disconnect
      handleDisconnect(port);
      break;
      
    default:
      console.warn('Unknown message type:', message.type);
  }
}

// SharedWorker connection handler
self.onconnect = function(event) {
  const port = event.ports[0];
  
  // Setup message handler
  port.onmessage = (e) => handleMessage(e, port);
  
  // Setup error handler
  port.onerror = (error) => {
    console.error('Port error:', error);
    handleDisconnect(port);
  };
  
  // Handle initial connection
  handleConnect(port);
  
  // Start communication
  port.start();
};

// Periodic cleanup
setInterval(() => {
  // Remove dead ports
  const deadPorts = [];
  
  ports.forEach(port => {
    try {
      // Test if port is still alive
      port.postMessage(JSON.stringify({
        type: MSG_TYPES.PING
      }));
    } catch (error) {
      deadPorts.push(port);
    }
  });
  
  deadPorts.forEach(port => {
    handleDisconnect(port);
  });
  
  // Clean up empty subscription sets
  subscriptions.forEach((subscribers, key) => {
    if (subscribers.size === 0) {
      subscriptions.delete(key);
    }
  });
  
  // Log status
  console.log(`SharedWorker status: ${ports.size} tabs connected, ${state.size} state keys, ${subscriptions.size} subscriptions`);
}, 30000); // Every 30 seconds

console.log('SharedWorker initialized');