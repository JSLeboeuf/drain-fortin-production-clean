/**
 * OutlookCalendarSync.ts - Synchronisation bidirectionnelle du calendrier Outlook
 * Gestion des événements, conflits, récurrence, et synchronisation temps réel
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { Event, Calendar } from '@microsoft/microsoft-graph-types';
import { GraphAPIClient } from './utils/GraphAPIClient';
import { ConflictResolver } from './sync/ConflictResolver';
import { SyncOrchestrator } from './sync/SyncOrchestrator';
import { ChangeTracker } from './sync/ChangeTracker';
import { BatchProcessor } from './utils/BatchProcessor';
import { AuditLogger } from './security/AuditLogger';
import { CacheManager } from './utils/CacheManager';
import { RetryMechanism } from './utils/RetryMechanism';
import { 
  OutlookCalendarEvent,
  OutlookCalendar,
  CalendarSyncOptions,
  CalendarConflict,
  CalendarSyncStatus,
  CalendarSyncResult,
  CalendarEventCreate,
  CalendarEventUpdate,
  CalendarRecurrencePattern,
  CalendarAvailability,
  CalendarFreeBusyResponse,
  CalendarSyncMetrics,
  OutlookError
} from './config/outlook.types';
import { OUTLOOK_CONSTANTS } from './config/outlook.constants';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';

/**
 * Service de synchronisation bidirectionnelle pour les calendriers Outlook
 * Gère la création, mise à jour, suppression et résolution de conflits
 */
export class OutlookCalendarSync {
  private graphClient: GraphAPIClient;
  private conflictResolver: ConflictResolver;
  private syncOrchestrator: SyncOrchestrator;
  private changeTracker: ChangeTracker;
  private batchProcessor: BatchProcessor;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;
  private retryMechanism: RetryMechanism;
  private errorHandler: OutlookErrorHandler;
  
  private isInitialized: boolean = false;
  private syncInProgress: boolean = false;
  private lastSyncTimestamp: Date | null = null;
  private syncMetrics: CalendarSyncMetrics;
  
