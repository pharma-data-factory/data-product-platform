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
  /** Remove a credential entirely (NXD-138: administrator reset). */
  deleteSignatureCredential(userRef: string): Promise<void>;
}

/** What an enrolment did: a first PIN, or a change of an existing one. */
export type EnrolmentOutcome = 'ENROLLED' | 'CHANGED';

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
   * Set the first signing PIN, or change an existing one (NXD-138).
   *
   * - **First enrolment is free.** No PIN exists, so there is nothing to
   *   prove; being signed in is all a first PIN can rest on. `currentPin` is
   *   ignored.
   * - **A change needs the current PIN.** Otherwise whoever holds the session
   *   (a stolen token, an unlocked workstation) could replace the second
   *   factor and sign as the seat, and the two factors would be one
   *   (NXD-136). The current PIN goes through `verify`, so a wrong one counts
   *   as a failed attempt and a locked credential cannot be changed at all.
   * - A forgotten PIN is not changed here: a platform administrator clears it
   *   (`clear`), and the seat enrols again.
   *
   * Only the user themselves may enrol. An administrator who could set
   * another user's PIN could sign in their name; enforced by the caller,
   * which takes the user from the token.
   */
  async enroll(
    userRef: string,
    pin: string,
    currentPin?: string,
  ): Promise<EnrolmentOutcome> {
    if (pin.length < MIN_PIN_LENGTH) {
      throw new InputError(
        `Signing PIN must be at least ${MIN_PIN_LENGTH} characters.`,
      );
    }

    const existing = await this.store.getSignatureCredential(userRef);
    if (existing) {
      if (!currentPin) {
        throw new InputError(
          'A signing PIN is already set for this account. Changing it requires ' +
            'the current PIN (currentPin). If it is forgotten, a platform ' +
            'administrator can reset it.',
        );
      }
      const check = await this.verify(userRef, currentPin);
      if (!check.ok) {
        if (check.lockedUntil) {
          throw new NotAllowedError(
            `Too many failed signing attempts. Locked until ${check.lockedUntil.toISOString()}. ` +
              'A locked PIN cannot be changed; wait until then, or ask a ' +
              'platform administrator to reset it.',
          );
        }
        throw new NotAllowedError(
          'The current signing PIN is wrong. The PIN was not changed.',
        );
      }
    }

    const salt = randomBytes(SALT_BYTES).toString('hex');
    const hash = await derive(pin, salt);

    await this.store.upsertSignatureCredential({
      userRef,
      pinHash: hash.toString('hex'),
      salt,
      algo: SCRYPT_ALGO,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      // A change has just verified the current PIN, which already cleared
      // the counter; a first enrolment starts from zero.
      failedAttempts: 0,
      lockedUntil: undefined,
    });
    return existing ? 'CHANGED' : 'ENROLLED';
  }

  /**
   * Clear a user's credential (NXD-138: administrator reset).
   *
   * Removes the PIN together with its failed-attempt counter and lockout. It
   * never sets a PIN: the seat must enrol again, as a first enrolment, before
   * its next signature, so the person who cleared it cannot sign as the seat.
   *
   * `record` is called with the credential about to be removed, before it is
   * removed: the caller writes the audit event there, so that a failed audit
   * write leaves the credential in place rather than gone and unrecorded.
   * Answers false, and calls nothing, when there was no credential.
   */
  async clear(
    userRef: string,
    record: (removed: SignatureCredential) => Promise<void>,
  ): Promise<boolean> {
    const existing = await this.store.getSignatureCredential(userRef);
    if (!existing) {
      return false;
    }
    await record(existing);
    await this.store.deleteSignatureCredential(userRef);
    return true;
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
