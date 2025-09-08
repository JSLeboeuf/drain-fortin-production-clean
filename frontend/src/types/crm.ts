// Types pour le CRM Drain Fortin

export interface Client {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  phone: string;
  phone_secondary?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  province?: string;
  sector?: string;
  client_type?: 'residential' | 'commercial' | 'municipal';
  priority_level?: 'P1' | 'P2' | 'P3' | 'P4';
  tags?: string[];
  first_contact_date?: string;
  last_contact_date?: string;
  total_services_count?: number;
  total_revenue?: number;
  status?: 'active' | 'inactive' | 'blacklist';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  // Enriched fields from view
  total_interventions?: number;
  total_sms?: number;
  last_intervention_date?: string;
  last_sms_date?: string;
  lifetime_value?: number;
}

export interface SMSMessage {
  id: string;
  client_id?: string;
  call_id?: string;
  intervention_id?: string;
  to_number: string;
  from_number: string;
  message: string;
  sms_type?: 'alert_internal' | 'confirmation' | 'reminder' | 'followup';
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  urgency_level?: 'immediate' | 'high' | 'medium' | 'low';
  twilio_sid?: string;
  status?: 'pending' | 'sent' | 'delivered' | 'failed';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  metadata?: any;
  created_at?: string;
  // Relations
  client?: Client;
}

export interface Intervention {
  id: string;
  client_id?: string;
  technician_id?: string;
  call_id?: string;
  service_type: string;
  problem_description?: string;
  solution_provided?: string;
  service_address?: string;
  service_city?: string;
  service_postal_code?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  scheduled_window?: string;
  started_at?: string;
  completed_at?: string;
  duration_minutes?: number;
  priority?: 'P1' | 'P2' | 'P3' | 'P4';
  status?: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  quoted_price?: number;
  final_price?: number;
  payment_method?: string;
  payment_status?: string;
  invoice_number?: string;
  photos?: string[];
  documents?: any;
  technician_notes?: string;
  customer_feedback?: string;
  rating?: number;
  created_at?: string;
  updated_at?: string;
  // Relations
  client?: Client;
  technician?: Technician;
  client_name?: string;
  client_phone?: string;
  client_address?: string;
  technician_name?: string;
}

export interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  specialties?: string[];
  certifications?: string[];
  experience_years?: number;
  available?: boolean;
  working_hours?: any;
  vacation_dates?: string[];
  total_interventions?: number;
  average_rating?: number;
  completion_rate?: number;
  status?: 'active' | 'inactive' | 'vacation';
  vehicle_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InternalAlert {
  id: string;
  client_id?: string;
  call_id?: string;
  intervention_id?: string;
  alert_type: 'urgency' | 'followup' | 'reminder' | 'escalation';
  priority: 'P1' | 'P2' | 'P3' | 'P4';
  title: string;
  message: string;
  client_info: {
    name?: string;
    phone?: string;
    address?: string;
    problem?: string;
  };
  status?: 'pending' | 'acknowledged' | 'resolved' | 'expired';
  acknowledged_by?: string;
  acknowledged_at?: string;
  resolved_by?: string;
  resolved_at?: string;
  sms_sent?: boolean;
  sms_message_id?: string;
  created_at?: string;
  expires_at?: string;
  // Relations
  client?: Client;
  client_name?: string;
  client_phone?: string;
  minutes_since_created?: number;
}

export interface CommunicationHistory {
  id: string;
  client_id?: string;
  intervention_id?: string;
  communication_type: 'call_inbound' | 'call_outbound' | 'sms' | 'email' | 'in_person';
  direction?: 'inbound' | 'outbound';
  subject?: string;
  content?: string;
  outcome?: string;
  notes?: string;
  created_at?: string;
  created_by?: string;
  // Relations
  client?: Client;
  intervention?: Intervention;
}

export interface CRMStats {
  totalClients: number;
  activeClients: number;
  totalInterventions: number;
  todayInterventions: number;
  totalSMS: number;
  todaySMS: number;
  totalRevenue: number;
  monthRevenue: number;
  activeAlerts: number;
  p1Alerts: number;
  p2Alerts: number;
  averageResponseTime: number;
  customerSatisfaction: number;
}

export interface CRMFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  serviceType?: string;
  technician?: string;
  paymentStatus?: string;
}