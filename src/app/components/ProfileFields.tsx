import { useState } from 'react';
import { Avatar, TextField } from '@/components/ui';
import { cn } from '@/lib/cn';
import { getPack, THEME_PACKS, useCopy } from '@/theme';
import { MEMBER_COLORS } from '@/theme/memberColors';

export interface ProfileValue {
  displayName: string;
  avatar: string | null;
  color: string;
}

/** Name, avatar (from the chosen theme's set, or any set), and color. */
export function ProfileFields({
  value,
  onChange,
  themeId,
}: {
  value: ProfileValue;
  onChange: (v: ProfileValue) => void;
  themeId: string;
}) {
  const t = useCopy();
  const [showAll, setShowAll] = useState(false);
  const packs = showAll ? THEME_PACKS : [getPack(themeId)];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar
          avatar={value.avatar}
          color={value.color}
          name={value.displayName || '?'}
          size={72}
        />
        <TextField
          className="flex-1"
          label={t('setup.displayName')}
          value={value.displayName}
          maxLength={40}
          required
          onChange={(e) => onChange({ ...value, displayName: e.target.value })}
        />
      </div>

      <fieldset>
        <legend className="mb-2 px-0.5 text-sm font-bold">{t('setup.avatar')}</legend>
        {packs.map((pack) => (
          <div
            key={pack.id}
            role="radiogroup"
            aria-label={pack.name}
            className="mb-2 grid grid-cols-6 gap-2"
          >
            {pack.avatars.map((a) => (
              <button
                key={a.id}
                type="button"
                role="radio"
                aria-checked={value.avatar === a.id}
                aria-label={a.name}
                onClick={() => onChange({ ...value, avatar: a.id })}
                className="grid place-items-center rounded-full"
              >
                <Avatar
                  avatar={a.id}
                  color={value.color}
                  name={a.name}
                  size={48}
                  ring={value.avatar === a.id}
                  decorative
                />
              </button>
            ))}
          </div>
        ))}
        {THEME_PACKS.length > 1 && (
          <button
            type="button"
            className="min-h-[40px] px-1 text-sm font-bold underline underline-offset-2"
            onClick={() => setShowAll((s) => !s)}
          >
            {showAll
              ? t('common.showLess')
              : t('common.showMore', { count: THEME_PACKS.length - 1 })}
          </button>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 px-0.5 text-sm font-bold">{t('setup.color')}</legend>
        <div role="radiogroup" aria-label={t('setup.color')} className="flex flex-wrap gap-2">
          {MEMBER_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={value.color === c.id}
              aria-label={t(`color.${c.id}` as 'color.sky')}
              onClick={() => onChange({ ...value, color: c.id })}
              className={cn(
                'h-11 w-11 rounded-full',
                value.color === c.id && 'ring-[3px] ring-primary ring-offset-2 ring-offset-bg',
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </fieldset>
    </div>
  );
}
