'use server';

import { getStandings as getPslStandings, type LeagueStanding } from "@/services/api-football-service";

export async function getStandings(): Promise<LeagueStanding[]> {
    return getPslStandings();
}
