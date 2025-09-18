/**
 * Simple Error Boundary Component
 * Matches the Drain Fortin styling from the original app
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { DRAIN_FORTIN_COLORS } from '../../constants/colors';
import { ButtonPrimary } from '../ui/Button';

interface SimpleErrorBoundaryState {
  hasError: boolean;
}

export class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  SimpleErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SimpleErrorBoundaryState {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          background: DRAIN_FORTIN_COLORS.grayLight
        }}>
          <AlertCircle size={48} color={DRAIN_FORTIN_COLORS.danger} />
          <h2 style={{ 
            marginTop: '16px', 
            color: DRAIN_FORTIN_COLORS.blueDark,
            fontSize: '24px',
            fontWeight: '700'
          }}>
            Une erreur est survenue
          </h2>
          <p style={{ 
            color: DRAIN_FORTIN_COLORS.gray, 
            marginTop: '8px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            Le système de monitoring a rencontré un problème.
          </p>
          <ButtonPrimary 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px' }}
          >
            Rafraîchir la page
          </ButtonPrimary>
        </div>
      );
    }

    return this.props.children;
  }
}