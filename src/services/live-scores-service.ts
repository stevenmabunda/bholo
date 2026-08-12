// IMPORTANT: This file should not be marked with 'use server'
// as it is a pure data-fetching utility and doesn't need to be
// directly callable from the client. It will be used by server actions.

import type { MatchType } from '@/lib/data';
import { getLiveMatches } from './api-football-service';


// Service function to get live matches.
// This now acts as a wrapper around the API-Football service.
export async function getLiveMatchesFromApi(): Promise<MatchType[]> {
  return getLiveMatches();
}
