'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Picking when a post goes out.
 *
 * The value stays in `datetime-local` shape (YYYY-MM-DDTHH:mm) because that is
 * what the composer already stores and converts to an absolute instant on
 * submit — this changes how the time is chosen, not what is carried around.
 */

/** Local wall-clock string, not UTC — the user picks a time on their clock. */
function toLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TIME_PRESETS = ['09:00', '12:00', '15:00', '18:00', '21:00'];

export function SchedulePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const selected = useMemo(() => (value ? new Date(value) : null), [value]);
  const today = startOfDay(new Date());

  const timeValue = selected ? format(selected, 'HH:mm') : '';

  /** Combines a chosen day with the time already picked, or a sensible first one. */
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    const next = new Date(date);
    if (selected) {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else if (startOfDay(date).getTime() === today.getTime()) {
      // Scheduling for later today: the next whole hour is the useful default.
      const soon = new Date(Date.now() + 60 * 60 * 1000);
      next.setHours(soon.getHours(), 0, 0, 0);
    } else {
      // A future day defaults to morning. Carrying "the next hour from now"
      // across to another date gives absurd defaults — picking a date at 3am
      // offered to post at 4am three days later.
      next.setHours(9, 0, 0, 0);
    }

    // Picking today with an hour that has already passed would be invalid the
    // moment it was chosen; nudge it forward rather than silently rejecting it
    // when they hit Schedule.
    if (next.getTime() <= Date.now()) {
      const bumped = new Date(Date.now() + 60 * 60 * 1000);
      bumped.setMinutes(0, 0, 0);
      next.setHours(bumped.getHours(), bumped.getMinutes(), 0, 0);
    }

    onChange(toLocalValue(next));
  };

  const handleTimeChange = (time: string) => {
    if (!time) return;
    const [hours, minutes] = time.split(':').map(Number);
    const base = selected ? new Date(selected) : new Date();
    base.setHours(hours, minutes, 0, 0);
    onChange(toLocalValue(base));
  };

  /** A preset that has already passed today is not offered. */
  const isPresetDisabled = (preset: string) => {
    if (!selected) return false;
    const [hours, minutes] = preset.split(':').map(Number);
    const candidate = new Date(selected);
    candidate.setHours(hours, minutes, 0, 0);
    return candidate.getTime() <= Date.now();
  };

  const isValid = selected ? selected.getTime() > Date.now() : false;

  return (
    <div className="flex w-[300px] max-w-[85vw] flex-col">
      <p className="px-1 pb-2 text-sm font-semibold">Schedule post</p>

      <Calendar
        mode="single"
        selected={selected ?? undefined}
        onSelect={handleDateSelect}
        disabled={{ before: today }}
        initialFocus
        className="p-0"
      />

      <div className="mt-3 border-t pt-3">
        <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Time</p>

        <div className="flex flex-wrap gap-1.5 px-1">
          {TIME_PRESETS.map((preset) => {
            const disabled = isPresetDisabled(preset);
            return (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant={timeValue === preset ? 'default' : 'outline'}
                disabled={disabled}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => handleTimeChange(preset)}
              >
                {preset}
              </Button>
            );
          })}
        </div>

        <Input
          type="time"
          aria-label="Custom time"
          value={timeValue}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="mt-2 h-8 w-full text-sm"
        />
      </div>

      <div className="mt-3 border-t pt-3">
        {selected ? (
          <p className={cn('px-1 text-xs', isValid ? 'text-muted-foreground' : 'text-destructive')}>
            {isValid
              ? `Goes out ${format(selected, 'EEEE d MMMM')} at ${format(selected, 'HH:mm')}`
              : 'That time has already passed — pick a later one.'}
          </p>
        ) : (
          <p className="px-1 text-xs text-muted-foreground">Pick a date to schedule this post.</p>
        )}

        {selected && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 px-1 text-destructive hover:text-destructive"
            onClick={() => onChange('')}
          >
            Clear schedule
          </Button>
        )}
      </div>
    </div>
  );
}

export default SchedulePicker;
