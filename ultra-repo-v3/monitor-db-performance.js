/**
 * Database Performance Monitoring - Maria Rodriguez
 * Real-time monitoring and optimization recommendations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class DatabasePerformanceMonitor {
  constructor() {
    this.metrics = {
      queryTimes: [],
      slowQueries: [],
      cacheHitRate: 0,
      connectionPoolUsage: 0,
      tableSize: {},
      indexUsage: {},
      deadTuples: {}
    };
    
    this.thresholds = {
      slowQueryMs: 100,
      cacheHitRateMin: 0.95,
      deadTuplesMax: 0.10,
      connectionPoolMax: 0.80
    };
  }

  async analyzeQueryPerformance() {
    console.log("\n📊 ANALYZING QUERY PERFORMANCE...");
    
    // Test common query patterns
    const queries = [
      {
        name: "Recent calls lookup",
        query: `
          SELECT call_id, phone_number, status, duration
          FROM vapi_calls
          WHERE started_at > NOW() - INTERVAL '24 hours'
          ORDER BY started_at DESC
          LIMIT 100
        `
      },
      {
        name: "Phone number search",
        query: `
          SELECT * FROM vapi_calls
          WHERE phone_number = '450-280-3222'
          ORDER BY started_at DESC
          LIMIT 10
        `
      },
      {
        name: "Dashboard metrics",
        query: `
          SELECT 
            COUNT(*) as total_calls,
            COUNT(DISTINCT phone_number) as unique_callers,
            AVG(duration) as avg_duration,
            COUNT(*) FILTER (WHERE priority = 'P1') as urgent_calls
          FROM vapi_calls
          WHERE started_at > NOW() - INTERVAL '24 hours'
        `
      },
      {
        name: "Lead conversion rate",
        query: `
          SELECT 
            service_type,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'converted') as converted,
            AVG(estimated_value) as avg_value
          FROM leads
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY service_type
        `
      }
    ];

    for (const q of queries) {
      const startTime = performance.now();
      
      try {
        const { data, error } = await supabase.rpc('explain_analyze', {
          query_text: q.query
        }).single();
        
        const executionTime = performance.now() - startTime;
        
        this.metrics.queryTimes.push({
          name: q.name,
          time: executionTime,
          plan: data?.plan
        });
        
        console.log(`\n✅ ${q.name}`);
        console.log(`   Execution time: ${executionTime.toFixed(2)}ms`);
        
        if (executionTime > this.thresholds.slowQueryMs) {
          console.log(`   ⚠️ SLOW QUERY DETECTED!`);
          this.metrics.slowQueries.push(q.name);
        }
        
      } catch (error) {
        console.error(`❌ Failed to analyze: ${q.name}`, error.message);
      }
    }
  }

  async checkIndexUsage() {
    console.log("\n🔍 CHECKING INDEX USAGE...");
    
    const { data: indexes } = await supabase.rpc('get_index_usage');
    
    if (indexes) {
      const unusedIndexes = indexes.filter(idx => idx.idx_scan === 0);
      const inefficientIndexes = indexes.filter(idx => 
        idx.idx_scan > 0 && idx.idx_tup_read / idx.idx_scan > 1000
      );
      
      console.log(`\n📈 Index Statistics:`);
      console.log(`   Total indexes: ${indexes.length}`);
      console.log(`   Unused indexes: ${unusedIndexes.length}`);
      console.log(`   Inefficient indexes: ${inefficientIndexes.length}`);
      
      if (unusedIndexes.length > 0) {
        console.log(`\n   ⚠️ Unused indexes (consider removing):`);
        unusedIndexes.forEach(idx => {
          console.log(`      - ${idx.indexname} on ${idx.tablename}`);
        });
      }
      
      if (inefficientIndexes.length > 0) {
        console.log(`\n   ⚠️ Inefficient indexes (consider rebuilding):`);
        inefficientIndexes.forEach(idx => {
          console.log(`      - ${idx.indexname} (${idx.idx_tup_read / idx.idx_scan} tuples/scan)`);
        });
      }
    }
  }

  async analyzeCachePerformance() {
    console.log("\n💾 ANALYZING CACHE PERFORMANCE...");
    
    const { data: cacheStats } = await supabase.rpc('get_cache_stats').single();
    
    if (cacheStats) {
      const hitRate = cacheStats.heap_hit_rate || 0;
      this.metrics.cacheHitRate = hitRate;
      
      console.log(`\n   Cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
      console.log(`   Buffer cache size: ${cacheStats.buffer_cache_size}`);
      
      if (hitRate < this.thresholds.cacheHitRateMin) {
        console.log(`   ⚠️ LOW CACHE HIT RATE!`);
        console.log(`   💡 Recommendations:`);
        console.log(`      - Increase shared_buffers`);
        console.log(`      - Add more RAM to server`);
        console.log(`      - Optimize frequent queries`);
      }
    }
  }

  async checkTableBloat() {
    console.log("\n🗑️ CHECKING TABLE BLOAT...");
    
    const tables = ['vapi_calls', 'call_logs', 'leads', 'appointments'];
    
    for (const table of tables) {
      const { data: stats } = await supabase.rpc('get_table_stats', { 
        table_name: table 
      }).single();
      
      if (stats) {
        const deadRatio = stats.n_dead_tup / (stats.n_live_tup + stats.n_dead_tup) || 0;
        this.metrics.deadTuples[table] = deadRatio;
        
        console.log(`\n   Table: ${table}`);
        console.log(`      Live tuples: ${stats.n_live_tup}`);
        console.log(`      Dead tuples: ${stats.n_dead_tup}`);
        console.log(`      Dead ratio: ${(deadRatio * 100).toFixed(2)}%`);
        
        if (deadRatio > this.thresholds.deadTuplesMax) {
          console.log(`      ⚠️ HIGH BLOAT - Run VACUUM!`);
        }
      }
    }
  }

  async generateOptimizationReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📋 MARIA'S OPTIMIZATION REPORT");
    console.log("=".repeat(60));
    
    // Query Performance Summary
    const avgQueryTime = this.metrics.queryTimes.reduce((sum, q) => sum + q.time, 0) / 
                        this.metrics.queryTimes.length || 0;
    
    console.log("\n⚡ PERFORMANCE SUMMARY:");
    console.log(`   Average query time: ${avgQueryTime.toFixed(2)}ms`);
    console.log(`   Slow queries: ${this.metrics.slowQueries.length}`);
    console.log(`   Cache hit rate: ${(this.metrics.cacheHitRate * 100).toFixed(2)}%`);
    
    // Critical Issues
    console.log("\n🚨 CRITICAL ISSUES:");
    
    let criticalCount = 0;
    
    if (this.metrics.slowQueries.length > 0) {
      criticalCount++;
      console.log(`   ${criticalCount}. Slow queries detected:`);
      this.metrics.slowQueries.forEach(q => console.log(`      - ${q}`));
    }
    
    if (this.metrics.cacheHitRate < this.thresholds.cacheHitRateMin) {
      criticalCount++;
      console.log(`   ${criticalCount}. Cache hit rate below threshold`);
    }
    
    const bloatedTables = Object.entries(this.metrics.deadTuples)
      .filter(([_, ratio]) => ratio > this.thresholds.deadTuplesMax);
    
    if (bloatedTables.length > 0) {
      criticalCount++;
      console.log(`   ${criticalCount}. Tables with high bloat:`);
      bloatedTables.forEach(([table, ratio]) => 
        console.log(`      - ${table}: ${(ratio * 100).toFixed(2)}% dead tuples`)
      );
    }
    
    if (criticalCount === 0) {
      console.log("   ✅ No critical issues found!");
    }
    
    // Optimization Recommendations
    console.log("\n💡 MARIA'S RECOMMENDATIONS:");
    
    if (avgQueryTime > 50) {
      console.log("   1. Query Optimization:");
      console.log("      - Review and optimize slow queries");
      console.log("      - Add missing indexes");
      console.log("      - Consider materialized views for complex aggregations");
    }
    
    if (this.metrics.cacheHitRate < 0.99) {
      console.log("   2. Cache Optimization:");
      console.log("      - Increase shared_buffers to 25% of RAM");
      console.log("      - Enable query result caching");
      console.log("      - Implement Redis for application-level caching");
    }
    
    if (bloatedTables.length > 0) {
      console.log("   3. Maintenance Tasks:");
      console.log("      - Run VACUUM ANALYZE on bloated tables");
      console.log("      - Configure more aggressive autovacuum");
      console.log("      - Consider partitioning for large tables");
    }
    
    // Performance Score
    let score = 100;
    score -= this.metrics.slowQueries.length * 10;
    score -= (1 - this.metrics.cacheHitRate) * 100;
    score -= bloatedTables.length * 5;
    score = Math.max(0, Math.min(100, score));
    
    console.log("\n🏆 PERFORMANCE SCORE: " + score + "/100");
    
    if (score >= 90) {
      console.log("   Grade: A - Excellent performance!");
    } else if (score >= 80) {
      console.log("   Grade: B - Good, minor optimizations needed");
    } else if (score >= 70) {
      console.log("   Grade: C - Acceptable, but needs improvement");
    } else {
      console.log("   Grade: D - Poor performance, immediate action required!");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("Maria Rodriguez - 'Chaque requête doit être une œuvre d'art'");
    console.log("=".repeat(60));
  }

  async runFullAnalysis() {
    console.log("🚀 STARTING DATABASE PERFORMANCE ANALYSIS");
    console.log("="."=".repeat(60));
    
    await this.analyzeQueryPerformance();
    await this.checkIndexUsage();
    await this.analyzeCachePerformance();
    await this.checkTableBloat();
    await this.generateOptimizationReport();
  }
}

// Helper RPC functions (add to Supabase)
const rpcFunctions = `
-- Add these functions to Supabase SQL Editor

CREATE OR REPLACE FUNCTION explain_analyze(query_text TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    plan JSON;
BEGIN
    EXECUTE 'EXPLAIN (ANALYZE, FORMAT JSON) ' || query_text INTO plan;
    RETURN plan;
END;
$$;

CREATE OR REPLACE FUNCTION get_index_usage()
RETURNS TABLE(
    tablename TEXT,
    indexname TEXT,
    idx_scan BIGINT,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT
)
LANGUAGE sql
AS $$
    SELECT 
        tablename::TEXT,
        indexname::TEXT,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
    FROM pg_stat_user_indexes
    ORDER BY idx_scan;
$$;

CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS JSON
LANGUAGE sql
AS $$
    SELECT json_build_object(
        'heap_hit_rate', 
        CASE 
            WHEN heap_read + heap_hit > 0 
            THEN heap_hit::float / (heap_read + heap_hit) 
            ELSE 0 
        END,
        'buffer_cache_size', pg_size_pretty(pg_database_size(current_database()))
    )
    FROM pg_stat_database
    WHERE datname = current_database();
$$;

CREATE OR REPLACE FUNCTION get_table_stats(table_name TEXT)
RETURNS JSON
LANGUAGE sql
AS $$
    SELECT json_build_object(
        'n_live_tup', n_live_tup,
        'n_dead_tup', n_dead_tup,
        'last_vacuum', last_vacuum,
        'last_autovacuum', last_autovacuum
    )
    FROM pg_stat_user_tables
    WHERE tablename = table_name;
$$;
`;

// Run monitor
if (require.main === module) {
  const monitor = new DatabasePerformanceMonitor();
  
  monitor.runFullAnalysis().catch(err => {
    console.error("❌ Monitoring failed:", err);
    process.exit(1);
  });
}

module.exports = DatabasePerformanceMonitor;