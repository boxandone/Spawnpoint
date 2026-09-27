import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

/**
 * A QR code as crisp SVG. Always black on white, in every theme, because
 * scanners read that best (and it's what prints).
 */
export function QrCode({
  value,
  size = 120,
  label,
  className,
}: {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}) {
  const { d, n } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let path = '';
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (qr.isDark(r, c)) path += `M${c + 2} ${r + 2}h1v1h-1z`;
      }
    }
    return { d: path, n: count + 4 };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${n} ${n}`}
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={n} height={n} fill="white" />
      <path d={d} fill="black" />
    </svg>
  );
}
