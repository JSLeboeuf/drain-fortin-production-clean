/**
 * ChangeTracker - Suivi des changements pour la synchronisation
 */

import { CalendarEvent } from '../config/outlook.types';

export interface ChangeRecord {
  id: string;
  type: 'created' | 'updated' | 'deleted';
  timestamp: Date;
  previousState?: Partial<CalendarEvent>;
  currentState?: Partial<CalendarEvent>;
}

export class ChangeTracker {
  private changes: Map<string, ChangeRecord> = new Map();
  private deltaToken?: string;

  constructor(private maxChanges: number = 1000) {}

  trackChange(
    id: string,
    type: 'created' | 'updated' | 'deleted',
    previousState?: Partial<CalendarEvent>,
    currentState?: Partial<CalendarEvent>
  ): void {
    const record: ChangeRecord = {
      id,
      type,
      timestamp: new Date(),
      previousState,
      currentState
    };

    this.changes.set(id, record);

    // Limit the size of the change tracker
    if (this.changes.size > this.maxChanges) {
      const oldestKey = this.changes.keys().next().value;
      this.changes.delete(oldestKey);
    }
  }

  getChanges(since?: Date): ChangeRecord[] {
    const allChanges = Array.from(this.changes.values());
    
    if (since) {
      return allChanges.filter(change => change.timestamp > since);
    }
    
    return allChanges;
  }

  getChange(id: string): ChangeRecord | undefined {
    return this.changes.get(id);
  }

  hasChanges(): boolean {
    return this.changes.size > 0;
  }

  clearChanges(): void {
    this.changes.clear();
  }

  setDeltaToken(token: string): void {
    this.deltaToken = token;
  }

  getDeltaToken(): string | undefined {
    return this.deltaToken;
  }

  detectChanges(
    oldEvents: CalendarEvent[],
    newEvents: CalendarEvent[]
  ): ChangeRecord[] {
    const oldMap = new Map(oldEvents.map(e => [e.id, e]));
    const newMap = new Map(newEvents.map(e => [e.id, e]));
    const changes: ChangeRecord[] = [];

    // Detect created and updated events
    for (const [id, newEvent] of newMap) {
      const oldEvent = oldMap.get(id);
      if (!oldEvent) {
        this.trackChange(id, 'created', undefined, newEvent);
        changes.push(this.getChange(id)!);
      } else if (this.hasEventChanged(oldEvent, newEvent)) {
        this.trackChange(id, 'updated', oldEvent, newEvent);
        changes.push(this.getChange(id)!);
      }
    }

    // Detect deleted events
    for (const [id, oldEvent] of oldMap) {
      if (!newMap.has(id)) {
        this.trackChange(id, 'deleted', oldEvent, undefined);
        changes.push(this.getChange(id)!);
      }
    }

    return changes;
  }

  private hasEventChanged(oldEvent: CalendarEvent, newEvent: CalendarEvent): boolean {
    // Compare last modified times if available
    if (oldEvent.lastModifiedDateTime && newEvent.lastModifiedDateTime) {
      return new Date(oldEvent.lastModifiedDateTime) < new Date(newEvent.lastModifiedDateTime);
    }

    // Otherwise, do a simple comparison of key fields
    return (
      oldEvent.subject !== newEvent.subject ||
      oldEvent.start?.dateTime !== newEvent.start?.dateTime ||
      oldEvent.end?.dateTime !== newEvent.end?.dateTime ||
      oldEvent.location?.displayName !== newEvent.location?.displayName
    );
  }
}