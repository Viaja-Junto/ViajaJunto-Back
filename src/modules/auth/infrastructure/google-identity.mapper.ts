import { UnauthorizedException } from '@nestjs/common';
import type { Profile } from 'passport-google-oauth20';
import type { GoogleIdentity } from '@modules/users/domain/google-identity.entity.js';

// Accounts are linked by email, so trusting an unverified one would allow account takeover.
export function toGoogleIdentity(profile: Profile): GoogleIdentity {
  const email = profile.emails
    ?.find((entry) => entry.verified)
    ?.value.toLowerCase();

  if (!email) {
    throw new UnauthorizedException(
      'Google account has no verified email address',
    );
  }

  return {
    googleId: profile.id,
    email,
    name: profile.displayName?.trim() || email.split('@')[0],
  };
}
