import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState, Splash } from '@/components/ui';
import { hourIn } from '@/lib/dates';
import { TaskActionSheet } from '@/modules/chores/components/TaskActionSheet';
import { TodayView } from '@/modules/chores/components/TodayView';
import { useChores, useLogCompletions } from '@/modules/chores/hooks';
import { buildToday, catchUp, rotationFor, weeklyPoints } from '@/modules/chores/logic';
import type { ChoreTask } from '@/modules/chores/types';
import { useHousehold } from '@/modules/households/context';
import { locationLabel } from '@/modules/locations/logic';
import { useCopy } from '@/theme';

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
  const meterValue = useMemo(() => {
    const effort = new Map(tasks.map((x) => [x.id, x.effort]));
    return weeklyPoints(completions, (id) => effort.get(id), today);
  }, [tasks, completions, today]);
  const zoneNames = useMemo(
    () =>
      rotationFor(settings.zone_rotation, today)
        .map((id) => locations.find((l) => l.id === id)?.name)
        .filter((n): n is string => !!n),
    [settings.zone_rotation, today, locations],
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
        meter={{ value: meterValue, target: settings.weekly_target }}
        zoneNames={zoneNames}
        catchUpCount={catchUpCount}
        locationName={(id) => locationLabel(id, locations)}
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
        onCatchUp={() => navigate('/catch-up')}
        onUpcoming={() => navigate('/upcoming')}
      />
      <TaskActionSheet
        task={menuTask}
        onClose={() => setMenuTask(null)}
        onLog={(input) => log([input])}
        members={members}
        me={member}
        today={today}
      />
    </>
  );
}
