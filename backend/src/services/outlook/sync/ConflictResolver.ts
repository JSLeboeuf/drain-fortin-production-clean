/**
 * ConflictResolver - Résolution des conflits de synchronisation
 */

import { CalendarEvent } from '../config/outlook.types';

export interface ConflictResolutionResult {
  resolved: CalendarEvent;
  strategy: 'newest' | 'oldest' | 'merge' | 'skip';
  conflicts: CalendarEvent[];
}

export class ConflictResolver {
  constructor(private strategy: 'newest' | 'oldest' | 'merge' | 'custom' = 'newest') {}

  async resolve(
    localEvent: CalendarEvent,
    remoteEvent: CalendarEvent
  ): Promise<ConflictResolutionResult> {
    const conflicts = [localEvent, remoteEvent];
    
    let resolved: CalendarEvent;
    let strategyUsed: 'newest' | 'oldest' | 'merge' | 'skip';

    switch (this.strategy) {
      case 'newest':
        resolved = this.resolveByNewest(localEvent, remoteEvent);
        strategyUsed = 'newest';
        break;
      case 'oldest':
        resolved = this.resolveByOldest(localEvent, remoteEvent);
        strategyUsed = 'oldest';
        break;
      case 'merge':
        resolved = this.mergEvents(localEvent, remoteEvent);
        strategyUsed = 'merge';
        break;
      default:
        resolved = localEvent;
        strategyUsed = 'skip';
    }

    return {
      resolved,
      strategy: strategyUsed,
      conflicts
    };
  }

  private resolveByNewest(local: CalendarEvent, remote: CalendarEvent): CalendarEvent {
    const localTime = new Date(local.lastModifiedDateTime || local.createdDateTime).getTime();
    const remoteTime = new Date(remote.lastModifiedDateTime || remote.createdDateTime).getTime();
    return localTime > remoteTime ? local : remote;
  }

  private resolveByOldest(local: CalendarEvent, remote: CalendarEvent): CalendarEvent {
    const localTime = new Date(local.lastModifiedDateTime || local.createdDateTime).getTime();
    const remoteTime = new Date(remote.lastModifiedDateTime || remote.createdDateTime).getTime();
    return localTime < remoteTime ? local : remote;
  }

  private mergEvents(local: CalendarEvent, remote: CalendarEvent): CalendarEvent {
    // Merge strategy: combine non-conflicting properties
    return {
      ...local,
      ...remote,
      // Preserve local critical properties
      id: local.id || remote.id,
      subject: local.subject || remote.subject,
      start: local.start || remote.start,
      end: local.end || remote.end,
      // Merge attendees
      attendees: [
        ...(local.attendees || []),
        ...(remote.attendees || [])
      ].filter((v, i, a) => 
        a.findIndex(t => t.emailAddress?.address === v.emailAddress?.address) === i
      ),
      // Use newest modification time
      lastModifiedDateTime: new Date(Math.max(
        new Date(local.lastModifiedDateTime || 0).getTime(),
        new Date(remote.lastModifiedDateTime || 0).getTime()
      )).toISOString()
    };
  }
}