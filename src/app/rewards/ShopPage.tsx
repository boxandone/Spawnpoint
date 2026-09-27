import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import {
  Button,
  Chip,
  EmptyState,
  IconButton,
  PageHeader,
  Panel,
  SectionTitle,
  Sheet,
  Splash,
  Switch,
  TextField,
  useToast,
} from '@/components/ui';
import { useHousehold } from '@/modules/households/context';
import * as api from '@/modules/rewards/api';
import { useInvalidateRewards, useMyRewards, useShop } from '@/modules/rewards/hooks';
import { qk } from '@/lib/queryKeys';
import { useCopy } from '@/theme';

const ICONS = ['🎁', '😴', '🍰', '☕', '🎮', '📚', '🛁', '🍿', '🌮', '🎬', '🧁', '🌿'];
const SUGGESTIONS = [
  { name: 'Sleep in Saturday', icon: '😴', cost: 150 },
  { name: 'Pick the movie', icon: '🎬', cost: 100 },
  { name: 'Fancy coffee', icon: '☕', cost: 120 },
  { name: 'Skip one chore', icon: '🌿', cost: 250 },
  { name: 'Takeout night', icon: '🌮', cost: 400 },
];

/** Your private reward shop. Coins = credited XP; spending is checked by the database. */
export function ShopPage() {
  const t = useCopy();
  const toast = useToast();
  const qc = useQueryClient();
  const { member } = useHousehold();
  const { data: rewards } = useMyRewards();
  const shop = useShop();
  const invalidate = useInvalidateRewards();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎁');
  const [cost, setCost] = useState('150');
  const [redeeming, setRedeeming] = useState<api.Reward | null>(null);
  const [share, setShare] = useState(false);
  const refreshShop = () => qc.invalidateQueries({ queryKey: qk.shop(member.id) });

  if (shop.isLoading) return <Splash />;
  const coins = rewards?.coins ?? 0;
  const coinsName = t('coins.name');
  const items = shop.data ?? [];

  const add = async (
    e: FormEvent | null,
    preset?: { name: string; icon: string; cost: number },
  ) => {
    e?.preventDefault();
    const input = preset ?? { name: name.trim(), icon, cost: Math.round(Number(cost)) };
    if (!input.name || !(input.cost >= 1)) return;
    await api.createReward(input);
    setName('');
    await refreshShop();
  };

  return (
    <div className="pb-6">
      <PageHeader title={t('shop.name')} subtitle={t('shop.private')} back="/me" />
      <Panel className="flex items-center justify-between">
        <p className="font-display text-xl">
          {t('shop.balance', { coins: coins.toLocaleString(), coinsName })}
        </p>
      </Panel>

      {items.length === 0 ? (
        <EmptyState icon="gift" title={t('shop.empty')} />
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((r) => {
            const need = r.cost - coins;
            return (
              <li key={r.id} className="sp-panel flex min-h-[64px] items-center gap-3 px-3 py-2">
                <span
                  className="grid h-11 w-11 place-items-center rounded-full bg-surface-2 text-2xl"
                  aria-hidden
                >
                  {r.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{r.name}</span>
                  <span className="block text-sm text-ink-muted">
                    {r.cost.toLocaleString()} {coinsName}
                    {need > 0 && ` · ${t('shop.need', { need: need.toLocaleString() })}`}
                  </span>
                </span>
                <Button size="sm" disabled={need > 0} onClick={() => setRedeeming(r)}>
                  {t('shop.redeem')}
                </Button>
                <IconButton
                  icon="archive"
                  label={t('shop.remove', { name: r.name })}
                  className="text-ink-muted"
                  onClick={async () => {
                    await api.updateReward(r.id, { archived_at: new Date().toISOString() });
                    await refreshShop();
                    toast.show({
                      message: t('shop.removed'),
                      onUndo: async () => {
                        await api.updateReward(r.id, { archived_at: null });
                        await refreshShop();
                      },
                    });
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}

      <SectionTitle>{t('shop.add')}</SectionTitle>
      <Panel>
        <form onSubmit={(e) => void add(e)} className="flex flex-col gap-3">
          <TextField
            label={t('shop.rewardName')}
            placeholder={t('shop.rewardPlaceholder')}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset>
            <legend className="mb-2 text-sm font-bold">{t('shop.icon')}</legend>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((i) => (
                <Chip
                  key={i}
                  selected={icon === i}
                  onClick={() => setIcon(i)}
                  className="px-2.5 text-lg"
                  aria-label={i}
                >
                  {i}
                </Chip>
              ))}
            </div>
          </fieldset>
          <TextField
            label={`${t('shop.cost')} (${coinsName})`}
            type="number"
            inputMode="numeric"
            min={1}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
          />
          <Button type="submit" icon="plus" disabled={!name.trim() || !(Number(cost) >= 1)}>
            {t('shop.add')}
          </Button>
        </form>
      </Panel>

      <SectionTitle>{t('shop.suggestions')}</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !items.some((i) => i.name === s.name)).map((s) => (
          <Chip
            key={s.name}
            leading={<span aria-hidden>{s.icon}</span>}
            onClick={() => void add(null, s)}
          >
            {s.name} · {s.cost}
          </Chip>
        ))}
      </div>

      <Sheet
        open={!!redeeming}
        onClose={() => setRedeeming(null)}
        title={redeeming ? `${redeeming.icon} ${redeeming.name}` : ''}
        footer={
          redeeming && (
            <Button
              block
              size="lg"
              icon="gift"
              onClick={async () => {
                const r = redeeming;
                setRedeeming(null);
                try {
                  const res = await api.redeemReward(r.id, share);
                  invalidate();
                  toast.show({
                    message: t('shop.redeemed', { name: r.name }),
                    onUndo: async () => {
                      await api.undoRedemption(res.id);
                      invalidate();
                    },
                  });
                } catch {
                  toast.show({ message: t('common.error'), tone: 'danger' });
                  invalidate();
                }
              }}
            >
              {redeeming &&
                t('shop.redeemFor', { cost: `${redeeming.cost.toLocaleString()} ${coinsName}` })}
            </Button>
          )
        }
      >
        <Switch label={t('shop.shareRedeem')} checked={share} onChange={setShare} />
      </Sheet>
    </div>
  );
}
