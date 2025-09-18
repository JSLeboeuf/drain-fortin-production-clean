import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Twilio } from 'twilio';

import SMSCRMManager, { normalizePhoneNumbers } from '../src/services/sms-crm-manager';

class SupabaseMock {
  public readonly inserts: Record<string, any[]> = {};

  private createQueryBuilder(table: string) {
    return {
      insert: async (payload: any) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        this.inserts[table] = [...(this.inserts[table] ?? []), ...rows];
        return { data: rows, error: null };
      },
      select: () => this.createQueryBuilder(table),
      gte: () => this.createQueryBuilder(table),
      lte: () => this.createQueryBuilder(table),
      eq: () => this.createQueryBuilder(table),
      order: () => this.createQueryBuilder(table),
      limit: () => this.createQueryBuilder(table),
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null })
    };
  }

  from(table: string) {
    return this.createQueryBuilder(table);
  }
}

describe('SMSCRMManager utilities', () => {
  it('normalizes phone numbers by cleaning formatting, adding missing prefixes, and deduplicating', () => {
    const result = normalizePhoneNumbers([
      ' +1 (555) 000-0001 ',
      null,
      '',
      '+15550000001',
      '514-555-0000',
      '001-555-000-0002',
      '00 1 555 000 0002',
      '011 44 20 7946 0018'
    ]);

    expect(result).toEqual(['+15550000001', '+15145550000', '+15550000002', '+442079460018']);
  });
});

describe('SMSCRMManager', () => {
  let supabase: SupabaseMock;
  let twilioCreateMock: ReturnType<typeof vi.fn>;
  let manager: SMSCRMManager;
  const envKeys = ['GUILLAUME_PHONE', 'SMS_ALERT_NUMBERS', 'TWILIO_PHONE_NUMBER'] as const;
  type EnvKey = (typeof envKeys)[number];
  let envBackup: Record<EnvKey, string | undefined>;

  beforeEach(() => {
    envBackup = {} as Record<EnvKey, string | undefined>;
    envKeys.forEach(key => {
      envBackup[key] = process.env[key];

      if (process.env[key] !== undefined) {
        delete process.env[key];
      }
    });

    supabase = new SupabaseMock();
    twilioCreateMock = vi.fn().mockResolvedValue({
      sid: 'SM001',
      status: 'queued',
      from: '+15559998888'
    });

    const twilioClient = {
      messages: {
        create: twilioCreateMock
      }
    } as unknown as Twilio;

    manager = new SMSCRMManager({
      supabase: supabase as unknown as SupabaseClient,
      twilioClient,
      twilioFrom: '+15559998888',
      phoneNumbers: {
        guillaume: ' +15550000001 ',
        alerts: ['+15550000002', '+15550000002', ''],
        business: ['+15550000010']
      },
      now: () => new Date('2024-01-02T03:04:05.000Z')
    });
  });

  afterEach(() => {
    envKeys.forEach(key => {
      if (envBackup[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = envBackup[key];
      }
    });
  });

  it('sends urgent notifications to unique recipients and logs CRM activity', async () => {
    const response = await manager.sendCallNotification({
      customerName: 'Jean Tremblay',
      phoneNumber: '+15145550000',
      issue: 'Refoulement',
      address: '123 Rue Principale',
      urgency: 'urgent',
      callId: 'call-123'
    });

    expect(response).toEqual({ success: true, message: 'SMS envoyé avec succès' });
    expect(twilioCreateMock).toHaveBeenCalledTimes(2);

    const recipients = twilioCreateMock.mock.calls.map(call => call[0].to).sort();
    expect(recipients).toEqual(['+15550000001', '+15550000002']);

    const messageBody = twilioCreateMock.mock.calls[0][0].body as string;
    expect(messageBody).toContain('Client: Jean Tremblay');
    expect(messageBody).toContain('Tél: +15145550000');
    expect(messageBody).toContain('Problème: Refoulement');
    expect(messageBody).toContain('Répondre: drainfortin.com/c/call-123');

    expect(supabase.inserts['sms_logs']).toHaveLength(2);
    expect(supabase.inserts['crm_activity_logs']).toHaveLength(1);
    expect(supabase.inserts['crm_activity_logs'][0].notificationSent).toBe(true);
  });

  it('marks notification as failed when a recipient SMS cannot be delivered', async () => {
    twilioCreateMock.mockImplementation(({ to }: { to: string }) => {
      if (to === '+15550000002') {
        return Promise.reject(new Error('Twilio failure'));
      }

      return Promise.resolve({
        sid: 'SM001',
        status: 'queued',
        from: '+15559998888',
        to
      });
    });

    const response = await manager.sendCallNotification({
      customerName: 'Marie Dupont',
      phoneNumber: '+15147770000',
      issue: 'Urgence inondation',
      address: '456 Rue des Pins',
      urgency: 'urgent',
      callId: 'call-999'
    });

    expect(response.success).toBe(false);
    expect(response.failedRecipients).toEqual(['+15550000002']);
    expect(response.error).toContain('+15550000002');

    expect(twilioCreateMock).toHaveBeenCalledTimes(2);

    const smsLogs = supabase.inserts['sms_logs'];
    expect(smsLogs).toHaveLength(2);
    expect(smsLogs.some(entry => entry.status === 'failed')).toBe(true);

    const crmLog = supabase.inserts['crm_activity_logs'][0];
    expect(crmLog.notificationSent).toBe(false);
  });

  it('normalizes the Twilio sender identity while preserving WhatsApp routing', async () => {
    const localManager = new SMSCRMManager({
      supabase: supabase as unknown as SupabaseClient,
      twilioClient: {
        messages: {
          create: twilioCreateMock
        }
      } as unknown as Twilio,
      twilioFrom: ' whatsapp:+1 (555) 111-2222 ',
      phoneNumbers: {
        guillaume: ' +15550000003 ',
        alerts: [],
        business: []
      },
      now: () => new Date('2024-01-02T03:04:05.000Z')
    });

    await localManager.sendAppointmentReminder({
      customerName: 'Alex',
      address: '1 Main',
      time: '10:00',
      serviceType: 'Inspection'
    });

    expect(twilioCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15550000003',
        from: 'whatsapp:+15551112222'
      })
    );
  });

  it('falls back to default Guillaume number when overrides are invalid', async () => {
    const previousGuillaume = process.env.GUILLAUME_PHONE;
    process.env.GUILLAUME_PHONE = '';

    try {
      const localManager = new SMSCRMManager({
        supabase: supabase as unknown as SupabaseClient,
        twilioClient: {
          messages: {
            create: twilioCreateMock
          }
        } as unknown as Twilio,
        phoneNumbers: {
          guillaume: 'not-a-number',
          alerts: [''],
          business: []
        },
        now: () => new Date('2024-01-02T03:04:05.000Z')
      });

      await localManager.sendAppointmentReminder({
        customerName: 'Louise',
        address: '2 Main',
        time: '13:00',
        serviceType: 'Réparation'
      });

      expect(twilioCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+15141234567'
        })
      );
    } finally {
      if (previousGuillaume === undefined) {
        delete process.env.GUILLAUME_PHONE;
      } else {
        process.env.GUILLAUME_PHONE = previousGuillaume;
      }
    }
  });
});
