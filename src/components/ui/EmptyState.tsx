import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/** A friendly empty screen: a drawn badge of shapes around the icon, one line, one button. */
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
      <span className="relative mb-4 grid h-28 w-28 place-items-center" aria-hidden>
        <svg viewBox="0 0 112 112" className="absolute inset-0">
          <circle cx="56" cy="58" r="44" fill="var(--primary)" opacity="0.12" />
          <circle cx="92" cy="26" r="9" fill="var(--accent)" opacity="0.7" />
          <circle cx="18" cy="84" r="6" fill="var(--secondary)" opacity="0.6" />
          <path
            d="M20 30l4 -8 4 8M86 88l3 -6 3 6"
            fill="none"
            stroke="var(--secondary)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-accent text-on-accent shadow-card">
          <Icon name={icon} size={30} />
        </span>
      </span>
      <h2 className="text-xl">{title}</h2>
      {body && <p className="mt-1 max-w-xs text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
