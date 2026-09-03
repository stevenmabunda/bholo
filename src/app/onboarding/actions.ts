'use server';

import { createClient } from '@/lib/supabase/server';
import { PSL_TEAMS } from '@/lib/psl-teams';

export async function completeTeamOnboarding(
  teamName: string
): Promise<{ success: boolean; error?: string }> {
  // The picker only ever sends one of these 16 names, but this is a
  // server action — reachable directly, not just through the UI that
  // constrains it — so it gets checked here too, the same as any other
  // write that used to accept free text.
  const isValidTeam = PSL_TEAMS.some((t) => t.name === teamName);
  if (!isValidTeam) {
    return { success: false, error: 'Not a recognised Betway Premiership club.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Not authenticated.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ favourite_club: teamName })
    .eq('id', user.id);

  if (error) {
    console.error('completeTeamOnboarding failed:', error);
    return { success: false, error: 'Could not save your team. Please try again.' };
  }

  return { success: true };
}
