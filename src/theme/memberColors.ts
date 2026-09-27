/**
 * Member colors are identity, not theme: the same person keeps the same color in
 * every theme. They're soft enough that dark ink initials stay readable (tested).
 */
export const MEMBER_COLORS = [
  { id: 'sky', hex: '#A9D4FF' },
  { id: 'mint', hex: '#A8E6CF' },
  { id: 'peach', hex: '#FFC9A8' },
  { id: 'lilac', hex: '#D4C1F7' },
  { id: 'lemon', hex: '#FFE699' },
  { id: 'rose', hex: '#FFB8C8' },
  { id: 'sage', hex: '#C6DDB0' },
  { id: 'sand', hex: '#EBD6B5' },
] as const;

export type MemberColorId = (typeof MEMBER_COLORS)[number]['id'];

export const MEMBER_INK = '#1E2430';

export function memberColor(id: string | null | undefined): string {
  return (MEMBER_COLORS.find((c) => c.id === id) ?? MEMBER_COLORS[0]).hex;
}
