'use server';

import { getStandings as getPslStandings, type LeagueStanding } from "@/services/thesportsdb-service";

export async function getStandings(): Promise<LeagueStanding[]> {
    return getPslStandings();
}
