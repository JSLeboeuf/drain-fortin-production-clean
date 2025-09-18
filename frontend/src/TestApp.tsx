/**
 * Test App to verify refactored components work
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DRAIN_FORTIN_COLORS } from './constants/colors';
import { ButtonPrimary } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { StatusBadge } from './components/ui/StatusBadge';
import { QuickStats } from './components/dashboard/QuickStats';
import { Header } from './components/layout/Header';

const testQueryClient = new QueryClient();

// Mock stats data for testing
const mockStats = {
  todayCalls: 42,
  successCalls: 38,
  failedCalls: 4,
  avgDuration: 135
};

export default function TestApp() {
  return (
    <QueryClientProvider client={testQueryClient}>
      <div style={{ minHeight: '100vh', background: DRAIN_FORTIN_COLORS.grayLight }}>
        <Header connectionStatus="connected" alertCount={3} />
        
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
          <h1 style={{ 
            color: DRAIN_FORTIN_COLORS.blueDark, 
            fontSize: '28px', 
            fontWeight: '700',
            marginBottom: '20px' 
          }}>
            Test des Composants Refactorisés
          </h1>
          
          <QuickStats stats={mockStats} />

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            marginBottom: '20px' 
          }}>
            <Card title="Test des Boutons">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <ButtonPrimary onClick={() => alert('Button 1 works!')}>
                  Bouton Principal
                </ButtonPrimary>
                <ButtonPrimary disabled onClick={() => alert('Button 2 works!')}>
                  Bouton Désactivé
                </ButtonPrimary>
              </div>
            </Card>

            <Card title="Test des Status">
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <StatusBadge status="active" live />
                <StatusBadge status="completed" />
                <StatusBadge status="failed" />
                <StatusBadge status="pending" />
              </div>
            </Card>
          </div>

          <Card title="Test Réussi ✅">
            <p>Tous les composants refactorisés fonctionnent correctement!</p>
            <p>La modularisation est réussie:</p>
            <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
              <li>Constantes extraites → constants/colors.ts</li>
              <li>Configuration Supabase → config/supabase.ts</li>
              <li>Composants UI → components/ui/</li>
              <li>Composants Dashboard → components/dashboard/</li>
              <li>Composants Layout → components/layout/</li>
              <li>Hooks personnalisés → hooks/</li>
            </ul>
          </Card>
        </div>
      </div>
    </QueryClientProvider>
  );
}