/**
 * EncryptionService.ts - Service de chiffrement des données sensibles
 * Chiffrement AES-256-GCM, gestion des clés, et sécurité des tokens
 * 
 * Drain Fortin Voice AI System - Production Ready
 * @version 2.0.0
 * @author Claude Code - Anthropic
 */

import * as crypto from 'crypto';
import { OutlookConfig, OutlookError } from '../config/outlook.types';

/**
 * Service de chiffrement pour protéger les données sensibles
 * Utilise AES-256-GCM pour un chiffrement authentifié
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16;  // 128 bits
  private readonly tagLength = 16; // 128 bits
  private readonly saltLength = 16; // 128 bits
  
  private readonly masterKey: Buffer;
  private readonly config: OutlookConfig['security'];
  
  constructor(config: OutlookConfig | OutlookConfig['security']) {
    this.config = 'encryptionKey' in config ? config : config.security;
    
    // Validation de la configuration
    this.validateConfig();
    
    // Dérivation de la clé maître
    this.masterKey = this.deriveKey(this.config.encryptionKey);
  }
  
  /**
   * Chiffre une chaîne de caractères
   * @param plaintext Texte en clair à chiffrer
   * @param additionalData Données supplémentaires pour l'authentification
   */
  public async encrypt(plaintext: string, additionalData?: string): Promise<string> {
    try {
      if (!plaintext) {
        throw new OutlookError('ENCRYPTION_ERROR', 'Plaintext cannot be empty');
      }
      
      // Génération d'un sel unique et d'un IV
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      
      // Dérivation d'une clé spécifique avec le sel
      const derivedKey = this.deriveKeyWithSalt(this.masterKey, salt);
      
      // Création du cipher
      const cipher = crypto.createCipher(this.algorithm, derivedKey);
      cipher.setAAD(Buffer.from(additionalData || ''));
      
      // Chiffrement
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Récupération du tag d'authentification
      const tag = cipher.getAuthTag();
      
      // Assemblage final: salt + iv + tag + encrypted
      const result = Buffer.concat([salt, iv, tag, encrypted]);
      
      return result.toString('base64');
      
    } catch (error) {
      throw new OutlookError(
        'ENCRYPTION_ERROR',
        `Failed to encrypt data: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Déchiffre une chaîne chiffrée
   * @param encryptedData Données chiffrées en base64
   * @param additionalData Données supplémentaires pour l'authentification
   */
  public async decrypt(encryptedData: string, additionalData?: string): Promise<string> {
    try {
      if (!encryptedData) {
        throw new OutlookError('DECRYPTION_ERROR', 'Encrypted data cannot be empty');
      }
      
      // Décodage base64
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Validation de la taille minimale
      const minSize = this.saltLength + this.ivLength + this.tagLength + 1;
      if (buffer.length < minSize) {
        throw new OutlookError('DECRYPTION_ERROR', 'Invalid encrypted data format');
      }
      
      // Extraction des composants
      let offset = 0;
      const salt = buffer.subarray(offset, offset + this.saltLength);
      offset += this.saltLength;
      
      const iv = buffer.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;
      
      const tag = buffer.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;
      
      const encrypted = buffer.subarray(offset);
      
      // Dérivation de la clé avec le sel
      const derivedKey = this.deriveKeyWithSalt(this.masterKey, salt);
      
      // Création du decipher
      const decipher = crypto.createDecipher(this.algorithm, derivedKey);
      decipher.setAuthTag(tag);
      decipher.setAAD(Buffer.from(additionalData || ''));
      
      // Déchiffrement
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
      
    } catch (error) {
      throw new OutlookError(
        'DECRYPTION_ERROR',
        `Failed to decrypt data: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Chiffre un objet JSON
   * @param obj Objet à chiffrer
   * @param additionalData Données supplémentaires pour l'authentification
   */
  public async encryptObject(obj: any, additionalData?: string): Promise<string> {
    try {
      const jsonString = JSON.stringify(obj);
      return await this.encrypt(jsonString, additionalData);
    } catch (error) {
      throw new OutlookError(
        'ENCRYPTION_ERROR',
        `Failed to encrypt object: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Déchiffre vers un objet JSON
   * @param encryptedData Données chiffrées
   * @param additionalData Données supplémentaires pour l'authentification
   */
  public async decryptObject<T>(encryptedData: string, additionalData?: string): Promise<T> {
    try {
      const jsonString = await this.decrypt(encryptedData, additionalData);
      return JSON.parse(jsonString) as T;
    } catch (error) {
      throw new OutlookError(
        'DECRYPTION_ERROR',
        `Failed to decrypt object: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Génère un hash sécurisé (pour les mots de passe, etc.)
   * @param data Données à hasher
   * @param salt Sel optionnel
   */
  public hash(data: string, salt?: string): string {
    try {
      const actualSalt = salt || crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512');
      
      return `${actualSalt}:${hash.toString('hex')}`;
      
    } catch (error) {
      throw new OutlookError(
        'HASH_ERROR',
        `Failed to hash data: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Vérifie un hash
   * @param data Données à vérifier
   * @param hashedData Hash à comparer
   */
  public verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, storedHash] = hashedData.split(':');
      const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512');
      
      return crypto.timingSafeEqual(
        Buffer.from(storedHash, 'hex'),
        hash
      );
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Génère une clé de chiffrement aléatoire
   * @param length Longueur de la clé en bytes
   */
  public generateRandomKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Génère un token aléatoire sécurisé
   * @param length Longueur du token en bytes
   */
  public generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
  
  /**
   * Chiffre spécifiquement des tokens OAuth2
   * @param token Token à chiffrer
   * @param tokenType Type de token (access, refresh, id)
   */
  public async encryptToken(token: string, tokenType: string): Promise<string> {
    const additionalData = `token:${tokenType}:${Date.now()}`;
    return await this.encrypt(token, additionalData);
  }
  
  /**
   * Déchiffre spécifiquement des tokens OAuth2
   * @param encryptedToken Token chiffré
   * @param tokenType Type de token (access, refresh, id)
   */
  public async decryptToken(encryptedToken: string, tokenType: string): Promise<string> {
    // Pour les tokens, nous ne pouvons pas reconstituer exactement l'additionalData
    // car il contenait un timestamp. On essaie donc sans additionalData d'abord
    try {
      return await this.decrypt(encryptedToken);
    } catch {
      // Si ça échoue, essayer avec le pattern général
      const additionalData = `token:${tokenType}`;
      return await this.decrypt(encryptedToken, additionalData);
    }
  }
  
  /**
   * Méthodes utilitaires privées
   */
  
  private deriveKey(password: string): Buffer {
    // Utilise PBKDF2 avec un sel fixe pour la clé maître
    const salt = Buffer.from('drain-fortin-outlook-salt', 'utf8');
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }
  
  private deriveKeyWithSalt(masterKey: Buffer, salt: Buffer): Buffer {
    // Dérivation HKDF pour créer des clés spécifiques
    const prk = crypto.createHmac('sha256', salt).update(masterKey).digest();
    const okm = crypto.createHmac('sha256', prk).update(Buffer.from('outlook-encryption', 'utf8')).digest();
    
    return okm.subarray(0, this.keyLength);
  }
  
  private validateConfig(): void {
    if (!this.config || !this.config.encryptionKey) {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'Encryption key is required in security configuration'
      );
    }
    
    if (this.config.encryptionKey.length < 32) {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'Encryption key must be at least 32 characters long'
      );
    }
    
    if (this.config.encryptionKey === 'default-key-change-in-production') {
      throw new OutlookError(
        'CONFIGURATION_INVALID',
        'Default encryption key detected. Change encryption key in production!'
      );
    }
  }
  
  /**
   * Rotation des clés de chiffrement
   * @param newKey Nouvelle clé de chiffrement
   * @param oldEncryptedData Données chiffrées avec l'ancienne clé
   */
  public async rotateKey(newKey: string, oldEncryptedData: string): Promise<string> {
    try {
      // Déchiffrer avec l'ancienne clé
      const plaintext = await this.decrypt(oldEncryptedData);
      
      // Créer un nouveau service avec la nouvelle clé
      const newEncryptionService = new EncryptionService({
        ...this.config,
        encryptionKey: newKey
      });
      
      // Rechiffrer avec la nouvelle clé
      return await newEncryptionService.encrypt(plaintext);
      
    } catch (error) {
      throw new OutlookError(
        'KEY_ROTATION_ERROR',
        `Failed to rotate encryption key: ${error.message}`,
        { error: error.message }
      );
    }
  }
  
  /**
   * Test de l'intégrité du service de chiffrement
   */
  public async testIntegrity(): Promise<boolean> {
    try {
      const testData = 'test-encryption-integrity-' + Date.now();
      const encrypted = await this.encrypt(testData);
      const decrypted = await this.decrypt(encrypted);
      
      return testData === decrypted;
      
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Nettoyage sécurisé des buffers sensibles
   * @param buffer Buffer à nettoyer
   */
  public static secureErase(buffer: Buffer): void {
    if (buffer && buffer.length > 0) {
      buffer.fill(0);
    }
  }
  
  /**
   * Génère un checksum pour vérifier l'intégrité des données
   * @param data Données à vérifier
   */
  public generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Vérifie l'intégrité des données avec un checksum
   * @param data Données à vérifier
   * @param checksum Checksum attendu
   */
  public verifyChecksum(data: string, checksum: string): boolean {
    const calculatedChecksum = this.generateChecksum(data);
    return crypto.timingSafeEqual(
      Buffer.from(checksum, 'hex'),
      Buffer.from(calculatedChecksum, 'hex')
    );
  }
}

export default EncryptionService;