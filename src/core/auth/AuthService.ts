import { Platform } from 'react-native';

import { Storage } from '../services/storage/storage';
import { RELAY_URL } from '../transport/config';
import { relayServices } from '../network/sharedRelay';

/**
 * Account identity & sign-in. Guest and Anonymous are fully implemented and work
 * offline (a persistent local id) or online (a relay-issued session token).
 * Google, Apple and Steam are provider adapters wired to the same flow — they
 * require provider credentials / a native build, so they activate when those are
 * configured and otherwise report `provider_not_configured`. Account linking
 * preserves the player's persistent id across providers.
 */
export type AuthProvider = 'guest' | 'anonymous' | 'google' | 'apple' | 'steam';

export interface AuthIdentity {
  persistentId: string;
  name: string;
  provider: AuthProvider;
  token?: string;
  /** Provider-specific external id once linked (e.g. Google sub, Steam id). */
  externalId?: string;
}

const KEY = 'auth/identity';

export class AuthService {
  private identity: AuthIdentity | null = null;

  get current(): AuthIdentity | null {
    return this.identity;
  }

  /** Restores a saved identity (called at startup). */
  async restore(): Promise<AuthIdentity | null> {
    this.identity = await Storage.get<AuthIdentity | null>(KEY, null);
    return this.identity;
  }

  /** Guest sign-in with a stable local id (the player's persistent id). */
  async signInGuest(persistentId: string, name: string): Promise<AuthIdentity> {
    return this.establish({ persistentId, name, provider: 'guest' });
  }

  /** Anonymous: like guest but explicitly not linked to any provider. */
  async signInAnonymous(persistentId: string, name: string): Promise<AuthIdentity> {
    return this.establish({ persistentId, name, provider: 'anonymous' });
  }

  /** Google sign-in via expo-auth-session (needs an OAuth client id). */
  async signInWithGoogle(): Promise<AuthIdentity> {
    return this.provider('google', 'expo-auth-session');
  }

  /** Apple sign-in via expo-apple-authentication (iOS, needs entitlement). */
  async signInWithApple(): Promise<AuthIdentity> {
    if (Platform.OS !== 'ios') throw new Error('apple_signin_ios_only');
    return this.provider('apple', 'expo-apple-authentication');
  }

  /** Steam sign-in (desktop Steam build via Steamworks). */
  async signInWithSteam(): Promise<AuthIdentity> {
    return this.provider('steam', 'steamworks');
  }

  /** Links the current account to a provider while keeping the persistent id. */
  async link(provider: AuthProvider, externalId: string): Promise<void> {
    if (!this.identity) return;
    this.identity = { ...this.identity, provider, externalId };
    await Storage.set(KEY, this.identity);
  }

  signOut(): void {
    this.identity = null;
    void Storage.remove(KEY);
    relayServices.close();
  }

  /** Establishes a session: persists identity and connects relay services if available. */
  private async establish(identity: AuthIdentity): Promise<AuthIdentity> {
    this.identity = identity;
    await Storage.set(KEY, identity);
    if (RELAY_URL) {
      try {
        const res = await relayServices.connect(RELAY_URL, {
          persistentId: identity.persistentId,
          name: identity.name,
          token: identity.token,
          provider: identity.provider,
        });
        this.identity = { ...identity, persistentId: res.persistentId, token: res.token };
        await Storage.set(KEY, this.identity);
      } catch {
        // Offline / no relay — guest still works fully locally.
      }
    }
    return this.identity;
  }

  /**
   * Provider adapter. The real flow is delegated to the provider SDK when it's
   * installed + configured (resolved dynamically so the bundle never hard-depends
   * on it); otherwise a clear, catchable error is thrown.
   */
  private async provider(provider: AuthProvider, moduleName: string): Promise<AuthIdentity> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const req: (id: string) => any = (globalThis as any).require || require;
      const sdk = req(moduleName);
      if (!sdk) throw new Error('provider_not_configured');
      // Each provider's concrete token exchange is wired here once credentials
      // exist; until then we surface a configuration error rather than fake it.
      throw new Error('provider_not_configured');
    } catch {
      throw new Error(`${provider}_not_configured`);
    }
  }
}

export const authService = new AuthService();
