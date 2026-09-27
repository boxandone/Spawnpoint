import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export interface TabItem {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

interface TabBarProps {
  items: TabItem[];
  /** The floating center action (Scan). */
  action?: { to: string; label: string; icon: IconName };
  label: string;
  /** Render inline instead of fixed to the viewport (styleguide previews). */
  inline?: boolean;
}

/** Bottom tab bar with a floating center action. One thumb, one tap. */
export function TabBar({ items, action, label, inline }: TabBarProps) {
  const half = Math.ceil(items.length / 2);
  const left = action ? items.slice(0, half) : items;
  const right = action ? items.slice(half) : [];

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
      <ul className="mx-auto flex h-16 max-w-lg items-stretch px-1">
        {left.map((item) => (
          <Tab key={item.to} item={item} />
        ))}
        {action && (
          <li className="relative flex w-[72px] shrink-0 justify-center">
            <NavLink
              to={action.to}
              aria-label={action.label}
              className="absolute -top-5 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-ink shadow-press ring-4 ring-bg transition-transform active:translate-y-[var(--press-depth)] active:shadow-none"
            >
              <Icon name={action.icon} size={26} strokeWidth={2.4} />
            </NavLink>
          </li>
        )}
        {right.map((item) => (
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
            <Icon
              name={item.icon}
              size={22}
              className="relative"
              strokeWidth={isActive ? 2.4 : 2}
            />
            <span className="relative max-w-full truncate font-display">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}
