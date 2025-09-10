-- =====================================================
-- Migration: Outlook Integration Tables
-- Description: Tables pour l'intégration Microsoft Outlook
-- Version: 2.0.0
-- Date: 2025-01-10
-- Author: Claude Code - Anthropic
-- =====================================================

-- ===== EXTENSIONS REQUISES =====
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===== SCHÉMA OUTLOOK =====
CREATE SCHEMA IF NOT EXISTS outlook;
COMMENT ON SCHEMA outlook IS 'Microsoft Outlook Integration Schema';

-- ===== TABLE: outlook_users =====
-- Stockage des informations utilisateur Outlook
CREATE TABLE outlook.outlook_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informations Outlook
    outlook_user_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    given_name VARCHAR(255),
    surname VARCHAR(255),
    job_title VARCHAR(255),
    department VARCHAR(255),
    company_name VARCHAR(255),
    mobile_phone VARCHAR(50),
    business_phones TEXT[], -- Array de numéros
    office_location VARCHAR(255),
    preferred_language VARCHAR(10),
    
    -- Métadonnées
    tenant_id VARCHAR(255),
    last_sign_in TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, outlook_user_id)
);

-- Index pour performance
CREATE INDEX idx_outlook_users_user_id ON outlook.outlook_users(user_id);
CREATE INDEX idx_outlook_users_email ON outlook.outlook_users(email);
CREATE INDEX idx_outlook_users_outlook_id ON outlook.outlook_users(outlook_user_id);

-- ===== TABLE: outlook_auth_tokens =====
-- Stockage sécurisé des tokens OAuth2 (chiffrés)
CREATE TABLE outlook.outlook_auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlook_user_id VARCHAR(255) NOT NULL,
    
    -- Tokens chiffrés
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    id_token_encrypted TEXT,
    
    -- Métadonnées des tokens
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT[] NOT NULL,
    
    -- Sécurité
    encryption_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used TIMESTAMPTZ,
    
    -- Contraintes
    UNIQUE(user_id, outlook_user_id)
);

-- Index pour performance et sécurité
CREATE INDEX idx_outlook_tokens_user_id ON outlook.outlook_auth_tokens(user_id);
CREATE INDEX idx_outlook_tokens_expires_at ON outlook.outlook_auth_tokens(expires_at);

-- ===== TABLE: outlook_calendars =====
-- Calendriers Outlook synchronisés
CREATE TABLE outlook.outlook_calendars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outlook_user_id VARCHAR(255) NOT NULL,
    
    -- Informations du calendrier
    outlook_calendar_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(50),
    is_default_calendar BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT true,
    can_share BOOLEAN DEFAULT false,
    can_view_private_items BOOLEAN DEFAULT false,
    
    -- Propriétaire
    owner_name VARCHAR(255),
    owner_address VARCHAR(255),
    
    -- Synchronisation
    is_synced BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    delta_token TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, outlook_calendar_id)
);

-- Index pour performance
CREATE INDEX idx_outlook_calendars_user_id ON outlook.outlook_calendars(user_id);
CREATE INDEX idx_outlook_calendars_sync ON outlook.outlook_calendars(is_synced, last_sync_at);

-- ===== TABLE: outlook_events =====
-- Événements de calendrier synchronisés
CREATE TABLE outlook.outlook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES outlook.outlook_calendars(id) ON DELETE CASCADE,
    
    -- Identifiants Outlook
    outlook_event_id VARCHAR(255) NOT NULL,
    outlook_calendar_id VARCHAR(255) NOT NULL,
    
    -- Informations de l'événement
    subject VARCHAR(500) NOT NULL,
    body_content_type VARCHAR(20) DEFAULT 'text',
    body_content TEXT,
    
    -- Date et heure
    start_datetime TIMESTAMPTZ NOT NULL,
    start_timezone VARCHAR(100),
    end_datetime TIMESTAMPTZ NOT NULL,
    end_timezone VARCHAR(100),
    is_all_day BOOLEAN DEFAULT false,
    
    -- Localisation
    location_display_name VARCHAR(255),
    location_address JSONB,
    location_coordinates JSONB,
    
    -- Propriétés de l'événement
    show_as VARCHAR(50) DEFAULT 'busy', -- free, tentative, busy, oof, workingElsewhere
    importance VARCHAR(20) DEFAULT 'normal', -- low, normal, high
    sensitivity VARCHAR(20) DEFAULT 'normal', -- normal, personal, private, confidential
    is_cancelled BOOLEAN DEFAULT false,
    is_organizer BOOLEAN DEFAULT false,
    response_requested BOOLEAN DEFAULT true,
    
    -- Organisateur
    organizer_name VARCHAR(255),
    organizer_email VARCHAR(255),
    
    -- Récurrence
    recurrence_pattern JSONB,
    is_recurring BOOLEAN DEFAULT false,
    
    -- Métadonnées
    categories TEXT[],
    web_link TEXT,
    change_key VARCHAR(255),
    
    -- Synchronisation
    outlook_created_at TIMESTAMPTZ,
    outlook_modified_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, outlook_event_id)
);

