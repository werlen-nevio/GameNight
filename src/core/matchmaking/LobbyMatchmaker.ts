import { Emitter } from '../events/emitter';
import { createId, createLobbyCode } from '../utils/id';
import type { Matchmaker, MatchRules, QueueTicket, QueueType } from './types';

/**
 * The shipped matchmaker. Private and invite-only matches resolve immediately
 * to a fresh lobby code (the host then shares it). Public/ranked queues require
 * a matchmaking server and return an `unavailable` ticket with a clear message —
 * the same {@link Matchmaker} interface a real backend will implement.
 */
export class LobbyMatchmaker implements Matchmaker {
  private events = new Emitter<{ update: QueueTicket }>();

  async enqueue(type: QueueType, rules: MatchRules): Promise<QueueTicket> {
    if (type === 'private' || type === 'invite') {
      const ticket: QueueTicket = {
        id: createId(8),
        type,
        rules,
        status: 'found',
        lobbyCode: createLobbyCode(),
      };
      this.events.emit('update', ticket);
      return ticket;
    }
    const ticket: QueueTicket = {
      id: createId(8),
      type,
      rules,
      status: 'unavailable',
      message: 'Öffentliche & Ranked-Warteschlangen benötigen einen Matchmaking-Server.',
    };
    this.events.emit('update', ticket);
    return ticket;
  }

  async cancel(_ticketId: string): Promise<void> {
    /* no queue to cancel in the local implementation */
  }

  onUpdate(handler: (ticket: QueueTicket) => void): () => void {
    return this.events.on('update', handler);
  }
}

export const matchmaker: Matchmaker = new LobbyMatchmaker();
