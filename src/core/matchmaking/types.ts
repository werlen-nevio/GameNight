/**
 * Matchmaking contracts — future-ready for public queues, ranked and custom
 * rules. Private/invite flows work today via lobby codes; competitive queues
 * require a matchmaking backend that implements this interface.
 */
export type QueueType = 'public' | 'ranked' | 'private' | 'invite';

export interface MatchRules {
  modeId?: string;
  maxPlayers?: number;
  ranked?: boolean;
  /** Arbitrary custom-lobby settings. */
  custom?: Record<string, unknown>;
}

export type TicketStatus = 'searching' | 'found' | 'cancelled' | 'unavailable';

export interface QueueTicket {
  id: string;
  type: QueueType;
  rules: MatchRules;
  status: TicketStatus;
  /** The lobby to join once matched. */
  lobbyCode?: string;
  /** Human-readable reason when `unavailable`. */
  message?: string;
}

export interface Matchmaker {
  enqueue(type: QueueType, rules: MatchRules): Promise<QueueTicket>;
  cancel(ticketId: string): Promise<void>;
  onUpdate(handler: (ticket: QueueTicket) => void): () => void;
}