-- Index pour performance
CREATE INDEX idx_outlook_events_user_id ON outlook.outlook_events(user_id);
CREATE INDEX idx_outlook_events_calendar_id ON outlook.outlook_events(calendar_id);
CREATE INDEX idx_outlook_events_start_time ON outlook.outlook_events(start_datetime);
CREATE INDEX idx_outlook_events_date_range ON outlook.outlook_events(start_datetime, end_datetime);
CREATE INDEX idx_outlook_events_sync ON outlook.outlook_events(last_sync_at);

-- ===== TABLE: outlook_event_attendees =====
-- Participants aux événements
CREATE TABLE outlook.outlook_event_attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES outlook.outlook_events(id) ON DELETE CASCADE,
    
    -- Informations du participant
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    attendee_type VARCHAR(20) DEFAULT 'required', -- required, optional, resource
    response_status VARCHAR(50) DEFAULT 'none', -- none, organizer, tentativelyAccepted, accepted, declined, notResponded
    response_time TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(event_id, email)
);

-- Index pour performance
CREATE INDEX idx_outlook_attendees_event_id ON outlook.outlook_event_attendees(event_id);
CREATE INDEX idx_outlook_attendees_email ON outlook.outlook_event_attendees(email);

-- ===== TABLE: outlook_contacts =====
-- Contacts Outlook synchronisés
CREATE TABLE outlook.outlook_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identifiant Outlook
    outlook_contact_id VARCHAR(255) NOT NULL,
    
    -- Informations personnelles
    display_name VARCHAR(255) NOT NULL,
    given_name VARCHAR(255),
    surname VARCHAR(255),
    middle_name VARCHAR(255),
    nickname VARCHAR(255),
    title VARCHAR(100),
    
    -- Informations professionnelles
    company_name VARCHAR(255),
    department VARCHAR(255),
    job_title VARCHAR(255),
    
    -- Emails
    email_addresses JSONB, -- Array d'objets {name, address, type}
    
    -- Téléphones
    business_phones TEXT[],
    home_phones TEXT[],
    mobile_phone VARCHAR(50),
    
    -- Adresses
    business_address JSONB, -- Objet adresse structuré
    home_address JSONB,
    other_address JSONB,
    
    -- Autres informations
    birthday DATE,
    personal_notes TEXT,
    categories TEXT[],
    
    -- Métadonnées Outlook
    change_key VARCHAR(255),
    parent_folder_id VARCHAR(255),
    outlook_created_at TIMESTAMPTZ,
    outlook_modified_at TIMESTAMPTZ,
    
    -- Synchronisation
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    is_duplicate BOOLEAN DEFAULT false,
    master_contact_id UUID REFERENCES outlook.outlook_contacts(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, outlook_contact_id)
);

-- Index pour performance et recherche
CREATE INDEX idx_outlook_contacts_user_id ON outlook.outlook_contacts(user_id);
CREATE INDEX idx_outlook_contacts_display_name ON outlook.outlook_contacts(display_name);
CREATE INDEX idx_outlook_contacts_company ON outlook.outlook_contacts(company_name);
CREATE INDEX idx_outlook_contacts_email ON outlook.outlook_contacts USING GIN (email_addresses);
CREATE INDEX idx_outlook_contacts_phone ON outlook.outlook_contacts USING GIN (business_phones);
CREATE INDEX idx_outlook_contacts_sync ON outlook.outlook_contacts(last_sync_at);

