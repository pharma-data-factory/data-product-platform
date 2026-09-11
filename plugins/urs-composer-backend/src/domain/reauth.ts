/**
 * Re-authentication for electronic signatures.
 *
 * 21 CFR Part 11 requires a signature to be based on two distinct components.
 * Being logged in supplies the first ("something you have" — the session).
 * This module supplies the second ("something you know").
 *
 * Backstage authentication is deliberately not involved. Adding a signing step
 * to the login flow would mean changing an upstream concern to serve a
 * downstream one; instead the signing secret lives beside the signatures, and
 * the provider interface leaves room for an identity provider to take over
 * later without the signature service noticing.
 */

import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { InputError, NotAllowedError } from '@backstage/errors';
import { SignatureCredential } from '../types';

/**
 * Recorded per credential so these can be raised later without invalidating
 * the credentials already enrolled: an old row keeps verifying under the
 * parameters it was written with.
 */
export const SCRYPT_ALGO = 'scrypt-n16384-r8-p1-len64';
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

/** Minimum length of a signing PIN. */
export const MIN_PIN_LENGTH = 6;

/** How many consecutive failures before the credential locks. */
export const MAX_FAILED_ATTEMPTS = 5;

/** How long the credential stays locked after too many failures. */
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface ReAuthResult {
  ok: boolean;
  /** Populated when the credential is locked, so callers can say until when. */
  lockedUntil?: Date;
}

/**
 * Verifies the second factor for a signature.
 *
 * The signature service depends on this interface only, so replacing the PIN
 * with an identity-provider step-up is a wiring change.
 */
export interface ReAuthProvider {
  /** Stable name, recorded in the audit trail so it is clear what was verified. */
  readonly name: string;

  verify(userRef: string, secret: string): Promise<ReAuthResult>;
}

/** Storage the PIN provider needs; implemented by the URS repository. */
export interface SignatureCredentialStore {
  getSignatureCredential(userRef: string): Promise<SignatureCredential | null>;
  upsertSignatureCredential(credential: SignatureCredential): Promise<void>;
  recordSignatureAttempt(
    userRef: string,
    failedAttempts: number,
    lockedUntil: Date | null,
  ): Promise<void>;
}

// Wrapped by hand rather than with promisify, whose typings do not cover the
// options argument that carries the cost parameters.
function derive(secret: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(secret, salt, KEY_LENGTH, SCRYPT_PARAMS, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/**
 * PIN-based second factor.
 *
 * The PIN is enrolled once per user and stored only as a salted scrypt hash.
 */
export class SignaturePinReAuth implements ReAuthProvider {
  readonly name = 'signature-pin';

  constructor(private readonly store: SignatureCredentialStore) {}

  /**
   * Set or replace a user's signing PIN.
   *
   * Only the user themselves may do this — an administrator who could set
   * another user's PIN could sign in their name, which would defeat the
   * purpose. Enforced by the caller in the router.
   */
  async enroll(userRef: string, pin: string): Promise<void> {
    if (pin.length < MIN_PIN_LENGTH) {
      throw new InputError(
        `Signing PIN must be at least ${MIN_PIN_LENGTH} characters.`,
      );
    }

    const existing = await this.store.getSignatureCredential(userRef);
    const salt = randomBytes(SALT_BYTES).toString('hex');
    const hash = await derive(pin, salt);

    await this.store.upsertSignatureCredential({
      userRef,
      pinHash: hash.toString('hex'),
      salt,
      algo: SCRYPT_ALGO,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      // Re-enrolling clears a lockout; the user has proven possession of the
      // account through the normal login.
      failedAttempts: 0,
      lockedUntil: undefined,
    });
  }

  async verify(userRef: string, secret: string): Promise<ReAuthResult> {
    const credential = await this.store.getSignatureCredential(userRef);
    if (!credential) {
      throw new NotAllowedError(
        'No signing PIN has been set for this account. Set one before signing.',
      );
    }

    if (credential.lockedUntil && credential.lockedUntil > new Date()) {
      return { ok: false, lockedUntil: credential.lockedUntil };
    }

    if (credential.algo !== SCRYPT_ALGO) {
      throw new NotAllowedError(
        `Signing credential uses unsupported algorithm ${credential.algo}. Re-enrol the PIN.`,
      );
    }

    const expected = Buffer.from(credential.pinHash, 'hex');
    const actual = await derive(secret, credential.salt);
    const ok =
      expected.length === actual.length && timingSafeEqual(expected, actual);

    if (ok) {
      if (credential.failedAttempts > 0 || credential.lockedUntil) {
        await this.store.recordSignatureAttempt(userRef, 0, null);
      }
      return { ok: true };
    }

    const failedAttempts = credential.failedAttempts + 1;
    const lockedUntil =
      failedAttempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MS)
        : null;
    await this.store.recordSignatureAttempt(userRef, failedAttempts, lockedUntil);

    return { ok: false, lockedUntil: lockedUntil ?? undefined };
  }
}

/**
 * Placeholder for an identity-provider step-up (OIDC `acr_values`, or an
 * equivalent re-prompt).
 *
 * Not implemented: it needs an identity provider that supports step-up, which
 * this deployment does not have yet. It exists so that the shape of that
 * integration is settled — a future implementation replaces this class and
 * touches nothing else.
 */
export class OidcStepUpReAuth implements ReAuthProvider {
  readonly name = 'oidc-step-up';

  async verify(_userRef: string, _secret: string): Promise<ReAuthResult> {
    throw new NotAllowedError(
      'Step-up authentication via the identity provider is not configured. ' +
        'Use the signature PIN provider.',
    );
  }
}