  constructor(
    graphClient: GraphAPIClient,
    options: {
      auditLogger: AuditLogger;
      cacheManager: CacheManager;
      retryMechanism: RetryMechanism;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    this.graphClient = graphClient;
    this.auditLogger = options.auditLogger;
    this.cacheManager = options.cacheManager;
    this.retryMechanism = options.retryMechanism;
    this.errorHandler = options.errorHandler;
    
    // Initialisation des composants de synchronisation
    this.conflictResolver = new ConflictResolver({
      auditLogger: this.auditLogger,
      cacheManager: this.cacheManager
    });
    
    this.changeTracker = new ChangeTracker({
      graphClient: this.graphClient,
      cacheManager: this.cacheManager,
      auditLogger: this.auditLogger
    });
    
    this.syncOrchestrator = new SyncOrchestrator({
      changeTracker: this.changeTracker,
      conflictResolver: this.conflictResolver,
      auditLogger: this.auditLogger
    });
    
    this.batchProcessor = new BatchProcessor({
      graphClient: this.graphClient,
      retryMechanism: this.retryMechanism,
      auditLogger: this.auditLogger
    });
    
    this.syncMetrics = this.initializeSyncMetrics();
  }
  
  /**
   * Initialise le service de synchronisation calendrier
   */
  public async initialize(): Promise<void> {
    try {
      this.auditLogger.info('OutlookCalendarSync:Initialize', {
        timestamp: new Date().toISOString()
      });
      
      // Initialiser les composants
      await this.changeTracker.initialize();
      await this.syncOrchestrator.initialize();
      
      // Charger la dernière synchronisation
      this.lastSyncTimestamp = await this.loadLastSyncTimestamp();
      
      this.isInitialized = true;
      
      this.auditLogger.info('OutlookCalendarSync:InitializeSuccess', {
        lastSyncTimestamp: this.lastSyncTimestamp?.toISOString(),
        isInitialized: this.isInitialized
      });
      
    } catch (error) {
      this.auditLogger.error('OutlookCalendarSync:InitializeError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:Initialize');
    }
  }
  
  /**
   * Synchronisation complète bidirectionnelle
   * @param options Options de synchronisation
   */
  public async performFullSync(options: CalendarSyncOptions = {}): Promise<CalendarSyncResult> {
    this.ensureInitialized();
    
    if (this.syncInProgress) {
      throw new OutlookError(
        'SYNC_IN_PROGRESS',
        'Calendar synchronization already in progress',
        { syncStartTime: this.syncMetrics.lastSyncStart }
      );
    }
    
    const syncStartTime = new Date();
    this.syncInProgress = true;
    this.syncMetrics.lastSyncStart = syncStartTime;
    
    try {
      this.auditLogger.info('OutlookCalendarSync:FullSyncStart', {
        options,
        syncStartTime: syncStartTime.toISOString()
      });
      
      // Étape 1: Récupérer les changements depuis la dernière sync
      const deltaToken = await this.loadDeltaToken();
      const changes = await this.changeTracker.getCalendarChanges(deltaToken, options);
      
      this.auditLogger.info('OutlookCalendarSync:ChangesDetected', {
        totalChanges: changes.events.length + changes.deletions.length,
        events: changes.events.length,
        deletions: changes.deletions.length,
        deltaToken: changes.deltaToken
      });
      
      // Étape 2: Résolution des conflits
      const conflicts = await this.conflictResolver.detectConflicts(changes.events, options);
      const resolvedEvents = await this.conflictResolver.resolveConflicts(conflicts, options.conflictResolution);
      
      this.syncMetrics.conflictsDetected = conflicts.length;
      this.syncMetrics.conflictsResolved = resolvedEvents.filter(e => e.conflictResolved).length;
      
      // Étape 3: Application des changements par lot
      const batchResults = await this.batchProcessor.processBatch(resolvedEvents, {
        batchSize: options.batchSize || OUTLOOK_CONSTANTS.SYNC.DEFAULT_BATCH_SIZE,
        maxRetries: options.maxRetries || OUTLOOK_CONSTANTS.SYNC.DEFAULT_MAX_RETRIES
      });
      
      // Étape 4: Traitement des suppressions
      const deletionResults = await this.processDeletions(changes.deletions, options);
      
      // Étape 5: Mise à jour du cache et des tokens
      await this.saveDeltaToken(changes.deltaToken);
      await this.updateLastSyncTimestamp(syncStartTime);
      
      // Compilation des résultats
      const syncResult: CalendarSyncResult = {
        success: true,
        syncTimestamp: syncStartTime,
        duration: Date.now() - syncStartTime.getTime(),
        metrics: {
          ...this.syncMetrics,
          eventsProcessed: batchResults.successful.length,
          eventsFailed: batchResults.failed.length,
          eventsDeleted: deletionResults.successful.length,
          deletionsFailed: deletionResults.failed.length
        },
        conflicts: conflicts,
        errors: [...batchResults.errors, ...deletionResults.errors]
      };
      
      this.auditLogger.info('OutlookCalendarSync:FullSyncSuccess', syncResult);
      return syncResult;
      
    } catch (error) {
      const syncError = this.errorHandler.handleError(error, 'OutlookCalendarSync:PerformFullSync');
      
      const syncResult: CalendarSyncResult = {
        success: false,
        syncTimestamp: syncStartTime,
        duration: Date.now() - syncStartTime.getTime(),
        metrics: this.syncMetrics,
        conflicts: [],
        errors: [syncError],
        error: syncError
      };
      
      this.auditLogger.error('OutlookCalendarSync:FullSyncError', syncResult);
      return syncResult;
      
    } finally {
      this.syncInProgress = false;
    }
  }
  
  /**
   * Crée un nouvel événement dans le calendrier Outlook
   * @param calendarId ID du calendrier
   * @param eventData Données de l'événement à créer
   */
  public async createEvent(calendarId: string, eventData: CalendarEventCreate): Promise<OutlookCalendarEvent> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:CreateEvent', {
        calendarId,
        subject: eventData.subject,
        startTime: eventData.start.dateTime
      });
      
      // Validation des données
      this.validateEventData(eventData);
      
      // Vérification des conflits avant création
      if (eventData.checkConflicts !== false) {
        const conflicts = await this.checkEventConflicts(eventData);
        if (conflicts.length > 0) {
          throw new OutlookError(
            'EVENT_CONFLICT',
            'Event conflicts detected',
            { conflicts, eventData }
          );
        }
      }
      
      // Création via Graph API avec retry
      const createdEvent = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/calendars/${calendarId}/events`).post(eventData);
      }, 'createEvent');
      
      // Conversion au format interne
      const outlookEvent = await this.convertGraphEventToOutlook(createdEvent);
      
      // Mise en cache
      await this.cacheManager.set(
        `calendar_event:${outlookEvent.id}`,
        outlookEvent,
        OUTLOOK_CONSTANTS.CACHE.EVENT_TTL
      );
      
      this.syncMetrics.eventsCreated++;
      
      this.auditLogger.info('OutlookCalendarSync:CreateEventSuccess', {
        eventId: outlookEvent.id,
        calendarId,
        subject: outlookEvent.subject
      });
      
      return outlookEvent;
      
    } catch (error) {
      this.syncMetrics.eventsCreateFailed++;
      this.auditLogger.error('OutlookCalendarSync:CreateEventError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:CreateEvent');
    }
  }
  
  /**
   * Met à jour un événement existant
   * @param eventId ID de l'événement
   * @param updates Données à mettre à jour
   */
  public async updateEvent(eventId: string, updates: CalendarEventUpdate): Promise<OutlookCalendarEvent> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:UpdateEvent', {
        eventId,
        updateFields: Object.keys(updates)
      });
      
      // Récupérer l'événement existant
      const existingEvent = await this.getEvent(eventId);
      if (!existingEvent) {
        throw new OutlookError(
          'EVENT_NOT_FOUND',
          `Event with ID ${eventId} not found`,
          { eventId }
        );
      }
      
      // Validation des mises à jour
      this.validateEventUpdates(updates);
      
      // Vérification des conflits si les dates/heures changent
      if (updates.start || updates.end) {
        const tempEvent = { ...existingEvent, ...updates };
        const conflicts = await this.checkEventConflicts(tempEvent as CalendarEventCreate, eventId);
        if (conflicts.length > 0) {
          throw new OutlookError(
            'UPDATE_CONFLICT',
            'Update would create conflicts',
            { conflicts, updates }
          );
        }
      }
      
      // Application de la mise à jour
      const updatedEvent = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/events/${eventId}`).patch(updates);
      }, 'updateEvent');
      
      // Conversion et cache
      const outlookEvent = await this.convertGraphEventToOutlook(updatedEvent);
      await this.cacheManager.set(
        `calendar_event:${eventId}`,
        outlookEvent,
        OUTLOOK_CONSTANTS.CACHE.EVENT_TTL
      );
      
      this.syncMetrics.eventsUpdated++;
      
      this.auditLogger.info('OutlookCalendarSync:UpdateEventSuccess', {
        eventId,
        subject: outlookEvent.subject
      });
      
      return outlookEvent;
      
    } catch (error) {
      this.syncMetrics.eventsUpdateFailed++;
      this.auditLogger.error('OutlookCalendarSync:UpdateEventError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:UpdateEvent');
    }
  }
  
  /**
   * Supprime un événement du calendrier
   * @param eventId ID de l'événement à supprimer
   */
  public async deleteEvent(eventId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:DeleteEvent', { eventId });
      
      // Vérifier que l'événement existe
      const existingEvent = await this.getEvent(eventId);
      if (!existingEvent) {
        this.auditLogger.warn('OutlookCalendarSync:DeleteEvent', 'Event not found, skipping deletion');
        return;
      }
      
      // Suppression via Graph API
      await this.retryMechanism.executeWithRetry(async () => {
        await this.graphClient.api(`/me/events/${eventId}`).delete();
      }, 'deleteEvent');
      
      // Suppression du cache
      await this.cacheManager.delete(`calendar_event:${eventId}`);
      
      this.syncMetrics.eventsDeleted++;
      
      this.auditLogger.info('OutlookCalendarSync:DeleteEventSuccess', { eventId });
      
    } catch (error) {
      this.syncMetrics.eventsDeleteFailed++;
      this.auditLogger.error('OutlookCalendarSync:DeleteEventError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:DeleteEvent');
    }
  }
  
  /**
   * Récupère un événement spécifique
   * @param eventId ID de l'événement
   */
  public async getEvent(eventId: string): Promise<OutlookCalendarEvent | null> {
    this.ensureInitialized();
    
    try {
      // Vérifier le cache d'abord
      const cachedEvent = await this.cacheManager.get<OutlookCalendarEvent>(`calendar_event:${eventId}`);
      if (cachedEvent) {
        this.auditLogger.debug('OutlookCalendarSync:GetEvent', 'Retrieved from cache');
        return cachedEvent;
      }
      
      // Récupérer depuis Graph API
      const graphEvent = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/events/${eventId}`).get();
      }, 'getEvent');
      
      const outlookEvent = await this.convertGraphEventToOutlook(graphEvent);
      
      // Mettre en cache
      await this.cacheManager.set(
        `calendar_event:${eventId}`,
        outlookEvent,
        OUTLOOK_CONSTANTS.CACHE.EVENT_TTL
      );
      
      return outlookEvent;
      
    } catch (error) {
      if (error.code === 'ErrorItemNotFound') {
        return null;
      }
      
      this.auditLogger.error('OutlookCalendarSync:GetEventError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:GetEvent');
    }
  }
  
  /**
   * Récupère les événements d'un calendrier dans une plage de dates
   * @param calendarId ID du calendrier (optionnel, calendrier par défaut si omis)
   * @param startDate Date de début
   * @param endDate Date de fin
   * @param options Options de requête
   */
  public async getEvents(
    calendarId: string | null,
    startDate: Date,
    endDate: Date,
    options: {
      pageSize?: number;
      orderBy?: string;
      filter?: string;
    } = {}
  ): Promise<OutlookCalendarEvent[]> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:GetEvents', {
        calendarId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        options
      });
      
      // Construction de la requête
      const endpoint = calendarId 
        ? `/me/calendars/${calendarId}/events`
        : '/me/events';
      
      let query = this.graphClient.api(endpoint);
      
      // Filtrage par date
      const dateFilter = `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`;
      let fullFilter = dateFilter;
      
      if (options.filter) {
        fullFilter = `(${dateFilter}) and (${options.filter})`;
      }
      
      query = query.filter(fullFilter);
      
      // Tri et pagination
      if (options.orderBy) {
        query = query.orderby(options.orderBy);
      } else {
        query = query.orderby('start/dateTime');
      }
      
      if (options.pageSize) {
        query = query.top(options.pageSize);
      }
      
      // Exécution de la requête
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await query.get();
      }, 'getEvents');
      
      // Conversion des événements
      const outlookEvents: OutlookCalendarEvent[] = [];
      for (const graphEvent of response.value) {
        const outlookEvent = await this.convertGraphEventToOutlook(graphEvent);
        outlookEvents.push(outlookEvent);
        
        // Mettre en cache
        await this.cacheManager.set(
          `calendar_event:${outlookEvent.id}`,
          outlookEvent,
          OUTLOOK_CONSTANTS.CACHE.EVENT_TTL
        );
      }
      
      this.auditLogger.info('OutlookCalendarSync:GetEventsSuccess', {
        calendarId,
        eventsCount: outlookEvents.length
      });
      
      return outlookEvents;
      
    } catch (error) {
      this.auditLogger.error('OutlookCalendarSync:GetEventsError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:GetEvents');
    }
  }
  
  /**
   * Vérifie la disponibilité libre/occupé d'un utilisateur
   * @param userEmail Email de l'utilisateur
   * @param startDate Date de début
   * @param endDate Date de fin
   * @param timeZone Fuseau horaire
   */
  public async getFreeBusyAvailability(
    userEmail: string,
    startDate: Date,
    endDate: Date,
    timeZone: string = 'UTC'
  ): Promise<CalendarFreeBusyResponse> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:GetFreeBusyAvailability', {
        userEmail,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timeZone
      });
      
      const requestBody = {
        schedules: [userEmail],
        startTime: {
          dateTime: startDate.toISOString(),
          timeZone: timeZone
        },
        endTime: {
          dateTime: endDate.toISOString(),
          timeZone: timeZone
        },
        availabilityViewInterval: 30
      };
      
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api('/me/calendar/getSchedule').post(requestBody);
      }, 'getFreeBusyAvailability');
      
      const freeBusyResponse: CalendarFreeBusyResponse = {
        userEmail,
        startDate,
        endDate,
        timeZone,
        busyTimes: response.value[0]?.busyTimes || [],
        freeBusyStatus: response.value[0]?.freeBusyStatus || [],
        workingHours: response.value[0]?.workingHours
      };
      
      this.auditLogger.info('OutlookCalendarSync:GetFreeBusyAvailabilitySuccess', {
        userEmail,
        busyTimesCount: freeBusyResponse.busyTimes.length
      });
      
      return freeBusyResponse;
      
    } catch (error) {
      this.auditLogger.error('OutlookCalendarSync:GetFreeBusyAvailabilityError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:GetFreeBusyAvailability');
    }
  }
  
  /**
   * Récupère la liste des calendriers de l'utilisateur
   */
  public async getCalendars(): Promise<OutlookCalendar[]> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookCalendarSync:GetCalendars', {
        timestamp: new Date().toISOString()
      });
      
      // Vérifier le cache d'abord
      const cacheKey = 'user_calendars';
      const cachedCalendars = await this.cacheManager.get<OutlookCalendar[]>(cacheKey);
      if (cachedCalendars) {
        this.auditLogger.debug('OutlookCalendarSync:GetCalendars', 'Retrieved from cache');
        return cachedCalendars;
      }
      
      // Récupérer depuis Graph API
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api('/me/calendars').get();
      }, 'getCalendars');
      
      const calendars: OutlookCalendar[] = response.value.map((cal: Calendar) => ({
        id: cal.id!,
        name: cal.name!,
        color: cal.color || 'blue',
        isDefaultCalendar: cal.isDefaultCalendar || false,
        canEdit: cal.canEdit !== false,
        canShare: cal.canShare !== false,
        canViewPrivateItems: cal.canViewPrivateItems !== false,
        owner: cal.owner ? {
          name: cal.owner.name,
          address: cal.owner.address
        } : undefined,
        permissions: cal.permissions || []
      }));
      
      // Mettre en cache
      await this.cacheManager.set(cacheKey, calendars, OUTLOOK_CONSTANTS.CACHE.CALENDARS_TTL);
      
      this.auditLogger.info('OutlookCalendarSync:GetCalendarsSuccess', {
        calendarsCount: calendars.length
      });
      
      return calendars;
      
    } catch (error) {
      this.auditLogger.error('OutlookCalendarSync:GetCalendarsError', error);
      throw this.errorHandler.handleError(error, 'OutlookCalendarSync:GetCalendars');
    }
  }
  
  /**
   * Méthodes utilitaires privées
   */
  
  private async convertGraphEventToOutlook(graphEvent: Event): Promise<OutlookCalendarEvent> {
    return {
      id: graphEvent.id!,
      subject: graphEvent.subject || '',
      body: graphEvent.body ? {
        contentType: graphEvent.body.contentType || 'text',
        content: graphEvent.body.content || ''
      } : { contentType: 'text', content: '' },
      start: {
        dateTime: new Date(graphEvent.start!.dateTime!),
        timeZone: graphEvent.start!.timeZone || 'UTC'
      },
      end: {
        dateTime: new Date(graphEvent.end!.dateTime!),
        timeZone: graphEvent.end!.timeZone || 'UTC'
      },
      isAllDay: graphEvent.isAllDay || false,
      location: graphEvent.location ? {
        displayName: graphEvent.location.displayName || '',
        address: graphEvent.location.address,
        coordinates: graphEvent.location.coordinates
      } : undefined,
      attendees: graphEvent.attendees?.map(att => ({
        name: att.emailAddress?.name || '',
        email: att.emailAddress?.address || '',
        responseStatus: att.status?.response || 'none',
        responseTime: att.status?.time ? new Date(att.status.time) : undefined,
        type: att.type || 'required'
      })) || [],
      organizer: graphEvent.organizer ? {
        name: graphEvent.organizer.emailAddress?.name || '',
        email: graphEvent.organizer.emailAddress?.address || ''
      } : undefined,
      recurrence: this.convertRecurrencePattern(graphEvent.recurrence),
      showAs: graphEvent.showAs || 'busy',
      importance: graphEvent.importance || 'normal',
      sensitivity: graphEvent.sensitivity || 'normal',
      categories: graphEvent.categories || [],
      webLink: graphEvent.webLink,
      createdDateTime: graphEvent.createdDateTime ? new Date(graphEvent.createdDateTime) : new Date(),
      lastModifiedDateTime: graphEvent.lastModifiedDateTime ? new Date(graphEvent.lastModifiedDateTime) : new Date(),
      isCancelled: graphEvent.isCancelled || false,
      isOrganizer: graphEvent.isOrganizer || false,
      responseRequested: graphEvent.responseRequested !== false
    };
  }
  
  private convertRecurrencePattern(graphRecurrence: any): CalendarRecurrencePattern | undefined {
    if (!graphRecurrence) return undefined;
    
    return {
      pattern: {
        type: graphRecurrence.pattern?.type || 'daily',
        interval: graphRecurrence.pattern?.interval || 1,
        daysOfWeek: graphRecurrence.pattern?.daysOfWeek || [],
        dayOfMonth: graphRecurrence.pattern?.dayOfMonth,
        weekIndex: graphRecurrence.pattern?.weekIndex,
        month: graphRecurrence.pattern?.month
      },
      range: {
        type: graphRecurrence.range?.type || 'noEnd',
        startDate: graphRecurrence.range?.startDate ? new Date(graphRecurrence.range.startDate) : new Date(),
        endDate: graphRecurrence.range?.endDate ? new Date(graphRecurrence.range.endDate) : undefined,
        numberOfOccurrences: graphRecurrence.range?.numberOfOccurrences
      }
    };
  }
  
  private validateEventData(eventData: CalendarEventCreate): void {
    if (!eventData.subject || eventData.subject.trim() === '') {
      throw new OutlookError('VALIDATION_ERROR', 'Event subject is required');
    }
    
    if (!eventData.start || !eventData.end) {
      throw new OutlookError('VALIDATION_ERROR', 'Event start and end times are required');
    }
    
    if (eventData.start.dateTime >= eventData.end.dateTime) {
      throw new OutlookError('VALIDATION_ERROR', 'Event start time must be before end time');
    }
  }
  
  private validateEventUpdates(updates: CalendarEventUpdate): void {
    if (updates.start && updates.end && updates.start.dateTime >= updates.end.dateTime) {
      throw new OutlookError('VALIDATION_ERROR', 'Event start time must be before end time');
    }
  }
  
  private async checkEventConflicts(eventData: CalendarEventCreate, excludeEventId?: string): Promise<CalendarConflict[]> {
    // Récupérer les événements existants dans la plage de temps
    const existingEvents = await this.getEvents(
      null,
      eventData.start.dateTime,
      eventData.end.dateTime
    );
    
    // Filtrer l'événement exclu si spécifié
    const relevantEvents = excludeEventId 
      ? existingEvents.filter(e => e.id !== excludeEventId)
      : existingEvents;
    
    const conflicts: CalendarConflict[] = [];
    
    for (const existingEvent of relevantEvents) {
      // Vérifier le chevauchement de temps
      if (this.eventsOverlap(eventData, existingEvent)) {
        conflicts.push({
          type: 'time_overlap',
          existingEvent,
          newEvent: eventData,
          conflictReason: 'Events have overlapping time periods',
          severity: 'high'
        });
      }
    }
    
    return conflicts;
  }
  
  private eventsOverlap(event1: CalendarEventCreate, event2: OutlookCalendarEvent): boolean {
    return event1.start.dateTime < event2.end.dateTime && 
           event1.end.dateTime > event2.start.dateTime;
  }
  
  private async processDeletions(deletions: string[], options: CalendarSyncOptions): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: OutlookError }>;
    errors: OutlookError[];
  }> {
    const successful: string[] = [];
    const failed: Array<{ id: string; error: OutlookError }> = [];
    const errors: OutlookError[] = [];
    
    for (const eventId of deletions) {
      try {
        await this.deleteEvent(eventId);
        successful.push(eventId);
      } catch (error) {
        const outlookError = this.errorHandler.handleError(error, 'OutlookCalendarSync:ProcessDeletion');
        failed.push({ id: eventId, error: outlookError });
        errors.push(outlookError);
      }
    }
    
    return { successful, failed, errors };
  }
  
  private async loadLastSyncTimestamp(): Promise<Date | null> {
    try {
      const timestamp = await this.cacheManager.get<string>('calendar_sync_last_timestamp');
      return timestamp ? new Date(timestamp) : null;
    } catch {
      return null;
    }
  }
  
  private async updateLastSyncTimestamp(timestamp: Date): Promise<void> {
    this.lastSyncTimestamp = timestamp;
    await this.cacheManager.set('calendar_sync_last_timestamp', timestamp.toISOString());
  }
  
  private async loadDeltaToken(): Promise<string | null> {
    try {
      return await this.cacheManager.get<string>('calendar_sync_delta_token');
    } catch {
      return null;
    }
  }
  
  private async saveDeltaToken(token: string): Promise<void> {
    await this.cacheManager.set('calendar_sync_delta_token', token);
  }
  
  private initializeSyncMetrics(): CalendarSyncMetrics {
    return {
      lastSyncStart: null,
      lastSyncEnd: null,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      eventsCreateFailed: 0,
      eventsUpdateFailed: 0,
      eventsDeleteFailed: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      syncDuration: 0,
      errorCount: 0
    };
  }
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OutlookError(
        'SERVICE_NOT_INITIALIZED',
        'OutlookCalendarSync must be initialized before use'
      );
    }
  }
  
  /**
   * Getters pour accès aux propriétés
   */
  
  public get syncStatus(): CalendarSyncStatus {
    return {
      isInitialized: this.isInitialized,
      syncInProgress: this.syncInProgress,
      lastSyncTimestamp: this.lastSyncTimestamp,
      metrics: this.syncMetrics
    };
  }
  
  public getSyncMetrics(): CalendarSyncMetrics {
    return { ...this.syncMetrics };
  }
}

export default OutlookCalendarSync;