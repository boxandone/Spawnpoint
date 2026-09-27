import { Select } from '@/components/ui';
import { useLocations } from '@/modules/locations/hooks';
import { buildTree } from '@/modules/locations/logic';
import { useCopy } from '@/theme';

/** Pick an area or spot (zones group them). Stuff can live in any of them. */
export function LocationSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const t = useCopy();
  const { locations } = useLocations();
  const tree = buildTree(locations);
  const options: Array<{ id: string; label: string }> = [];
  for (const root of tree) {
    const rootName = root.location.name;
    if (root.location.kind !== 'zone') options.push({ id: root.location.id, label: rootName });
    for (const child of root.children) {
      const childName = `${rootName} · ${child.location.name}`;
      options.push({ id: child.location.id, label: childName });
      for (const spot of child.children) {
        options.push({ id: spot.location.id, label: `${childName} · ${spot.location.name}` });
      }
    }
  }
  return (
    <Select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('stuff.noPlace')}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
