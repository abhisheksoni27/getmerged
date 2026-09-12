import type { ProfileFormState } from "./useProfileForm";

export const HEADLINE_MAX_LENGTH = 120;
export const BIO_MAX_LENGTH = 1000;

/** Returns an error message when the headline is invalid, otherwise null. */
export function validateHeadline(headline: string): string | null {
  if (headline.trim().length === 0) return "Headline cannot be empty.";
  if (headline.length > HEADLINE_MAX_LENGTH) {
    return `Headline must be ${HEADLINE_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

/** Returns an error message when the bio is invalid, otherwise null. */
export function validateBio(bio: string): string | null {
  if (bio.length > BIO_MAX_LENGTH) {
    return `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
  }
  return null;
}

/** Returns the first form-level validation error, otherwise null. */
export function validateProfileForm(state: ProfileFormState): string | null {
  return validateHeadline(state.headline) ?? validateBio(state.bio);
}
