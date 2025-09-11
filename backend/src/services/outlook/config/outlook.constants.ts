/**
 * outlook.constants.ts - Constantes et enums pour l'intégration Outlook
 * Configuration par défaut, endpoints API, limites, et constantes système
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { OutlookConfig } from './outlook.types';

// ===== ENDPOINTS ET URLS =====

export const OUTLOOK_ENDPOINTS = {
  // Microsoft Graph API
  GRAPH_API_BASE: 'https://graph.microsoft.com/v1.0',
  GRAPH_API_BETA: 'https://graph.microsoft.com/beta',
  
  // OAuth2 Authority
  AUTHORITY_BASE: 'https://login.microsoftonline.com',
  COMMON_AUTHORITY: 'https://login.microsoftonline.com/common',
  
  // Ressources Microsoft
  GRAPH_RESOURCE: 'https://graph.microsoft.com',
  OUTLOOK_RESOURCE: 'https://outlook.office365.com',
  
  // Webhooks
  WEBHOOK_NOTIFICATION_URL: '/webhooks/outlook',
  WEBHOOK_VALIDATION_TOKEN: 'validationToken',
  
  // API Endpoints spécifiques
  USER_PROFILE: '/me',
  CALENDARS: '/me/calendars',
  EVENTS: '/me/events',
  MESSAGES: '/me/messages',
  CONTACTS: '/me/contacts',
  MAIL_FOLDERS: '/me/mailFolders',
  TASKS: '/me/outlook/tasks',
  SUBSCRIPTIONS: '/subscriptions',
  
  // Opérations sur les emails
  SEND_MAIL: '/me/sendMail',
  REPLY: '/reply',
  REPLY_ALL: '/replyAll',
  FORWARD: '/forward',
  
  // Opérations sur les calendriers
  CALENDAR_VIEW: '/me/calendarView',
  GET_SCHEDULE: '/me/calendar/getSchedule',
  FIND_MEETING_TIMES: '/me/findMeetingTimes',
  
  // Batch requests
  BATCH: '/$batch'
} as const;

// ===== SCOPES OAUTH2 =====

export const OUTLOOK_SCOPES = {
  // Scopes de base
  OPENID: 'openid',
  PROFILE: 'profile',
  EMAIL: 'email',
  OFFLINE_ACCESS: 'offline_access',
  
  // Calendriers
  CALENDARS_READ: 'Calendars.Read',
  CALENDARS_READ_WRITE: 'Calendars.ReadWrite',
  CALENDARS_READ_SHARED: 'Calendars.Read.Shared',
  CALENDARS_READ_WRITE_SHARED: 'Calendars.ReadWrite.Shared',
  
  // Emails
  MAIL_READ: 'Mail.Read',
  MAIL_READ_WRITE: 'Mail.ReadWrite',
  MAIL_SEND: 'Mail.Send',
  MAIL_SEND_SHARED: 'Mail.Send.Shared',
  MAIL_READ_SHARED: 'Mail.Read.Shared',
  MAIL_READ_WRITE_SHARED: 'Mail.ReadWrite.Shared',
  
  // Contacts
  CONTACTS_READ: 'Contacts.Read',
  CONTACTS_READ_WRITE: 'Contacts.ReadWrite',
  CONTACTS_READ_SHARED: 'Contacts.Read.Shared',
  CONTACTS_READ_WRITE_SHARED: 'Contacts.ReadWrite.Shared',
  
  // Tâches
  TASKS_READ: 'Tasks.Read',
  TASKS_READ_WRITE: 'Tasks.ReadWrite',
  TASKS_READ_SHARED: 'Tasks.Read.Shared',
  TASKS_READ_WRITE_SHARED: 'Tasks.ReadWrite.Shared',
  
  // Utilisateur
  USER_READ: 'User.Read',
  USER_READ_ALL: 'User.Read.All',
  USER_READ_WRITE: 'User.ReadWrite',
  
  // Présence
  PRESENCE_READ: 'Presence.Read',
  PRESENCE_READ_ALL: 'Presence.Read.All',
  
  // Files et OneDrive
  FILES_READ: 'Files.Read',
  FILES_READ_WRITE: 'Files.ReadWrite',
  FILES_READ_ALL: 'Files.Read.All',
  FILES_READ_WRITE_ALL: 'Files.ReadWrite.All'
} as const;

// ===== LIMITES API =====

export const API_LIMITS = {
  // Rate Limits Microsoft Graph
  REQUESTS_PER_MINUTE: 2000,
  REQUESTS_PER_HOUR: 120000,
  REQUESTS_PER_DAY: 2880000,
  
  // Limites par ressource
  CALENDAR: {
    EVENTS_PER_REQUEST: 1000,
    BATCH_SIZE: 20,
    MAX_RECURRENCE_INSTANCES: 999
  },
  
  EMAIL: {
    MESSAGES_PER_REQUEST: 1000,
    BATCH_SIZE: 20,
    MAX_ATTACHMENT_SIZE: 150 * 1024 * 1024, // 150MB
    MAX_MESSAGE_SIZE: 25 * 1024 * 1024,     // 25MB
    MAX_RECIPIENTS: 500
  },
  
  CONTACTS: {
    CONTACTS_PER_REQUEST: 1000,
    BATCH_SIZE: 20
  },
  
  TASKS: {
    TASKS_PER_REQUEST: 1000,
    BATCH_SIZE: 20
  },
  
  // Webhooks
  WEBHOOK: {
    MAX_SUBSCRIPTIONS: 1000,
    MAX_NOTIFICATION_URL_LENGTH: 2048,
    MIN_EXPIRATION_TIME: 4230, // minutes (3 days)
    MAX_EXPIRATION_TIME: 259200 // minutes (180 days)
  },
  
  // Batch operations
  BATCH: {
    MAX_REQUESTS: 20,
    MAX_REQUEST_SIZE: 4 * 1024 * 1024 // 4MB
  }
} as const;

// ===== TIMEOUTS ET DÉLAIS =====

export const TIMEOUTS = {
  // Timeouts API
  DEFAULT_TIMEOUT: 30000,           // 30 secondes
  UPLOAD_TIMEOUT: 300000,           // 5 minutes
  BATCH_TIMEOUT: 60000,             // 1 minute
  WEBHOOK_TIMEOUT: 10000,           // 10 secondes
  
  // Retry delays
  RETRY_BASE_DELAY: 1000,           // 1 seconde
  RETRY_MAX_DELAY: 60000,           // 1 minute
  RETRY_EXPONENTIAL_BASE: 2,
  
  // Cache TTL
  CACHE: {
    DEFAULT_TTL: 3600,              // 1 heure
    TOKEN_TTL: 3300,                // 55 minutes (tokens expirent en 60min)
    USER_PROFILE_TTL: 86400,        // 24 heures
    CALENDAR_TTL: 1800,             // 30 minutes
    EVENT_TTL: 3600,                // 1 heure
    EMAIL_TTL: 3600,                // 1 heure
    CONTACT_TTL: 86400,             // 24 heures
    TASK_TTL: 3600,                 // 1 heure
    FOLDER_TTL: 86400,              // 24 heures
    TEMPLATE_TTL: 86400,            // 24 heures
    SIGNATURE_TTL: 86400            // 24 heures
  },
  
  // Polling intervals
  POLLING: {
    HEALTH_CHECK: 60000,            // 1 minute
    METRICS_COLLECTION: 30000,      // 30 secondes
    TOKEN_REFRESH: 300000,          // 5 minutes
    SUBSCRIPTION_RENEWAL: 3600000   // 1 heure
  }
} as const;

// ===== CONFIGURATION PAR DÉFAUT =====

export const DEFAULT_CONFIG: OutlookConfig = {
  oauth2: {
    clientId: process.env.OUTLOOK_CLIENT_ID || '',
    clientSecret: process.env.OUTLOOK_CLIENT_SECRET || '',
    tenantId: process.env.OUTLOOK_TENANT_ID || 'common',
    redirectUri: process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    scopes: [
      OUTLOOK_SCOPES.OPENID,
      OUTLOOK_SCOPES.PROFILE,
      OUTLOOK_SCOPES.EMAIL,
      OUTLOOK_SCOPES.OFFLINE_ACCESS,
      OUTLOOK_SCOPES.CALENDARS_READ_WRITE,
      OUTLOOK_SCOPES.MAIL_READ_WRITE,
      OUTLOOK_SCOPES.MAIL_SEND,
      OUTLOOK_SCOPES.CONTACTS_READ_WRITE,
      OUTLOOK_SCOPES.TASKS_READ_WRITE,
      OUTLOOK_SCOPES.USER_READ,
      OUTLOOK_SCOPES.PRESENCE_READ
    ],
    authority: OUTLOOK_ENDPOINTS.COMMON_AUTHORITY
  },
  
  cache: {
    provider: 'memory',
    ttl: TIMEOUTS.CACHE.DEFAULT_TTL,
    maxSize: 10000,
    userProfileTTL: TIMEOUTS.CACHE.USER_PROFILE_TTL,
    tokenTTL: TIMEOUTS.CACHE.TOKEN_TTL,
    eventTTL: TIMEOUTS.CACHE.EVENT_TTL,
    emailTTL: TIMEOUTS.CACHE.EMAIL_TTL,
    contactTTL: TIMEOUTS.CACHE.CONTACT_TTL
  },
  
  retry: {
    maxRetries: 3,
    baseDelay: TIMEOUTS.RETRY_BASE_DELAY,
    maxDelay: TIMEOUTS.RETRY_MAX_DELAY,
    exponentialBase: TIMEOUTS.RETRY_EXPONENTIAL_BASE,
    jitter: true
  },
  
  rateLimit: {
    maxRequestsPerMinute: API_LIMITS.REQUESTS_PER_MINUTE,
    maxRequestsPerHour: API_LIMITS.REQUESTS_PER_HOUR,
    maxConcurrentRequests: 50,
    backoffMultiplier: 2
  },
  
  audit: {
    enabled: true,
    level: 'info',
    destination: 'console',
    retentionDays: 30,
    encryptPII: true
  },
  
  metrics: {
    enabled: true,
    provider: 'memory',
    interval: TIMEOUTS.POLLING.METRICS_COLLECTION
  },
  
  health: {
    checkInterval: TIMEOUTS.POLLING.HEALTH_CHECK,
    timeout: TIMEOUTS.DEFAULT_TIMEOUT,
    retryAttempts: 3
  },
  
  sync: {
    enableRealtime: true,
    batchSize: API_LIMITS.CALENDAR.BATCH_SIZE,
    maxRetries: 3,
    conflictResolutionStrategy: 'timestamp',
    deltaTokenTTL: 86400
  },
  
  security: {
    encryptionKey: process.env.OUTLOOK_ENCRYPTION_KEY || 'default-key-change-in-production',
    tokenEncryption: true,
    auditEncryption: true,
    dataRetentionDays: 90
  },
  
  phone: {
    defaultCountryCode: '+1',
    formatInternational: true,
    validateNumbers: true
  },
  
  routing: {
    defaultStrategy: 'round_robin',
    maxQueueTime: 300, // 5 minutes
    overflowStrategy: 'voicemail',
    workingHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'America/Toronto',
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  }
};

// ===== PATTERNS ET REGEX =====

export const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE_NORTH_AMERICA: /^[\+]?[1]?[\s\-\.]?[\(]?([0-9]{3})[\)]?[\s\-\.]?([0-9]{3})[\s\-\.]?([0-9]{4})$/,
  PHONE_INTERNATIONAL: /^[\+]?[1-9]{1}[0-9]{1,14}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  TEMPLATE_VARIABLE: /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
  TIME_FORMAT: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
  DATE_ISO: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
} as const;

// ===== MESSAGES D'ERREUR =====

export const ERROR_MESSAGES = {
  // Authentification
  AUTHENTICATION_FAILED: 'Authentication failed',
  TOKEN_EXPIRED: 'Access token has expired',
  TOKEN_INVALID: 'Access token is invalid',
  REFRESH_FAILED: 'Failed to refresh access token',
  UNAUTHORIZED: 'Unauthorized access',
  
  // Configuration
  CONFIG_INVALID: 'Invalid configuration',
  CONFIG_MISSING: 'Required configuration missing',
  
  // API
  API_ERROR: 'Microsoft Graph API error',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded',
  REQUEST_TIMEOUT: 'Request timeout',
  NETWORK_ERROR: 'Network error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  
  // Données
  DATA_VALIDATION_ERROR: 'Data validation error',
  RESOURCE_NOT_FOUND: 'Resource not found',
  RESOURCE_CONFLICT: 'Resource conflict',
  PERMISSION_DENIED: 'Permission denied',
  
  // Synchronisation
  SYNC_FAILED: 'Synchronization failed',
  CONFLICT_RESOLUTION_FAILED: 'Conflict resolution failed',
  DELTA_TOKEN_EXPIRED: 'Delta token expired',
  
  // Calendrier
  CALENDAR_NOT_FOUND: 'Calendar not found',
  EVENT_NOT_FOUND: 'Event not found',
  EVENT_CONFLICT: 'Event time conflict',
  INVALID_RECURRENCE: 'Invalid recurrence pattern',
  
  // Email
  EMAIL_SEND_FAILED: 'Failed to send email',
  EMAIL_NOT_FOUND: 'Email not found',
  ATTACHMENT_TOO_LARGE: 'Attachment too large',
  INVALID_RECIPIENT: 'Invalid recipient address',
  
  // Contacts
  CONTACT_NOT_FOUND: 'Contact not found',
  DUPLICATE_CONTACT: 'Duplicate contact detected',
  CONTACT_VALIDATION_ERROR: 'Contact validation error',
  
  // Téléphonie
  CALL_ROUTING_FAILED: 'Call routing failed',
  PHONE_NUMBER_INVALID: 'Invalid phone number',
  QUEUE_FULL: 'Call queue is full',
  NO_AVAILABLE_AGENTS: 'No available agents',
  
  // Cache
  CACHE_ERROR: 'Cache operation error',
  CACHE_CONNECTION_FAILED: 'Cache connection failed',
  
  // Général
  INTERNAL_ERROR: 'Internal server error',
  OPERATION_TIMEOUT: 'Operation timeout',
  RESOURCE_EXHAUSTED: 'Resource exhausted',
  FEATURE_NOT_SUPPORTED: 'Feature not supported'
} as const;

// ===== CODES D'ERREUR =====

export const ERROR_CODES = {
  // Authentification (1000-1099)
  AUTHENTICATION_FAILED: 'E1001',
  TOKEN_EXPIRED: 'E1002',
  TOKEN_INVALID: 'E1003',
  REFRESH_FAILED: 'E1004',
  UNAUTHORIZED: 'E1005',
  
  // Configuration (1100-1199)
  CONFIGURATION_INVALID: 'E1101',
  CONFIGURATION_MISSING: 'E1102',
  
  // API Microsoft Graph (1200-1299)
  GRAPH_API_ERROR: 'E1201',
  RATE_LIMIT_EXCEEDED: 'E1202',
  REQUEST_TIMEOUT: 'E1203',
  NETWORK_ERROR: 'E1204',
  SERVICE_UNAVAILABLE: 'E1205',
  
  // Validation des données (1300-1399)
  VALIDATION_ERROR: 'E1301',
  RESOURCE_NOT_FOUND: 'E1302',
  RESOURCE_CONFLICT: 'E1303',
  PERMISSION_DENIED: 'E1304',
  
  // Synchronisation (1400-1499)
  SYNC_FAILED: 'E1401',
  CONFLICT_RESOLUTION_FAILED: 'E1402',
  DELTA_TOKEN_EXPIRED: 'E1403',
  SYNC_IN_PROGRESS: 'E1404',
  
  // Calendrier (1500-1599)
  CALENDAR_NOT_FOUND: 'E1501',
  EVENT_NOT_FOUND: 'E1502',
  EVENT_CONFLICT: 'E1503',
  INVALID_RECURRENCE: 'E1504',
  
  // Email (1600-1699)
  EMAIL_SEND_FAILED: 'E1601',
  EMAIL_NOT_FOUND: 'E1602',
  ATTACHMENT_TOO_LARGE: 'E1603',
  INVALID_RECIPIENT: 'E1604',
  TEMPLATE_NOT_FOUND: 'E1605',
  TEMPLATE_VALIDATION_ERROR: 'E1606',
  
  // Contacts (1700-1799)
  CONTACT_NOT_FOUND: 'E1701',
  DUPLICATE_CONTACT: 'E1702',
  CONTACT_VALIDATION_ERROR: 'E1703',
  
  // Téléphonie (1800-1899)
  CALL_ROUTING_FAILED: 'E1801',
  PHONE_NUMBER_INVALID: 'E1802',
  QUEUE_FULL: 'E1803',
  NO_AVAILABLE_AGENTS: 'E1804',
  ROUTING_RULE_NOT_FOUND: 'E1805',
  
  // Cache (1900-1999)
  CACHE_ERROR: 'E1901',
  CACHE_CONNECTION_FAILED: 'E1902',
  
  // Services (2000-2099)
  SERVICE_NOT_INITIALIZED: 'E2001',
  HEALTH_CHECK_FAILED: 'E2002',
  
  // Général (9000-9999)
  INTERNAL_ERROR: 'E9001',
  OPERATION_TIMEOUT: 'E9002',
  RESOURCE_EXHAUSTED: 'E9003',
  FEATURE_NOT_SUPPORTED: 'E9004'
} as const;

// ===== CONSTANTES DE SYNCHRONISATION =====

export const SYNC = {
  DEFAULT_BATCH_SIZE: 20,
  DEFAULT_MAX_RETRIES: 3,
  DEFAULT_PAGE_SIZE: 100,
  MAX_DELTA_TOKEN_AGE: 86400000, // 24 heures en milliseconds
  
  CHANGE_TYPES: {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted'
  },
  
  CONFLICT_RESOLUTION: {
    CLIENT_WINS: 'client',
    SERVER_WINS: 'server',
    MANUAL: 'manual',
    TIMESTAMP: 'timestamp'
  }
} as const;

// ===== CONSTANTES EMAIL =====

export const EMAIL = {
  DEFAULT_BATCH_SIZE: 10,
  MAX_BULK_SIZE: 100,
  
  IMPORTANCE: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high'
  },
  
  SENSITIVITY: {
    NORMAL: 'normal',
    PERSONAL: 'personal',
    PRIVATE: 'private',
    CONFIDENTIAL: 'confidential'
  },
  
  FLAG_STATUS: {
    NOT_FLAGGED: 'notFlagged',
    COMPLETE: 'complete',
    FLAGGED: 'flagged'
  }
} as const;

// ===== CONSTANTES CALENDRIER =====

export const CALENDAR = {
  SHOW_AS: {
    FREE: 'free',
    TENTATIVE: 'tentative',
    BUSY: 'busy',
    OOF: 'oof',
    WORKING_ELSEWHERE: 'workingElsewhere',
    UNKNOWN: 'unknown'
  },
  
  RESPONSE_STATUS: {
    NONE: 'none',
    ORGANIZER: 'organizer',
    TENTATIVELY_ACCEPTED: 'tentativelyAccepted',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    NOT_RESPONDED: 'notResponded'
  },
  
  ATTENDEE_TYPE: {
    REQUIRED: 'required',
    OPTIONAL: 'optional',
    RESOURCE: 'resource'
  }
} as const;

// ===== CONSTANTES TÉLÉPHONIE =====

export const PHONE = {
  ROUTING_STRATEGIES: {
    ROUND_ROBIN: 'round_robin',
    LEAST_BUSY: 'least_busy',
    SKILLS_BASED: 'skills_based',
    PRIORITY: 'priority',
    LONGEST_IDLE: 'longest_idle'
  },
  
  OVERFLOW_STRATEGIES: {
    VOICEMAIL: 'voicemail',
    TRANSFER: 'transfer',
    CALLBACK: 'callback',
    QUEUE: 'queue'
  },
  
  CALL_STATUS: {
    QUEUED: 'queued',
    RINGING: 'ringing',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    BUSY: 'busy',
    NO_ANSWER: 'no-answer',
    CANCELLED: 'cancelled'
  },
  
  LINE_STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    MAINTENANCE: 'maintenance',
    ERROR: 'error'
  }
} as const;

// ===== CONSTANTES WEBHOOK =====

export const WEBHOOK = {
  CHANGE_TYPES: {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted'
  },
  
  RESOURCES: {
    MESSAGES: 'me/messages',
    EVENTS: 'me/events',
    CONTACTS: 'me/contacts',
    CALENDARS: 'me/calendars',
    MAIL_FOLDERS: 'me/mailFolders'
  },
  
  NOTIFICATION_TYPES: {
    MISSED_CALL: 'missed_call',
    VOICEMAIL: 'voicemail',
    NEW_EMAIL: 'new_email',
    CALENDAR_REMINDER: 'calendar_reminder',
    TASK_DUE: 'task_due'
  }
} as const;

// ===== EXPORT PRINCIPAL =====

export const OUTLOOK_CONSTANTS = {
  ENDPOINTS: OUTLOOK_ENDPOINTS,
  SCOPES: OUTLOOK_SCOPES,
  API_LIMITS,
  TIMEOUTS,
  DEFAULT_CONFIG,
  PATTERNS,
  ERROR_MESSAGES,
  ERROR_CODES,
  SYNC,
  EMAIL,
  CALENDAR,
  PHONE,
  WEBHOOK,
  CACHE: DEFAULT_CONFIG.CACHE
} as const;

export default OUTLOOK_CONSTANTS;