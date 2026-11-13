interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 44, className = '' }: LogoProps) {
  // Styled "IB" monogram (the exported logo image was an empty file).
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        fontWeight: 800,
        fontFamily: 'var(--font-heading)',
        color: 'hsl(var(--primary-foreground))',
        letterSpacing: '-0.04em',
        userSelect: 'none',
      }}
      aria-label="IB"
    >
      IB
    </span>
  );
}
