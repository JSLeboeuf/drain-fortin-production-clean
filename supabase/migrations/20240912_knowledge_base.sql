-- Migration: Add Knowledge Base Tables for VAPI Integration
-- Date: 2024-09-12
-- Purpose: Implement VAPI Best Practices for Dynamic Information Retrieval

-- ============================================
-- 1. WEBSITE KNOWLEDGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS website_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'zones', 'services', 'garanties', 'certifications', 
    'processus', 'tarifs', 'horaires', 'testimonials', 'faq'
  )),
  subcategory TEXT,
  content JSONB NOT NULL,
  search_text TEXT, -- For full-text search
  url_source TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_knowledge_category ON website_knowledge(category);
CREATE INDEX idx_knowledge_active ON website_knowledge(is_active);
CREATE INDEX idx_knowledge_search ON website_knowledge 
  USING gin(to_tsvector('french', search_text));

-- Add RLS policies
ALTER TABLE website_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON website_knowledge
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow anon read access" ON website_knowledge
  FOR SELECT USING (is_active = true);

-- ============================================
-- 2. SERVICE AREAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN (
    'montreal', 'rive_sud', 'rive_nord', 'laval', 'ouest_island'
  )),
  postal_codes TEXT[], -- Array of postal codes
  surcharge INTEGER DEFAULT 0,
  typical_response_time TEXT,
  max_distance_km INTEGER,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_areas_city ON service_areas(city);
CREATE INDEX idx_service_areas_zone ON service_areas(zone);
CREATE INDEX idx_service_areas_postal ON service_areas USING gin(postal_codes);

-- RLS
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON service_areas
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow anon read access" ON service_areas
  FOR SELECT USING (active = true);

-- ============================================
-- 3. SERVICE DETAILS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS service_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL UNIQUE CHECK (service_type IN (
    'debouchage', 'camera_inspection', 'racines_alesage',
    'gainage', 'drain_francais', 'installation_cheminee', 'sous_dalle'
  )),
  description TEXT,
  detailed_description TEXT,
  process JSONB, -- Step-by-step process
  typical_duration TEXT,
  price_range JSONB, -- {min: 350, max: 650}
  guarantee TEXT,
  guarantee_years INTEGER,
  required_equipment TEXT[],
  required_certs TEXT[],
  recent_testimonials JSONB,
  common_issues TEXT[],
  prevention_tips TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_service_details_type ON service_details(service_type);

-- RLS
ALTER TABLE service_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON service_details
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow anon read access" ON service_details
  FOR SELECT USING (true);

-- ============================================
-- 4. COMPANY INFO TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS company_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  info_type TEXT NOT NULL UNIQUE CHECK (info_type IN (
    'certifications', 'hours', 'contact', 'warranty',
    'about', 'team', 'history', 'values', 'partners'
  )),
  content JSONB NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_company_info_type ON company_info(info_type);

-- RLS
ALTER TABLE company_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service role full access" ON company_info
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow anon read access" ON company_info
  FOR SELECT USING (is_public = true);

-- ============================================
-- 5. KNOWLEDGE SYNC LOG
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type TEXT NOT NULL,
  source_url TEXT,
  records_updated INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_details JSONB,
  duration_ms INTEGER,
  status TEXT CHECK (status IN ('success', 'partial', 'failed')),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_sync_log_date ON knowledge_sync_log(synced_at DESC);

-- ============================================
-- 6. INSERT DEFAULT DATA
-- ============================================

-- Service Areas
INSERT INTO service_areas (city, zone, postal_codes, surcharge, typical_response_time) VALUES
  ('Montréal', 'montreal', ARRAY['H1A', 'H1B', 'H1C', 'H1E', 'H1G', 'H1H', 'H1J', 'H1K', 'H1L', 'H1M', 'H1N', 'H1P', 'H1R', 'H1S', 'H1T', 'H1V', 'H1W', 'H1X', 'H1Y', 'H1Z', 'H2A', 'H2B', 'H2C', 'H2E', 'H2G', 'H2H', 'H2J', 'H2K', 'H2L', 'H2M', 'H2N', 'H2P', 'H2R', 'H2S', 'H2T', 'H2V', 'H2W', 'H2X', 'H2Y', 'H2Z', 'H3A', 'H3B', 'H3C', 'H3E', 'H3G', 'H3H', 'H3J', 'H3K', 'H3L', 'H3M', 'H3N', 'H3P', 'H3R', 'H3S', 'H3T', 'H3V', 'H3W', 'H3X', 'H3Y', 'H3Z', 'H4A', 'H4B', 'H4C', 'H4E', 'H4G', 'H4H', 'H4J', 'H4K', 'H4L', 'H4M', 'H4N', 'H4P', 'H4R', 'H4S', 'H4T', 'H4V', 'H4W', 'H4X', 'H4Y', 'H4Z'], 0, '2-4 heures'),
  ('Laval', 'laval', ARRAY['H7A', 'H7B', 'H7C', 'H7E', 'H7G', 'H7H', 'H7J', 'H7K', 'H7L', 'H7M', 'H7N', 'H7P', 'H7R', 'H7S', 'H7T', 'H7V', 'H7W', 'H7X', 'H7Y'], 0, '2-4 heures'),
  ('Longueuil', 'rive_sud', ARRAY['J3Y', 'J3Z', 'J4B', 'J4G', 'J4H', 'J4J', 'J4K', 'J4L', 'J4M', 'J4N', 'J4P', 'J4R', 'J4S', 'J4T', 'J4V', 'J4W', 'J4X'], 100, '3-5 heures'),
  ('Brossard', 'rive_sud', ARRAY['J4W', 'J4X', 'J4Y', 'J4Z'], 100, '3-5 heures'),
  ('Saint-Lambert', 'rive_sud', ARRAY['J4P', 'J4R', 'J4S'], 100, '3-5 heures'),
  ('Boucherville', 'rive_sud', ARRAY['J4B'], 100, '3-5 heures'),
  ('Saint-Hubert', 'rive_sud', ARRAY['J3Y', 'J3Z'], 100, '3-5 heures'),
  ('Terrebonne', 'rive_nord', ARRAY['J6V', 'J6W', 'J6X', 'J6Y', 'J7M'], 0, '3-5 heures'),
  ('Blainville', 'rive_nord', ARRAY['J7B', 'J7C', 'J7E'], 0, '3-5 heures'),
  ('Dollard-des-Ormeaux', 'ouest_island', ARRAY['H9A', 'H9B', 'H9G'], 0, '3-5 heures'),
  ('Pointe-Claire', 'ouest_island', ARRAY['H9R', 'H9S'], 0, '3-5 heures')
