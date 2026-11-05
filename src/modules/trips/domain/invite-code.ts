// No I, L, O, 0 or 1: nothing that can be misread when typed.
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_CODE_LENGTH = 8;

export const INVITE_CODE_PATTERN = new RegExp(
  `^[${INVITE_CODE_ALPHABET}]{${INVITE_CODE_LENGTH}}$`,
  'i',
);

export function generateInviteCode(randomInt: (max: number) => number): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)],
  ).join('');
}

export function normalizeInviteCode(input: string): string {
  return input.trim().toUpperCase();
}
