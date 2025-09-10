-- Migration: Créer les tables manquantes pour Drain Fortin
-- Date: 2025-01-09
-- Tables: service_requests, clients, price_calculations

-- 1. Table clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Informations client (8 champs obligatoires)
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
    
    -- Index pour recherche rapide
    CONSTRAINT unique_phone UNIQUE(telephone)
);

-- Index pour performance
CREATE INDEX idx_clients_telephone ON public.clients(telephone);
CREATE INDEX idx_clients_email ON public.clients(email);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

-- 2. Table service_requests
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Lien client
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
    
    -- Prix et facturation
    prix_estime DECIMAL(10,2),
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

-- Index pour performance
CREATE INDEX idx_service_requests_client_id ON public.service_requests(client_id);
CREATE INDEX idx_service_requests_urgence ON public.service_requests(urgence);
CREATE INDEX idx_service_requests_statut ON public.service_requests(statut);
CREATE INDEX idx_service_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX idx_service_requests_date_intervention ON public.service_requests(date_intervention);

-- 3. Table price_calculations
CREATE TABLE IF NOT EXISTS public.price_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Lien avec demande de service
    service_request_id UUID REFERENCES public.service_requests(id),
    call_id UUID REFERENCES public.calls(id),
    
    -- Calcul de base
    prix_base DECIMAL(10,2) NOT NULL DEFAULT 350.00,
    type_service VARCHAR(100),
    
    -- Suppléments
    supplement_rive_sud DECIMAL(10,2) DEFAULT 0,
    supplement_urgence DECIMAL(10,2) DEFAULT 0,
    supplement_nuit DECIMAL(10,2) DEFAULT 0,
    supplement_commercial DECIMAL(10,2) DEFAULT 0,
    supplement_pieces DECIMAL(10,2) DEFAULT 0,
    supplement_distance DECIMAL(10,2) DEFAULT 0,
    
    -- Rabais
    rabais_client_regulier DECIMAL(10,2) DEFAULT 0,
    rabais_promo DECIMAL(10,2) DEFAULT 0,
    rabais_volume DECIMAL(10,2) DEFAULT 0,
    
    -- Totaux
    sous_total DECIMAL(10,2) NOT NULL,
    tps DECIMAL(10,2) DEFAULT 0,
    tvq DECIMAL(10,2) DEFAULT 0,
    total_taxes DECIMAL(10,2) DEFAULT 0,
    total_final DECIMAL(10,2) NOT NULL,
    
    -- Validation règles business
    respect_minimum BOOLEAN DEFAULT TRUE CHECK (prix_base >= 350),
    
    -- Détails du calcul
    calcul_details JSONB DEFAULT '{}'::jsonb,
    notes TEXT
);

-- Index pour performance
CREATE INDEX idx_price_calculations_service_request_id ON public.price_calculations(service_request_id);
CREATE INDEX idx_price_calculations_created_at ON public.price_calculations(created_at DESC);
CREATE INDEX idx_price_calculations_total_final ON public.price_calculations(total_final);

-- 4. Triggers pour mise à jour automatique
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger aux tables avec updated_at
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

-- Politique pour service role (accès complet)
CREATE POLICY "Service role has full access to clients"
    ON public.clients
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to service_requests"
    ON public.service_requests
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to price_calculations"
    ON public.price_calculations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Politique pour anon (lecture seule sur certaines données)
CREATE POLICY "Anon can read non-sensitive client data"
    ON public.clients
    FOR SELECT
    USING (auth.role() = 'anon');

-- 6. Fonction pour calculer le prix automatiquement
CREATE OR REPLACE FUNCTION calculate_service_price(
    p_type_service VARCHAR,
    p_is_rive_sud BOOLEAN DEFAULT FALSE,
    p_urgence VARCHAR DEFAULT 'P4',
    p_is_commercial BOOLEAN DEFAULT FALSE
) RETURNS TABLE(
    prix_base DECIMAL,
    supplements DECIMAL,
    sous_total DECIMAL,
    taxes DECIMAL,
    total DECIMAL
) AS $$
DECLARE
    v_prix_base DECIMAL := 350.00; -- Minimum obligatoire
    v_supplements DECIMAL := 0;
    v_sous_total DECIMAL;
    v_taxes DECIMAL;
    v_total DECIMAL;
BEGIN
    -- Supplément Rive-Sud
    IF p_is_rive_sud THEN
        v_supplements := v_supplements + 100.00;
    END IF;
    
    -- Supplément urgence
    IF p_urgence = 'P1' THEN
        v_supplements := v_supplements + 150.00;
    ELSIF p_urgence = 'P2' THEN
        v_supplements := v_supplements + 75.00;
    END IF;
    
    -- Supplément commercial
    IF p_is_commercial THEN
        v_supplements := v_supplements + 200.00;
    END IF;
    
    -- Calculs finaux
    v_sous_total := v_prix_base + v_supplements;
    v_taxes := v_sous_total * 0.14975; -- TPS + TVQ au Québec
    v_total := v_sous_total + v_taxes;
    
    RETURN QUERY SELECT 
        v_prix_base,
        v_supplements,
        v_sous_total,
        v_taxes,
        v_total;
END;
$$ LANGUAGE plpgsql;

-- 7. Vues utiles pour le dashboard
CREATE OR REPLACE VIEW public.v_service_requests_summary AS
SELECT 
    sr.*,
    c.nom || ' ' || COALESCE(c.prenom, '') as client_nom_complet,
    c.telephone as client_telephone,
    c.adresse as client_adresse,
    pc.total_final as prix_total
FROM public.service_requests sr
LEFT JOIN public.clients c ON sr.client_id = c.id
LEFT JOIN public.price_calculations pc ON pc.service_request_id = sr.id
ORDER BY sr.created_at DESC;

-- Grant permissions pour les vues
GRANT SELECT ON public.v_service_requests_summary TO anon, authenticated;

-- 8. Données de test initiales (optionnel)
INSERT INTO public.clients (nom, prenom, telephone, email, adresse, ville, code_postal)
VALUES 
    ('Test', 'Client', '+14502803222', 'test@drainfortin.ca', '123 Rue Test', 'Montréal', 'H1H 1H1')
ON CONFLICT (telephone) DO NOTHING;

-- Message de confirmation
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration complétée: 3 tables créées (clients, service_requests, price_calculations)';
    RAISE NOTICE 'Fonction calculate_service_price disponible pour calculs de prix';
    RAISE NOTICE 'RLS activé sur toutes les tables';
END $$;