ON CONFLICT DO NOTHING;

-- Service Details
INSERT INTO service_details (
  service_type, 
  description, 
  typical_duration, 
  price_range,
  guarantee,
  guarantee_years,
  required_certs
) VALUES
  ('debouchage', 
   'Service de débouchage professionnel avec inspection caméra incluse pour identifier la cause exacte du blocage.',
   '1-2 heures',
   '{"min": 350, "max": 650}'::jsonb,
   '30 jours satisfaction garantie',
   0,
   ARRAY['RBQ', 'CMMTQ']),
  
  ('camera_inspection',
   'Inspection par caméra haute définition pour diagnostic précis de l''état de vos canalisations.',
   '30-60 minutes',
   '{"min": 350, "max": 350}'::jsonb,
   'Rapport détaillé fourni',
   0,
   ARRAY['RBQ']),
  
  ('racines_alesage',
   'Enlèvement mécanique des racines par alésage avec mention de gainage si nécessaire.',
   '2-4 heures',
   '{"min": 450, "max": 750}'::jsonb,
   '1 an contre repousse',
   1,
   ARRAY['RBQ', 'CMMTQ']),
  
  ('gainage',
   'Installation de gaine structurale sans excavation pour réhabilitation complète de vos conduites.',
   'Première visite: 2-3 heures',
   '{"min": 350, "max": 750}'::jsonb,
   '25 ans sur matériaux, 5 ans main d''œuvre',
   25,
   ARRAY['RBQ', 'CMMTQ', 'IPEX']),
  
  ('drain_francais',
   'Nettoyage complet de drain français avec vérification des cheminées d''accès.',
   '2-3 heures',
   '{"min": 500, "max": 800}'::jsonb,
   '10 ans étanchéité',
   10,
   ARRAY['RBQ']),
  
  ('installation_cheminee',
   'Installation de cheminées d''accès avec excavation, incluant inspection et nettoyage.',
   '1-2 jours',
   '{"min": 2500, "max": 2500}'::jsonb,
   '15 ans structure',
   15,
   ARRAY['RBQ', 'CCQ']),
  
  ('sous_dalle',
   'Remplacement de plomberie sous dalle de béton avec excavation et remise en état.',
   'Variable selon projet',
   '{"min": 350, "max": 1000}'::jsonb,
   'Selon travaux effectués',
   5,
   ARRAY['RBQ', 'CMMTQ'])
ON CONFLICT (service_type) DO NOTHING;

-- Company Info
INSERT INTO company_info (info_type, content) VALUES
  ('certifications', '{
    "rbq": "À confirmer avec Guillaume",
    "cmmtq": "Membre actif",
    "apchq": "Certifié",
    "autres": ["IPEX Certified", "Aqua-Pipe Authorized"]
  }'::jsonb),
  
  ('hours', '{
    "regular": "6h00 à 15h00",
    "days": "Lundi au vendredi",
    "saturday": "Sur demande",
    "sunday": "Fermé",
    "holidays": "Fermé",
    "emergency": "Service urgence 24/7 via agent IA"
  }'::jsonb),
  
  ('contact', '{
    "phone_main": "438-900-4385",
    "phone_guillaume": "514-529-6037",
    "phone_maxime": "514-617-5425",
    "email": "estimation@drainfortin.ca",
    "website": "https://drainfortin.ca",
    "address": "À confirmer"
  }'::jsonb),
  
  ('warranty', '{
    "general": "Toutes nos interventions sont garanties",
    "debouchage": "30 jours satisfaction",
    "gainage": "25 ans matériaux, 5 ans main d''œuvre",
    "drain_francais": "10 ans étanchéité",
    "racines": "1 an contre repousse",
    "cheminee": "15 ans structure"
  }'::jsonb),
  
  ('about', '{
    "founded": "Plus de 10 ans d''expérience",
    "speciality": "Spécialistes en gainage et drainage",
    "service_area": "Grand Montréal",
    "team_size": "Équipe professionnelle certifiée",
    "values": ["Qualité", "Fiabilité", "Innovation", "Service client"]
  }'::jsonb)
