/**
 * NXD-160. What a signature's justification must be: a reason in words.
 *
 * A one-word entry ("freigabe", "ok") was accepted for a GMP decision in the
 * lifecycle walkthrough of NXD-159. A justification is part of the signed
 * record; a token records no reason. The rule is deliberately a floor, not a
 * judgement of content: at least two words and ten characters.
 */
export const MIN_JUSTIFICATION_LENGTH = 10;

/** Why a justification is not enough, or undefined when it is. */
export function justificationProblem(
  justification: string | undefined,
): string | undefined {
  const text = String(justification ?? '').trim();
  if (!text) {
    return 'A justification is required.';
  }
  if (text.length < MIN_JUSTIFICATION_LENGTH || text.split(/\s+/).length < 2) {
    return `Say why in a sentence of at least two words and ${MIN_JUSTIFICATION_LENGTH} characters; "${text}" records no reason.`;
  }
  return undefined;
}
