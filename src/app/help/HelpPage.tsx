import { Link } from 'react-router-dom';
import {
  Button,
  Icon,
  PageHeader,
  Panel,
  SectionTitle,
  Switch,
  useToast,
  type IconName,
} from '@/components/ui';
import { useCopy, type CopyKey } from '@/theme';
import { useGuide } from './tips';

const FAQ = [
  'done',
  'backdate',
  'skip',
  'waiting',
  'catchUp',
  'freshness',
  'rotation',
  'shopping',
  'staples',
  'receipts',
  'labels',
  'theme',
  'invite',
  'install',
  'private',
  'numbers',
] as const;

const CONTACT: Array<{ kind: 'bug' | 'question' | 'idea'; icon: IconName }> = [
  { kind: 'bug', icon: 'close' },
  { kind: 'question', icon: 'sparkle' },
  { kind: 'idea', icon: 'plus' },
];

/** Help: guide mode, answers to common questions, and a private line to the operator. */
export function HelpPage() {
  const t = useCopy();
  const toast = useToast();
  const guide = useGuide();

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <PageHeader title={t('help.title')} subtitle={t('help.subtitle')} back />

      <Panel className="flex flex-col gap-2">
        <Switch
          label={t('help.guideMode')}
          description={t('help.guideModeBody')}
          checked={guide.enabled}
          onChange={guide.setEnabled}
        />
        <Button
          variant="ghost"
          size="sm"
          icon="undo"
          className="self-start"
          onClick={() => {
            guide.resetAll();
            toast.show({ message: t('help.tipsReset') });
          }}
        >
          {t('help.resetTips')}
        </Button>
      </Panel>

      <SectionTitle>{t('help.contactTitle')}</SectionTitle>
      <ul className="sp-panel divide-y divide-line">
        {CONTACT.map((c) => (
          <li key={c.kind}>
            <Link
              to={`/help/feedback/${c.kind}`}
              className="flex min-h-[60px] items-center gap-3 px-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-theme-sm bg-surface-2">
                <Icon name={c.icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{t(`help.report.${c.kind}` as CopyKey)}</span>
                <span className="block text-sm text-ink-muted">
                  {t(`help.report.${c.kind}Body` as CopyKey)}
                </span>
              </span>
              <Icon name="chevron" size={18} className="text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-sm text-ink-muted">{t('help.contactBody')}</p>

      <SectionTitle>{t('help.faqTitle')}</SectionTitle>
      <div className="sp-panel divide-y divide-line">
        {FAQ.map((q) => (
          <details key={q} className="group px-4">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center gap-3 font-bold [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{t(`help.q.${q}` as CopyKey)}</span>
              <Icon
                name="down"
                size={18}
                className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="pb-4 leading-relaxed">{t(`help.a.${q}` as CopyKey)}</p>
          </details>
        ))}
      </div>

      <p className="mt-6 text-center text-sm">
        <Link to="/privacy" className="font-bold underline underline-offset-2">
          {t('legal.privacyTitle')}
        </Link>
      </p>
    </div>
  );
}
