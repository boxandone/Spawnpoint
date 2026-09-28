import { useRef } from 'react';
import { Avatar, Icon, Tag } from '@/components/ui';
import { cn } from '@/lib/cn';
import { shortDay, type IsoDate } from '@/lib/dates';
import type { Member } from '@/modules/households/types';
import { EffortIcon, useCopy } from '@/theme';
import type { ChoreTask } from '../types';

export interface TaskRowProps {
  task: ChoreTask;
  state: 'due' | 'waiting' | 'done';
  /** An "as needed" check: a dashed circle, and no pressure. */
  optional?: boolean;
  /** Hide the room name when the list is already grouped by room. */
  hideLocation?: boolean;
  today: IsoDate;
  waitingSince?: IsoDate;
  /** yearly_in windows show "This month" instead of a day. */
  windowed?: boolean;
  location?: string | null;
  assignee?: Member;
  doneBy?: Member;
  onDone?: (el: HTMLElement) => void;
  onMore?: () => void;
}

/** One chore on Today. Tap the circle: done. Tap the rest: open it (log another day, skip, edit). */
export function TaskRow({
  task,
  state,
  optional,
  hideLocation,
  today,
  waitingSince,
  windowed,
  location,
  assignee,
  doneBy,
  onDone,
  onMore,
}: TaskRowProps) {
  const t = useCopy();
  const checkRef = useRef<HTMLButtonElement>(null);
  const interactive = !!onDone;
  const isDone = state === 'done';

  return (
    <li
      className={cn(
        'sp-panel flex min-h-[64px] items-center gap-3 py-2 pl-2 pr-1 transition-opacity',
        isDone && 'opacity-70',
      )}
    >
      <button
        ref={checkRef}
        type="button"
        disabled={!interactive || isDone}
        aria-label={isDone ? task.title : t('task.markDone', { task: task.title })}
        aria-pressed={isDone}
        onClick={() => checkRef.current && onDone?.(checkRef.current)}
        className={cn(
          'grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors',
          isDone
            ? 'bg-success text-on-success'
            : optional
              ? 'border-[2.5px] border-dashed border-primary text-primary hover:bg-primary/10 active:bg-primary/20'
              : 'text-primary shadow-[inset_0_0_0_2.5px_var(--primary)] hover:bg-primary/10 active:bg-primary/20',
        )}
      >
        <Icon
          name="check"
          size={22}
          strokeWidth={3}
          className={cn(
            isDone ? 'motion-safe:[animation:sp-check-pop_260ms_ease-out]' : 'opacity-0',
          )}
        />
      </button>

      <button
        type="button"
        disabled={!onMore}
        aria-label={onMore ? t('task.open', { task: task.title }) : undefined}
        className="min-w-0 flex-1 select-none py-1 text-left disabled:cursor-default"
        onClick={onMore}
      >
        <span
          className={cn(
            'block truncate font-bold leading-snug',
            isDone && 'line-through decoration-2',
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <EffortIcon level={task.effort} />
          {location && !hideLocation && <span className="truncate">{location}</span>}
          {state === 'waiting' && waitingSince && (
            <Tag tone="accent">
              <Icon name="clock" size={12} strokeWidth={2.5} />
              {t('task.waiting', { day: shortDay(waitingSince, today) })}
            </Tag>
          )}
          {state === 'due' && windowed && <Tag tone="secondary">{t('today.thisMonth')}</Tag>}
          {isDone && doneBy && <span>{doneBy.display_name}</span>}
        </span>
      </button>

      {assignee && !isDone && (
        <Avatar
          avatar={assignee.avatar}
          color={assignee.color}
          name={t('task.assignedTo', { name: assignee.display_name })}
          size={28}
        />
      )}
    </li>
  );
}
