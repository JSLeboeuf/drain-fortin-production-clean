// Call service for handling VAPI call operations with improved architecture
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { DatabaseError, ValidationError, NotFoundError } from '../utils/errors.ts';
import { withDatabaseRetry } from '../utils/retry.ts';
import { logger } from '../utils/logging.ts';

export interface CallData {
  id: string;
  assistantId: string;
  phoneNumber?: string;
  customerId?: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  analysis?: any;
}

export interface CallEndData {
  callId: string;
  analysis?: any;
  customerData?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    description?: string;
  };
  priorityData?: {
    priority: 'P1' | 'P2' | 'P3' | 'P4';
    reason: string;
    slaSeconds: number;
  };
}

export interface TranscriptData {
  callId: string;
  role: 'user' | 'assistant';
  message: string;
  confidence?: number;
  timestamp: string;
}

export interface ToolCallData {
  callId: string;
  toolName: string;
  toolCallId: string;
  arguments: any;
  result?: any;
  executedAt?: string;
}

export class CallService {
  constructor(private supabase: SupabaseClient) {}

  // Create or update call record
  async upsertCall(callData: CallData): Promise<void> {
    logger.info('Upserting call record', { 
      callId: callData.id,
      status: callData.status 
    });

    const operationId = logger.startOperation('upsert_call');

    try {
      await withDatabaseRetry(async () => {
        const { error } = await this.supabase
          .from('vapi_calls')
          .upsert({
            call_id: callData.id,
            assistant_id: callData.assistantId,
            phone_number: callData.phoneNumber,
            customer_id: callData.customerId,
            status: callData.status,
            started_at: callData.startedAt || new Date().toISOString(),
            ended_at: callData.endedAt,
            call_duration: callData.duration,
            analysis: callData.analysis
          }, { onConflict: 'call_id' });

        if (error) {
          throw new DatabaseError('Failed to upsert call record', 'upsert', error);
        }
      });

      logger.endOperation('upsert_call', operationId, { callId: callData.id });
    } catch (error) {
      logger.failOperation('upsert_call', operationId, error as Error, { callId: callData.id });
      throw error;
    }
  }

