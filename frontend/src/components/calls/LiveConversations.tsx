/**
 * Live Conversations Component
 * Displays active calls in real-time
 */

import React, { memo } from 'react';
import { PhoneCall, Volume2, Eye } from 'lucide-react';

import { DRAIN_FORTIN_COLORS } from '@/config/theme';
import type { LiveConversationsProps } from '@/types';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';
import ButtonPrimary from '../ui/ButtonPrimary';

const LiveConversations = memo<LiveConversationsProps>(({ calls }) => {
  const activeCalls = calls?.filter((call) => call.status === 'active') || [];

  const emptyStateStyles: React.CSSProperties = {
    padding: '40px',
    textAlign: 'center' as const,
    color: DRAIN_FORTIN_COLORS.gray,
    background: DRAIN_FORTIN_COLORS.grayLight,
    borderRadius: '4px'
  };

  const callsListStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  };

  const callItemStyles: React.CSSProperties = {
    padding: '16px',
    background: DRAIN_FORTIN_COLORS.grayLight,
    borderRadius: '4px',
    borderLeft: `4px solid ${DRAIN_FORTIN_COLORS.liveGreen}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  };

  const callInfoStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  };

  const callDetailsStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px'
  };

  const phoneNumberStyles: React.CSSProperties = {
    fontWeight: '600',
    color: DRAIN_FORTIN_COLORS.blueDark,
    margin: 0
  };

  const metadataStyles: React.CSSProperties = {
    fontSize: '12px',
    color: DRAIN_FORTIN_COLORS.gray,
    margin: 0
  };

  const actionsStyles: React.CSSProperties = {
    display: 'flex',
    gap: '8px'
  };

  const formatDuration = (duration?: number): string => {
    if (!duration) return '0';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const formatPhoneNumber = (phoneNumber?: string): string => {
    return phoneNumber || 'Numéro masqué';
  };

  if (activeCalls.length === 0) {
    return (
      <Card title="Conversations en direct">
        <div style={emptyStateStyles}>
          <PhoneCall 
            size={48} 
            style={{ opacity: 0.3, marginBottom: '12px' }} 
            aria-hidden="true"
          />
          <p style={{ fontSize: '16px', margin: 0 }}>
            Aucun appel en cours
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Conversations en direct"
      actions={
        <div style={{ 
          fontSize: '12px', 
          color: DRAIN_FORTIN_COLORS.liveGreen,
          fontWeight: '600'
        }}>
          {activeCalls.length} en cours
        </div>
      }
    >
      <div style={callsListStyles}>
        {activeCalls.map((call) => (
          <div
            key={call.id}
            className="animate-slide-in-right"
            style={callItemStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateX(4px)';
              e.currentTarget.style.boxShadow = `0 4px 8px ${DRAIN_FORTIN_COLORS.liveGreen}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={callInfoStyles}>
              <StatusBadge status="active" live />
              <div style={callDetailsStyles}>
                <p style={phoneNumberStyles}>
                  {formatPhoneNumber(call.phone_number)}
                </p>
                <p style={metadataStyles}>
                  Durée: {formatDuration(call.duration)} | Agent: Paul
                </p>
              </div>
            </div>
            
            <div style={actionsStyles}>
              <ButtonPrimary 
                icon={Volume2}
                size="sm"
                aria-label={`Listen to call with ${formatPhoneNumber(call.phone_number)}`}
              >
                Écouter
              </ButtonPrimary>
              <ButtonPrimary 
                icon={Eye}
                size="sm" 
                variant="secondary"
                aria-label={`View transcript for call with ${formatPhoneNumber(call.phone_number)}`}
              >
                Transcript
              </ButtonPrimary>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
});

LiveConversations.displayName = 'LiveConversations';

export default LiveConversations;