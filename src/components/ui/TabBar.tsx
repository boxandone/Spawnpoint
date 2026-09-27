import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
  /** A small dot for something new (announced to screen readers via badgeLabel). */
  badge?: boolean;
  badgeLabel?: string;
}

interface TabBarProps {
  items: TabItem[];
  /** The floating center action (Scan). */
  action?: { to: string; label: string; icon: IconName };
  label: string;
  /** Render inline instead of fixed to the viewport (styleguide previews). */
  inline?: boolean;
}

/** Bottom tab bar with a floating action (Scan) above it. One thumb, one tap. */
export function TabBar({ items, action, label, inline }: TabBarProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'z-40 border-t border-line bg-surface/95 backdrop-blur',
        inline
          ? 'relative rounded-b-theme'
          : 'fixed inset-x-0 bottom-0 pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {action && (
        <div className="pointer-events-none absolute inset-x-0 -top-[4.25rem] mx-auto flex max-w-lg justify-end px-4">
          <NavLink
            to={action.to}
            aria-label={action.label}
            title={action.label}
            className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-ink shadow-press ring-4 ring-bg transition-transform active:translate-y-[var(--press-depth)] active:shadow-none"
          >
            <Icon name={action.icon} size={26} strokeWidth={2.4} />
          </NavLink>
        </div>
      )}
      <ul className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {items.map((item) => (
          <Tab key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  );
}

function Tab({ item }: { item: TabItem }) {
  return (
    <li className="flex min-w-0 flex-1">
      <NavLink
        to={item.to}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-theme text-[11px] font-bold transition-colors',
            isActive ? 'text-ink' : 'text-ink-muted hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                'sp-tab-indicator absolute top-1 h-8 w-14 rounded-full bg-primary/15 transition-opacity',
                isActive ? 'opacity-100' : 'opacity-0',
              )}
              aria-hidden
            />
            <span className="relative">
              <Icon name={item.icon} size={22} strokeWidth={isActive ? 2.4 : 2} />
              {item.badge && (
                <span
                  className="absolute -right-1 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface"
                  aria-hidden
                />
              )}
            </span>
            {item.badge && item.badgeLabel && <span className="sr-only">{item.badgeLabel}</span>}
            <span className="relative max-w-full truncate font-display">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