  // Process call end with transaction
  async processCallEnd(data: CallEndData): Promise<any> {
    logger.info('Processing call end', { 
      callId: data.callId,
      hasCustomerData: !!data.customerData,
      priority: data.priorityData?.priority
    });

    const operationId = logger.startOperation('process_call_end');

    try {
      const result = await withDatabaseRetry(async () => {
        const { data: result, error } = await this.supabase.rpc('process_call_end', {
          call_id_param: data.callId,
          analysis_param: data.analysis || null,
          customer_data_param: data.customerData ? JSON.stringify(data.customerData) : null,
          priority_data_param: data.priorityData ? JSON.stringify(data.priorityData) : null
        });

        if (error) {
          throw new DatabaseError('Failed to process call end', 'rpc_call', error);
        }

        return result;
      });

      if (!result?.success) {
        throw new DatabaseError(
          `Call end processing failed: ${result?.error || 'Unknown error'}`,
          'process_call_end',
          result
        );
      }

      logger.endOperation('process_call_end', operationId, { 
        callId: data.callId,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.failOperation('process_call_end', operationId, error as Error, { 
        callId: data.callId 
      });
      throw error;
    }
  }

  // Add transcript entry
  async addTranscript(data: TranscriptData): Promise<void> {
    logger.debug('Adding call transcript', { 
      callId: data.callId,
      role: data.role,
      messageLength: data.message?.length || 0
    });

    if (!data.callId || !data.message || !data.role) {
      throw new ValidationError('Missing required transcript data', 'transcript');
    }

    try {
      await withDatabaseRetry(async () => {
        const { error } = await this.supabase
          .from('call_transcripts')
          .insert({
            call_id: data.callId,
            role: data.role,
            message: data.message,
            confidence: data.confidence,
            timestamp: data.timestamp || new Date().toISOString()
          });

        if (error) {
          throw new DatabaseError('Failed to insert transcript', 'insert', error);
        }
      });

      logger.debug('Transcript added successfully', { callId: data.callId });
    } catch (error) {
      logger.error('Failed to add transcript', error as Error, { 
        callId: data.callId,
        role: data.role
      });
      throw error;
    }
  }

  // Add tool call record
  async addToolCall(data: ToolCallData): Promise<void> {
    logger.debug('Adding tool call record', { 
      callId: data.callId,
      toolName: data.toolName,
      toolCallId: data.toolCallId
    });

    if (!data.callId || !data.toolName || !data.toolCallId) {
      throw new ValidationError('Missing required tool call data', 'tool_call');
    }

    try {
      await withDatabaseRetry(async () => {
        const { error } = await this.supabase
          .from('tool_calls')
          .insert({
            call_id: data.callId,
            tool_name: data.toolName,
            tool_call_id: data.toolCallId,
            arguments: data.arguments,
            result: data.result,
            executed_at: data.executedAt,
            timestamp: new Date().toISOString()
          });

        if (error) {
          throw new DatabaseError('Failed to insert tool call', 'insert', error);
        }
      });

      logger.debug('Tool call added successfully', { 
        callId: data.callId,
        toolName: data.toolName
      });
    } catch (error) {
      logger.error('Failed to add tool call', error as Error, { 
        callId: data.callId,
        toolName: data.toolName
      });
      throw error;
    }
  }

  // Get call details
  async getCall(callId: string): Promise<any> {
    logger.debug('Fetching call details', { callId });

    try {
      const { data, error } = await withDatabaseRetry(async () => {
        return this.supabase
          .from('vapi_calls')
          .select('*')
          .eq('call_id', callId)
          .single();
      });

      if (error) {
        if (error.code === 'PGRST116') { // No rows returned
          throw new NotFoundError('Call', callId);
        }
        throw new DatabaseError('Failed to fetch call', 'select', error);
      }

      logger.debug('Call fetched successfully', { callId });
      return data;
    } catch (error) {
      logger.error('Failed to fetch call', error as Error, { callId });
      throw error;
    }
  }

  // Get call transcripts
  async getCallTranscripts(callId: string, limit = 100): Promise<any[]> {
    logger.debug('Fetching call transcripts', { callId, limit });

    try {
      const { data, error } = await withDatabaseRetry(async () => {
        return this.supabase
          .from('call_transcripts')
          .select('*')
          .eq('call_id', callId)
          .order('timestamp', { ascending: true })
          .limit(limit);
      });

      if (error) {
        throw new DatabaseError('Failed to fetch transcripts', 'select', error);
      }

      logger.debug('Transcripts fetched successfully', { 
        callId, 
        count: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch transcripts', error as Error, { callId });
      throw error;
    }
  }

  // Get call tool calls
  async getCallToolCalls(callId: string): Promise<any[]> {
    logger.debug('Fetching call tool calls', { callId });

    try {
      const { data, error } = await withDatabaseRetry(async () => {
        return this.supabase
          .from('tool_calls')
          .select('*')
          .eq('call_id', callId)
          .order('timestamp', { ascending: true });
      });

      if (error) {
        throw new DatabaseError('Failed to fetch tool calls', 'select', error);
      }

      logger.debug('Tool calls fetched successfully', { 
        callId, 
        count: data?.length || 0 
      });

      return data || [];
    } catch (error) {
      logger.error('Failed to fetch tool calls', error as Error, { callId });
      throw error;
    }
  }

  // Update tool call with result
  async updateToolCallResult(toolCallId: string, result: any): Promise<void> {
    logger.debug('Updating tool call result', { toolCallId });

    try {
      await withDatabaseRetry(async () => {
        const { error } = await this.supabase
          .from('tool_calls')
          .update({
            result,
            executed_at: new Date().toISOString()
          })
          .eq('tool_call_id', toolCallId);

        if (error) {
          throw new DatabaseError('Failed to update tool call result', 'update', error);
        }
      });

      logger.debug('Tool call result updated successfully', { toolCallId });
    } catch (error) {
      logger.error('Failed to update tool call result', error as Error, { toolCallId });
      throw error;
    }
  }

  // Get call statistics
  async getCallStats(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<any> {
    logger.debug('Fetching call statistics', { timeframe });

    const intervals = {
      hour: '1 hour',
      day: '1 day', 
      week: '7 days'
    };

    try {
      const { data, error } = await withDatabaseRetry(async () => {
        return this.supabase.rpc('get_call_stats', {
          interval_param: intervals[timeframe]
        });
      });

      if (error) {
        throw new DatabaseError('Failed to fetch call stats', 'rpc_call', error);
      }

      logger.debug('Call stats fetched successfully', { timeframe });
      return data;
    } catch (error) {
      logger.error('Failed to fetch call stats', error as Error, { timeframe });
      throw error;
    }
  }

  // Health check for call service
  async healthCheck(): Promise<{ healthy: boolean; message: string; details?: any }> {
    try {
      // Simple connectivity test
      const { data, error } = await this.supabase
        .from('vapi_calls')
        .select('count(*)')
        .limit(1);

      if (error) {
        return {
          healthy: false,
          message: 'Database connectivity failed',
          details: error
        };
      }

      return {
        healthy: true,
        message: 'Call service operational'
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Call service error',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}