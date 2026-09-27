import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export function EmptyState({
  icon = 'sparkle',
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 grid h-16 w-16 place-items-center rounded-full bg-accent text-on-accent">
        <Icon name={icon} size={30} />
      </span>
      <h2 className="text-xl">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
