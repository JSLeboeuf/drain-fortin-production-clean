import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // SQL for missing tables
    const createTablesSQL = `
      -- Table clients
      CREATE TABLE IF NOT EXISTS public.clients (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- 8 champs obligatoires
          nom VARCHAR(255) NOT NULL,
          prenom VARCHAR(255),
          telephone VARCHAR(20) NOT NULL,
          email VARCHAR(255),
          adresse VARCHAR(500) NOT NULL,
          ville VARCHAR(100) NOT NULL,
          code_postal VARCHAR(10),
          province VARCHAR(50) DEFAULT 'QC',
          
          -- Métadonnées
          source VARCHAR(50) DEFAULT 'vapi',
          notes TEXT,
          tags TEXT[],
          
          CONSTRAINT unique_phone UNIQUE(telephone)
      );

      -- Table service_requests
      CREATE TABLE IF NOT EXISTS public.service_requests (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Liens
          client_id UUID REFERENCES public.clients(id),
          call_id UUID REFERENCES public.calls(id),
          
          -- Détails de la demande
          type_service VARCHAR(100) NOT NULL,
          urgence VARCHAR(10) CHECK (urgence IN ('P1', 'P2', 'P3', 'P4')),
          probleme TEXT NOT NULL,
          localisation VARCHAR(255),
          
          -- Statut
          statut VARCHAR(50) DEFAULT 'nouveau',
          date_intervention TIMESTAMP WITH TIME ZONE,
          technicien_assigne VARCHAR(100),
          
          -- Prix (minimum 350$)
          prix_estime DECIMAL(10,2) DEFAULT 350.00,
          prix_final DECIMAL(10,2),
          taxes DECIMAL(10,2),
          total DECIMAL(10,2),
          
          -- Zones spéciales
          is_rive_sud BOOLEAN DEFAULT FALSE,
          is_urgence_nuit BOOLEAN DEFAULT FALSE,
          is_commercial BOOLEAN DEFAULT FALSE,
          
          -- Notes
          notes_client TEXT,
          notes_interne TEXT,
          resolution TEXT,
          
          -- Métadonnées
          metadata JSONB DEFAULT '{}'::jsonb
      );

      -- Table price_calculations  
      CREATE TABLE IF NOT EXISTS public.price_calculations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Liens
          service_request_id UUID REFERENCES public.service_requests(id),
          call_id UUID REFERENCES public.calls(id),
          
          -- Calcul (minimum 350$)
          prix_base DECIMAL(10,2) NOT NULL DEFAULT 350.00,
          type_service VARCHAR(100),
          
          -- Suppléments
          supplement_rive_sud DECIMAL(10,2) DEFAULT 0,
          supplement_urgence DECIMAL(10,2) DEFAULT 0,
          supplement_nuit DECIMAL(10,2) DEFAULT 0,
          supplement_commercial DECIMAL(10,2) DEFAULT 0,
          
          -- Totaux
          sous_total DECIMAL(10,2) NOT NULL,
          tps DECIMAL(10,2) DEFAULT 0,
          tvq DECIMAL(10,2) DEFAULT 0,
          total_taxes DECIMAL(10,2) DEFAULT 0,
          total_final DECIMAL(10,2) NOT NULL,
          
          -- Validation règles business
          respect_minimum BOOLEAN DEFAULT TRUE CHECK (prix_base >= 350),
          
          -- Détails
          calcul_details JSONB DEFAULT '{}'::jsonb,
          notes TEXT
      );

      -- Index pour performance
      CREATE INDEX IF NOT EXISTS idx_clients_telephone ON public.clients(telephone);
      CREATE INDEX IF NOT EXISTS idx_service_requests_urgence ON public.service_requests(urgence);
      CREATE INDEX IF NOT EXISTS idx_service_requests_statut ON public.service_requests(statut);

      -- Enable RLS
      ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;  
      ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

      -- Politique service_role
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'clients' AND policyname = 'Service role has full access to clients'
          ) THEN
              CREATE POLICY "Service role has full access to clients"
                  ON public.clients
                  FOR ALL
                  USING (auth.role() = 'service_role');
          END IF;

          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'service_requests' AND policyname = 'Service role has full access to service_requests'
          ) THEN
              CREATE POLICY "Service role has full access to service_requests"
                  ON public.service_requests
                  FOR ALL
                  USING (auth.role() = 'service_role');
          END IF;

          IF NOT EXISTS (
              SELECT 1 FROM pg_policies 
              WHERE tablename = 'price_calculations' AND policyname = 'Service role has full access to price_calculations'
          ) THEN
              CREATE POLICY "Service role has full access to price_calculations"
                  ON public.price_calculations
                  FOR ALL
                  USING (auth.role() = 'service_role');
          END IF;
      END $$;
    `;

    // Execute the SQL
    const { data, error } = await supabaseClient.rpc('exec_sql', {
      sql: createTablesSQL
    });

    if (error) {
      console.error('SQL execution error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify tables were created
    const tables = ['clients', 'service_requests', 'price_calculations'];
    const verificationResults = {};
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabaseClient
          .from(table)
          .select('count')
          .limit(1);
        
        verificationResults[table] = !tableError;
      } catch (err) {
        verificationResults[table] = false;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Missing tables created successfully',
        timestamp: new Date().toISOString(),
        tables: verificationResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});