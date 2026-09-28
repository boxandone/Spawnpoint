import { useThemeScope } from './ThemeProvider';
import type { BadgeFrameProps, EffortLevel, HeroArtProps } from './types';

/** The active pack's effort icon (dots, chevrons, …). */
export function EffortIcon({
  level,
  className,
  title,
}: {
  level: EffortLevel;
  className?: string;
  title?: string;
}) {
  const { pack } = useThemeScope();
  const Effort = pack.Effort;
  return <Effort level={level} className={className} title={title} />;
}

/** The active pack's badge frame around a universal glyph. */
export function BadgeFrame(props: BadgeFrameProps) {
  const { pack } = useThemeScope();
  const Frame = pack.BadgeFrame;
  return <Frame {...props} />;
}

/** The active pack's decorative header art. Purely visual; hidden from screen readers. */
export function HeroArt(props: HeroArtProps) {
  const { pack } = useThemeScope();
  const Art = pack.Hero;
  return <Art {...props} />;
}
