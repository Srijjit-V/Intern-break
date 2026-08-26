import { useState } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export default function Logo({ size = 44, className = '' }: LogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    // Fallback: styled "IB" monogram
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

  return (
    <span
      className={`inline-flex items-center justify-center overflow-visible rounded-xl bg-black p-1.5 shadow-md ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/airo-assets/images/logo/primary/dark"
        alt="Intern Break Space"
        width={size}
        height={size}
        className="block h-auto w-auto max-w-full self-center object-contain"
        style={{ maxHeight: `calc(${size}px - 12px)`, maxWidth: `calc(${size}px - 12px)` }}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
