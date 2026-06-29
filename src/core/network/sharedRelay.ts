import { RelayServices } from './RelayServices';

/**
 * The single account-level relay connection shared by auth, cloud save, friends
 * presence and matchmaking. One socket, many concerns — kept modular by each
 * service owning only its own message types.
 */
export const relayServices = new RelayServices();
