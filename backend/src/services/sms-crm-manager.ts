/**
 * SMS & CRM Manager - Gestion simple sans Outlook
 * Envoie tout par SMS et gère dans le CRM
 */

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export class SMSCRMManager {
  private supabase: any;
  private twilioClient: any;
  
  // Numéros configurés pour Guillaume
  private readonly PHONE_NUMBERS = {
    guillaume: process.env.GUILLAUME_PHONE || '+15141234567',
    business: ['+15145296037', '+14389004385'],
    alerts: (process.env.SMS_ALERT_NUMBERS || '').split(',').filter(Boolean)
  };

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * Envoie un SMS pour un nouvel appel
   */
  async sendCallNotification(callData: {
    customerName: string;
    phoneNumber: string;
    issue: string;
    address?: string;
    urgency: 'urgent' | 'normal';
    callId: string;
  }) {
    const { customerName, phoneNumber, issue, address, urgency, callId } = callData;
    
    // Formater le message SMS
    const emoji = urgency === 'urgent' ? '🚨' : '🔔';
    const urgencyText = urgency === 'urgent' ? 'URGENCE' : 'Nouvel appel';
    
    let message = `${emoji} ${urgencyText}\n`;
    message += `Client: ${customerName}\n`;
    message += `Tél: ${phoneNumber}\n`;
    message += `Problème: ${issue}\n`;
    if (address) {
      message += `Adresse: ${address}\n`;
    }
    message += `\nRépondre: drainfortin.com/c/${callId}`;

    // Envoyer le SMS
    try {
      await this.sendSMS(this.PHONE_NUMBERS.guillaume, message);
      
      // Si urgence, envoyer aussi aux numéros d'alerte
      if (urgency === 'urgent' && this.PHONE_NUMBERS.alerts.length > 0) {
        for (const alertNumber of this.PHONE_NUMBERS.alerts) {
          await this.sendSMS(alertNumber, message);
        }
      }

      // Logger dans le CRM
      await this.logInCRM({
        type: 'call_notification',
        callId,
        customerName,
        phoneNumber,
        issue,
        address,
        urgency,
        notificationSent: true,
        timestamp: new Date().toISOString()
      });

      return { success: true, message: 'SMS envoyé avec succès' };
    } catch (error) {
      console.error('Erreur envoi SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoie un SMS de rappel de rendez-vous
   */
  async sendAppointmentReminder(appointment: {
    customerName: string;
    address: string;
    time: string;
    technicianName?: string;
    serviceType: string;
  }) {
    const { customerName, address, time, technicianName, serviceType } = appointment;
    
    let message = `📅 Rappel RDV\n`;
    message += `Client: ${customerName}\n`;
    message += `Heure: ${time}\n`;
    message += `Adresse: ${address}\n`;
    message += `Service: ${serviceType}`;
    
    if (technicianName) {
      message += `\nTechnicien: ${technicianName}`;
    }

    return await this.sendSMS(this.PHONE_NUMBERS.guillaume, message);
  }

  /**
   * Envoie un résumé quotidien par SMS
   */
  async sendDailySummary() {
    try {
      // Récupérer les stats du jour
      const today = new Date().toISOString().split('T')[0];
      
      const { data: stats } = await this.supabase
        .from('call_logs')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`);

      const totalCalls = stats?.length || 0;
      const urgentCalls = stats?.filter(c => c.urgency === 'urgent').length || 0;
      const completedCalls = stats?.filter(c => c.status === 'completed').length || 0;

      let message = `📊 Résumé du jour\n`;
      message += `Total appels: ${totalCalls}\n`;
      message += `Urgences: ${urgentCalls}\n`;
      message += `Complétés: ${completedCalls}\n`;
      message += `\nDétails: drainfortin.com/admin`;

      return await this.sendSMS(this.PHONE_NUMBERS.guillaume, message);
    } catch (error) {
      console.error('Erreur résumé quotidien:', error);
    }
  }

  /**
   * Gère une réponse SMS du client
   */
  async handleSMSReply(from: string, body: string) {
    try {
      // Chercher le dernier appel de ce numéro
      const { data: lastCall } = await this.supabase
        .from('call_logs')
        .select('*')
        .eq('customer_phone', from)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastCall) {
        // Ajouter la réponse au CRM
        await this.supabase
          .from('call_messages')
          .insert({
            call_id: lastCall.id,
            from: from,
            message: body,
            type: 'sms_reply',
            timestamp: new Date().toISOString()
          });

        // Notifier Guillaume
        const notification = `💬 Réponse SMS\nDe: ${from}\nMessage: ${body}\nVoir: drainfortin.com/c/${lastCall.id}`;
        await this.sendSMS(this.PHONE_NUMBERS.guillaume, notification);
      }

      return { success: true };
    } catch (error) {
      console.error('Erreur gestion réponse SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Crée un lead dans le CRM depuis un appel
   */
  async createLeadFromCall(callData: any) {
    try {
      const lead = {
        name: callData.customerName,
        phone: callData.phoneNumber,
        email: callData.email || null,
        address: callData.address || null,
        issue_type: callData.issue,
        urgency: callData.urgency,
        source: 'phone_call',
        status: 'new',
        paul_interaction: callData.transcript || null,
        next_action: callData.nextAction || 'À contacter',
        created_at: new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();

      if (error) throw error;

      // Envoyer notification SMS
      const message = `✅ Nouveau lead créé\n${callData.customerName}\n${callData.issue}\nID: ${data.id}`;
      await this.sendSMS(this.PHONE_NUMBERS.guillaume, message);

      return data;
    } catch (error) {
      console.error('Erreur création lead:', error);
      throw error;
    }
  }

  /**
   * Envoie un SMS (fonction utilitaire)
   */
  private async sendSMS(to: string, message: string) {
    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '+14389004385',
        to: to
      });

      // Logger l'envoi
      await this.supabase
        .from('sms_logs')
        .insert({
          to,
          from: result.from,
          message,
          status: result.status,
          sid: result.sid,
          created_at: new Date().toISOString()
        });

      return result;
    } catch (error) {
      console.error('Erreur envoi SMS:', error);
      throw error;
    }
  }

  /**
   * Logger dans le CRM
   */
  private async logInCRM(data: any) {
    try {
      await this.supabase
        .from('crm_activity_logs')
        .insert({
          ...data,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Erreur log CRM:', error);
    }
  }

  /**
   * Obtenir le statut des lignes téléphoniques
   */
  async getPhoneLinesStatus() {
    const lines = this.PHONE_NUMBERS.business;
    const status = [];

    for (const line of lines) {
      try {
        // Vérifier le statut dans la base de données
        const { data } = await this.supabase
          .from('phone_lines')
          .select('*')
          .eq('phone_number', line)
          .single();

        status.push({
          number: line,
          status: data?.status || 'unknown',
          activeCalls: data?.current_active_calls || 0,
          maxCalls: data?.max_concurrent_calls || 10
        });
      } catch (error) {
        status.push({
          number: line,
          status: 'error',
          activeCalls: 0,
          maxCalls: 0
        });
      }
    }

    return status;
  }

  /**
   * Configuration simple sans Outlook
   */
  async setupSimpleMode() {
    console.log('📱 Mode Simple activé - SMS + CRM uniquement');
    console.log('✅ Pas besoin de configuration Outlook');
    console.log('✅ Notifications SMS actives:', this.PHONE_NUMBERS.guillaume);
    console.log('✅ CRM prêt sur: drainfortin.com/admin');
    
    return {
      mode: 'simple',
      sms: true,
      crm: true,
      outlook: false,
      phoneNumbers: this.PHONE_NUMBERS,
      status: 'ready'
    };
  }
}

// Export pour utilisation
export default SMSCRMManager;