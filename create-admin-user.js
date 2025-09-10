import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = 'https://phiduqxcufdmgjvdipyu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoaWR1cXhjdWZkbWdqdmRpcHl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcxODQ5ODEsImV4cCI6MjA2Mjc2MDk4MX0.-oqrPSdoc0XHBH496ffAgLhEcvzb5f552SDPWxrNAsg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminUser() {
  console.log('🔐 Création de l\'utilisateur admin...\n');
  
  try {
    // Créer l'utilisateur admin
    const { data, error } = await supabase.auth.signUp({
      email: 'admin@drainfortin.com',
      password: 'Admin123!@#',
      options: {
        data: {
          full_name: 'Admin Drain Fortin',
          role: 'admin'
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('✅ L\'utilisateur admin existe déjà!');
        
        // Essayer de se connecter
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: 'admin@drainfortin.com',
          password: 'Admin123!@#'
        });
        
        if (loginError) {
          console.error('❌ Erreur de connexion:', loginError.message);
          console.log('\n💡 Solution: Réinitialiser le mot de passe via Supabase Dashboard');
        } else {
          console.log('✅ Connexion réussie!');
          console.log('🔑 Token:', loginData.session?.access_token?.substring(0, 20) + '...');
        }
      } else {
        console.error('❌ Erreur:', error.message);
      }
    } else {
      console.log('✅ Utilisateur admin créé avec succès!');
      console.log('📧 Email: admin@drainfortin.com');
      console.log('🔑 Mot de passe: Admin123!@#');
      console.log('\n⚠️ Note: Vérifiez votre email pour confirmer le compte si nécessaire');
    }
    
    // Créer des données de test
    console.log('\n📊 Création de données de démonstration...');
    
    // Ajouter quelques appels fictifs
    const calls = [
      {
        call_id: 'demo-001',
        customer_phone: '+1 514 555 0101',
        started_at: new Date().toISOString(),
        duration: 245,
        transcript: 'Client demande un débouchage urgent',
        priority: 'P1',
        status: 'completed'
      },
      {
        call_id: 'demo-002',
        customer_phone: '+1 514 555 0102',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        duration: 180,
        transcript: 'Inspection de drain demandée',
        priority: 'P2',
        status: 'completed'
      },
      {
        call_id: 'demo-003',
        customer_phone: '+1 514 555 0103',
        started_at: new Date(Date.now() - 7200000).toISOString(),
        duration: 320,
        transcript: 'Urgence inondation sous-sol',
        priority: 'P1',
        status: 'completed'
      }
    ];
    
    for (const call of calls) {
      const { error } = await supabase.from('vapi_calls').insert(call);
      if (!error) {
        console.log(`✅ Appel ${call.call_id} ajouté`);
      }
    }
    
    // Ajouter quelques leads
    const leads = [
      {
        nom: 'Jean Tremblay',
        telephone: '+1 514 555 0101',
        email: 'jean.tremblay@example.com',
        service: 'Débouchage',
        urgence: true,
        priorite: 'P1'
      },
      {
        nom: 'Marie Gagnon',
        telephone: '+1 514 555 0102',
        email: 'marie.gagnon@example.com',
        service: 'Inspection',
        urgence: false,
        priorite: 'P2'
      }
    ];
    
    for (const lead of leads) {
      const { error } = await supabase.from('leads').insert(lead);
      if (!error) {
        console.log(`✅ Lead ${lead.nom} ajouté`);
      }
    }
    
    console.log('\n✅ Configuration terminée!');
    console.log('🌐 Accédez à: http://localhost:5174');
    console.log('📧 Connectez-vous avec: admin@drainfortin.com / Admin123!@#');
    
  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
  
  process.exit(0);
}

createAdminUser();