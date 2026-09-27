import { ProgressMeter } from '@/components/ui';
import { useCopy } from '@/theme';

/** The household's shared weekly progress. Household total only, never per person. */
export function WeeklyMeter({ value, target }: { value: number; target: number }) {
  const t = useCopy();
  return (
    <div id="weekly-meter" className="sp-panel rounded-theme p-4">
      <ProgressMeter
        label={t('meter.name')}
        value={value}
        max={target}
        valueText={t('today.meterBody', { value, target })}
        tone={value >= target ? 'success' : 'primary'}
        size="lg"
      />
    </div>
  );
}
