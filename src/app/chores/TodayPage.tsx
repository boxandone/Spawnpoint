import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, Splash } from '@/components/ui';
import { hourIn } from '@/lib/dates';
import { TaskActionSheet } from '@/modules/chores/components/TaskActionSheet';
import { TodayView, type TodayRoom } from '@/modules/chores/components/TodayView';
import { useChores, useLogCompletions } from '@/modules/chores/hooks';
import { buildToday, catchUp, rotationFor } from '@/modules/chores/logic';
import { LogFixSheet } from '@/modules/rewards/components/LogFixSheet';
import { useLogDeed, useWeekXp } from '@/modules/rewards/hooks';
import type { ChoreTask } from '@/modules/chores/types';
import { useHousehold } from '@/modules/households/context';
import { locationLabel } from '@/modules/locations/logic';
import { roomColor, roomIcon } from '@/modules/locations/rooms';
import { useCelebrate, useCopy } from '@/theme';
import { TipQueue } from '../help/Tip';

export function TodayPage() {
  const t = useCopy();
  const navigate = useNavigate();
  const { member, members, household, settings, today, memberById } = useHousehold();
  const { tasks, completions, locations, ctx, isLoading, error } = useChores();
  const log = useLogCompletions();
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [showAllWaiting, setShowAllWaiting] = useState(false);
  const [menuTask, setMenuTask] = useState<ChoreTask | null>(null);

  const visible = useMemo(
    () =>
      filter === 'mine'
        ? tasks.filter((x) => x.assignee_id === null || x.assignee_id === member.id)
        : tasks,
    [tasks, filter, member.id],
  );
  const view = useMemo(
    () => buildToday(visible, completions, today, ctx),
    [visible, completions, today, ctx],
  );
  const catchUpCount = useMemo(
    () => catchUp(tasks, completions, today, ctx).length,
    [tasks, completions, today, ctx],
  );
  const rewardsOn = settings.modules.rewards;
  const weekXp = useWeekXp();
  const meterValue = weekXp.data ?? 0;
  const logDeed = useLogDeed();
  const [fixOpen, setFixOpen] = useState(false);
  const celebrate = useCelebrate();
  const lastMeter = useRef<number | null>(null);
  // Celebrate when the household crosses the weekly target (not on first load).
  useEffect(() => {
    if (weekXp.data == null) return;
    const before = lastMeter.current;
    if (
      rewardsOn &&
      before != null &&
      before < settings.weekly_target &&
      weekXp.data >= settings.weekly_target
    ) {
      celebrate('meterFull', {
        from: document.getElementById('weekly-meter'),
        text: t('meter.full'),
      });
    }
    lastMeter.current = weekXp.data;
  }, [weekXp.data, settings.weekly_target, rewardsOn, celebrate, t]);
  const zoneNames = useMemo(
    () =>
      rotationFor(settings.zone_rotation, today)
        .map((id) => locations.find((l) => l.id === id)?.name)
        .filter((n): n is string => !!n),
    [settings.zone_rotation, today, locations],
  );
  // Group by area: a task in a spot belongs to the spot's area.
  const roomOf = useCallback(
    (task: ChoreTask): TodayRoom | null => {
      let loc = locations.find((l) => l.id === task.location_id);
      if (loc?.kind === 'spot') loc = locations.find((l) => l.id === loc?.parent_id);
      if (!loc || loc.kind === 'zone') return null;
      return { id: loc.id, name: loc.name, icon: roomIcon(loc), color: roomColor(loc.id) };
    },
    [locations],
  );
  const doneByFor = (taskId: string) => {
    const c = completions.find((x) => x.task_id === taskId && x.done_on === today);
    return memberById(c?.done_by);
  };

  if (isLoading) return <Splash />;
  if (error) return <EmptyState icon="home" title={t('common.error')} />;

  return (
    <>
      <TodayView
        name={member.display_name}
        hour={hourIn(household.timezone)}
        today={today}
        view={view}
        meter={rewardsOn ? { value: meterValue, target: settings.weekly_target } : undefined}
        zoneNames={zoneNames}
        catchUpCount={catchUpCount}
        locationName={(id) => locationLabel(id, locations)}
        roomOf={roomOf}
        memberById={memberById}
        doneByFor={doneByFor}
        filter={filter}
        onFilter={members.length > 1 ? setFilter : undefined}
        showAllWaiting={showAllWaiting}
        onToggleWaiting={() => setShowAllWaiting((v) => !v)}
        onDone={(task, el) =>
          log([{ taskId: task.id, doneOn: today, doneBy: member.id, source: 'tap' }], { from: el })
        }
        onMore={setMenuTask}
        onAdd={() => navigate('/tasks/new')}
        onScan={settings.modules.stuff ? () => navigate('/scan') : undefined}
        onLogFix={rewardsOn ? () => setFixOpen(true) : undefined}
        onCatchUp={() => navigate('/catch-up')}
        onUpcoming={() => navigate('/upcoming')}
        tips={
          view.due.length + view.waiting.length > 0 ? (
            <TipQueue tips={[{ id: 'today.tap', text: 'tip.today.tap' }]} />
          ) : undefined
        }
      />
      <TaskActionSheet
        task={menuTask}
        onClose={() => setMenuTask(null)}
        onLog={(input) => log([input])}
        members={members}
        me={member}
        today={today}
      />
      <LogFixSheet
        open={fixOpen}
        onClose={() => setFixOpen(false)}
        onLog={(input) => void logDeed(input)}
        members={members}
        me={member}
        today={today}
      />
    </>
  );
}
