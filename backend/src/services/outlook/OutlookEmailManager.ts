/**
 * OutlookEmailManager.ts - Gestionnaire d'emails Outlook avancé
 * Templates, pièces jointes, tracking, filtres, et gestion automatisée
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { Message, MailFolder, Attachment } from '@microsoft/microsoft-graph-types';
import { GraphAPIClient } from './utils/GraphAPIClient';
import { BatchProcessor } from './utils/BatchProcessor';
import { AuditLogger } from './security/AuditLogger';
import { CacheManager } from './utils/CacheManager';
import { RetryMechanism } from './utils/RetryMechanism';
import { EncryptionService } from './security/EncryptionService';
import { 
  OutlookEmail,
  OutlookEmailTemplate,
  OutlookEmailAttachment,
  OutlookMailFolder,
  EmailSendOptions,
  EmailSearchOptions,
  EmailFilterOptions,
  EmailTrackingInfo,
  EmailTemplate,
  EmailBulkOperation,
  EmailAnalytics,
  EmailAutoResponder,
  EmailSignature,
  EmailMetrics,
  OutlookError
} from './config/outlook.types';
import { OUTLOOK_CONSTANTS } from './config/outlook.constants';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';

/**
 * Gestionnaire d'emails Outlook avec fonctionnalités avancées
 * Templates, tracking, filtres automatiques, et analytics
 */
export class OutlookEmailManager {
  private graphClient: GraphAPIClient;
  private batchProcessor: BatchProcessor;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;
  private retryMechanism: RetryMechanism;
  private encryptionService: EncryptionService;
  private errorHandler: OutlookErrorHandler;
  
  private isInitialized: boolean = false;
  private emailMetrics: EmailMetrics;
  private templateCache: Map<string, OutlookEmailTemplate> = new Map();
  private autoResponders: Map<string, EmailAutoResponder> = new Map();
  
  constructor(
    graphClient: GraphAPIClient,
    options: {
      auditLogger: AuditLogger;
      cacheManager: CacheManager;
      retryMechanism: RetryMechanism;
      encryptionService: EncryptionService;
      errorHandler: OutlookErrorHandler;
    }
  ) {
    this.graphClient = graphClient;
    this.auditLogger = options.auditLogger;
    this.cacheManager = options.cacheManager;
    this.retryMechanism = options.retryMechanism;
    this.encryptionService = options.encryptionService;
    this.errorHandler = options.errorHandler;
    
    this.batchProcessor = new BatchProcessor({
      graphClient: this.graphClient,
      retryMechanism: this.retryMechanism,
      auditLogger: this.auditLogger
    });
    
    this.emailMetrics = this.initializeEmailMetrics();
  }
  
  /**
   * Initialise le gestionnaire d'emails
   */
  public async initialize(): Promise<void> {
    try {
      this.auditLogger.info('OutlookEmailManager:Initialize', {
        timestamp: new Date().toISOString()
      });
      
      // Charger les templates d'email
      await this.loadEmailTemplates();
      
      // Charger les répondeurs automatiques
      await this.loadAutoResponders();
      
      // Initialiser les signatures
      await this.loadEmailSignatures();
      
      this.isInitialized = true;
      
      this.auditLogger.info('OutlookEmailManager:InitializeSuccess', {
        templatesCount: this.templateCache.size,
        autoRespondersCount: this.autoResponders.size
      });
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:InitializeError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:Initialize');
    }
  }
  
