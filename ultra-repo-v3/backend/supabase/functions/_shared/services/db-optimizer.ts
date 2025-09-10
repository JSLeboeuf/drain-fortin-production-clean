import { SupabaseClient } from '@supabase/supabase-js';
import { getCache, generateCacheKey, cached, timed } from './cache-service.ts';

// Optimized database query patterns
export class DatabaseOptimizer {
  private supabase: SupabaseClient;
  private cache = getCache();

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  // Batch fetch with cache
  @timed('batchFetch')
  async batchFetch<T>(
    table: string,
    ids: string[],
    options?: {
      select?: string;
      ttl?: number;
    }
  ): Promise<T[]> {
    const { select = '*', ttl = 60000 } = options || {};
    
    // Check cache for each ID
    const cached: T[] = [];
    const missing: string[] = [];
    
    for (const id of ids) {
      const cacheKey = generateCacheKey(table, id, select);
      const cachedItem = this.cache.get<T>(cacheKey);
      
      if (cachedItem) {
        cached.push(cachedItem);
      } else {
        missing.push(id);
      }
    }
    
    // Fetch missing items in batch
    if (missing.length > 0) {
      const { data, error } = await this.supabase
        .from(table)
        .select(select)
        .in('id', missing);
      
      if (error) throw error;
      
      // Cache individual items
      for (const item of data || []) {
        const cacheKey = generateCacheKey(table, (item as any).id, select);
        this.cache.set(cacheKey, item, ttl);
        cached.push(item as T);
      }
    }
    
    return cached;
  }

  // Optimized paginated query with cursor
  @timed('paginatedQuery')
  async paginatedQuery<T>(
    table: string,
    options: {
      select?: string;
      orderBy?: string;
      ascending?: boolean;
      pageSize?: number;
      cursor?: string;
      filters?: Record<string, any>;
    }
  ) {
    const {
      select = '*',
      orderBy = 'created_at',
      ascending = false,
      pageSize = 50,
      cursor,
      filters = {},
    } = options;

    let query = this.supabase
      .from(table)
      .select(select, { count: 'exact' });

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    // Apply cursor-based pagination
    if (cursor) {
      query = ascending
        ? query.gt(orderBy, cursor)
        : query.lt(orderBy, cursor);
    }

    // Apply ordering and limit
    query = query
      .order(orderBy, { ascending })
      .limit(pageSize);

    const { data, error, count } = await query;

    if (error) throw error;

    // Calculate next cursor
    const nextCursor = data && data.length === pageSize
      ? (data[data.length - 1] as any)[orderBy]
      : null;

    return {
      data: data as T[],
      count,
      nextCursor,
      hasMore: !!nextCursor,
    };
  }

  // Parallel queries with Promise.all
  @timed('parallelQueries')
  async parallelQueries<T extends Record<string, any>>(
    queries: Record<string, () => Promise<any>>
  ): Promise<T> {
    const entries = Object.entries(queries);
    const promises = entries.map(([key, queryFn]) => 
      queryFn().then(result => ({ key, result }))
    );

    const results = await Promise.allSettled(promises);
    const output: any = {};

    for (const result of results) {
      if (result.status === 'fulfilled') {
        output[result.value.key] = result.value.result;
      } else {
        console.error(`Query failed: ${result.reason}`);
        output[result.reason.key] = null;
      }
    }

    return output as T;
  }

  // Optimized JOIN query with select expansion
  @timed('optimizedJoin')
  @cached(120000) // Cache for 2 minutes
  async optimizedJoin<T>(
    table: string,
    options: {
      select?: string;
      joins?: Array<{
        table: string;
        fields: string[];
        as?: string;
      }>;
      filters?: Record<string, any>;
      orderBy?: string;
      limit?: number;
    }
  ): Promise<T[]> {
    const {
      select = '*',
      joins = [],
      filters = {},
      orderBy = 'created_at',
      limit = 100,
    } = options;

    // Build select with joins
    let selectQuery = select;
    for (const join of joins) {
      const fields = join.fields.join(',');
      const alias = join.as || join.table;
      selectQuery += `,${alias}:${join.table}(${fields})`;
    }

    let query = this.supabase
      .from(table)
      .select(selectQuery);

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    // Apply ordering and limit
    query = query
      .order(orderBy, { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) throw error;

    return data as T[];
  }

  // Bulk upsert with conflict resolution
  @timed('bulkUpsert')
  async bulkUpsert<T>(
    table: string,
    records: T[],
    options?: {
      onConflict?: string;
      ignoreDuplicates?: boolean;
    }
  ): Promise<T[]> {
    const { onConflict = 'id', ignoreDuplicates = false } = options || {};

    const { data, error } = await this.supabase
      .from(table)
      .upsert(records, {
        onConflict,
        ignoreDuplicates,
      })
      .select();

    if (error) throw error;

    // Invalidate cache for this table
    this.cache.invalidate(`${table}:*`);

    return data as T[];
  }

  // Optimized aggregation queries
  @timed('aggregate')
  @cached(300000) // Cache for 5 minutes
  async aggregate(
    table: string,
    options: {
      groupBy?: string[];
      aggregates: Array<{
        column: string;
        function: 'count' | 'sum' | 'avg' | 'min' | 'max';
        as: string;
      }>;
      filters?: Record<string, any>;
    }
  ) {
    // Build RPC call for complex aggregation
    const rpcName = `aggregate_${table}`;
    
    try {
      const { data, error } = await this.supabase
        .rpc(rpcName, {
          group_by: options.groupBy || [],
          aggregates: options.aggregates,
          filters: options.filters || {},
        });

      if (error) throw error;

      return data;
    } catch (error) {
      // Fallback to manual aggregation if RPC doesn't exist
      console.warn(`RPC ${rpcName} not found, falling back to manual aggregation`);
      return this.manualAggregate(table, options);
    }
  }

  // Manual aggregation fallback
  private async manualAggregate(
    table: string,
    options: {
      groupBy?: string[];
      aggregates: Array<{
        column: string;
        function: 'count' | 'sum' | 'avg' | 'min' | 'max';
        as: string;
      }>;
      filters?: Record<string, any>;
    }
  ) {
    let query = this.supabase.from(table).select('*');

    // Apply filters
    for (const [key, value] of Object.entries(options.filters || {})) {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    // Manual aggregation in memory (not ideal for large datasets)
    const results = new Map<string, any>();

    for (const row of data || []) {
      const groupKey = options.groupBy
        ? options.groupBy.map(col => (row as any)[col]).join(':')
        : 'all';

      if (!results.has(groupKey)) {
        results.set(groupKey, {
          group: groupKey,
          values: [],
        });
      }

      results.get(groupKey).values.push(row);
    }

    // Calculate aggregates
    const output = [];
    for (const [groupKey, group] of results) {
      const aggregated: any = {};

      if (options.groupBy) {
        options.groupBy.forEach((col, i) => {
          aggregated[col] = groupKey.split(':')[i];
        });
      }

      for (const agg of options.aggregates) {
        const values = group.values.map((row: any) => row[agg.column]);
        
        switch (agg.function) {
          case 'count':
            aggregated[agg.as] = values.length;
            break;
          case 'sum':
            aggregated[agg.as] = values.reduce((a: number, b: number) => a + b, 0);
            break;
          case 'avg':
            aggregated[agg.as] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
            break;
          case 'min':
            aggregated[agg.as] = Math.min(...values);
            break;
          case 'max':
            aggregated[agg.as] = Math.max(...values);
            break;
        }
      }

      output.push(aggregated);
    }

    return output;
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }
}