-- ===== TABLE: outlook_emails =====
-- Messages Outlook synchronisés
CREATE TABLE outlook.outlook_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Identifiant Outlook
    outlook_message_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    parent_folder_id VARCHAR(255),
    
    -- Informations du message
    subject VARCHAR(998),
    body_content_type VARCHAR(20) DEFAULT 'text',
    body_content TEXT,
    
    -- Expéditeur et destinataires
    from_name VARCHAR(255),
    from_email VARCHAR(255),
    to_recipients JSONB, -- Array d'objets {name, email}
    cc_recipients JSONB,
    bcc_recipients JSONB,
    
    -- Date et heure
    received_datetime TIMESTAMPTZ,
    sent_datetime TIMESTAMPTZ,
    
    -- État du message
    is_read BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    importance VARCHAR(20) DEFAULT 'normal',
    
    -- Flag
    flag_status VARCHAR(50) DEFAULT 'notFlagged',
    flag_start_datetime TIMESTAMPTZ,
    flag_due_datetime TIMESTAMPTZ,
    
    -- Catégories et métadonnées
    categories TEXT[],
    web_link TEXT,
    change_key VARCHAR(255),
    
    -- Synchronisation
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(user_id, outlook_message_id)
);

-- Index pour performance
CREATE INDEX idx_outlook_emails_user_id ON outlook.outlook_emails(user_id);
CREATE INDEX idx_outlook_emails_received_at ON outlook.outlook_emails(received_datetime DESC);
CREATE INDEX idx_outlook_emails_from_email ON outlook.outlook_emails(from_email);
CREATE INDEX idx_outlook_emails_subject ON outlook.outlook_emails USING GIN (to_tsvector('english', subject));
CREATE INDEX idx_outlook_emails_conversation ON outlook.outlook_emails(conversation_id);
CREATE INDEX idx_outlook_emails_unread ON outlook.outlook_emails(is_read) WHERE is_read = false;

-- ===== TABLE: outlook_email_attachments =====
-- Pièces jointes des emails
CREATE TABLE outlook.outlook_email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID NOT NULL REFERENCES outlook.outlook_emails(id) ON DELETE CASCADE,
    
    -- Identifiant Outlook
    outlook_attachment_id VARCHAR(255) NOT NULL,
    
    -- Informations de la pièce jointe
    name VARCHAR(255) NOT NULL,
    content_type VARCHAR(255),
    size_bytes INTEGER,
    is_inline BOOLEAN DEFAULT false,
    
    -- Contenu (peut être stocké ou référencé)
    content_location TEXT, -- URL ou chemin vers le contenu
    content_id VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Contraintes
    UNIQUE(email_id, outlook_attachment_id)
);

-- Index pour performance
CREATE INDEX idx_outlook_attachments_email_id ON outlook.outlook_email_attachments(email_id);

-- ===== TABLE: outlook_routing_rules =====
-- Règles de routage téléphonique
CREATE TABLE outlook.outlook_routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informations de la règle
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER DEFAULT 5,
    is_enabled BOOLEAN DEFAULT true,
    
    -- Conditions (JSON)
    conditions JSONB NOT NULL,
    
    -- Actions (JSON)
    actions JSONB NOT NULL,
    
    -- Planification
    schedule_config JSONB, -- Horaires, jours, etc.
    
    -- Métriques
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_outlook_routing_rules_user_id ON outlook.outlook_routing_rules(user_id);
CREATE INDEX idx_outlook_routing_rules_priority ON outlook.outlook_routing_rules(priority DESC, is_enabled);

-- ===== TABLE: outlook_call_records =====
-- Enregistrements des appels
CREATE TABLE outlook.outlook_call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Informations de l'appel
    call_sid VARCHAR(255), -- Twilio call SID
    vapi_call_id VARCHAR(255), -- VAPI call ID
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50) NOT NULL,
    caller_name VARCHAR(255),
    
    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER,
    wait_time_seconds INTEGER,
    
    -- État et direction
    call_status VARCHAR(50), -- queued, ringing, in-progress, completed, failed, busy, no-answer, cancelled
    call_direction VARCHAR(20), -- inbound, outbound
    
    -- Routage
    routing_rule_id UUID REFERENCES outlook.outlook_routing_rules(id),
    routed_to_agent VARCHAR(255),
    queue_position INTEGER,
    
    -- Enregistrement et transcription
    recording_url TEXT,
    recording_duration INTEGER,
    transcription TEXT,
    transcription_confidence DECIMAL(3,2),
    
    -- Analyse
    sentiment_score DECIMAL(3,2),
    sentiment_label VARCHAR(20), -- positive, negative, neutral
    keywords TEXT[],
    action_items TEXT[],
    call_summary TEXT,
    
    -- Intégration Outlook
    outlook_event_id UUID REFERENCES outlook.outlook_events(id),
    outlook_contact_id UUID REFERENCES outlook.outlook_contacts(id),
    follow_up_email_sent BOOLEAN DEFAULT false,
    task_created BOOLEAN DEFAULT false,
    
    -- Métadonnées
    metadata JSONB,
    provider VARCHAR(50), -- twilio, vapi, other
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance et rapports
CREATE INDEX idx_outlook_call_records_user_id ON outlook.outlook_call_records(user_id);
CREATE INDEX idx_outlook_call_records_start_time ON outlook.outlook_call_records(start_time DESC);
CREATE INDEX idx_outlook_call_records_from_number ON outlook.outlook_call_records(from_number);
CREATE INDEX idx_outlook_call_records_status ON outlook.outlook_call_records(call_status);
CREATE INDEX idx_outlook_call_records_routing ON outlook.outlook_call_records(routing_rule_id);