  /**
   * Envoie un email simple
   * @param to Destinataires
   * @param subject Sujet
   * @param body Corps du message
   * @param options Options d'envoi
   */
  public async sendEmail(
    to: string | string[],
    subject: string,
    body: string,
    options: EmailSendOptions = {}
  ): Promise<OutlookEmail> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:SendEmail', {
        to: Array.isArray(to) ? to : [to],
        subject,
        hasAttachments: !!(options.attachments && options.attachments.length > 0)
      });
      
      // Préparation des destinataires
      const toRecipients = (Array.isArray(to) ? to : [to]).map(email => ({
        emailAddress: { address: email }
      }));
      
      const ccRecipients = options.cc?.map(email => ({
        emailAddress: { address: email }
      })) || [];
      
      const bccRecipients = options.bcc?.map(email => ({
        emailAddress: { address: email }
      })) || [];
      
      // Construction du message
      let messageBody = body;
      if (options.useTemplate && options.templateId) {
        const template = await this.getEmailTemplate(options.templateId);
        messageBody = await this.processTemplate(template, options.templateData || {});
      }
      
      // Ajout de la signature si demandée
      if (options.includeSignature !== false) {
        const signature = await this.getEmailSignature(options.signatureId);
        if (signature) {
          messageBody += `\n\n${signature.content}`;
        }
      }
      
      const message = {
        subject,
        body: {
          contentType: options.isHtml ? 'html' : 'text',
          content: messageBody
        },
        toRecipients,
        ccRecipients,
        bccRecipients,
        importance: options.importance || 'normal',
        isDeliveryReceiptRequested: options.requestDeliveryReceipt || false,
        isReadReceiptRequested: options.requestReadReceipt || false,
        flag: options.flag ? {
          flagStatus: 'flagged',
          startDateTime: options.flag.startDateTime,
          dueDateTime: options.flag.dueDateTime
        } : undefined
      };
      
      // Gestion des pièces jointes
      let sentMessage: Message;
      if (options.attachments && options.attachments.length > 0) {
        sentMessage = await this.sendEmailWithAttachments(message, options.attachments);
      } else {
        // Envoi direct
        sentMessage = await this.retryMechanism.executeWithRetry(async () => {
          return await this.graphClient.api('/me/sendMail').post({
            message,
            saveToSentItems: options.saveToSentItems !== false
          });
        }, 'sendEmail');
      }
      
      // Tracking de l'email si demandé
      let trackingInfo: EmailTrackingInfo | undefined;
      if (options.enableTracking) {
        trackingInfo = await this.setupEmailTracking(sentMessage.id!, options.trackingOptions);
      }
      
      const outlookEmail = await this.convertGraphMessageToOutlook(sentMessage, trackingInfo);
      
      // Mise à jour des métriques
      this.emailMetrics.emailsSent++;
      if (options.attachments) {
        this.emailMetrics.attachmentsSent += options.attachments.length;
      }
      
      this.auditLogger.info('OutlookEmailManager:SendEmailSuccess', {
        messageId: outlookEmail.id,
        subject,
        recipientsCount: toRecipients.length + ccRecipients.length + bccRecipients.length
      });
      
      return outlookEmail;
      
    } catch (error) {
      this.emailMetrics.emailsSendFailed++;
      this.auditLogger.error('OutlookEmailManager:SendEmailError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:SendEmail');
    }
  }
  
  /**
   * Envoie un email à partir d'un template
   * @param templateId ID du template
   * @param to Destinataires
   * @param templateData Données pour le template
   * @param options Options d'envoi
   */
  public async sendEmailFromTemplate(
    templateId: string,
    to: string | string[],
    templateData: Record<string, any> = {},
    options: EmailSendOptions = {}
  ): Promise<OutlookEmail> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:SendEmailFromTemplate', {
        templateId,
        to: Array.isArray(to) ? to : [to]
      });
      
      const template = await this.getEmailTemplate(templateId);
      if (!template) {
        throw new OutlookError(
          'TEMPLATE_NOT_FOUND',
          `Email template with ID ${templateId} not found`,
          { templateId }
        );
      }
      
      // Traitement du template
      const processedSubject = await this.processTemplate(template.subject, templateData);
      const processedBody = await this.processTemplate(template.body, templateData);
      
      // Fusion des options avec les options du template
      const mergedOptions: EmailSendOptions = {
        ...template.defaultOptions,
        ...options,
        useTemplate: false, // Éviter la double application
        isHtml: template.isHtml,
        templateId,
        templateData
      };
      
      return await this.sendEmail(to, processedSubject, processedBody, mergedOptions);
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:SendEmailFromTemplateError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:SendEmailFromTemplate');
    }
  }
  
  /**
   * Envoie d'emails en lot
   * @param emails Tableau d'emails à envoyer
   * @param options Options d'envoi en lot
   */
  public async sendBulkEmails(
    emails: Array<{
      to: string | string[];
      subject: string;
      body: string;
      templateId?: string;
      templateData?: Record<string, any>;
      options?: EmailSendOptions;
    }>,
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      stopOnError?: boolean;
    } = {}
  ): Promise<{
    successful: OutlookEmail[];
    failed: Array<{ email: any; error: OutlookError }>;
    summary: {
      total: number;
      sent: number;
      failed: number;
      duration: number;
    };
  }> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    const successful: OutlookEmail[] = [];
    const failed: Array<{ email: any; error: OutlookError }> = [];
    
    try {
      this.auditLogger.info('OutlookEmailManager:SendBulkEmails', {
        emailsCount: emails.length,
        batchSize: options.batchSize || OUTLOOK_CONSTANTS.EMAIL.DEFAULT_BATCH_SIZE
      });
      
      const batchSize = options.batchSize || OUTLOOK_CONSTANTS.EMAIL.DEFAULT_BATCH_SIZE;
      const batches = this.chunkArray(emails, batchSize);
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        this.auditLogger.debug('OutlookEmailManager:SendBulkEmails', {
          batchNumber: i + 1,
          batchSize: batch.length
        });
        
        // Traitement parallèle du lot
        const batchPromises = batch.map(async (email) => {
          try {
            let sentEmail: OutlookEmail;
            
            if (email.templateId) {
              sentEmail = await this.sendEmailFromTemplate(
                email.templateId,
                email.to,
                email.templateData || {},
                email.options || {}
              );
            } else {
              sentEmail = await this.sendEmail(
                email.to,
                email.subject,
                email.body,
                email.options || {}
              );
            }
            
            successful.push(sentEmail);
            
          } catch (error) {
            const outlookError = this.errorHandler.handleError(error, 'OutlookEmailManager:SendBulkEmails:BatchItem');
            failed.push({ email, error: outlookError });
            
            if (options.stopOnError) {
              throw outlookError;
            }
          }
        });
        
        await Promise.allSettled(batchPromises);
        
        // Délai entre les lots pour éviter le rate limiting
        if (i < batches.length - 1 && options.delayBetweenBatches) {
          await this.delay(options.delayBetweenBatches);
        }
      }
      
      const duration = Date.now() - startTime;
      const summary = {
        total: emails.length,
        sent: successful.length,
        failed: failed.length,
        duration
      };
      
      this.auditLogger.info('OutlookEmailManager:SendBulkEmailsSuccess', summary);
      
      return { successful, failed, summary };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.auditLogger.error('OutlookEmailManager:SendBulkEmailsError', error);
      
      return {
        successful,
        failed,
        summary: {
          total: emails.length,
          sent: successful.length,
          failed: failed.length,
          duration
        }
      };
    }
  }
  
  /**
   * Récupère les emails avec filtrage et pagination
   * @param folderId ID du dossier (optionnel)
   * @param options Options de recherche et filtrage
   */
  public async getEmails(
    folderId?: string,
    options: EmailSearchOptions = {}
  ): Promise<{
    emails: OutlookEmail[];
    totalCount?: number;
    hasMore: boolean;
    nextToken?: string;
  }> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:GetEmails', {
        folderId,
        options
      });
      
      // Construction de l'endpoint
      const endpoint = folderId 
        ? `/me/mailFolders/${folderId}/messages`
        : '/me/messages';
      
      let query = this.graphClient.api(endpoint);
      
      // Filtres
      if (options.filter) {
        query = query.filter(options.filter);
      }
      
      // Recherche textuelle
      if (options.search) {
        query = query.search(`"${options.search}"`);
      }
      
      // Tri
      if (options.orderBy) {
        query = query.orderby(options.orderBy);
      } else {
        query = query.orderby('receivedDateTime desc');
      }
      
      // Pagination
      if (options.pageSize) {
        query = query.top(options.pageSize);
      }
      
      if (options.skipToken) {
        query = query.skipToken(options.skipToken);
      }
      
      // Expansion des propriétés
      if (options.expand) {
        query = query.expand(options.expand.join(','));
      }
      
      // Exécution de la requête
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await query.get();
      }, 'getEmails');
      
      // Conversion des emails
      const outlookEmails: OutlookEmail[] = [];
      for (const graphMessage of response.value) {
        const outlookEmail = await this.convertGraphMessageToOutlook(graphMessage);
        outlookEmails.push(outlookEmail);
        
        // Mise en cache
        await this.cacheManager.set(
          `email:${outlookEmail.id}`,
          outlookEmail,
          OUTLOOK_CONSTANTS.CACHE.EMAIL_TTL
        );
      }
      
      // Informations de pagination
      const hasMore = !!response['@odata.nextLink'];
      const nextToken = this.extractSkipToken(response['@odata.nextLink']);
      
      this.auditLogger.info('OutlookEmailManager:GetEmailsSuccess', {
        emailsCount: outlookEmails.length,
        hasMore,
        folderId
      });
      
      return {
        emails: outlookEmails,
        totalCount: response['@odata.count'],
        hasMore,
        nextToken
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:GetEmailsError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:GetEmails');
    }
  }
  
  /**
   * Récupère un email spécifique avec ses pièces jointes
   * @param messageId ID du message
   * @param includeAttachments Inclure les pièces jointes
   */
  public async getEmail(messageId: string, includeAttachments: boolean = false): Promise<OutlookEmail | null> {
    this.ensureInitialized();
    
    try {
      // Vérifier le cache d'abord
      const cacheKey = `email:${messageId}`;
      const cachedEmail = await this.cacheManager.get<OutlookEmail>(cacheKey);
      if (cachedEmail && (!includeAttachments || cachedEmail.attachments)) {
        this.auditLogger.debug('OutlookEmailManager:GetEmail', 'Retrieved from cache');
        return cachedEmail;
      }
      
      // Récupérer depuis Graph API
      let query = this.graphClient.api(`/me/messages/${messageId}`);
      
      if (includeAttachments) {
        query = query.expand('attachments');
      }
      
      const graphMessage = await this.retryMechanism.executeWithRetry(async () => {
        return await query.get();
      }, 'getEmail');
      
      const outlookEmail = await this.convertGraphMessageToOutlook(graphMessage);
      
      // Traitement des pièces jointes si demandées
      if (includeAttachments && graphMessage.attachments) {
        outlookEmail.attachments = await this.processAttachments(graphMessage.attachments);
      }
      
      // Mise en cache
      await this.cacheManager.set(cacheKey, outlookEmail, OUTLOOK_CONSTANTS.CACHE.EMAIL_TTL);
      
      return outlookEmail;
      
    } catch (error) {
      if (error.code === 'ErrorItemNotFound') {
        return null;
      }
      
      this.auditLogger.error('OutlookEmailManager:GetEmailError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:GetEmail');
    }
  }
  
  /**
   * Marque un email comme lu/non-lu
   * @param messageId ID du message
   * @param isRead État de lecture
   */
  public async markAsRead(messageId: string, isRead: boolean = true): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:MarkAsRead', { messageId, isRead });
      
      await this.retryMechanism.executeWithRetry(async () => {
        await this.graphClient.api(`/me/messages/${messageId}`).patch({ isRead });
      }, 'markAsRead');
      
      // Mise à jour du cache
      const cachedEmail = await this.cacheManager.get<OutlookEmail>(`email:${messageId}`);
      if (cachedEmail) {
        cachedEmail.isRead = isRead;
        await this.cacheManager.set(`email:${messageId}`, cachedEmail, OUTLOOK_CONSTANTS.CACHE.EMAIL_TTL);
      }
      
      this.auditLogger.info('OutlookEmailManager:MarkAsReadSuccess', { messageId, isRead });
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:MarkAsReadError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:MarkAsRead');
    }
  }
  
  /**
   * Supprime un email
   * @param messageId ID du message
   * @param permanent Suppression définitive (sinon déplacé vers corbeille)
   */
  public async deleteEmail(messageId: string, permanent: boolean = false): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:DeleteEmail', { messageId, permanent });
      
      if (permanent) {
        // Suppression définitive
        await this.retryMechanism.executeWithRetry(async () => {
          await this.graphClient.api(`/me/messages/${messageId}`).delete();
        }, 'deleteEmail');
      } else {
        // Déplacement vers la corbeille
        await this.retryMechanism.executeWithRetry(async () => {
          await this.graphClient.api(`/me/messages/${messageId}/move`).post({
            destinationId: 'deleteditems'
          });
        }, 'moveToDeletedItems');
      }
      
      // Suppression du cache
      await this.cacheManager.delete(`email:${messageId}`);
      
      this.emailMetrics.emailsDeleted++;
      
      this.auditLogger.info('OutlookEmailManager:DeleteEmailSuccess', { messageId, permanent });
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:DeleteEmailError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:DeleteEmail');
    }
  }
  
  /**
   * Déplace un email vers un dossier
   * @param messageId ID du message
   * @param folderId ID du dossier de destination
   */
  public async moveEmail(messageId: string, folderId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:MoveEmail', { messageId, folderId });
      
      await this.retryMechanism.executeWithRetry(async () => {
        await this.graphClient.api(`/me/messages/${messageId}/move`).post({
          destinationId: folderId
        });
      }, 'moveEmail');
      
      // Mise à jour du cache
      const cachedEmail = await this.cacheManager.get<OutlookEmail>(`email:${messageId}`);
      if (cachedEmail) {
        cachedEmail.parentFolderId = folderId;
        await this.cacheManager.set(`email:${messageId}`, cachedEmail, OUTLOOK_CONSTANTS.CACHE.EMAIL_TTL);
      }
      
      this.auditLogger.info('OutlookEmailManager:MoveEmailSuccess', { messageId, folderId });
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:MoveEmailError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:MoveEmail');
    }
  }
  
  /**
   * Répond à un email
   * @param messageId ID du message original
   * @param replyBody Corps de la réponse
   * @param options Options de réponse
   */
  public async replyToEmail(
    messageId: string,
    replyBody: string,
    options: {
      replyAll?: boolean;
      includeSignature?: boolean;
      signatureId?: string;
      isHtml?: boolean;
    } = {}
  ): Promise<OutlookEmail> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:ReplyToEmail', {
        messageId,
        replyAll: options.replyAll || false
      });
      
      // Préparation du corps de réponse
      let finalReplyBody = replyBody;
      
      // Ajout de la signature si demandée
      if (options.includeSignature !== false) {
        const signature = await this.getEmailSignature(options.signatureId);
        if (signature) {
          finalReplyBody += `\n\n${signature.content}`;
        }
      }
      
      const replyData = {
        comment: finalReplyBody
      };
      
      // Choisir entre réponse simple ou répondre à tous
      const endpoint = options.replyAll 
        ? `/me/messages/${messageId}/replyAll`
        : `/me/messages/${messageId}/reply`;
      
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(endpoint).post(replyData);
      }, 'replyToEmail');
      
      const sentReply = await this.convertGraphMessageToOutlook(response);
      
      this.emailMetrics.emailsReplied++;
      
      this.auditLogger.info('OutlookEmailManager:ReplyToEmailSuccess', {
        originalMessageId: messageId,
        replyMessageId: sentReply.id
      });
      
      return sentReply;
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:ReplyToEmailError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:ReplyToEmail');
    }
  }
  
  /**
   * Récupère les dossiers de messagerie
   */
  public async getMailFolders(): Promise<OutlookMailFolder[]> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:GetMailFolders');
      
      // Vérifier le cache d'abord
      const cacheKey = 'mail_folders';
      const cachedFolders = await this.cacheManager.get<OutlookMailFolder[]>(cacheKey);
      if (cachedFolders) {
        this.auditLogger.debug('OutlookEmailManager:GetMailFolders', 'Retrieved from cache');
        return cachedFolders;
      }
      
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api('/me/mailFolders').get();
      }, 'getMailFolders');
      
      const folders: OutlookMailFolder[] = response.value.map((folder: MailFolder) => ({
        id: folder.id!,
        displayName: folder.displayName!,
        parentFolderId: folder.parentFolderId,
        childFolderCount: folder.childFolderCount || 0,
        unreadItemCount: folder.unreadItemCount || 0,
        totalItemCount: folder.totalItemCount || 0,
        isHidden: folder.isHidden || false,
        wellKnownName: folder.wellKnownName
      }));
      
      // Mise en cache
      await this.cacheManager.set(cacheKey, folders, OUTLOOK_CONSTANTS.CACHE.FOLDERS_TTL);
      
      this.auditLogger.info('OutlookEmailManager:GetMailFoldersSuccess', {
        foldersCount: folders.length
      });
      
      return folders;
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:GetMailFoldersError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:GetMailFolders');
    }
  }
  
  /**
   * Télécharge une pièce jointe
   * @param messageId ID du message
   * @param attachmentId ID de la pièce jointe
   */
  public async downloadAttachment(messageId: string, attachmentId: string): Promise<{
    name: string;
    contentType: string;
    size: number;
    content: Buffer;
  }> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:DownloadAttachment', {
        messageId,
        attachmentId
      });
      
      const attachment = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/messages/${messageId}/attachments/${attachmentId}`).get();
      }, 'downloadAttachment');
      
      // Décodage du contenu base64
      const content = Buffer.from(attachment.contentBytes, 'base64');
      
      this.auditLogger.info('OutlookEmailManager:DownloadAttachmentSuccess', {
        messageId,
        attachmentId,
        fileName: attachment.name,
        size: attachment.size
      });
      
      return {
        name: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size,
        content
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:DownloadAttachmentError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:DownloadAttachment');
    }
  }
  
  /**
   * Gère les templates d'email
   */
  public async createEmailTemplate(template: EmailTemplate): Promise<OutlookEmailTemplate> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookEmailManager:CreateEmailTemplate', {
        templateId: template.id,
        name: template.name
      });
      
      // Validation du template
      this.validateEmailTemplate(template);
      
      const outlookTemplate: OutlookEmailTemplate = {
        ...template,
        createdDate: new Date(),
        lastModified: new Date(),
        version: 1
      };
      
      // Stockage en cache et base de données
      this.templateCache.set(template.id, outlookTemplate);
      await this.cacheManager.set(
        `email_template:${template.id}`,
        outlookTemplate,
        OUTLOOK_CONSTANTS.CACHE.TEMPLATE_TTL
      );
      
      this.auditLogger.info('OutlookEmailManager:CreateEmailTemplateSuccess', {
        templateId: template.id
      });
      
      return outlookTemplate;
      
    } catch (error) {
      this.auditLogger.error('OutlookEmailManager:CreateEmailTemplateError', error);
      throw this.errorHandler.handleError(error, 'OutlookEmailManager:CreateEmailTemplate');
    }
  }
  
  /**
   * Met à jour les métriques d'email
   */
  public getEmailMetrics(): EmailMetrics {
    return { ...this.emailMetrics };
  }
  
  /**
   * Méthodes utilitaires privées
   */
  
  private async sendEmailWithAttachments(message: any, attachments: OutlookEmailAttachment[]): Promise<Message> {
    // Créer un brouillon
    const draft = await this.graphClient.api('/me/messages').post(message);
    
    // Ajouter les pièces jointes
    for (const attachment of attachments) {
      const attachmentData = {
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: attachment.name,
        contentBytes: attachment.content,
        contentType: attachment.contentType
      };
      
      await this.graphClient.api(`/me/messages/${draft.id}/attachments`).post(attachmentData);
    }
    
    // Envoyer le message
    await this.graphClient.api(`/me/messages/${draft.id}/send`).post({});
    
    return draft;
  }
  
  private async convertGraphMessageToOutlook(
    graphMessage: Message,
    trackingInfo?: EmailTrackingInfo
  ): Promise<OutlookEmail> {
    return {
      id: graphMessage.id!,
      subject: graphMessage.subject || '',
      body: {
        contentType: graphMessage.body?.contentType || 'text',
        content: graphMessage.body?.content || ''
      },
      from: {
        name: graphMessage.from?.emailAddress?.name || '',
        email: graphMessage.from?.emailAddress?.address || ''
      },
      to: graphMessage.toRecipients?.map(recipient => ({
        name: recipient.emailAddress?.name || '',
        email: recipient.emailAddress?.address || ''
      })) || [],
      cc: graphMessage.ccRecipients?.map(recipient => ({
        name: recipient.emailAddress?.name || '',
        email: recipient.emailAddress?.address || ''
      })) || [],
      bcc: graphMessage.bccRecipients?.map(recipient => ({
        name: recipient.emailAddress?.name || '',
        email: recipient.emailAddress?.address || ''
      })) || [],
      receivedDateTime: graphMessage.receivedDateTime ? new Date(graphMessage.receivedDateTime) : new Date(),
      sentDateTime: graphMessage.sentDateTime ? new Date(graphMessage.sentDateTime) : undefined,
      isRead: graphMessage.isRead || false,
      isDraft: graphMessage.isDraft || false,
      hasAttachments: graphMessage.hasAttachments || false,
      importance: graphMessage.importance || 'normal',
      flag: graphMessage.flag ? {
        flagStatus: graphMessage.flag.flagStatus || 'notFlagged',
        startDateTime: graphMessage.flag.startDateTime ? new Date(graphMessage.flag.startDateTime) : undefined,
        dueDateTime: graphMessage.flag.dueDateTime ? new Date(graphMessage.flag.dueDateTime) : undefined
      } : undefined,
      categories: graphMessage.categories || [],
      conversationId: graphMessage.conversationId,
      parentFolderId: graphMessage.parentFolderId,
      webLink: graphMessage.webLink,
      trackingInfo,
      attachments: graphMessage.attachments ? await this.processAttachments(graphMessage.attachments) : undefined
    };
  }
  
  private async processAttachments(graphAttachments: any[]): Promise<OutlookEmailAttachment[]> {
    return graphAttachments.map(att => ({
      id: att.id,
      name: att.name,
      contentType: att.contentType,
      size: att.size,
      isInline: att.isInline || false,
      content: att.contentBytes ? Buffer.from(att.contentBytes, 'base64') : undefined
    }));
  }
  
  private async processTemplate(template: string, data: Record<string, any>): Promise<string> {
    let processed = template;
    
    // Remplacement simple des variables {{variable}}
    for (const [key, value] of Object.entries(data)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    }
    
    // Variables système
    processed = processed.replace(/{{DATE}}/g, new Date().toLocaleDateString());
    processed = processed.replace(/{{TIME}}/g, new Date().toLocaleTimeString());
    processed = processed.replace(/{{DATETIME}}/g, new Date().toLocaleString());
    
    return processed;
  }
  
  private async getEmailTemplate(templateId: string): Promise<OutlookEmailTemplate | null> {
    // Vérifier le cache local d'abord
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId)!;
    }
    
    // Vérifier le cache distribué
    try {
      const cachedTemplate = await this.cacheManager.get<OutlookEmailTemplate>(`email_template:${templateId}`);
      if (cachedTemplate) {
        this.templateCache.set(templateId, cachedTemplate);
        return cachedTemplate;
      }
    } catch {
      // Ignorer les erreurs de cache
    }
    
    return null;
  }
  
  private async getEmailSignature(signatureId?: string): Promise<EmailSignature | null> {
    try {
      const cacheKey = signatureId ? `email_signature:${signatureId}` : 'email_signature:default';
      return await this.cacheManager.get<EmailSignature>(cacheKey);
    } catch {
      return null;
    }
  }
  
  private async setupEmailTracking(messageId: string, options?: any): Promise<EmailTrackingInfo> {
    // Implémentation du tracking d'email
    return {
      messageId,
      trackingId: `track_${messageId}_${Date.now()}`,
      enabled: true,
      readReceipt: options?.readReceipt || false,
      deliveryReceipt: options?.deliveryReceipt || false,
      linkTracking: options?.linkTracking || false,
      pixelTracking: options?.pixelTracking || false
    };
  }
  
  private async loadEmailTemplates(): Promise<void> {
    // Charger les templates depuis le cache ou la base de données
    // Implémentation selon le stockage choisi
  }
  
  private async loadAutoResponders(): Promise<void> {
    // Charger les répondeurs automatiques
    // Implémentation selon les besoins
  }
  
  private async loadEmailSignatures(): Promise<void> {
    // Charger les signatures d'email
    // Implémentation selon les besoins
  }
  
  private validateEmailTemplate(template: EmailTemplate): void {
    if (!template.id || !template.name || !template.subject || !template.body) {
      throw new OutlookError(
        'TEMPLATE_VALIDATION_ERROR',
        'Template must have id, name, subject, and body',
        template
      );
    }
  }
  
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  private extractSkipToken(nextLink?: string): string | undefined {
    if (!nextLink) return undefined;
    const url = new URL(nextLink);
    return url.searchParams.get('$skiptoken') || undefined;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private initializeEmailMetrics(): EmailMetrics {
    return {
      emailsSent: 0,
      emailsReceived: 0,
      emailsRead: 0,
      emailsDeleted: 0,
      emailsReplied: 0,
      emailsForwarded: 0,
      emailsSendFailed: 0,
      attachmentsSent: 0,
      attachmentsReceived: 0,
      templatesUsed: 0,
      autoResponsesSent: 0,
      lastActivity: new Date()
    };
  }
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OutlookError(
        'SERVICE_NOT_INITIALIZED',
        'OutlookEmailManager must be initialized before use'
      );
    }
  }
}

export default OutlookEmailManager;