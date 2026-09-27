import { useRef } from 'react';
import { Avatar, Icon, IconButton, Tag } from '@/components/ui';
import { cn } from '@/lib/cn';
import { shortDay, type IsoDate } from '@/lib/dates';
import { useLongPress } from '@/lib/useLongPress';
import type { Member } from '@/modules/households/types';
import { EffortIcon, useCopy } from '@/theme';
import type { ChoreTask } from '../types';

export interface TaskRowProps {
  task: ChoreTask;
  state: 'due' | 'waiting' | 'done';
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

/** One chore on Today. Tap the circle: done. Long-press or "…": more options. */
export function TaskRow({
  task,
  state,
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
  const press = useLongPress(() => onMore?.());
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

      <div
        className="min-w-0 flex-1 select-none py-1"
        {...(onMore
          ? {
              onPointerDown: press.onPointerDown,
              onPointerMove: press.onPointerMove,
              onPointerUp: press.onPointerUp,
              onPointerCancel: press.onPointerCancel,
              onPointerLeave: press.onPointerLeave,
              onContextMenu: press.onContextMenu,
            }
          : {})}
      >
        <p className={cn('truncate font-bold leading-snug', isDone && 'line-through decoration-2')}>
          {task.title}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
          <EffortIcon level={task.effort} />
          {location && <span className="truncate">{location}</span>}
          {state === 'waiting' && waitingSince && (
            <Tag tone="accent">
              <Icon name="clock" size={12} strokeWidth={2.5} />
              {t('task.waiting', { day: shortDay(waitingSince, today) })}
            </Tag>
          )}
          {state === 'due' && windowed && <Tag tone="secondary">{t('today.thisMonth')}</Tag>}
          {isDone && doneBy && <span>{doneBy.display_name}</span>}
        </div>
      </div>

      {assignee && !isDone && (
        <Avatar
          avatar={assignee.avatar}
          color={assignee.color}
          name={t('task.assignedTo', { name: assignee.display_name })}
          size={28}
        />
      )}
      {onMore && (
        <IconButton
          icon="more"
          label={t('task.moreActions', { task: task.title })}
          onClick={onMore}
          className="text-ink-muted"
        />
      )}
    </li>
  );
}
