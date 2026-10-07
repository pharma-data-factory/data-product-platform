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

  async deleteSignatureCredential(userRef: string) {
    this.credentials.delete(userRef);
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

  test('re-enrolling keeps the original creation date', async () => {
    const before = store.peek(USER)!.createdAt;
    await reAuth.enroll(USER, 'a-different-pin', PIN);

    expect(store.peek(USER)!.createdAt).toEqual(before);
    expect(store.peek(USER)!.updatedAt).toBeInstanceOf(Date);
  });
});

describe('Changing a PIN (NXD-138)', () => {
  let store: FakeStore;
  let reAuth: SignaturePinReAuth;

  beforeEach(() => {
    store = new FakeStore();
    reAuth = new SignaturePinReAuth(store);
  });

  test('a first enrolment needs no current PIN', async () => {
    await expect(reAuth.enroll(USER, PIN)).resolves.toBe('ENROLLED');
    await expect(reAuth.verify(USER, PIN)).resolves.toEqual({ ok: true });
  });

  test('a change without the current PIN is refused, and the PIN stays', async () => {
    await reAuth.enroll(USER, PIN);
    const before = store.peek(USER)!.pinHash;

    await expect(reAuth.enroll(USER, 'a-different-pin')).rejects.toThrow(
      InputError,
    );
    await expect(reAuth.enroll(USER, 'a-different-pin')).rejects.toThrow(
      /requires the current PIN/,
    );
    expect(store.peek(USER)!.pinHash).toBe(before);
    // Not an attempt: nothing was guessed.
    expect(store.peek(USER)!.failedAttempts).toBe(0);
  });

  test('a change with the current PIN replaces it', async () => {
    await reAuth.enroll(USER, PIN);

    await expect(reAuth.enroll(USER, 'a-different-pin', PIN)).resolves.toBe(
      'CHANGED',
    );
    await expect(reAuth.verify(USER, 'a-different-pin')).resolves.toEqual({
      ok: true,
    });
    await expect(reAuth.verify(USER, PIN)).resolves.toMatchObject({ ok: false });
  });

  test('a wrong current PIN is refused and counted as a failed attempt', async () => {
    await reAuth.enroll(USER, PIN);

    await expect(
      reAuth.enroll(USER, 'a-different-pin', 'wrong-pin'),
    ).rejects.toThrow(NotAllowedError);
    expect(store.peek(USER)!.failedAttempts).toBe(1);
    await expect(reAuth.verify(USER, PIN)).resolves.toEqual({ ok: true });
  });

  test('wrong current PINs lock the seat like wrong signing PINs', async () => {
    await reAuth.enroll(USER, PIN);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await expect(
        reAuth.enroll(USER, 'a-different-pin', 'wrong-pin'),
      ).rejects.toThrow(NotAllowedError);
    }
    expect(store.peek(USER)!.lockedUntil).toBeInstanceOf(Date);
  });

  test('a locked seat cannot change its PIN, not even with the right one', async () => {
    await reAuth.enroll(USER, PIN);
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await reAuth.verify(USER, 'nope');
    }
    const before = store.peek(USER)!.pinHash;

    await expect(reAuth.enroll(USER, 'a-different-pin', PIN)).rejects.toThrow(
      /Locked until .*cannot be changed/,
    );
    expect(store.peek(USER)!.pinHash).toBe(before);
    expect(store.peek(USER)!.lockedUntil).toBeInstanceOf(Date);
  });
});

describe('Clearing a PIN (NXD-138)', () => {
  let store: FakeStore;
  let reAuth: SignaturePinReAuth;

  beforeEach(async () => {
    store = new FakeStore();
    reAuth = new SignaturePinReAuth(store);
    await reAuth.enroll(USER, PIN);
  });

  test('clears the PIN with its lockout, records first, and the seat enrols again freely', async () => {
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i++) {
      await reAuth.verify(USER, 'nope');
    }
    const recorded: SignatureCredential[] = [];

    await expect(
      reAuth.clear(USER, async removed => {
        // Called while the credential still exists.
        expect(store.peek(USER)).toBeDefined();
        recorded.push(removed);
      }),
    ).resolves.toBe(true);

    expect(recorded).toHaveLength(1);
    expect(recorded[0].failedAttempts).toBe(MAX_FAILED_ATTEMPTS);
    expect(store.peek(USER)).toBeUndefined();
    await expect(reAuth.verify(USER, PIN)).rejects.toThrow(/No signing PIN/);
    await expect(reAuth.enroll(USER, 'a-fresh-pin')).resolves.toBe('ENROLLED');
    await expect(reAuth.verify(USER, 'a-fresh-pin')).resolves.toEqual({
      ok: true,
    });
  });

  test('a failed record leaves the credential in place', async () => {
    await expect(
      reAuth.clear(USER, async () => {
        throw new Error('audit unavailable');
      }),
    ).rejects.toThrow('audit unavailable');
    expect(store.peek(USER)).toBeDefined();
  });

  test('nothing to clear answers false and records nothing', async () => {
    const record = jest.fn();
    await expect(reAuth.clear('user:default/nobody', record)).resolves.toBe(
      false,
    );
    expect(record).not.toHaveBeenCalled();
  });
});

describe('Identity provider step-up', () => {
  test('reports that it is not configured rather than silently allowing', async () => {
    await expect(new OidcStepUpReAuth().verify(USER, PIN)).rejects.toThrow(
      NotAllowedError,
    );
  });
});
