/**
 * TypeScript interfaces for the Firebase Realtime Database party sync.
 * Direct partyName and member-centric hierarchy:
 *   parties -> {partyName} -> members -> {memberName} -> statuses -> {statusId}
 */

export interface PartySyncDatabase {
  parties: Record<string, PartyNode>;
}

export interface PartyNode {
  members: Record<string, PartyMember>;
}

export interface PartyMember {
  docId?: string;
  statuses?: Record<string, IncomingStatus>;
}

export type DurationUnit = 'rounds' | 'minutes' | 'hours' | 'days' | 'permanent' | 'instantaneous';

export interface IncomingStatus {
  statusId: string;
  statusName: string;
  senderName: string;
  duration: number;
  durationUnit?: DurationUnit;
  casterLevel?: number;
  spellLevel?: number;
  description?: string;
  args?: Record<string, unknown>;
  timestamp: number;
}
