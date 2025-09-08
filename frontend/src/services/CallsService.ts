/**
 * CALLS SERVICE - DOMAIN SERVICE IMPLEMENTATION
 * Handles all call-related business logic with optimized data access
 */

import { supabase } from '@/lib/supabase';
import { OptimizedSupabaseClient } from '@/lib/supabaseOptimized';
import { 
  BaseService, 
  BaseRepository, 
  ServiceResult, 
  PaginatedResult, 
  QueryOptions,
  RequiredFieldRule,
  Injectable
} from './BaseService';
import { logger } from '@/lib/logger';

// Domain Models
export interface Call {
  id: string;
  call_id: string;
  phone_number: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  status: 'active' | 'completed' | 'failed';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  customer_name?: string;
  customer_email?: string;
  address?: string;
  problem_description?: string;
  transcript?: string;
  recording_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CallMetrics {
  totalCalls: number;
  activeCalls: number;
  completedCalls: number;
  averageDuration: number;
  callsByHour: Array<{ hour: string; count: number }>;
  priorityDistribution: Record<string, number>;
  completionRate: number;
}

export interface CallFilter {
  status?: string;
  priority?: string;
  dateFrom?: string;
  dateTo?: string;
  customerName?: string;
  phoneNumber?: string;
}

// Repository Implementation
class CallsRepository extends BaseRepository<Call> {
  constructor() {
    super('vapi_calls', `
      id,
      call_id,
      phone_number,
      started_at,
      ended_at,
      duration,
      status,
      priority,
      customer_name,
      customer_email,
      address,
      problem_description,
      transcript,
      recording_url,
      metadata,
      created_at,
      updated_at
    `);
  }

