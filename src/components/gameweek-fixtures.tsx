'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

const staticFixtures = [
    {
        date: '18 Oct',
        matches: [
            { team1: 'AmaZulu FC', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/2/994.png', team2: 'Durban City', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/13/1069.png', time: '15:30', stadium: 'Moses Mabhida Stadium, Durban', status: 'Scheduled' },
            { team1: 'Magesi FC', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/24/1272.png', team2: 'TS Galaxy', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/22/566.png', time: '17:30', stadium: 'Seshego Stadium, Pietersburg', status: 'Scheduled' },
        ]
    },
    {
        date: '19 Oct',
        matches: [
            { team1: 'Marumo Gallants', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/1/321.png', team2: 'Chippa United', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/17/561.png', time: '15:30', stadium: 'Dr Molemela Stadium, Bloemfontein', status: 'Scheduled' },
        ]
    },
     {
        date: 'Postponed',
        matches: [
             { team1: 'Sekhukhune United', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/19/563.png', team2: 'Mamelodi Sundowns', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/27/539.png', time: '', stadium: '', status: 'Postponed' },
        ]
    },
    {
        date: '22 Oct',
        matches: [
            { team1: 'Orlando Pirates', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/21/533.png', team2: 'Polokwane City', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/26/538.png', time: '19:30', stadium: 'Orlando Stadium, Soweto', status: 'Scheduled' },
            { team1: 'Stellenbosch FC', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/8/552.png', team2: 'Golden Arrows', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/3/547.png', time: '19:30', stadium: 'Athlone Stadium, Cape Town', status: 'Scheduled' },
            { team1: 'Kaizer Chiefs', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/24/536.png', team2: 'Siwelele', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/23/535.png', time: '19:30', stadium: 'FNB Stadium, Johannesburg', status: 'Scheduled' },
        ]
    },
    {
        date: '31 Oct',
        matches: [
            { team1: 'Durban City', team1Logo: 'https://cdn.sportmonks.com/images/soccer/teams/13/1069.png', team2: 'Kaizer Chiefs', team2Logo: 'https://cdn.sportmonks.com/images/soccer/teams/24/536.png', time: '19:30', stadium: 'Moses Mabhida Stadium, Durban', status: 'Scheduled' },
        ]
    }
];

export function GameweekFixtures() {
  const [gameweek, setGameweek] = useState(10);

  return (
    <Card className="m-4">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setGameweek(g => Math.max(1, g - 1))}>
            <ChevronLeft />
          </Button>
          <div className="text-center">
            <p className="font-bold text-lg">Gameweek {gameweek}</p>
            <p className="text-sm text-muted-foreground">18 Oct - 31 Oct</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setGameweek(g => g + 1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <Tabs defaultValue="fixtures" className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none">
          <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="live">Live</TabsTrigger>
        </TabsList>
        <TabsContent value="fixtures">
            {staticFixtures.map(group => (
                <div key={group.date} className="border-t">
                    {group.matches.map((match, index) => (
                        <div key={index} className="p-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center text-sm even:bg-secondary/50">
                            <div className="flex items-center justify-end gap-2">
                                <span className="hidden sm:inline font-semibold">{match.team1}</span>
                                <Image src={match.team1Logo} alt={match.team1} width={28} height={28} unoptimized className="h-7 w-7" />
                            </div>
                            {match.status === 'Postponed' ? (
                                <div className="font-bold text-destructive text-xs">Postponed</div>
                            ) : (
                                <div className="font-bold text-lg">VS</div>
                            )}
                            <div className="flex items-center justify-start gap-2">
                                <Image src={match.team2Logo} alt={match.team2} width={28} height={28} unoptimized className="h-7 w-7" />
                                <span className="hidden sm:inline font-semibold">{match.team2}</span>
                            </div>
                            {match.status !== 'Postponed' && (
                                <div className="col-span-3 text-xs text-muted-foreground pt-1">
                                    {group.date} {match.time} - {match.stadium}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </TabsContent>
        <TabsContent value="results">
          <div className="p-8 text-center text-muted-foreground">
            <p>No results for this gameweek yet.</p>
          </div>
        </TabsContent>
        <TabsContent value="live">
          <div className="p-8 text-center text-muted-foreground">
            <p>There are no live matches right now.</p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
