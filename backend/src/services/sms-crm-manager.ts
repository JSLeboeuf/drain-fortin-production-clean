/**
 * SMS & CRM Manager - Gestion simple sans Outlook
 * Envoie tout par SMS et gère dans le CRM
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import twilio, { type Twilio } from 'twilio';

const DEFAULT_TWILIO_FROM = '+14389004385';
const DEFAULT_GUILLAUME_NUMBER = '+15141234567';
const DEFAULT_BUSINESS_NUMBERS = ['+15145296037', '+14389004385'] as const;

const getRequiredEnv = (key: string): string => {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Environment variable is empty: ${key}`);
  }

  return trimmed;
};

export const normalizePhoneNumbers = (numbers: Iterable<string | null | undefined>): string[] => {
  const uniqueNumbers = new Set<string>();

  for (const number of numbers) {
    if (typeof number !== 'string') {
      continue;
    }

    const normalized = number.trim();

    if (normalized.length > 0) {
      uniqueNumbers.add(normalized);
    }
  }

  return Array.from(uniqueNumbers);
};

const splitAndNormalizePhoneNumbers = (value: string | undefined): string[] =>
  value ? normalizePhoneNumbers(value.split(',')) : [];

type UrgencyLevel = 'urgent' | 'normal';

interface PhoneNumberConfig {
  guillaume: string;
  business: string[];
  alerts: string[];
}

interface BaseCallData {
  customerName: string;
  phoneNumber: string;
  issue: string;
  address?: string;
  urgency: UrgencyLevel;
}

interface CallNotificationData extends BaseCallData {
  callId: string;
}

interface AppointmentReminderData {
  customerName: string;
  address: string;
  time: string;
  serviceType: string;
  technicianName?: string;
}

interface LeadFromCallData extends BaseCallData {
  email?: string | null;
  transcript?: string | null;
  nextAction?: string | null;
}

interface SMSCRMManagerDependencies {
  supabase?: SupabaseClient;
  twilioClient?: Twilio;
  phoneNumbers?: Partial<PhoneNumberConfig>;
  now?: () => Date;
  twilioFrom?: string;
}

export class SMSCRMManager {
  private readonly supabase: SupabaseClient;
  private readonly twilioClient: Twilio;
  private readonly phoneNumbers: PhoneNumberConfig;
  private readonly now: () => Date;
  private readonly twilioFrom: string;

  constructor(dependencies: SMSCRMManagerDependencies = {}) {
    const { supabase, twilioClient, phoneNumbers, now, twilioFrom } = dependencies;

    this.supabase =
      supabase ??
      createClient(
        getRequiredEnv('SUPABASE_URL'),
        getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
      );

    this.twilioClient =
      twilioClient ??
      twilio(getRequiredEnv('TWILIO_ACCOUNT_SID'), getRequiredEnv('TWILIO_AUTH_TOKEN'));

    this.twilioFrom =
      twilioFrom?.trim() || process.env.TWILIO_PHONE_NUMBER?.trim() || DEFAULT_TWILIO_FROM;

    this.phoneNumbers = this.resolvePhoneNumbers(phoneNumbers);
    this.now = now ?? (() => new Date());
  }

  /**
   * Envoie un SMS pour un nouvel appel
   */
  async sendCallNotification(callData: CallNotificationData) {
    try {
      const message = this.buildCallNotificationMessage(callData);
      const recipients = this.getCallNotificationRecipients(callData.urgency);

      await this.sendSMSBatch(recipients, message);

      const timestamp = this.now().toISOString();

      await this.logInCRM({
        type: 'call_notification',
        callId: callData.callId,
        customerName: callData.customerName,
        phoneNumber: callData.phoneNumber,
        issue: callData.issue,
        address: callData.address,
        urgency: callData.urgency,
        notificationSent: true,
        timestamp
      });

      return { success: true, message: 'SMS envoyé avec succès' };
    } catch (error: unknown) {
      console.error('Erreur envoi SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Envoie un SMS de rappel de rendez-vous
   */
  async sendAppointmentReminder(appointment: AppointmentReminderData) {
    const message = this.buildAppointmentReminderMessage(appointment);
    return await this.sendSMS(this.phoneNumbers.guillaume, message);
  }

  /**
   * Envoie un résumé quotidien par SMS
   */
  async sendDailySummary() {
    try {
      const today = this.now().toISOString().split('T')[0];

      const { data: stats, error } = await this.supabase
        .from('call_logs')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      if (error) {
        throw error;
      }

      const statsList = Array.isArray(stats) ? (stats as any[]) : [];
      const totalCalls = statsList.length;
      const urgentCalls = statsList.filter((c: any) => c.urgency === 'urgent').length;
      const completedCalls = statsList.filter((c: any) => c.status === 'completed').length;

      const message = [
        '📊 Résumé du jour',
        `Total appels: ${totalCalls}`,
        `Urgences: ${urgentCalls}`,
        `Complétés: ${completedCalls}`,
        '',
        'Détails: drainfortin.com/admin'
      ].join('\n');

      return await this.sendSMS(this.phoneNumbers.guillaume, message);
    } catch (error) {
      console.error('Erreur résumé quotidien:', error);
    }
  }

  /**
   * Gère une réponse SMS du client
   */
  async handleSMSReply(from: string, body: string) {
    try {
      const { data: lastCall, error } = await this.supabase
        .from('call_logs')
        .select('*')
        .eq('customer_phone', from)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!lastCall) {
        return { success: true };
      }

      const timestamp = this.now().toISOString();

      const { error: insertError } = await this.supabase
        .from('call_messages')
        .insert({
          call_id: lastCall.id,
          from,
          message: body,
          type: 'sms_reply',
          timestamp
        });

      if (insertError) {
        throw insertError;
      }

      const notification = [
        '💬 Réponse SMS',
        `De: ${from}`,
        `Message: ${body}`,
        `Voir: drainfortin.com/c/${lastCall.id}`
      ].join('\n');

      await this.sendSMS(this.phoneNumbers.guillaume, notification);

      return { success: true };
    } catch (error: unknown) {
      console.error('Erreur gestion réponse SMS:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Crée un lead dans le CRM depuis un appel
   */
  async createLeadFromCall(callData: LeadFromCallData) {
    try {
      const timestamp = this.now().toISOString();

      const lead = {
        name: callData.customerName,
        phone: callData.phoneNumber,
        email: callData.email ?? null,
        address: callData.address ?? null,
        issue_type: callData.issue,
        urgency: callData.urgency,
        source: 'phone_call',
        status: 'new',
        paul_interaction: callData.transcript ?? null,
        next_action: callData.nextAction ?? 'À contacter',
        created_at: timestamp
      };

      const { data, error } = await this.supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const message = [
        '✅ Nouveau lead créé',
        callData.customerName,
        callData.issue,
        `ID: ${data?.id}`
      ].join('\n');

      await this.sendSMS(this.phoneNumbers.guillaume, message);

      return data;
    } catch (error) {
      console.error('Erreur création lead:', error);
      throw error;
    }
  }

  /**
   * Obtenir le statut des lignes téléphoniques
   */
  async getPhoneLinesStatus() {
    const statuses = await Promise.all(
      this.phoneNumbers.business.map(line => this.fetchPhoneLineStatus(line))
    );

    return statuses;
  }

  /**
   * Configuration simple sans Outlook
   */
  async setupSimpleMode() {
    console.log('📱 Mode Simple activé - SMS + CRM uniquement');
    console.log('✅ Pas besoin de configuration Outlook');
    console.log('✅ Notifications SMS actives:', this.phoneNumbers.guillaume);

    return {
      mode: 'simple',
      sms: true,
      crm: true,
      outlook: false,
      phoneNumbers: {
        guillaume: this.phoneNumbers.guillaume,
        business: [...this.phoneNumbers.business],
        alerts: [...this.phoneNumbers.alerts]
      },
      status: 'ready'
    };
  }

  private resolvePhoneNumbers(overrides?: Partial<PhoneNumberConfig>): PhoneNumberConfig {
    const baseConfig: PhoneNumberConfig = {
      guillaume: process.env.GUILLAUME_PHONE?.trim() || DEFAULT_GUILLAUME_NUMBER,
      business: normalizePhoneNumbers(DEFAULT_BUSINESS_NUMBERS),
      alerts: splitAndNormalizePhoneNumbers(process.env.SMS_ALERT_NUMBERS)
    };

    return {
      guillaume: overrides?.guillaume?.trim() || baseConfig.guillaume,
      business: overrides?.business
        ? normalizePhoneNumbers(overrides.business)
        : baseConfig.business,
      alerts: overrides?.alerts ? normalizePhoneNumbers(overrides.alerts) : baseConfig.alerts
    };
  }

  private buildCallNotificationMessage(callData: CallNotificationData): string {
    const urgencyLabel =
      callData.urgency === 'urgent'
        ? { emoji: '🚨', text: 'URGENCE' }
        : { emoji: '🔔', text: 'Nouvel appel' };

    const lines = [
      `${urgencyLabel.emoji} ${urgencyLabel.text}`,
      `Client: ${callData.customerName}`,
      `Tél: ${callData.phoneNumber}`,
      `Problème: ${callData.issue}`
    ];

    if (callData.address) {
      lines.push(`Adresse: ${callData.address}`);
    }

    lines.push('', `Répondre: drainfortin.com/c/${callData.callId}`);

    return lines.join('\n');
  }

  private buildAppointmentReminderMessage(appointment: AppointmentReminderData): string {
    const lines = [
      '📅 Rappel RDV',
      `Client: ${appointment.customerName}`,
      `Heure: ${appointment.time}`,
      `Adresse: ${appointment.address}`,
      `Service: ${appointment.serviceType}`
    ];

    if (appointment.technicianName) {
      lines.push(`Technicien: ${appointment.technicianName}`);
    }

    return lines.join('\n');
  }

  private getCallNotificationRecipients(urgency: UrgencyLevel): string[] {
    const recipients = [this.phoneNumbers.guillaume];

    if (urgency === 'urgent') {
      recipients.push(...this.phoneNumbers.alerts);
    }

    return normalizePhoneNumbers(recipients);
  }

  private async sendSMSBatch(recipients: string[], message: string) {
    const uniqueRecipients = normalizePhoneNumbers(recipients);

    await Promise.all(uniqueRecipients.map(recipient => this.sendSMS(recipient, message)));
  }

  private async fetchPhoneLineStatus(line: string) {
    try {
      const { data, error } = await this.supabase
        .from('phone_lines')
        .select('*')
        .eq('phone_number', line)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return {
        number: line,
        status: data?.status ?? 'unknown',
        activeCalls: data?.current_active_calls ?? 0,
        maxCalls: data?.max_concurrent_calls ?? 10
      };
    } catch {
      return {
        number: line,
        status: 'error',
        activeCalls: 0,
        maxCalls: 0
      };
    }
  }

  private async sendSMS(to: string, message: string) {
    const normalizedTo = to.trim();

    if (!normalizedTo) {
      throw new Error('Recipient phone number is required');
    }

    const result = await this.twilioClient.messages.create({
      body: message,
      from: this.twilioFrom,
      to: normalizedTo
    });

    const { error } = await this.supabase.from('sms_logs').insert({
      to: normalizedTo,
      from: result.from ?? this.twilioFrom,
      message,
      status: result.status,
      sid: result.sid,
      created_at: this.now().toISOString()
    });

    if (error) {
      console.error('Erreur log SMS:', error);
    }

    return result;
  }

  private async logInCRM(data: Record<string, unknown>) {
    try {
      const { error } = await this.supabase.from('crm_activity_logs').insert({
        ...data,
        created_at: this.now().toISOString()
      });

      if (error) {
        console.error('Erreur log CRM:', error);
      }
    } catch (error) {
      console.error('Erreur log CRM:', error);
    }
  }
}

// Export pour utilisation
export default SMSCRMManager;
