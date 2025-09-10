-- ============================================
-- DRAIN FORTIN CRM - SCHÉMA COMPLET
-- ============================================

-- 1. TABLE CLIENTS
-- ============================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Informations de base
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  
  -- Adresse
  address VARCHAR(500),
  city VARCHAR(100),
  postal_code VARCHAR(10),
  province VARCHAR(50) DEFAULT 'QC',
  sector VARCHAR(50), -- Rive-Sud, Montréal, Rive-Nord
  
  -- Classification
  client_type VARCHAR(50) DEFAULT 'residential', -- residential, commercial, municipal
  priority_level VARCHAR(10), -- P1, P2, P3, P4
  tags TEXT[], -- ['VIP', 'Contrat annuel', 'Urgent']
  
  -- Historique
  first_contact_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contact_date TIMESTAMP WITH TIME ZONE,
  total_services_count INT DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  
  -- Statut
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, blacklist
  notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  
  UNIQUE(phone)
);

-- Index pour recherche rapide
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_postal_code ON clients(postal_code);
CREATE INDEX idx_clients_city ON clients(city);
CREATE INDEX idx_clients_status ON clients(status);

-- 2. TABLE SMS ENVOYÉS
-- ============================================
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  call_id VARCHAR(255),
  intervention_id UUID,
  
  -- Détails SMS
  to_number VARCHAR(20) NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  
  -- Classification
  sms_type VARCHAR(50), -- alert_internal, confirmation, reminder, followup
  priority VARCHAR(10), -- P1, P2, P3, P4
  urgency_level VARCHAR(50), -- immediate, high, medium, low
  
  -- Statut Twilio
  twilio_sid VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  
  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sms_client_id ON sms_messages(client_id);
CREATE INDEX idx_sms_call_id ON sms_messages(call_id);
CREATE INDEX idx_sms_status ON sms_messages(status);
CREATE INDEX idx_sms_sent_at ON sms_messages(sent_at DESC);

-- 3. TABLE INTERVENTIONS/SERVICES
-- ============================================
CREATE TABLE IF NOT EXISTS interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  technician_id UUID,
  call_id VARCHAR(255),
  
  -- Détails service
  service_type VARCHAR(100) NOT NULL, -- debouchage, camera, gainage, drain_francais
  problem_description TEXT,
  solution_provided TEXT,
  
  -- Localisation
  service_address VARCHAR(500),
  service_city VARCHAR(100),
  service_postal_code VARCHAR(10),
  
  -- Planification
  scheduled_date DATE,
  scheduled_time TIME,
  scheduled_window VARCHAR(50), -- AM, PM, 9h-12h, etc
  
  -- Exécution
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INT,
  
  -- Priorité et statut
  priority VARCHAR(10), -- P1, P2, P3, P4
  status VARCHAR(50) DEFAULT 'pending', -- pending, scheduled, in_progress, completed, cancelled
  
  -- Facturation
  quoted_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  payment_method VARCHAR(50), -- cash, interac, credit, cheque
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, partial, overdue
  invoice_number VARCHAR(50),
  
  -- Photos et documents
  photos TEXT[],
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Notes
  technician_notes TEXT,
  customer_feedback TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_interventions_client_id ON interventions(client_id);
CREATE INDEX idx_interventions_technician_id ON interventions(technician_id);
CREATE INDEX idx_interventions_status ON interventions(status);
CREATE INDEX idx_interventions_scheduled_date ON interventions(scheduled_date);
CREATE INDEX idx_interventions_priority ON interventions(priority);