ON CONFLICT (info_type) DO NOTHING;

-- Website Knowledge samples
INSERT INTO website_knowledge (category, content, search_text, url_source) VALUES
  ('zones', 
   '{"title": "Zones de service", "content": "Nous desservons le Grand Montréal incluant Montréal, Laval, Longueuil, Brossard, Saint-Lambert, Terrebonne et plus. Frais de déplacement de 100$ pour la Rive-Sud."}'::jsonb,
   'montreal laval longueuil brossard saint-lambert terrebonne rive-sud rive-nord zones service déplacement',
   '/zones-service'),
  
  ('services',
   '{"title": "Nos services", "content": "Débouchage avec caméra, enlèvement de racines, gainage sans excavation, nettoyage de drain français, installation de cheminées."}'::jsonb,
   'débouchage caméra racines gainage drain français cheminée inspection vidéo',
   '/services'),
  
  ('garanties',
   '{"title": "Nos garanties", "content": "Gainage: 25 ans matériaux et 5 ans main d''œuvre. Débouchage: 30 jours satisfaction. Drain français: 10 ans étanchéité."}'::jsonb,
   'garantie warranty gainage débouchage drain satisfaction matériaux main oeuvre',
   '/garanties'),
  
  ('processus',
   '{"title": "Comment envoyer une vidéo", "content": "Rendez-vous sur drainfortin.ca, cliquez sur Nous contacter, puis sur le bouton Nous envoyer vos vidéos. Incluez nom, adresse et téléphone."}'::jsonb,
   'vidéo video envoyer upload contact formulaire site web',
   '/contact'),
  
  ('faq',
   '{"question": "Prix minimum?", "answer": "Minimum 350$ plus taxes pour tout déplacement, peu importe le service."}'::jsonb,
   'prix minimum déplacement coût tarif',
   '/faq')
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. FUNCTIONS FOR EASY ACCESS
-- ============================================

-- Function to search website knowledge
CREATE OR REPLACE FUNCTION search_knowledge(
  p_category TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content JSONB,
  relevance REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wk.id,
    wk.category,
    wk.content,
    CASE 
      WHEN p_query IS NOT NULL THEN
        ts_rank(to_tsvector('french', wk.search_text), plainto_tsquery('french', p_query))
      ELSE 1.0
    END as relevance
  FROM website_knowledge wk
  WHERE 
    wk.is_active = true
    AND (p_category IS NULL OR wk.category = p_category)
    AND (p_query IS NULL OR 
         to_tsvector('french', wk.search_text) @@ plainto_tsquery('french', p_query))
  ORDER BY relevance DESC, wk.priority DESC
  LIMIT 5;
END;
$$;

-- Function to check service area
CREATE OR REPLACE FUNCTION check_service_area(
  p_city TEXT DEFAULT NULL,
  p_postal TEXT DEFAULT NULL
)
RETURNS TABLE (
  serviced BOOLEAN,
  city TEXT,
  zone TEXT,
  surcharge INTEGER,
  response_time TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as serviced,
    sa.city,
    sa.zone,
    sa.surcharge,
    sa.typical_response_time as response_time
  FROM service_areas sa
  WHERE 
    sa.active = true
    AND (
      (p_city IS NOT NULL AND sa.city ILIKE '%' || p_city || '%')
      OR (p_postal IS NOT NULL AND p_postal = ANY(sa.postal_codes))
    )
  LIMIT 1;
  
  -- If no result, return not serviced
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      false as serviced,
      p_city as city,
      'non_desservi'::TEXT as zone,
      0 as surcharge,
      'Non disponible'::TEXT as response_time;
  END IF;
END;
$$;

-- ============================================
-- 8. TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_website_knowledge_updated_at 
  BEFORE UPDATE ON website_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_areas_updated_at 
  BEFORE UPDATE ON service_areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_details_updated_at 
  BEFORE UPDATE ON service_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_info_updated_at 
  BEFORE UPDATE ON company_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. GRANTS FOR API ACCESS
-- ============================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE website_knowledge IS 'Knowledge base for VAPI assistant with website information';
COMMENT ON TABLE service_areas IS 'Service areas with surcharges and response times';
COMMENT ON TABLE service_details IS 'Detailed information about each service offered';
COMMENT ON TABLE company_info IS 'Company information like certifications, hours, contact';
COMMENT ON TABLE knowledge_sync_log IS 'Log of knowledge base synchronization operations';

COMMENT ON FUNCTION search_knowledge IS 'Search the knowledge base by category and/or query';
COMMENT ON FUNCTION check_service_area IS 'Check if a city or postal code is in service area';