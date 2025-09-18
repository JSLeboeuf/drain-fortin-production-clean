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
  it('normalizes phone numbers by trimming and removing duplicates', () => {
    const result = normalizePhoneNumbers([' +15550000001 ', null, '', '+15550000001', '+15550000002']);

    expect(result).toEqual(['+15550000001', '+15550000002']);
  });

  it('applies the default country code when numbers are provided without a prefix', () => {
    const result = normalizePhoneNumbers(['514-555-0001', '(514) 555-0002']);

    expect(result).toEqual(['+15145550001', '+15145550002']);
  });

  it('converts international prefixes and strips invalid characters', () => {
    const result = normalizePhoneNumbers(['00 44 1234 567890']);

    expect(result).toEqual(['+441234567890']);
  });

  it('skips invalid numbers and reports them to the callback', () => {
    const invalidValues: string[] = [];

    const result = normalizePhoneNumbers(['abc', '+0000', ''], {
      onInvalid: value => invalidValues.push(value)
    });

    expect(result).toEqual([]);
    expect(invalidValues).toEqual(['abc', '+0000']);
  });
});

describe('SMSCRMManager', () => {
  let supabase: SupabaseMock;
  let twilioCreateMock: ReturnType<typeof vi.fn>;
  let manager: SMSCRMManager;
  let originalGuillaumePhone: string | undefined;

  beforeEach(() => {
    originalGuillaumePhone = process.env.GUILLAUME_PHONE;
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
    process.env.GUILLAUME_PHONE = originalGuillaumePhone;
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

    expect(response).toEqual({
      success: true,
      message: 'SMS envoyé avec succès',
      recipients: ['+15550000001', '+15550000002']
    });
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
  });

  it('falls back to the environment Guillaume number when override is invalid', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.GUILLAUME_PHONE = '15145550004';

    manager = new SMSCRMManager({
      supabase: supabase as unknown as SupabaseClient,
      twilioClient: {
        messages: {
          create: twilioCreateMock
        }
      } as unknown as Twilio,
      twilioFrom: '+15559998888',
      phoneNumbers: {
        guillaume: 'not-a-number'
      },
      now: () => new Date('2024-01-02T03:04:05.000Z')
    });

    twilioCreateMock.mockClear();

    await manager.sendAppointmentReminder({
      customerName: 'Fallback Test',
      address: '123 Rue Principale',
      time: '14:00',
      serviceType: 'Inspection'
    });

    expect(twilioCreateMock).toHaveBeenCalledTimes(1);
    expect(twilioCreateMock.mock.calls[0][0].to).toBe('+15145550004');
    expect(warnSpy).toHaveBeenCalledWith(
      '[SMSCRMManager] Invalid Guillaume override phone number skipped: not-a-number'
    );

    warnSpy.mockRestore();
  });
});
