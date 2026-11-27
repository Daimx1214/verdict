// Brand glyph - Specification 9.3: two bars on a verdigris baseline, 24x24 grid.
export default function Glyph({ size = 24, line = false }: { size?: number; line?: boolean }) {
  const stroke = line ? { fill: "none", strokeWidth: 1.5 } : {};
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="5" y="10" width="4" height="10" fill="var(--ctrl)" {...(line ? { ...stroke, stroke: "var(--ctrl)" } : {})} />
      <rect x="11" y="5" width="4" height="15" fill="var(--chal)" {...(line ? { ...stroke, stroke: "var(--chal)" } : {})} />
      <rect x="3" y="21" width="14" height="1.6" fill="var(--accent)" />
    </svg>
  );
}
