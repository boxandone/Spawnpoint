import { Link } from 'react-router-dom';
import { Icon, Tag, type IconName } from '@/components/ui';
import type { Item } from '@/modules/stuff/api';
import { useCopy, type CopyKey } from '@/theme';
import { MEMBER_INK } from '@/theme/memberColors';
import { roomColor } from '@/modules/locations/rooms';

export const CATEGORY_ICONS: Record<string, IconName> = {
  electronics: 'bolt',
  appliance: 'home',
  networking: 'link',
  furniture: 'zone',
  tools: 'wrench',
  outdoor: 'leaf',
  other: 'stuff',
};

/** One item in a list: photo or category icon, name, and where it lives. */
export function ItemRowLink({
  item,
  place,
  thumb,
  trailing,
}: {
  item: Item;
  place: string | null;
  thumb?: string;
  trailing?: React.ReactNode;
}) {
  const t = useCopy();
  const where = [place, item.spot].filter(Boolean).join(' · ');
  return (
    <li>
      <Link
        to={`/stuff/${item.id}`}
        className="sp-panel flex min-h-[64px] items-center gap-3 p-2 pr-3"
      >
        {thumb ? (
          <img
            src={thumb}
            alt=""
            loading="lazy"
            className="h-12 w-12 shrink-0 rounded-theme-sm bg-surface-2 object-cover"
          />
        ) : (
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-theme-sm"
            style={{ background: roomColor(item.location_id), color: MEMBER_INK }}
          >
            <Icon name={CATEGORY_ICONS[item.category] ?? 'stuff'} size={22} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{item.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-ink-muted">
            {where && <span className="truncate">{where}</span>}
            {item.status !== 'active' && (
              <Tag tone="secondary">{t(`stuff.status.${item.status}` as CopyKey)}</Tag>
            )}
          </span>
        </span>
        {trailing ?? <Icon name="chevron" size={18} className="text-ink-muted" />}
      </Link>
    </li>
  );
}