-- 4. TABLE TECHNICIENS
-- ============================================
CREATE TABLE IF NOT EXISTS technicians (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Informations personnelles
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  
  -- Compétences
  specialties TEXT[], -- ['debouchage', 'camera', 'gainage']
  certifications TEXT[],
  experience_years INT,
  
  -- Disponibilité
  available BOOLEAN DEFAULT true,
  working_hours JSONB DEFAULT '{"monday": "8h-17h", "tuesday": "8h-17h"}'::jsonb,
  vacation_dates DATE[],
  
  -- Performance
  total_interventions INT DEFAULT 0,
  average_rating DECIMAL(3,2),
  completion_rate DECIMAL(5,2),
  
  -- Statut
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, vacation
  vehicle_number VARCHAR(50),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLE APPELS VAPI (mise à jour)
-- ============================================
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE vapi_calls ADD COLUMN IF NOT EXISTS intervention_id UUID REFERENCES interventions(id);

-- 6. TABLE ALERTES INTERNES
-- ============================================
CREATE TABLE IF NOT EXISTS internal_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  call_id VARCHAR(255),
  intervention_id UUID REFERENCES interventions(id),
  
  -- Détails alerte
  alert_type VARCHAR(50) NOT NULL, -- urgency, followup, reminder, escalation
  priority VARCHAR(10) NOT NULL, -- P1, P2, P3, P4
  
  -- Contenu
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  client_info JSONB NOT NULL, -- {name, phone, address, problem}
  
  -- Statut
  status VARCHAR(50) DEFAULT 'pending', -- pending, acknowledged, resolved, expired
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Notification
  sms_sent BOOLEAN DEFAULT false,
  sms_message_id UUID REFERENCES sms_messages(id),
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_alerts_client_id ON internal_alerts(client_id);
CREATE INDEX idx_alerts_status ON internal_alerts(status);
CREATE INDEX idx_alerts_priority ON internal_alerts(priority);
CREATE INDEX idx_alerts_created_at ON internal_alerts(created_at DESC);

-- 7. TABLE HISTORIQUE COMMUNICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS communication_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Relations
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  intervention_id UUID REFERENCES interventions(id),
  
  -- Type de communication
  communication_type VARCHAR(50) NOT NULL, -- call_inbound, call_outbound, sms, email, in_person
  direction VARCHAR(20), -- inbound, outbound
  
  -- Contenu
  subject VARCHAR(255),
  content TEXT,
  
  -- Résultat
  outcome VARCHAR(100), -- scheduled, no_answer, voicemail, completed
  notes TEXT,
  
  -- Métadonnées
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

CREATE INDEX idx_comm_history_client_id ON communication_history(client_id);
CREATE INDEX idx_comm_history_created_at ON communication_history(created_at DESC);

-- 8. VUES POUR LE CRM
-- ============================================

-- Vue clients enrichis
CREATE OR REPLACE VIEW clients_enriched AS
SELECT 
  c.*,
  COUNT(DISTINCT i.id) as total_interventions,
  COUNT(DISTINCT s.id) as total_sms,
  MAX(i.scheduled_date) as last_intervention_date,
  MAX(s.sent_at) as last_sms_date,
  COALESCE(SUM(i.final_price), 0) as lifetime_value
FROM clients c
LEFT JOIN interventions i ON c.id = i.client_id
LEFT JOIN sms_messages s ON c.id = s.client_id
GROUP BY c.id;

-- Vue interventions du jour
CREATE OR REPLACE VIEW today_interventions AS
SELECT 
  i.*,
  c.first_name || ' ' || c.last_name as client_name,
  c.phone as client_phone,
  c.address as client_address,
  t.first_name || ' ' || t.last_name as technician_name
FROM interventions i
LEFT JOIN clients c ON i.client_id = c.id
LEFT JOIN technicians t ON i.technician_id = t.id
WHERE i.scheduled_date = CURRENT_DATE
ORDER BY i.priority, i.scheduled_time;

-- Vue alertes actives
CREATE OR REPLACE VIEW active_alerts AS
SELECT 
  ia.*,
  c.first_name || ' ' || c.last_name as client_name,
  c.phone as client_phone,
  EXTRACT(EPOCH FROM (NOW() - ia.created_at))/60 as minutes_since_created
FROM internal_alerts ia
LEFT JOIN clients c ON ia.client_id = c.id
WHERE ia.status IN ('pending', 'acknowledged')
  AND (ia.expires_at IS NULL OR ia.expires_at > NOW())
ORDER BY 
  CASE ia.priority 
    WHEN 'P1' THEN 1 
    WHEN 'P2' THEN 2 
    WHEN 'P3' THEN 3 
    ELSE 4 
  END,
  ia.created_at DESC;

-- 9. FONCTIONS HELPER
-- ============================================

-- Fonction pour créer ou mettre à jour un client
CREATE OR REPLACE FUNCTION upsert_client(
  p_phone VARCHAR,
  p_first_name VARCHAR DEFAULT NULL,
  p_last_name VARCHAR DEFAULT NULL,
  p_email VARCHAR DEFAULT NULL,
  p_address VARCHAR DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL,
  p_postal_code VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_client_id UUID;
BEGIN
  INSERT INTO clients (
    phone, first_name, last_name, email, 
    address, city, postal_code, last_contact_date
  ) VALUES (
    p_phone, p_first_name, p_last_name, p_email,
    p_address, p_city, p_postal_code, NOW()
  )
  ON CONFLICT (phone) DO UPDATE SET
    first_name = COALESCE(EXCLUDED.first_name, clients.first_name),
    last_name = COALESCE(EXCLUDED.last_name, clients.last_name),
    email = COALESCE(EXCLUDED.email, clients.email),
    address = COALESCE(EXCLUDED.address, clients.address),
    city = COALESCE(EXCLUDED.city, clients.city),
    postal_code = COALESCE(EXCLUDED.postal_code, clients.postal_code),
    last_contact_date = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_client_id;
  
  RETURN v_client_id;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer une alerte interne
CREATE OR REPLACE FUNCTION create_internal_alert(
  p_client_id UUID,
  p_priority VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_client_info JSONB,
  p_call_id VARCHAR DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Définir l'expiration selon la priorité
  v_expires_at := CASE p_priority
    WHEN 'P1' THEN NOW() + INTERVAL '30 minutes'
    WHEN 'P2' THEN NOW() + INTERVAL '2 hours'
    WHEN 'P3' THEN NOW() + INTERVAL '4 hours'
    ELSE NOW() + INTERVAL '24 hours'
  END;
  
  INSERT INTO internal_alerts (
    client_id, call_id, priority, title, message, 
    client_info, alert_type, expires_at
  ) VALUES (
    p_client_id, p_call_id, p_priority, p_title, p_message,
    p_client_info, 'urgency', v_expires_at
  )
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGERS
-- ============================================

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interventions_updated_at BEFORE UPDATE ON interventions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. PERMISSIONS (Row Level Security)
-- ============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_alerts ENABLE ROW LEVEL SECURITY;

-- Politiques pour lecture publique (à ajuster selon vos besoins)
CREATE POLICY "Enable read for all authenticated users" ON clients
  FOR SELECT USING (true);

CREATE POLICY "Enable read for all authenticated users" ON interventions
  FOR SELECT USING (true);

CREATE POLICY "Enable read for all authenticated users" ON sms_messages
  FOR SELECT USING (true);

CREATE POLICY "Enable read for all authenticated users" ON internal_alerts
  FOR SELECT USING (true);

-- 12. DONNÉES DE TEST
-- ============================================

-- Insérer quelques techniciens de test
INSERT INTO technicians (first_name, last_name, phone, specialties) VALUES
  ('Marc', 'Tremblay', '514-555-0001', ARRAY['debouchage', 'camera']),
  ('Pierre', 'Dubois', '514-555-0002', ARRAY['gainage', 'drain_francais']),
  ('Jean', 'Lavoie', '514-555-0003', ARRAY['debouchage', 'urgence']);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'CRM Schema created successfully!';
  RAISE NOTICE 'Tables created: clients, sms_messages, interventions, technicians, internal_alerts, communication_history';
  RAISE NOTICE 'Views created: clients_enriched, today_interventions, active_alerts';
  RAISE NOTICE 'Functions created: upsert_client, create_internal_alert';
END $$;