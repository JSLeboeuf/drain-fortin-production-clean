/**
 * OutlookContactSync.ts - Synchronisation bidirectionnelle des contacts Outlook
 * Gestion des contacts, fusion intelligente, déduplication, et mapping CRM
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import { Contact } from '@microsoft/microsoft-graph-types';
import { GraphAPIClient } from './utils/GraphAPIClient';
import { AuditLogger } from './security/AuditLogger';
import { CacheManager } from './utils/CacheManager';
import { RetryMechanism } from './utils/RetryMechanism';
import { BatchProcessor } from './utils/BatchProcessor';
import { 
  OutlookContact,
  OutlookAddress,
  ContactCreateRequest,
  ContactSyncMetrics,
  OutlookError
} from './config/outlook.types';
import { OUTLOOK_CONSTANTS } from './config/outlook.constants';
import { OutlookErrorHandler } from './utils/OutlookErrorHandler';

/**
 * Service de synchronisation des contacts Outlook avec déduplication intelligente
 * Gère la création, fusion, mapping, et synchronisation bidirectionnelle
 */
export class OutlookContactSync {
  private graphClient: GraphAPIClient;
  private auditLogger: AuditLogger;
  private cacheManager: CacheManager;
  private retryMechanism: RetryMechanism;
  private batchProcessor: BatchProcessor;
  private errorHandler: OutlookErrorHandler;
  
  private isInitialized = false;
  private syncMetrics: ContactSyncMetrics;
  
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
    
    this.batchProcessor = new BatchProcessor({
      graphClient: this.graphClient,
      retryMechanism: this.retryMechanism,
      auditLogger: this.auditLogger
    });
    
