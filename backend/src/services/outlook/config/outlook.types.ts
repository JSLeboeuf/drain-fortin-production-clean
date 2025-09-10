/**
 * outlook.types.ts - Types TypeScript complets pour l'intégration Outlook
 * Tous les types, interfaces et enums pour le système Outlook
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

// ===== TYPES DE BASE =====

export type OutlookConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error' | 'expired';
export type OutlookHealthStatus = 'healthy' | 'degraded' | 'unhealthy';
export type OutlookImportance = 'low' | 'normal' | 'high';
export type OutlookSensitivity = 'normal' | 'personal' | 'private' | 'confidential';
export type OutlookShowAs = 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
export type OutlookResponseStatus = 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
export type OutlookAttendeeType = 'required' | 'optional' | 'resource';
export type OutlookRecurrenceType = 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
export type OutlookRecurrenceRangeType = 'endDate' | 'noEnd' | 'numbered';
export type OutlookWeekIndex = 'first' | 'second' | 'third' | 'fourth' | 'last';
export type OutlookDayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type OutlookBodyType = 'text' | 'html';
export type OutlookFlagStatus = 'notFlagged' | 'complete' | 'flagged';
export type CallRoutingStatus = 'available' | 'busy' | 'away' | 'doNotDisturb' | 'offline';
export type PhoneLineStatus = 'active' | 'inactive' | 'maintenance' | 'error';

// ===== CONFIGURATION =====

export interface OutlookConfig {
  oauth2: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    redirectUri: string;
    scopes: string[];
    authority?: string;
  };
  
  cache: {
    provider: 'memory' | 'redis' | 'file';
    ttl: number;
    maxSize?: number;
    redisUrl?: string;
    filePath?: string;
    userProfileTTL: number;
    tokenTTL: number;
    eventTTL: number;
    emailTTL: number;
    contactTTL: number;
  };
  
  retry: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    exponentialBase: number;
    jitter: boolean;
  };
  
  rateLimit: {
    maxRequestsPerMinute: number;
    maxRequestsPerHour: number;
    maxConcurrentRequests: number;
    backoffMultiplier: number;
  };
  
  audit: {
    enabled: boolean;
    level: 'error' | 'warn' | 'info' | 'debug';
    destination: 'console' | 'file' | 'database' | 'webhook';
    retentionDays: number;
    encryptPII: boolean;
  };
  
  metrics: {
    enabled: boolean;
    provider: 'memory' | 'prometheus' | 'statsd';
    endpoint?: string;
    interval: number;
  };
  
  health: {
    checkInterval: number;
    timeout: number;
    retryAttempts: number;
  };
  
  sync: {
    enableRealtime: boolean;
    batchSize: number;
    maxRetries: number;
    conflictResolutionStrategy: 'client' | 'server' | 'manual' | 'timestamp';
    deltaTokenTTL: number;
  };
  
  security: {
    encryptionKey: string;
    tokenEncryption: boolean;
    auditEncryption: boolean;
    dataRetentionDays: number;
  };
  
  phone: {
    defaultCountryCode: string;
    formatInternational: boolean;
    validateNumbers: boolean;
  };
  
  routing: {
    defaultStrategy: 'round_robin' | 'least_busy' | 'skills_based' | 'priority';
    maxQueueTime: number;
    overflowStrategy: 'voicemail' | 'transfer' | 'callback';
    workingHours: {
      start: string; // HH:MM
      end: string;   // HH:MM
      timezone: string;
      daysOfWeek: OutlookDayOfWeek[];
    };
  };
}

export interface OutlookServiceOptions {
  enableMetrics?: boolean;
  enableAudit?: boolean;
  enableCache?: boolean;
  enableRetry?: boolean;
  enableRateLimit?: boolean;
  customProviders?: {
    cache?: any;
    audit?: any;
    metrics?: any;
  };
}

// ===== UTILISATEUR =====

export interface OutlookUser {
  id: string;
  email: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  mobilePhone?: string;
  businessPhones: string[];
  officeLocation?: string;
  preferredLanguage?: string;
  lastSignIn: Date;
}

// ===== AUTHENTIFICATION =====

export interface OutlookAuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresOn: Date;
  scopes: string[];
  tokenType: 'Bearer';
}

// ===== CALENDRIER =====

export interface OutlookCalendar {
  id: string;
  name: string;
  color: string;
  isDefaultCalendar: boolean;
  canEdit: boolean;
  canShare: boolean;
  canViewPrivateItems: boolean;
  owner?: {
    name?: string;
    address?: string;
  };
  permissions: any[];
}

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  body: {
    contentType: OutlookBodyType;
    content: string;
  };
  start: {
    dateTime: Date;
    timeZone: string;
  };
  end: {
    dateTime: Date;
    timeZone: string;
  };
  isAllDay: boolean;
  location?: {
    displayName: string;
    address?: any;
    coordinates?: any;
  };
  attendees: OutlookAttendee[];
  organizer?: {
    name: string;
    email: string;
  };
  recurrence?: CalendarRecurrencePattern;
  showAs: OutlookShowAs;
  importance: OutlookImportance;
  sensitivity: OutlookSensitivity;
  categories: string[];
  webLink?: string;
  createdDateTime: Date;
  lastModifiedDateTime: Date;
  isCancelled: boolean;
  isOrganizer: boolean;
  responseRequested: boolean;
}

export interface OutlookAttendee {
  name: string;
  email: string;
  responseStatus: OutlookResponseStatus;
  responseTime?: Date;
  type: OutlookAttendeeType;
}

export interface CalendarRecurrencePattern {
  pattern: {
    type: OutlookRecurrenceType;
    interval: number;
    daysOfWeek?: OutlookDayOfWeek[];
    dayOfMonth?: number;
    weekIndex?: OutlookWeekIndex;
    month?: number;
  };
  range: {
    type: OutlookRecurrenceRangeType;
    startDate: Date;
    endDate?: Date;
    numberOfOccurrences?: number;
  };
}

export interface CalendarEventCreate {
  subject: string;
  body?: {
    contentType: OutlookBodyType;
    content: string;
  };
  start: {
    dateTime: Date;
    timeZone: string;
  };
  end: {
    dateTime: Date;
    timeZone: string;
  };
  isAllDay?: boolean;
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type?: OutlookAttendeeType;
  }>;
  recurrence?: CalendarRecurrencePattern;
  showAs?: OutlookShowAs;
  importance?: OutlookImportance;
  sensitivity?: OutlookSensitivity;
  categories?: string[];
  checkConflicts?: boolean;
}

export interface CalendarEventUpdate {
  subject?: string;
  body?: {
    contentType: OutlookBodyType;
    content: string;
  };
  start?: {
    dateTime: Date;
    timeZone: string;
  };
  end?: {
    dateTime: Date;
    timeZone: string;
  };
  isAllDay?: boolean;
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name?: string;
    };
    type?: OutlookAttendeeType;
  }>;
  showAs?: OutlookShowAs;
  importance?: OutlookImportance;
  sensitivity?: OutlookSensitivity;
  categories?: string[];
}

// ===== EMAIL =====

export interface OutlookEmail {
  id: string;
  subject: string;
  body: {
    contentType: OutlookBodyType;
    content: string;
  };
  from: {
    name: string;
    email: string;
  };
  to: Array<{
    name: string;
    email: string;
  }>;
  cc: Array<{
    name: string;
    email: string;
  }>;
  bcc: Array<{
    name: string;
    email: string;
  }>;
  receivedDateTime: Date;
  sentDateTime?: Date;
  isRead: boolean;
  isDraft: boolean;
  hasAttachments: boolean;
  importance: OutlookImportance;
  flag?: {
    flagStatus: OutlookFlagStatus;
    startDateTime?: Date;
    dueDateTime?: Date;
  };
  categories: string[];
  conversationId?: string;
  parentFolderId?: string;
  webLink?: string;
  trackingInfo?: EmailTrackingInfo;
  attachments?: OutlookEmailAttachment[];
}

export interface OutlookEmailAttachment {
  id?: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
  content?: Buffer;
}

export interface OutlookMailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount: number;
  unreadItemCount: number;
  totalItemCount: number;
  isHidden: boolean;
  wellKnownName?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  subject: string;
  body: string;
  isHtml: boolean;
  category?: string;
  tags: string[];
  variables: string[];
  defaultOptions?: EmailSendOptions;
}

export interface OutlookEmailTemplate extends EmailTemplate {
  createdDate: Date;
  lastModified: Date;
  version: number;
  usageCount?: number;
}

export interface EmailSignature {
  id: string;
  name: string;
  content: string;
  isHtml: boolean;
  isDefault: boolean;
}

export interface EmailTrackingInfo {
  messageId: string;
  trackingId: string;
  enabled: boolean;
  readReceipt: boolean;
  deliveryReceipt: boolean;
  linkTracking: boolean;
  pixelTracking: boolean;
  opens?: Array<{
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
  }>;
  clicks?: Array<{
    url: string;
    timestamp: Date;
    userAgent?: string;
    ipAddress?: string;
  }>;
}

// ===== CONTACTS =====

export interface OutlookContact {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  middleName?: string;
  nickname?: string;
  title?: string;
  companyName?: string;
  department?: string;
  jobTitle?: string;
  emailAddresses: Array<{
    name?: string;
    address: string;
    type?: 'work' | 'home' | 'other';
  }>;
  businessPhones: string[];
  homePhones: string[];
  mobilePhone?: string;
  businessAddress?: OutlookAddress;
  homeAddress?: OutlookAddress;
  otherAddress?: OutlookAddress;
  birthday?: Date;
  personalNotes?: string;
  categories: string[];
  createdDateTime: Date;
  lastModifiedDateTime: Date;
  changeKey?: string;
  parentFolderId?: string;
}

export interface OutlookAddress {
  street?: string;
  city?: string;
  state?: string;
  countryOrRegion?: string;
  postalCode?: string;
}

export interface ContactCreateRequest {
  displayName: string;
  givenName?: string;
  surname?: string;
  companyName?: string;
  jobTitle?: string;
  emailAddresses?: Array<{
    name?: string;
    address: string;
    type?: 'work' | 'home' | 'other';
  }>;
  businessPhones?: string[];
  mobilePhone?: string;
  businessAddress?: OutlookAddress;
  personalNotes?: string;
  categories?: string[];
}

// ===== TÂCHES =====

export interface OutlookTask {
  id: string;
  subject: string;
  body?: {
    contentType: OutlookBodyType;
    content: string;
  };
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  priority: OutlookImportance;
  percentComplete: number;
  startDateTime?: Date;
  dueDateTime?: Date;
  completedDateTime?: Date;
  reminderDateTime?: Date;
  categories: string[];
  hasAttachments: boolean;
  sensitivity: OutlookSensitivity;
  createdDateTime: Date;
  lastModifiedDateTime: Date;
  changeKey?: string;
  parentFolderId?: string;
  recurrence?: CalendarRecurrencePattern;
}

export interface TaskCreateRequest {
  subject: string;
  body?: {
    contentType: OutlookBodyType;
    content: string;
  };
  status?: 'notStarted' | 'inProgress';
  priority?: OutlookImportance;
  startDateTime?: Date;
  dueDateTime?: Date;
  reminderDateTime?: Date;
  categories?: string[];
  sensitivity?: OutlookSensitivity;
}

// ===== ROUTAGE TÉLÉPHONIQUE =====

export interface PhoneRoutingRule {
  id: string;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  conditions: PhoneRoutingCondition[];
  actions: PhoneRoutingAction[];
  schedule?: ScheduleRule;
  createdDate: Date;
  lastModified: Date;
}

export interface PhoneRoutingCondition {
  type: 'caller_id' | 'time_of_day' | 'day_of_week' | 'skills_required' | 'queue_length' | 'agent_availability';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
  caseSensitive?: boolean;
}

export interface PhoneRoutingAction {
  type: 'route_to_agent' | 'route_to_queue' | 'play_message' | 'transfer_external' | 'voicemail' | 'callback';
  parameters: Record<string, any>;
}

export interface ScheduleRule {
  timeZone: string;
  workingHours: Array<{
    dayOfWeek: OutlookDayOfWeek;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
  }>;
  holidays: Array<{
    name: string;
    date: Date;
    isRecurring: boolean;
  }>;
}

export interface CallQueueEntry {
  id: string;
  callId: string;
  phoneNumber: string;
  callerName?: string;
  queuedAt: Date;
  priority: number;
  skillsRequired: string[];
  waitTime: number;
  position: number;
  estimatedWaitTime?: number;
  callbackRequested: boolean;
  metadata: Record<string, any>;
}

export interface PhoneLineConfiguration {
  id: string;
  name: string;
  phoneNumber: string;
  provider: 'twilio' | 'vapi' | 'other';
  status: PhoneLineStatus;
  capacity: number;
  currentLoad: number;
  routingRules: string[]; // Rule IDs
  voicemailEnabled: boolean;
  voicemailGreeting?: string;
  transcriptionEnabled: boolean;
  recordingEnabled: boolean;
  configuration: Record<string, any>;
}

export interface CallDistributionStrategy {
  type: 'round_robin' | 'least_busy' | 'skills_based' | 'priority' | 'longest_idle';
  parameters: Record<string, any>;
  fallbackStrategy?: CallDistributionStrategy;
}

// ===== OPTIONS ET CONFIGURATION =====

export interface EmailSendOptions {
  cc?: string[];
  bcc?: string[];
  importance?: OutlookImportance;
  sensitivity?: OutlookSensitivity;
  requestDeliveryReceipt?: boolean;
  requestReadReceipt?: boolean;
  saveToSentItems?: boolean;
  attachments?: OutlookEmailAttachment[];
  isHtml?: boolean;
  useTemplate?: boolean;
  templateId?: string;
  templateData?: Record<string, any>;
  includeSignature?: boolean;
  signatureId?: string;
  enableTracking?: boolean;
  trackingOptions?: {
    readReceipt?: boolean;
    deliveryReceipt?: boolean;
    linkTracking?: boolean;
    pixelTracking?: boolean;
  };
  flag?: {
    startDateTime?: Date;
    dueDateTime?: Date;
  };
}

export interface EmailSearchOptions {
  filter?: string;
  search?: string;
  orderBy?: string;
  pageSize?: number;
  skipToken?: string;
  expand?: string[];
}

export interface EmailFilterOptions {
  isRead?: boolean;
  hasAttachments?: boolean;
  importance?: OutlookImportance;
  from?: string;
  subject?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  categories?: string[];
}

export interface CalendarSyncOptions {
  conflictResolution?: 'client_wins' | 'server_wins' | 'manual' | 'timestamp';
  batchSize?: number;
  maxRetries?: number;
  skipDeleted?: boolean;
  includeRecurrence?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CalendarAvailability {
  userEmail: string;
  timeZone: string;
  workingHours: Array<{
    dayOfWeek: OutlookDayOfWeek;
    startTime: string;
    endTime: string;
  }>;
  busyTimes: Array<{
    start: Date;
    end: Date;
    showAs: OutlookShowAs;
  }>;
}

export interface CalendarFreeBusyResponse {
  userEmail: string;
  startDate: Date;
  endDate: Date;
  timeZone: string;
  busyTimes: Array<{
    start: string;
    end: string;
    status: string;
  }>;
  freeBusyStatus: string[];
  workingHours?: any;
}

// ===== SYNCHRONISATION =====

export interface CalendarConflict {
  type: 'time_overlap' | 'resource_conflict' | 'attendee_conflict';
  existingEvent: OutlookCalendarEvent;
  newEvent: CalendarEventCreate;
  conflictReason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolution?: string;
  conflictResolved?: boolean;
}

export interface SyncChange {
  id: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: 'event' | 'contact' | 'email' | 'task';
  timestamp: Date;
  data: any;
  deltaToken?: string;
}

export interface SyncResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  changesProcessed: number;
  conflicts: number;
  errors: OutlookError[];
  deltaToken?: string;
}

// ===== RÉSULTATS ET STATUS =====

export interface CalendarSyncStatus {
  isInitialized: boolean;
  syncInProgress: boolean;
  lastSyncTimestamp: Date | null;
  metrics: CalendarSyncMetrics;
}

export interface CalendarSyncResult {
  success: boolean;
  syncTimestamp: Date;
  duration: number;
  metrics: CalendarSyncMetrics;
  conflicts: CalendarConflict[];
  errors: OutlookError[];
  error?: OutlookError;
}

// ===== MÉTRIQUES =====

export interface CalendarSyncMetrics {
  lastSyncStart: Date | null;
  lastSyncEnd: Date | null;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  eventsCreateFailed: number;
  eventsUpdateFailed: number;
  eventsDeleteFailed: number;
  conflictsDetected: number;
  conflictsResolved: number;
  syncDuration: number;
  errorCount: number;
}

export interface EmailMetrics {
  emailsSent: number;
  emailsReceived: number;
  emailsRead: number;
  emailsDeleted: number;
  emailsReplied: number;
  emailsForwarded: number;
  emailsSendFailed: number;
  attachmentsSent: number;
  attachmentsReceived: number;
  templatesUsed: number;
  autoResponsesSent: number;
  lastActivity: Date;
}

export interface ContactSyncMetrics {
  contactsProcessed: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsDeleted: number;
  contactsMerged: number;
  duplicatesDetected: number;
  syncDuration: number;
  lastSync: Date;
}

export interface PhoneMetrics {
  callsReceived: number;
  callsRouted: number;
  callsQueued: number;
  callsAbandoned: number;
  averageWaitTime: number;
  averageCallDuration: number;
  voicemailsReceived: number;
  transcriptionsCompleted: number;
  routingRulesTriggered: number;
  lastActivity: Date;
}

export interface OutlookServiceMetrics {
  connectionStatus: OutlookConnectionStatus;
  uptime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  rateLimitHits: number;
  cacheHitRatio: number;
  calendar: CalendarSyncMetrics;
  email: EmailMetrics;
  contacts: ContactSyncMetrics;
  phone: PhoneMetrics;
  lastUpdated: Date;
}

// ===== SANTÉ ET MONITORING =====

export interface OutlookServiceHealth {
  status: OutlookHealthStatus;
  timestamp: Date;
  checks: {
    authentication: HealthCheck;
    graphApi: HealthCheck;
    rateLimits: HealthCheck;
    cache: HealthCheck;
    database?: HealthCheck;
  };
  error?: OutlookError;
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn' | 'unknown';
  message?: string;
  duration?: number;
  details?: Record<string, any>;
}

// ===== ERREURS =====

export class OutlookError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly context?: any;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    code: string,
    message: string,
    context?: any,
    statusCode?: number,
    correlationId?: string
  ) {
    super(message);
    this.name = 'OutlookError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = correlationId;

    // Maintenir la stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OutlookError);
    }
  }

  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      stack: this.stack
    };
  }
}

// ===== FONCTIONNALITÉS AVANCÉES =====

export interface EmailAutoResponder {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Array<{
    type: 'sender' | 'subject' | 'body' | 'time' | 'keyword';
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex';
    value: string;
    caseSensitive?: boolean;
  }>;
  response: {
    templateId?: string;
    subject: string;
    body: string;
    isHtml: boolean;
    includeOriginal: boolean;
  };
  schedule?: ScheduleRule;
  rateLimit: {
    enabled: boolean;
    maxPerHour?: number;
    maxPerDay?: number;
    perSenderLimit?: number;
  };
  analytics: {
    sent: number;
    lastUsed?: Date;
    averageResponseTime: number;
  };
}

export interface EmailBulkOperation {
  id: string;
  type: 'mark_read' | 'mark_unread' | 'delete' | 'move' | 'categorize' | 'flag';
  filter: EmailFilterOptions;
  parameters: Record<string, any>;
  batchSize: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    processed: number;
    successful: number;
    failed: number;
  };
  startedAt?: Date;
  completedAt?: Date;
  errors: OutlookError[];
}

export interface EmailAnalytics {
  period: {
    start: Date;
    end: Date;
  };
  sent: {
    total: number;
    byDay: Record<string, number>;
    byHour: Record<string, number>;
    byTemplate: Record<string, number>;
  };
  received: {
    total: number;
    byDay: Record<string, number>;
    bySender: Record<string, number>;
    byCategory: Record<string, number>;
  };
  engagement: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    bounceRate: number;
  };
  performance: {
    averageDeliveryTime: number;
    averageResponseTime: number;
    peakHours: string[];
  };
}

// ===== INTÉGRATION VAPI/TWILIO =====

export interface VapiIntegrationConfig {
  apiKey: string;
  assistantId?: string;
  phoneNumberId?: string;
  webhookUrl: string;
  webhookSecret: string;
  features: {
    transcription: boolean;
    sentiment: boolean;
    keywordDetection: boolean;
    callRecording: boolean;
    realTimeAnalysis: boolean;
  };
}

export interface TwilioIntegrationConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  webhookUrl: string;
  features: {
    smsToEmail: boolean;
    callRecording: boolean;
    transcription: boolean;
    conferencing: boolean;
  };
}

export interface CallRecord {
  id: string;
  callSid?: string;
  from: string;
  to: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer' | 'cancelled';
  direction: 'inbound' | 'outbound';
  recordingUrl?: string;
  transcription?: string;
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
    confidence: number;
  };
  routingInfo: {
    ruleId?: string;
    queueId?: string;
    agentId?: string;
    waitTime: number;
  };
  outlookIntegration?: {
    eventId?: string;
    emailId?: string;
    contactId?: string;
    taskId?: string;
  };
  metadata: Record<string, any>;
}

export interface CallTranscriptionResult {
  callId: string;
  transcription: string;
  confidence: number;
  language: string;
  speakers: Array<{
    speaker: string;
    segments: Array<{
      start: number;
      end: number;
      text: string;
      confidence: number;
    }>;
  }>;
  keywords: string[];
  sentiment: {
    overall: {
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    };
    segments: Array<{
      start: number;
      end: number;
      score: number;
      label: 'positive' | 'negative' | 'neutral';
    }>;
  };
  actionItems: string[];
  summary: string;
}

// ===== WEBHOOKS =====

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: Date;
  resource: string;
  resourceId: string;
  changeType: 'created' | 'updated' | 'deleted';
  data: any;
  subscriptionId?: string;
  tenantId?: string;
  userId?: string;
}

export interface WebhookSubscription {
  id: string;
  resource: string;
  changeTypes: string[];
  notificationUrl: string;
  expirationDateTime: Date;
  clientState?: string;
  latestSupportedTlsVersion?: string;
  encryptionCertificate?: string;
  includeResourceData?: boolean;
}

// Export par défaut
export default {
  OutlookError
};