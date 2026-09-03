import { TeamPickerView } from '@/components/onboarding/team-picker-view';

// Server shell only — matches the convention elsewhere in this app
// (post/[id], live/[fixtureId]) of a thin server page handing off to a
// client view that owns the actual interaction.
export default function OnboardingTeamPage() {
  return <TeamPickerView />;
}
