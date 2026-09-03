/**
 * Shared between middleware.ts (reads it, and sets it once it confirms a
 * profile is onboarded) and onboarding/actions.ts (sets it on completion).
 * One name in one place — middleware and the action drifting on this string
 * would silently break the whole gate (everyone stuck re-onboarding, or
 * nobody ever gated at all).
 */
export const ONBOARDING_COOKIE = 'bholo_onboarded';
export const ONBOARDING_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
