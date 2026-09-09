import { InputError, NotAllowedError } from '@backstage/errors';
import { SignatureCredential } from '../types';
import {
  MAX_FAILED_ATTEMPTS,
  MIN_PIN_LENGTH,
  OidcStepUpReAuth,
  SCRYPT_ALGO,
  SignatureCredentialStore,
  SignaturePinReAuth,
} from './reauth';

class FakeStore implements SignatureCredentialStore {
  private credentials = new Map<string, SignatureCredential>();

  async getSignatureCredential(userRef: string) {
    return this.credentials.get(userRef) ?? null;
  }

  async upsertSignatureCredential(credential: SignatureCredential) {
    this.credentials.set(credential.userRef, credential);
  }

  async recordSignatureAttempt(
    userRef: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ) {
    const existing = this.credentials.get(userRef);
    if (!existing) return;
    this.credentials.set(userRef, {
      ...existing,
      failedAttempts,
      lockedUntil: lockedUntil ?? undefined,
    });
  }

  peek(userRef: string) {
    return this.credentials.get(userRef);
  }
}

const USER = 'user:default/jane';
const PIN = 'correct-horse';

describe('Signing PIN', () => {
  let store: FakeStore;
  let reAuth: SignaturePinReAuth;

  beforeEach(() => {
    store = new FakeStore();
    reAuth = new SignaturePinReAuth(store);
  });

  test('accepts the enrolled PIN', async () => {
    await reAuth.enroll(USER, PIN);
    await expect(reAuth.verify(USER, PIN)).resolves.toEqual({ ok: true });
  });

  test('rejects a wrong PIN', async () => {
    await reAuth.enroll(USER, PIN);
    await expect(reAuth.verify(USER, 'wrong-pin')).resolves.toMatchObject({
      ok: false,
    });
  });

  test('never stores the PIN itself', async () => {
    await reAuth.enroll(USER, PIN);
    const stored = store.peek(USER)!;

    expect(stored.pinHash).not.toContain(PIN);
    expect(stored.salt).not.toContain(PIN);
    expect(JSON.stringify(stored)).not.toContain(PIN);
    expect(stored.algo).toBe(SCRYPT_ALGO);
  });

  test('gives two users with the same PIN different hashes', async () => {
    await reAuth.enroll(USER, PIN);
    await reAuth.enroll('user:default/john', PIN);

    expect(store.peek(USER)!.pinHash).not.toBe(
      store.peek('user:default/john')!.pinHash,
    );
  });

  test('refuses a PIN that is too short', async () => {
    await expect(reAuth.enroll(USER, 'x'.repeat(MIN_PIN_LENGTH - 1))).rejects.toThrow(
      InputError,
    );
  });

  test('refuses to verify an account that never enrolled', async () => {
    await expect(reAuth.verify(USER, PIN)).rejects.toThrow(NotAllowedError);
  });

  test('rejects a credential written under an unknown algorithm', async () => {
    await reAuth.enroll(USER, PIN);
    await store.upsertSignatureCredential({
      ...store.peek(USER)!,
      algo: 'md5-from-2003',
    });

    await expect(reAuth.verify(USER, PIN)).rejects.toThrow(/unsupported algorithm/);
  });
});

describe('Lockout', () => {
  let store: FakeStore;
  let reAuth: SignaturePinReAuth;

  beforeEach(async () => {
    store = new FakeStore();
    reAuth = new SignaturePinReAuth(store);
    await reAuth.enroll(USER, PIN);
  });

  test('counts consecutive failures', async () => {
    await reAuth.verify(USER, 'nope');
    await reAuth.verify(USER, 'nope');

    expect(store.peek(USER)!.failedAttempts).toBe(2);
  });

  test('locks after too many failures', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await reAuth.verify(USER, 'nope');
    }

    const result = await reAuth.verify(USER, PIN);
    expect(result.ok).toBe(false);
    expect(result.lockedUntil).toBeInstanceOf(Date);
  });

  test('a correct PIN clears the counter', async () => {
    await reAuth.verify(USER, 'nope');
    await reAuth.verify(USER, PIN);

    expect(store.peek(USER)!.failedAttempts).toBe(0);
  });

  test('re-enrolling lifts a lockout', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await reAuth.verify(USER, 'nope');
    }

    await reAuth.enroll(USER, 'a-different-pin');

    expect(store.peek(USER)!.lockedUntil).toBeUndefined();
    await expect(reAuth.verify(USER, 'a-different-pin')).resolves.toEqual({
      ok: true,
    });
  });

  test('re-enrolling keeps the original creation date', async () => {
    const before = store.peek(USER)!.createdAt;
    await reAuth.enroll(USER, 'a-different-pin');

    expect(store.peek(USER)!.createdAt).toEqual(before);
    expect(store.peek(USER)!.updatedAt).toBeInstanceOf(Date);
  });
});

describe('Identity provider step-up', () => {
  test('reports that it is not configured rather than silently allowing', async () => {
    await expect(new OidcStepUpReAuth().verify(USER, PIN)).rejects.toThrow(
      NotAllowedError,
    );
  });
});
