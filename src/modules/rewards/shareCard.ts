/**
 * The share card: an image with your level, title, badge count, and top three
 * badges, drawn in your theme's colors. It never includes household data.
 */
export interface ShareCardInput {
  name: string;
  levelLine: string;
  badgeLine: string;
  topBadges: Array<{ name: string; tier: string }>;
  themeName: string;
  appName: string;
  avatarSrc?: string;
  avatarColor: string;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'gray';
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawShareCard(input: ShareCardInput): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const c = {
    bg: cssVar('--bg'),
    surface: cssVar('--surface'),
    ink: cssVar('--ink'),
    muted: cssVar('--ink-muted'),
    primary: cssVar('--primary'),
    secondary: cssVar('--secondary'),
    accent: cssVar('--accent'),
  };
  const display = cssVar('--font-display');
  const body = cssVar('--font-body');
  await document.fonts?.ready;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);
  // Theme art: soft confetti in the theme's colors.
  const dots = [c.primary, c.secondary, c.accent];
  for (let i = 0; i < 46; i++) {
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = dots[i % 3] as string;
    const x = (i * 197) % W;
    const y = (i * 311) % H;
    ctx.beginPath();
    ctx.arc(x, y, 10 + ((i * 7) % 22), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = c.surface;
  roundRect(ctx, 90, 150, W - 180, H - 300, 48);
  ctx.fill();

  ctx.fillStyle = input.avatarColor;
  ctx.beginPath();
  ctx.arc(W / 2, 330, 130, 0, Math.PI * 2);
  ctx.fill();
  if (input.avatarSrc) {
    const img = await loadImage(input.avatarSrc);
    if (img) ctx.drawImage(img, W / 2 - 115, 225, 230, 230);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = c.ink;
  ctx.font = `800 64px ${display}`;
  ctx.fillText(input.name, W / 2, 540);
  ctx.fillStyle = c.primary;
  roundRect(ctx, W / 2 - 330, 590, 660, 110, 55);
  ctx.fill();
  ctx.fillStyle = cssVar('--primary-ink');
  ctx.font = `800 56px ${display}`;
  ctx.fillText(input.levelLine, W / 2, 665);

  ctx.fillStyle = c.muted;
  ctx.font = `600 42px ${body}`;
  ctx.fillText(input.badgeLine, W / 2, 790);

  ctx.font = `700 40px ${body}`;
  input.topBadges.slice(0, 3).forEach((b, i) => {
    const y = 880 + i * 90;
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(250, y - 14, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = c.ink;
    ctx.fillText(b.name, 300, y, 440);
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'right';
    ctx.fillText(b.tier, W - 170, y);
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = c.muted;
  ctx.font = `600 34px ${body}`;
  ctx.fillText(`${input.appName} · ${input.themeName}`, W / 2, H - 90);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Share through the phone's share sheet when possible, otherwise download. */
export async function shareOrDownload(
  blob: Blob,
  filename: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'downloaded';
}