-- ===== TABLE: outlook_sync_logs =====
-- Logs de synchronisation pour audit et debugging
CREATE TABLE outlook.outlook_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Type de synchronisation
    sync_type VARCHAR(50) NOT NULL, -- calendar, contacts, emails
    operation VARCHAR(50) NOT NULL, -- full_sync, delta_sync, create, update, delete
    
    -- Résultats
    status VARCHAR(20) NOT NULL, -- success, partial, failed
    items_processed INTEGER DEFAULT 0,
    items_succeeded INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    
    -- Détails
    error_message TEXT,
    error_details JSONB,
    
    -- Performance
    duration_ms INTEGER,
    memory_usage_mb DECIMAL(8,2),
    
    -- Tokens et métadonnées
    delta_token TEXT,
    next_link TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance et monitoring
CREATE INDEX idx_outlook_sync_logs_user_id ON outlook.outlook_sync_logs(user_id);
CREATE INDEX idx_outlook_sync_logs_type_status ON outlook.outlook_sync_logs(sync_type, status);
CREATE INDEX idx_outlook_sync_logs_started_at ON outlook.outlook_sync_logs(started_at DESC);

-- ===== FONCTIONS ET TRIGGERS =====

-- Fonction pour mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION outlook.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Application des triggers sur toutes les tables
CREATE TRIGGER trigger_outlook_users_updated_at
    BEFORE UPDATE ON outlook.outlook_users
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_auth_tokens_updated_at
    BEFORE UPDATE ON outlook.outlook_auth_tokens
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_calendars_updated_at
    BEFORE UPDATE ON outlook.outlook_calendars
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_events_updated_at
    BEFORE UPDATE ON outlook.outlook_events
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_event_attendees_updated_at
    BEFORE UPDATE ON outlook.outlook_event_attendees
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_contacts_updated_at
    BEFORE UPDATE ON outlook.outlook_contacts
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_emails_updated_at
    BEFORE UPDATE ON outlook.outlook_emails
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_email_attachments_updated_at
    BEFORE UPDATE ON outlook.outlook_email_attachments
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_routing_rules_updated_at
    BEFORE UPDATE ON outlook.outlook_routing_rules
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

CREATE TRIGGER trigger_outlook_call_records_updated_at
    BEFORE UPDATE ON outlook.outlook_call_records
    FOR EACH ROW EXECUTE FUNCTION outlook.update_updated_at_column();

-- ===== VUES UTILES =====

-- Vue des utilisateurs actifs avec leurs dernières synchronisations
CREATE VIEW outlook.active_users_sync_status AS
SELECT 
    ou.id,
    ou.display_name,
    ou.email,
    ou.is_active,
    ou.last_sign_in,
    MAX(GREATEST(
        COALESCE(oc.last_sync_at, '1970-01-01'::timestamptz),
        COALESCE(ocon.last_sync_at, '1970-01-01'::timestamptz),
        COALESCE(oe.last_sync_at, '1970-01-01'::timestamptz)
    )) AS last_sync_at
FROM outlook.outlook_users ou
LEFT JOIN outlook.outlook_calendars oc ON ou.user_id = oc.user_id
LEFT JOIN outlook.outlook_contacts ocon ON ou.user_id = ocon.user_id
LEFT JOIN outlook.outlook_emails oe ON ou.user_id = oe.user_id
WHERE ou.is_active = true
GROUP BY ou.id, ou.display_name, ou.email, ou.is_active, ou.last_sign_in;

-- Vue des statistiques de synchronisation par utilisateur
CREATE VIEW outlook.sync_statistics_by_user AS
SELECT 
    ou.user_id,
    ou.display_name,
    ou.email,
    COUNT(DISTINCT oc.id) as calendars_count,
    COUNT(DISTINCT oe.id) as events_count,
    COUNT(DISTINCT ocon.id) as contacts_count,
    COUNT(DISTINCT oem.id) as emails_count,
    COUNT(DISTINCT ocr.id) as calls_count,
    MAX(ou.last_sign_in) as last_sign_in