    this.syncMetrics = this.initializeSyncMetrics();
  }
  
  /**
   * Initialise le service de synchronisation des contacts
   */
  public async initialize(): Promise<void> {
    try {
      this.auditLogger.info('OutlookContactSync:Initialize');
      
      // Test de connectivité
      await this.graphClient.api('/me/contacts').top(1).get();
      
      this.isInitialized = true;
      
      this.auditLogger.info('OutlookContactSync:InitializeSuccess');
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:InitializeError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:Initialize');
    }
  }
  
  /**
   * Crée un nouveau contact
   * @param contactData Données du contact
   */
  public async createContact(contactData: ContactCreateRequest): Promise<OutlookContact> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:CreateContact', {
        displayName: contactData.displayName,
        companyName: contactData.companyName
      });
      
      // Validation des données
      this.validateContactData(contactData);
      
      // Vérification des doublons
      const existingContacts = await this.findPotentialDuplicates(contactData);
      if (existingContacts.length > 0) {
        this.auditLogger.warn('OutlookContactSync:CreateContact:PotentialDuplicates', {
          displayName: contactData.displayName,
          duplicatesCount: existingContacts.length,
          duplicates: existingContacts.map(c => ({ id: c.id, displayName: c.displayName }))
        });
      }
      
      // Préparation des données pour Graph API
      const graphContact = this.prepareContactForGraph(contactData);
      
      // Création du contact
      const createdContact = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api('/me/contacts').post(graphContact);
      }, 'createContact');
      
      // Conversion au format interne
      const outlookContact = this.convertGraphContactToOutlook(createdContact);
      
      // Mise en cache
      await this.cacheManager.set(
        `contact:${outlookContact.id}`,
        outlookContact,
        OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.CONTACT_TTL
      );
      
      // Indexation pour la recherche rapide
      await this.indexContactForSearch(outlookContact);
      
      this.syncMetrics.contactsCreated++;
      
      this.auditLogger.info('OutlookContactSync:CreateContactSuccess', {
        contactId: outlookContact.id,
        displayName: outlookContact.displayName
      });
      
      return outlookContact;
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:CreateContactError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:CreateContact');
    }
  }
  
  /**
   * Met à jour un contact existant
   * @param contactId ID du contact
   * @param updates Données à mettre à jour
   */
  public async updateContact(
    contactId: string, 
    updates: Partial<ContactCreateRequest>
  ): Promise<OutlookContact> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:UpdateContact', {
        contactId,
        updateFields: Object.keys(updates)
      });
      
      // Récupération du contact existant
      const existingContact = await this.getContact(contactId);
      if (!existingContact) {
        throw new OutlookError('CONTACT_NOT_FOUND', `Contact ${contactId} not found`);
      }
      
      // Validation des mises à jour
      this.validateContactUpdates(updates);
      
      // Préparation des données
      const graphUpdates = this.prepareContactUpdatesForGraph(updates);
      
      // Mise à jour
      const updatedContact = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/contacts/${contactId}`).patch(graphUpdates);
      }, 'updateContact');
      
      // Conversion et mise en cache
      const outlookContact = this.convertGraphContactToOutlook(updatedContact);
      await this.cacheManager.set(
        `contact:${contactId}`,
        outlookContact,
        OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.CONTACT_TTL
      );
      
      // Réindexation pour la recherche
      await this.indexContactForSearch(outlookContact);
      
      this.syncMetrics.contactsUpdated++;
      
      this.auditLogger.info('OutlookContactSync:UpdateContactSuccess', {
        contactId,
        displayName: outlookContact.displayName
      });
      
      return outlookContact;
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:UpdateContactError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:UpdateContact');
    }
  }
  
  /**
   * Supprime un contact
   * @param contactId ID du contact à supprimer
   */
  public async deleteContact(contactId: string): Promise<void> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:DeleteContact', { contactId });
      
      // Suppression du contact
      await this.retryMechanism.executeWithRetry(async () => {
        await this.graphClient.api(`/me/contacts/${contactId}`).delete();
      }, 'deleteContact');
      
      // Suppression du cache
      await this.cacheManager.delete(`contact:${contactId}`);
      
      // Suppression de l'index de recherche
      await this.removeContactFromSearchIndex(contactId);
      
      this.syncMetrics.contactsDeleted++;
      
      this.auditLogger.info('OutlookContactSync:DeleteContactSuccess', { contactId });
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:DeleteContactError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:DeleteContact');
    }
  }
  
  /**
   * Récupère un contact par son ID
   * @param contactId ID du contact
   */
  public async getContact(contactId: string): Promise<OutlookContact | null> {
    this.ensureInitialized();
    
    try {
      // Vérification du cache
      const cached = await this.cacheManager.get<OutlookContact>(`contact:${contactId}`);
      if (cached) {
        return cached;
      }
      
      // Récupération depuis Graph API
      const graphContact = await this.retryMechanism.executeWithRetry(async () => {
        return await this.graphClient.api(`/me/contacts/${contactId}`).get();
      }, 'getContact');
      
      const outlookContact = this.convertGraphContactToOutlook(graphContact);
      
      // Mise en cache
      await this.cacheManager.set(
        `contact:${contactId}`,
        outlookContact,
        OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.CONTACT_TTL
      );
      
      return outlookContact;
      
    } catch (error) {
      if (error.code === 'ErrorItemNotFound') {
        return null;
      }
      
      this.auditLogger.error('OutlookContactSync:GetContactError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:GetContact');
    }
  }
  
  /**
   * Recherche des contacts
   * @param query Requête de recherche
   * @param options Options de recherche
   */
  public async searchContacts(
    query: string,
    options: {
      maxResults?: number;
      fields?: string[];
      sortBy?: string;
      includeDeleted?: boolean;
    } = {}
  ): Promise<OutlookContact[]> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:SearchContacts', {
        query,
        options
      });
      
      // Construction de la requête de recherche
      let graphQuery = this.graphClient.api('/me/contacts');
      
      // Filtrage par recherche textuelle
      if (query) {
        graphQuery = graphQuery.search(`"${query}"`);
      }
      
      // Sélection des champs
      if (options.fields) {
        graphQuery = graphQuery.select(options.fields.join(','));
      }
      
      // Tri
      if (options.sortBy) {
        graphQuery = graphQuery.orderby(options.sortBy);
      } else {
        graphQuery = graphQuery.orderby('displayName');
      }
      
      // Limite de résultats
      if (options.maxResults) {
        graphQuery = graphQuery.top(Math.min(options.maxResults, 1000));
      }
      
      // Exécution de la requête
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await graphQuery.get();
      }, 'searchContacts');
      
      // Conversion des résultats
      const contacts = response.value.map((contact: Contact) => 
        this.convertGraphContactToOutlook(contact)
      );
      
      this.auditLogger.info('OutlookContactSync:SearchContactsSuccess', {
        query,
        resultsCount: contacts.length
      });
      
      return contacts;
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:SearchContactsError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:SearchContacts');
    }
  }
  
  /**
   * Récupère tous les contacts avec pagination
   * @param options Options de récupération
   */
  public async getAllContacts(options: {
    pageSize?: number;
    skipToken?: string;
    includeDeleted?: boolean;
    filter?: string;
  } = {}): Promise<{
    contacts: OutlookContact[];
    hasMore: boolean;
    nextToken?: string;
  }> {
    this.ensureInitialized();
    
    try {
      let query = this.graphClient.api('/me/contacts');
      
      // Tri par nom d'affichage
      query = query.orderby('displayName');
      
      // Pagination
      if (options.pageSize) {
        query = query.top(options.pageSize);
      }
      
      if (options.skipToken) {
        query = query.skipToken(options.skipToken);
      }
      
      // Filtrage
      if (options.filter) {
        query = query.filter(options.filter);
      }
      
      const response = await this.retryMechanism.executeWithRetry(async () => {
        return await query.get();
      }, 'getAllContacts');
      
      const contacts = response.value.map((contact: Contact) => 
        this.convertGraphContactToOutlook(contact)
      );
      
      // Mise en cache des contacts
      for (const contact of contacts) {
        await this.cacheManager.set(
          `contact:${contact.id}`,
          contact,
          OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.CONTACT_TTL
        );
      }
      
      return {
        contacts,
        hasMore: !!response['@odata.nextLink'],
        nextToken: this.extractSkipToken(response['@odata.nextLink'])
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:GetAllContactsError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:GetAllContacts');
    }
  }
  
  /**
   * Détection et fusion de doublons
   * @param mergeStrategy Stratégie de fusion
   */
  public async detectAndMergeDuplicates(
    mergeStrategy: 'manual' | 'automatic' | 'preview' = 'preview'
  ): Promise<{
    duplicateGroups: Array<{
      contacts: OutlookContact[];
      confidence: number;
      suggestedMaster?: OutlookContact;
    }>;
    mergedCount?: number;
    previewOnly: boolean;
  }> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:DetectAndMergeDuplicates', {
        mergeStrategy
      });
      
      // Récupération de tous les contacts
      const allContacts: OutlookContact[] = [];
      let hasMore = true;
      let nextToken: string | undefined;
      
      while (hasMore) {
        const result = await this.getAllContacts({
          pageSize: 200,
          skipToken: nextToken
        });
        
        allContacts.push(...result.contacts);
        hasMore = result.hasMore;
        nextToken = result.nextToken;
      }
      
      // Détection des doublons
      const duplicateGroups = this.findDuplicateGroups(allContacts);
      
      this.auditLogger.info('OutlookContactSync:DuplicatesDetected', {
        totalContacts: allContacts.length,
        duplicateGroups: duplicateGroups.length,
        totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.contacts.length, 0)
      });
      
      let mergedCount = 0;
      
      // Fusion automatique si demandée
      if (mergeStrategy === 'automatic') {
        for (const group of duplicateGroups) {
          if (group.confidence > 0.8) { // Seuil de confiance élevé
            try {
              await this.mergeContactGroup(group);
              mergedCount++;
            } catch (error) {
              this.auditLogger.warn('OutlookContactSync:MergeFailed', error, {
                groupSize: group.contacts.length
              });
            }
          }
        }
      }
      
      return {
        duplicateGroups,
        mergedCount: mergeStrategy === 'automatic' ? mergedCount : undefined,
        previewOnly: mergeStrategy === 'preview'
      };
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:DetectAndMergeDuplicatesError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:DetectAndMergeDuplicates');
    }
  }
  
  /**
   * Fusion manuelle de contacts
   * @param contactIds IDs des contacts à fusionner
   * @param masterContactId ID du contact maître
   */
  public async mergeContacts(
    contactIds: string[],
    masterContactId: string
  ): Promise<OutlookContact> {
    this.ensureInitialized();
    
    try {
      this.auditLogger.info('OutlookContactSync:MergeContacts', {
        contactIds,
        masterContactId,
        contactsToMerge: contactIds.length
      });
      
      if (!contactIds.includes(masterContactId)) {
        throw new OutlookError('INVALID_MERGE', 'Master contact must be included in contacts to merge');
      }
      
      // Récupération de tous les contacts
      const contacts = await Promise.all(
        contactIds.map(id => this.getContact(id))
      );
      
      const validContacts = contacts.filter(c => c !== null) as OutlookContact[];
      if (validContacts.length < 2) {
        throw new OutlookError('INSUFFICIENT_CONTACTS', 'At least 2 contacts are required for merging');
      }
      
      const masterContact = validContacts.find(c => c.id === masterContactId);
      if (!masterContact) {
        throw new OutlookError('MASTER_CONTACT_NOT_FOUND', 'Master contact not found');
      }
      
      // Fusion des données
      const mergedData = this.mergeContactData(validContacts, masterContact);
      
      // Mise à jour du contact maître
      const updatedMaster = await this.updateContact(masterContactId, mergedData);
      
      // Suppression des autres contacts
      const contactsToDelete = contactIds.filter(id => id !== masterContactId);
      for (const contactId of contactsToDelete) {
        try {
          await this.deleteContact(contactId);
        } catch (error) {
          this.auditLogger.warn('OutlookContactSync:DeleteDuringMerge', error, { contactId });
        }
      }
      
      this.syncMetrics.contactsMerged++;
      
      this.auditLogger.info('OutlookContactSync:MergeContactsSuccess', {
        masterContactId,
        mergedCount: contactsToDelete.length,
        finalDisplayName: updatedMaster.displayName
      });
      
      return updatedMaster;
      
    } catch (error) {
      this.auditLogger.error('OutlookContactSync:MergeContactsError', error);
      throw this.errorHandler.handleError(error, 'OutlookContactSync:MergeContacts');
    }
  }
  
  /**
   * Métriques de synchronisation
   */
  public getSyncMetrics(): ContactSyncMetrics {
    return { ...this.syncMetrics };
  }
  
  /**
   * Reset des métriques
   */
  public resetSyncMetrics(): void {
    this.syncMetrics = this.initializeSyncMetrics();
  }
  
  /**
   * Méthodes privées utilitaires
   */
  
  private convertGraphContactToOutlook(contact: Contact): OutlookContact {
    return {
      id: contact.id!,
      displayName: contact.displayName || '',
      givenName: contact.givenName,
      surname: contact.surname,
      middleName: contact.middleName,
      nickname: contact.nickname,
      title: contact.title,
      companyName: contact.companyName,
      department: contact.department,
      jobTitle: contact.jobTitle,
      emailAddresses: contact.emailAddresses?.map(email => ({
        name: email.name,
        address: email.address || '',
        type: this.mapEmailType(email.name)
      })) || [],
      businessPhones: contact.businessPhones || [],
      homePhones: contact.homePhones || [],
      mobilePhone: contact.mobilePhone,
      businessAddress: this.convertGraphAddress(contact.businessAddress),
      homeAddress: this.convertGraphAddress(contact.homeAddress),
      otherAddress: this.convertGraphAddress(contact.otherAddress),
      birthday: contact.birthday ? new Date(contact.birthday) : undefined,
      personalNotes: contact.personalNotes,
      categories: contact.categories || [],
      createdDateTime: contact.createdDateTime ? new Date(contact.createdDateTime) : new Date(),
      lastModifiedDateTime: contact.lastModifiedDateTime ? new Date(contact.lastModifiedDateTime) : new Date(),
      changeKey: contact.changeKey,
      parentFolderId: contact.parentFolderId
    };
  }
  
  private convertGraphAddress(address: any): OutlookAddress | undefined {
    if (!address) return undefined;
    
    return {
      street: address.street,
      city: address.city,
      state: address.state,
      countryOrRegion: address.countryOrRegion,
      postalCode: address.postalCode
    };
  }
  
  private mapEmailType(name?: string): 'work' | 'home' | 'other' {
    if (!name) return 'other';
    
    const lowerName = name.toLowerCase();
    if (lowerName.includes('work') || lowerName.includes('business')) return 'work';
    if (lowerName.includes('home') || lowerName.includes('personal')) return 'home';
    
    return 'other';
  }
  
  private prepareContactForGraph(contact: ContactCreateRequest): any {
    return {
      displayName: contact.displayName,
      givenName: contact.givenName,
      surname: contact.surname,
      companyName: contact.companyName,
      jobTitle: contact.jobTitle,
      emailAddresses: contact.emailAddresses?.map(email => ({
        address: email.address,
        name: email.name || email.type || 'Email'
      })),
      businessPhones: contact.businessPhones,
      mobilePhone: contact.mobilePhone,
      businessAddress: contact.businessAddress,
      personalNotes: contact.personalNotes,
      categories: contact.categories
    };
  }
  
  private prepareContactUpdatesForGraph(updates: Partial<ContactCreateRequest>): any {
    const graphUpdates: any = {};
    
    Object.keys(updates).forEach(key => {
      const value = updates[key as keyof ContactCreateRequest];
      if (value !== undefined) {
        if (key === 'emailAddresses') {
          graphUpdates[key] = (value as any[])?.map(email => ({
            address: email.address,
            name: email.name || email.type || 'Email'
          }));
        } else {
          graphUpdates[key] = value;
        }
      }
    });
    
    return graphUpdates;
  }
  
  private validateContactData(contact: ContactCreateRequest): void {
    if (!contact.displayName || contact.displayName.trim() === '') {
      throw new OutlookError('CONTACT_VALIDATION_ERROR', 'Display name is required');
    }
    
    // Validation des emails
    if (contact.emailAddresses) {
      for (const email of contact.emailAddresses) {
        if (!this.isValidEmail(email.address)) {
          throw new OutlookError('CONTACT_VALIDATION_ERROR', `Invalid email address: ${email.address}`);
        }
      }
    }
    
    // Validation des téléphones
    if (contact.businessPhones) {
      for (const phone of contact.businessPhones) {
        if (!this.isValidPhoneNumber(phone)) {
          throw new OutlookError('CONTACT_VALIDATION_ERROR', `Invalid phone number: ${phone}`);
        }
      }
    }
  }
  
  private validateContactUpdates(updates: Partial<ContactCreateRequest>): void {
    if (updates.displayName !== undefined && updates.displayName.trim() === '') {
      throw new OutlookError('CONTACT_VALIDATION_ERROR', 'Display name cannot be empty');
    }
    
    if (updates.emailAddresses) {
      for (const email of updates.emailAddresses) {
        if (!this.isValidEmail(email.address)) {
          throw new OutlookError('CONTACT_VALIDATION_ERROR', `Invalid email address: ${email.address}`);
        }
      }
    }
  }
  
  private isValidEmail(email: string): boolean {
    return OUTLOOK_CONSTANTS.PATTERNS.EMAIL.test(email);
  }
  
  private isValidPhoneNumber(phone: string): boolean {
    return OUTLOOK_CONSTANTS.PATTERNS.PHONE_NORTH_AMERICA.test(phone) ||
           OUTLOOK_CONSTANTS.PATTERNS.PHONE_INTERNATIONAL.test(phone);
  }
  
  private async findPotentialDuplicates(contact: ContactCreateRequest): Promise<OutlookContact[]> {
    const duplicates: OutlookContact[] = [];
    
    // Recherche par nom
    if (contact.displayName) {
      const nameMatches = await this.searchContacts(contact.displayName, { maxResults: 10 });
      duplicates.push(...nameMatches);
    }
    
    // Recherche par email
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      for (const email of contact.emailAddresses) {
        const emailMatches = await this.searchContacts(email.address, { maxResults: 5 });
        duplicates.push(...emailMatches);
      }
    }
    
    // Déduplication et filtrage
    const uniqueDuplicates = duplicates.filter((contact, index, self) => 
      index === self.findIndex(c => c.id === contact.id)
    );
    
    return uniqueDuplicates;
  }
  
  private findDuplicateGroups(contacts: OutlookContact[]): Array<{
    contacts: OutlookContact[];
    confidence: number;
    suggestedMaster?: OutlookContact;
  }> {
    const groups: Array<{ contacts: OutlookContact[]; confidence: number }> = [];
    const processed = new Set<string>();
    
    for (let i = 0; i < contacts.length; i++) {
      if (processed.has(contacts[i].id)) continue;
      
      const group = [contacts[i]];
      processed.add(contacts[i].id);
      
      for (let j = i + 1; j < contacts.length; j++) {
        if (processed.has(contacts[j].id)) continue;
        
        const similarity = this.calculateContactSimilarity(contacts[i], contacts[j]);
        if (similarity > 0.7) { // Seuil de similarité
          group.push(contacts[j]);
          processed.add(contacts[j].id);
        }
      }
      
      if (group.length > 1) {
        const confidence = this.calculateGroupConfidence(group);
        const suggestedMaster = this.selectMasterContact(group);
        
        groups.push({
          contacts: group,
          confidence,
          suggestedMaster
        });
      }
    }
    
    return groups;
  }
  
  private calculateContactSimilarity(contact1: OutlookContact, contact2: OutlookContact): number {
    let similarity = 0;
    let factors = 0;
    
    // Similarité du nom
    if (contact1.displayName && contact2.displayName) {
      similarity += this.stringSimilarity(contact1.displayName, contact2.displayName) * 0.4;
      factors += 0.4;
    }
    
    // Similarité des emails
    const emailSimilarity = this.calculateEmailSimilarity(
      contact1.emailAddresses,
      contact2.emailAddresses
    );
    if (emailSimilarity > 0) {
      similarity += emailSimilarity * 0.3;
      factors += 0.3;
    }
    
    // Similarité de l'entreprise
    if (contact1.companyName && contact2.companyName) {
      similarity += this.stringSimilarity(contact1.companyName, contact2.companyName) * 0.2;
      factors += 0.2;
    }
    
    // Similarité du téléphone
    const phoneSimilarity = this.calculatePhoneSimilarity(
      [...contact1.businessPhones, contact1.mobilePhone].filter(Boolean),
      [...contact2.businessPhones, contact2.mobilePhone].filter(Boolean)
    );
    if (phoneSimilarity > 0) {
      similarity += phoneSimilarity * 0.1;
      factors += 0.1;
    }
    
    return factors > 0 ? similarity / factors : 0;
  }
  
  private stringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private calculateEmailSimilarity(emails1: any[], emails2: any[]): number {
    if (!emails1 || !emails2 || emails1.length === 0 || emails2.length === 0) {
      return 0;
    }
    
    const addresses1 = emails1.map(e => e.address.toLowerCase());
    const addresses2 = emails2.map(e => e.address.toLowerCase());
    
    const commonEmails = addresses1.filter(email => addresses2.includes(email));
    
    return commonEmails.length > 0 ? 1 : 0;
  }
  
  private calculatePhoneSimilarity(phones1: string[], phones2: string[]): number {
    if (!phones1 || !phones2 || phones1.length === 0 || phones2.length === 0) {
      return 0;
    }
    
    const normalized1 = phones1.map(phone => phone.replace(/\D/g, ''));
    const normalized2 = phones2.map(phone => phone.replace(/\D/g, ''));
    
    const commonPhones = normalized1.filter(phone => normalized2.includes(phone));
    
    return commonPhones.length > 0 ? 1 : 0;
  }
  
  private calculateGroupConfidence(group: OutlookContact[]): number {
    if (group.length < 2) return 0;
    
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalSimilarity += this.calculateContactSimilarity(group[i], group[j]);
        comparisons++;
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }
  
  private selectMasterContact(group: OutlookContact[]): OutlookContact {
    // Préférer le contact le plus récent ou le plus complet
    return group.reduce((master, contact) => {
      // Calculer un score de complétude
      const masterScore = this.calculateCompletenessScore(master);
      const contactScore = this.calculateCompletenessScore(contact);
      
      if (contactScore > masterScore) return contact;
      if (contactScore === masterScore && contact.lastModifiedDateTime > master.lastModifiedDateTime) {
        return contact;
      }
      
      return master;
    });
  }
  
  private calculateCompletenessScore(contact: OutlookContact): number {
    let score = 0;
    
    if (contact.displayName) score += 2;
    if (contact.givenName) score += 1;
    if (contact.surname) score += 1;
    if (contact.companyName) score += 1;
    if (contact.jobTitle) score += 1;
    if (contact.emailAddresses.length > 0) score += 3;
    if (contact.businessPhones.length > 0) score += 2;
    if (contact.mobilePhone) score += 2;
    if (contact.businessAddress) score += 1;
    if (contact.personalNotes) score += 1;
    
    return score;
  }
  
  private mergeContactData(contacts: OutlookContact[], master: OutlookContact): Partial<ContactCreateRequest> {
    const merged: Partial<ContactCreateRequest> = {};
    
    // Fusion des données en privilégiant les plus complètes
    merged.displayName = this.selectBestValue(contacts.map(c => c.displayName)) || master.displayName;
    merged.givenName = this.selectBestValue(contacts.map(c => c.givenName));
    merged.surname = this.selectBestValue(contacts.map(c => c.surname));
    merged.companyName = this.selectBestValue(contacts.map(c => c.companyName));
    merged.jobTitle = this.selectBestValue(contacts.map(c => c.jobTitle));
    
    // Fusion des emails (déduplication)
    const allEmails = contacts.flatMap(c => c.emailAddresses);
    merged.emailAddresses = this.deduplicateEmails(allEmails);
    
    // Fusion des téléphones
    const allBusinessPhones = contacts.flatMap(c => c.businessPhones);
    merged.businessPhones = [...new Set(allBusinessPhones)];
    
    merged.mobilePhone = this.selectBestValue(contacts.map(c => c.mobilePhone));
    
    // Fusion des adresses
    merged.businessAddress = this.selectBestAddress(contacts.map(c => c.businessAddress));
    
    // Fusion des notes
    const allNotes = contacts.map(c => c.personalNotes).filter(Boolean);
    if (allNotes.length > 0) {
      merged.personalNotes = allNotes.join('\n\n');
    }
    
    // Fusion des catégories
    const allCategories = contacts.flatMap(c => c.categories);
    merged.categories = [...new Set(allCategories)];
    
    return merged;
  }
  
  private selectBestValue<T>(values: (T | undefined)[]): T | undefined {
    // Retourne la valeur la plus complète (non vide, la plus longue)
    const validValues = values.filter(v => v && String(v).trim() !== '');
    
    if (validValues.length === 0) return undefined;
    
    return validValues.reduce((best, current) => {
      if (!best) return current;
      
      const bestLength = String(best).length;
      const currentLength = String(current).length;
      
      return currentLength > bestLength ? current : best;
    });
  }
  
  private selectBestAddress(addresses: (OutlookAddress | undefined)[]): OutlookAddress | undefined {
    const validAddresses = addresses.filter(Boolean) as OutlookAddress[];
    
    if (validAddresses.length === 0) return undefined;
    
    // Sélectionner l'adresse la plus complète
    return validAddresses.reduce((best, current) => {
      const bestScore = this.calculateAddressCompleteness(best);
      const currentScore = this.calculateAddressCompleteness(current);
      
      return currentScore > bestScore ? current : best;
    });
  }
  
  private calculateAddressCompleteness(address: OutlookAddress): number {
    let score = 0;
    if (address.street) score++;
    if (address.city) score++;
    if (address.state) score++;
    if (address.postalCode) score++;
    if (address.countryOrRegion) score++;
    
    return score;
  }
  
  private deduplicateEmails(emails: any[]): any[] {
    const seen = new Set<string>();
    return emails.filter(email => {
      const key = email.address.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  private async mergeContactGroup(group: {
    contacts: OutlookContact[];
    confidence: number;
    suggestedMaster?: OutlookContact;
  }): Promise<OutlookContact> {
    const master = group.suggestedMaster || group.contacts[0];
    const contactIds = group.contacts.map(c => c.id);
    
    return await this.mergeContacts(contactIds, master.id);
  }
  
  private async indexContactForSearch(contact: OutlookContact): Promise<void> {
    // Implémentation de l'indexation pour la recherche rapide
    // Pourrait utiliser un index en mémoire, Elasticsearch, etc.
    const searchIndex = {
      id: contact.id,
      displayName: contact.displayName?.toLowerCase(),
      emails: contact.emailAddresses.map(e => e.address.toLowerCase()),
      company: contact.companyName?.toLowerCase(),
      phones: [...contact.businessPhones, contact.mobilePhone].filter(Boolean)
    };
    
    await this.cacheManager.set(
      `contact_search:${contact.id}`,
      searchIndex,
      OUTLOOK_CONSTANTS.TIMEOUTS.CACHE.CONTACT_TTL
    );
  }
  
  private async removeContactFromSearchIndex(contactId: string): Promise<void> {
    await this.cacheManager.delete(`contact_search:${contactId}`);
  }
  
  private extractSkipToken(nextLink?: string): string | undefined {
    if (!nextLink) return undefined;
    
    try {
      const url = new URL(nextLink);
      return url.searchParams.get('$skiptoken') || undefined;
    } catch {
      return undefined;
    }
  }
  
  private initializeSyncMetrics(): ContactSyncMetrics {
    return {
      contactsProcessed: 0,
      contactsCreated: 0,
      contactsUpdated: 0,
      contactsDeleted: 0,
      contactsMerged: 0,
      duplicatesDetected: 0,
      syncDuration: 0,
      lastSync: new Date()
    };
  }
  
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new OutlookError(
        'SERVICE_NOT_INITIALIZED',
        'OutlookContactSync must be initialized before use'
      );
    }
  }
}

export default OutlookContactSync;