import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: boolean
    auth: boolean
    storage: boolean
    realtime: boolean
    functions: boolean
  }
  metrics?: {
    responseTime: number
    memoryUsage: number
    cpuUsage?: number
    activeConnections?: number
  }
  errors: string[]
}

const startTime = Date.now()

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json'
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const health: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: false,
      auth: false,
      storage: false,
      realtime: false,
      functions: true // This function is running
    },
    errors: []
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check database connectivity
    try {
      const dbStart = Date.now()
      const { error: dbError } = await supabase
        .from('health_check')
        .select('id')
        .limit(1)
        .single()
      
      // It's OK if the table doesn't exist, we just want to check connectivity
      if (!dbError || dbError.code === 'PGRST116') {
        health.checks.database = true
      } else {
        throw dbError
      }
      
      const dbTime = Date.now() - dbStart
      health.metrics = { ...health.metrics, responseTime: dbTime }
    } catch (error) {
      health.errors.push(`Database check failed: ${error.message}`)
      health.status = 'degraded'
    }

    // Check auth service
    try {
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1
      })
      
      if (!authError) {
        health.checks.auth = true
      } else {
        throw authError
      }
    } catch (error) {
      health.errors.push(`Auth check failed: ${error.message}`)
      health.status = 'degraded'
    }

    // Check storage service
    try {
      const { data: buckets, error: storageError } = await supabase
        .storage
        .listBuckets()
      
      if (!storageError) {
        health.checks.storage = true
      } else {
        throw storageError
      }
    } catch (error) {
      health.errors.push(`Storage check failed: ${error.message}`)
      health.status = 'degraded'
    }

    // Check realtime connectivity
    try {
      // Simple check - if we can create a channel, realtime is available
      const channel = supabase.channel('health-check')
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          health.checks.realtime = true
        }
      })
      
      // Give it a moment to connect
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Cleanup
      await supabase.removeChannel(channel)
      
      if (!health.checks.realtime) {
        health.errors.push('Realtime connection timeout')
        health.status = 'degraded'
      }
    } catch (error) {
      health.errors.push(`Realtime check failed: ${error.message}`)
      health.status = 'degraded'
    }

    // Add memory usage metrics
    if (health.metrics) {
      health.metrics.memoryUsage = Math.round(
        (Deno.memoryUsage().heapUsed / 1024 / 1024) * 100
      ) / 100 // MB with 2 decimal places
    }

    // Determine overall health status
    const criticalChecks = ['database', 'auth']
    const criticalFailed = criticalChecks.some(check => !health.checks[check])
    
    if (criticalFailed) {
      health.status = 'unhealthy'
    } else if (health.errors.length > 0) {
      health.status = 'degraded'
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503

    return new Response(
      JSON.stringify(health, null, 2),
      { 
        status: statusCode,
        headers: corsHeaders 
      }
    )

  } catch (error) {
    // Critical error - service is unhealthy
    health.status = 'unhealthy'
    health.errors.push(`Critical error: ${error.message}`)
    
    return new Response(
      JSON.stringify(health, null, 2),
      { 
        status: 503,
        headers: corsHeaders 
      }
    )
  }
})