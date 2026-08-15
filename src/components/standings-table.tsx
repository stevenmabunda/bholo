'use client';

import { useQuery } from '@tanstack/react-query';
import { getStandings } from '@/app/(app)/live/actions';
import { queryKeys } from '@/lib/query-keys';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';

export function StandingsTable() {
    const { data: standings = [], isLoading: loading } = useQuery({
        queryKey: queryKeys.standings(),
        queryFn: () => getStandings(),
        // League tables barely move within a session, and the service
        // layer already caches upstream.
        staleTime: 10 * 60_000,
    });

    return (
        <Card className="bg-black">
            <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">PSL Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead className="text-center">MP</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">GD</TableHead>
                            <TableHead className="text-center">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             Array.from({ length: 16 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-5 w-5" /></TableCell>
                                    <TableCell><div className="flex items-center gap-2"><Skeleton className="h-6 w-6 rounded-full" /><Skeleton className="h-5 w-24" /></div></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-6 mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            standings.map((standing) => (
                                <TableRow key={standing.team.id}>
                                    <TableCell>{standing.rank}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Image src={standing.team.logo} alt={standing.team.name} width={24} height={24} className="h-6 w-6" />
                                            <span className="font-semibold">{standing.team.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">{standing.all.played}</TableCell>
                                    <TableCell className="text-center">{standing.all.win}</TableCell>
                                    <TableCell className="text-center">{standing.all.draw}</TableCell>
                                    <TableCell className="text-center">{standing.all.lose}</TableCell>
                                    <TableCell className="text-center">{standing.goalsDiff}</TableCell>
                                    <TableCell className="text-center font-bold">{standing.points}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