  async findById(id: string): Promise<Call | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectFields)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Failed to find call by ID', { id, error });
      return null;
    }

    return data;
  }

  async findAll(options: QueryOptions = {}): Promise<PaginatedResult<Call>> {
    const { page = 1, pageSize = 25, sortBy, sortOrder, filters } = options;

    let query = supabase
      .from(this.tableName)
      .select(this.selectFields, { count: 'exact' });

    // Apply filters
    query = this.buildFilters(query, filters);
    query = this.applySorting(query, sortBy, sortOrder);
    query = this.applyPagination(query, page, pageSize);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch calls', { error, options });
      return this.transformPaginatedResult([], 0, page, pageSize);
    }

    return this.transformPaginatedResult(data || [], count || 0, page, pageSize);
  }

  async create(call: Omit<Call, 'id' | 'created_at' | 'updated_at'>): Promise<Call> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(call)
      .select(this.selectFields)
      .single();

    if (error) {
      logger.error('Failed to create call', { error, call });
      throw new Error(`Failed to create call: ${error.message}`);
    }

    return data;
  }

  async update(id: string, updates: Partial<Call>): Promise<Call> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(this.selectFields)
      .single();

    if (error) {
      logger.error('Failed to update call', { error, id, updates });
      throw new Error(`Failed to update call: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete call', { error, id });
      return false;
    }

    return true;
  }

  async count(filters?: Record<string, any>): Promise<number> {
    let query = supabase
      .from(this.tableName)
      .select('id', { count: 'exact', head: true });

    query = this.buildFilters(query, filters);

    const { count, error } = await query;

    if (error) {
      logger.error('Failed to count calls', { error, filters });
      return 0;
    }

    return count || 0;
  }

  // Custom query methods
  async findByCallId(callId: string): Promise<Call | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectFields)
      .eq('call_id', callId)
      .single();

    if (error) {
      logger.error('Failed to find call by call_id', { callId, error });
      return null;
    }

    return data;
  }

  async findRecentCalls(limit = 50): Promise<Call[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectFields)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to fetch recent calls', { error });
      return [];
    }

    return data || [];
  }

  async getCallMetrics(timeframe = '24h'): Promise<CallMetrics> {
    const { data, error } = await supabase
      .rpc('get_call_metrics', { time_period: timeframe });

    if (error) {
      logger.error('Failed to fetch call metrics', { error });
      return {
        totalCalls: 0,
        activeCalls: 0,
        completedCalls: 0,
        averageDuration: 0,
        callsByHour: [],
        priorityDistribution: {},
        completionRate: 0
      };
    }

    return data || {};
  }
}

// Service Implementation
@Injectable('CallsService')
export class CallsService extends BaseService {
  private repository = new CallsRepository();

  // Validation rules for calls
  private getValidationRules() {
    return [
      new RequiredFieldRule<Partial<Call>>('call_id', 'Call ID'),
      new RequiredFieldRule<Partial<Call>>('phone_number', 'Phone Number'),
      new RequiredFieldRule<Partial<Call>>('started_at', 'Start Time')
    ];
  }

  /**
   * Get paginated calls with filters and caching
   */
  async getCalls(options: QueryOptions & { filters?: CallFilter } = {}): Promise<ServiceResult<PaginatedResult<Call>>> {
    return this.executeOperation(
      async () => {
        // Use optimized client for better performance
        const result = await OptimizedSupabaseClient.getCallsOptimized(
          options.pageSize || 25,
          ((options.page || 1) - 1) * (options.pageSize || 25)
        );

        if (result.error) {
          throw new Error(result.error);
        }

        // Transform to paginated result format
        const calls = result.data || [];
        const total = await this.repository.count(options.filters);

        return this.transformPaginatedResult(
          calls, 
          total, 
          options.page || 1, 
          options.pageSize || 25
        );
      },
      'Get Calls',
      'Call'
    );
  }

  /**
   * Get call by ID with caching
   */
  async getCallById(id: string): Promise<ServiceResult<Call | null>> {
    return this.executeOperation(
      async () => {
        const call = await this.repository.findById(id);
        
        if (call) {
          await this.publishEvent('call.viewed', call.id, 'Call', { callId: id });
        }

        return call;
      },
      `Get Call ${id}`,
      'Call'
    );
  }

  /**
   * Create new call with validation
   */
  async createCall(callData: Omit<Call, 'id' | 'created_at' | 'updated_at'>): Promise<ServiceResult<Call>> {
    return this.executeOperation(
      async () => {
        // Validate call data
        const validation = this.validateEntity(callData, this.getValidationRules());
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const call = await this.repository.create(callData);

        // Clear cache and publish event
        this.invalidateCache('calls');
        await this.publishEvent('call.created', call.id, 'Call', call);

        return call;
      },
      'Create Call',
      'Call'
    );
  }

  /**
   * Update call with optimistic updates
   */
  async updateCall(id: string, updates: Partial<Call>): Promise<ServiceResult<Call>> {
    return this.executeOperation(
      async () => {
        const call = await this.repository.update(id, updates);

        // Clear cache and publish event
        this.invalidateCache('calls');
        await this.publishEvent('call.updated', call.id, 'Call', { updates, call });

        return call;
      },
      `Update Call ${id}`,
      'Call'
    );
  }

  /**
   * Delete call with cleanup
   */
  async deleteCall(id: string): Promise<ServiceResult<boolean>> {
    return this.executeOperation(
      async () => {
        const success = await this.repository.delete(id);

        if (success) {
          // Clear cache and publish event
          this.invalidateCache('calls');
          await this.publishEvent('call.deleted', id, 'Call', { callId: id });
        }

        return success;
      },
      `Delete Call ${id}`,
      'Call'
    );
  }

  /**
   * Get recent calls with caching
   */
  async getRecentCalls(limit = 50): Promise<ServiceResult<Call[]>> {
    return this.executeOperation(
      async () => {
        return await this.repository.findRecentCalls(limit);
      },
      'Get Recent Calls',
      'Call'
    );
  }

  /**
   * Get call metrics with caching
   */
  async getCallMetrics(timeframe = '24h'): Promise<ServiceResult<CallMetrics>> {
    return this.executeOperation(
      async () => {
        return await this.repository.getCallMetrics(timeframe);
      },
      'Get Call Metrics',
      'Call'
    );
  }

  /**
   * Search calls by criteria
   */
  async searchCalls(
    query: string,
    options: QueryOptions = {}
  ): Promise<ServiceResult<PaginatedResult<Call>>> {
    return this.executeOperation(
      async () => {
        const filters = {
          ...options.filters,
          or: `customer_name.ilike.%${query}%,phone_number.ilike.%${query}%,problem_description.ilike.%${query}%`
        };

        return await this.repository.findAll({
          ...options,
          filters
        });
      },
      `Search Calls: ${query}`,
      'Call'
    );
  }

  /**
   * Batch update calls
   */
  async batchUpdateCalls(
    updates: Array<{ id: string; data: Partial<Call> }>
  ): Promise<ServiceResult<Call[]>> {
    return this.executeOperation(
      async () => {
        const updatedCalls: Call[] = [];

        // Use transaction-like approach with Promise.all
        const promises = updates.map(async ({ id, data }) => {
          const call = await this.repository.update(id, data);
          updatedCalls.push(call);
          return call;
        });

        await Promise.all(promises);

        // Clear cache and publish batch event
        this.invalidateCache('calls');
        await this.publishEvent('calls.batch_updated', 'batch', 'Call', {
          count: updatedCalls.length,
          callIds: updatedCalls.map(c => c.id)
        });

        return updatedCalls;
      },
      'Batch Update Calls',
      'Call'
    );
  }

  /**
   * Export calls data
   */
  async exportCalls(
    filters?: CallFilter,
    format: 'json' | 'csv' = 'json'
  ): Promise<ServiceResult<string>> {
    return this.executeOperation(
      async () => {
        const calls = await this.repository.findAll({ filters, pageSize: 10000 });
        
        if (format === 'csv') {
          return this.convertToCSV(calls.items);
        }

        return JSON.stringify(calls.items, null, 2);
      },
      'Export Calls',
      'Call'
    );
  }

  private convertToCSV(calls: Call[]): string {
    if (calls.length === 0) return '';

    const headers = [
      'ID', 'Call ID', 'Phone', 'Started At', 'Duration', 
      'Status', 'Priority', 'Customer', 'Problem'
    ];

    const rows = calls.map(call => [
      call.id,
      call.call_id,
      call.phone_number,
      call.started_at,
      call.duration?.toString() || '',
      call.status,
      call.priority,
      call.customer_name || '',
      call.problem_description || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

// Export singleton instance
export const callsService = new CallsService();