FROM outlook.outlook_users ou
LEFT JOIN outlook.outlook_calendars oc ON ou.user_id = oc.user_id
LEFT JOIN outlook.outlook_events oe ON ou.user_id = oe.user_id
LEFT JOIN outlook.outlook_contacts ocon ON ou.user_id = ocon.user_id
LEFT JOIN outlook.outlook_emails oem ON ou.user_id = oem.user_id
LEFT JOIN outlook.outlook_call_records ocr ON ou.user_id = ocr.user_id
GROUP BY ou.user_id, ou.display_name, ou.email;

-- ===== POLITIQUES DE SÉCURITÉ (RLS) =====

-- Activation du Row Level Security sur toutes les tables
ALTER TABLE outlook.outlook_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_email_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlook.outlook_sync_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Les utilisateurs ne peuvent accéder qu'à leurs propres données
CREATE POLICY "Users can only access their own Outlook data" ON outlook.outlook_users
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own auth tokens" ON outlook.outlook_auth_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own calendars" ON outlook.outlook_calendars
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own events" ON outlook.outlook_events
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access attendees of their own events" ON outlook.outlook_event_attendees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outlook.outlook_events 
            WHERE id = outlook_event_attendees.event_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their own contacts" ON outlook.outlook_contacts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own emails" ON outlook.outlook_emails
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access attachments of their own emails" ON outlook.outlook_email_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM outlook.outlook_emails 
            WHERE id = outlook_email_attachments.email_id 
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can only access their own routing rules" ON outlook.outlook_routing_rules
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own call records" ON outlook.outlook_call_records
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own sync logs" ON outlook.outlook_sync_logs
    FOR ALL USING (auth.uid() = user_id);

-- ===== GRANTS ET PERMISSIONS =====

-- Permissions pour l'utilisateur authentifié
GRANT USAGE ON SCHEMA outlook TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA outlook TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA outlook TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA outlook TO authenticated;

-- Permissions pour les vues
GRANT SELECT ON outlook.active_users_sync_status TO authenticated;
GRANT SELECT ON outlook.sync_statistics_by_user TO authenticated;

-- ===== COMMENTAIRES SUR LES TABLES =====

COMMENT ON TABLE outlook.outlook_users IS 'Utilisateurs Outlook synchronisés avec les comptes Supabase';
COMMENT ON TABLE outlook.outlook_auth_tokens IS 'Tokens OAuth2 chiffrés pour l authentification Microsoft Graph';
COMMENT ON TABLE outlook.outlook_calendars IS 'Calendriers Outlook synchronisés';
COMMENT ON TABLE outlook.outlook_events IS 'Événements de calendrier synchronisés depuis Outlook';
COMMENT ON TABLE outlook.outlook_event_attendees IS 'Participants aux événements de calendrier';
COMMENT ON TABLE outlook.outlook_contacts IS 'Contacts Outlook synchronisés';
COMMENT ON TABLE outlook.outlook_emails IS 'Messages email synchronisés depuis Outlook';
COMMENT ON TABLE outlook.outlook_email_attachments IS 'Pièces jointes des emails';
COMMENT ON TABLE outlook.outlook_routing_rules IS 'Règles de routage téléphonique intelligentes';
COMMENT ON TABLE outlook.outlook_call_records IS 'Enregistrements des appels avec intégration Outlook';
COMMENT ON TABLE outlook.outlook_sync_logs IS 'Logs de synchronisation pour audit et debugging';

-- ===== DONNÉES DE TEST (OPTIONNEL) =====

-- Insertion de règles de routage par défaut (à adapter selon les besoins)
-- Ceci sera fait par l'application, pas par la migration

-- ===== FIN DE LA MIGRATION =====

-- Vérification de la migration
DO $$ 
BEGIN
    RAISE NOTICE 'Migration Outlook Integration completed successfully';
    RAISE NOTICE 'Tables created: %, %, %, %, %, %, %, %, %, %, %',
        'outlook_users', 'outlook_auth_tokens', 'outlook_calendars', 'outlook_events', 
        'outlook_event_attendees', 'outlook_contacts', 'outlook_emails', 'outlook_email_attachments',
        'outlook_routing_rules', 'outlook_call_records', 'outlook_sync_logs';
    RAISE NOTICE 'Views created: %, %', 'active_users_sync_status', 'sync_statistics_by_user';
    RAISE NOTICE 'RLS policies enabled on all tables';
END $$;