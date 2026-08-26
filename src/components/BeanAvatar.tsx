import { resolveLoadout, type AvatarLoadout } from '@/lib/avatar-catalog';

interface BeanAvatarProps {
  loadout?: Partial<AvatarLoadout>;
  size?: number;
  dancing?: boolean;
  className?: string;
  title?: string;
}

/** Layered SVG bean — Fall Guys vibe, 2D, CSS idle dance. */
export default function BeanAvatar({
  loadout,
  size = 96,
  dancing = false,
  className = '',
  title,
}: BeanAvatarProps) {
  const parts = resolveLoadout(loadout);
  const showHat = parts.hat.id !== 'hat_none';

  return (
    <div
      className={`relative inline-flex items-end justify-center ${dancing ? 'bean-dance' : ''} ${className}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden={!title}
    >
      <svg viewBox="0 0 80 104" width={size} height={size} className="overflow-visible drop-shadow-md">
        {/* shadow */}
        <ellipse cx="40" cy="97" rx="18" ry="4" fill="rgba(0,0,0,0.18)" className={dancing ? 'bean-shadow' : undefined} />

        {/* legs / pants — two rounded pill legs clearly visible below the body */}
        <rect x="25" y="68" width="13" height="20" rx="6" fill={parts.pants.color} />
        <rect x="42" y="68" width="13" height="20" rx="6" fill={parts.pants.color} />
        {/* pants cuff highlight */}
        <rect x="25" y="82" width="13" height="4" rx="2" fill="rgba(0,0,0,0.15)" />
        <rect x="42" y="82" width="13" height="4" rx="2" fill="rgba(0,0,0,0.15)" />

        {/* shoes */}
        <ellipse cx="31.5" cy="89" rx="9" ry="5" fill={parts.shoes.color} />
        <ellipse cx="48.5" cy="89" rx="9" ry="5" fill={parts.shoes.color} />
        {parts.shoes.accent && (
          <>
            <rect x="25" y="87" width="13" height="2" fill={parts.shoes.accent} opacity={0.7} />
            <rect x="42" y="87" width="13" height="2" fill={parts.shoes.accent} opacity={0.7} />
          </>
        )}

        {/* body */}
        <ellipse cx="40" cy="46" rx="26" ry="30" fill={parts.body.color} />

        {/* shirt — sits below the face, covers lower 60% of torso */}
        {/* shirt body: starts at chest y=52, wide, hem at y=74 */}
        <path
          d="M22 52 Q40 58 58 52 L60 74 Q40 80 20 74 Z"
          fill={parts.shirt.color}
          opacity={0.97}
        />
        {/* sleeve left */}
        <path d="M22 52 L10 58 Q8 68 14 70 L24 63 Z" fill={parts.shirt.color} opacity={0.97} />
        {/* sleeve right */}
        <path d="M58 52 L70 58 Q72 68 66 70 L56 63 Z" fill={parts.shirt.color} opacity={0.97} />
        {/* collar — small V at top of shirt */}
        <path d="M34 52 Q40 57 46 52" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" strokeLinecap="round" />
        {/* shirt accent stripe */}
        {parts.shirt.accent && (
          <path d="M37 56 L43 56 L42 72 L38 72 Z" fill={parts.shirt.accent} opacity={0.4} />
        )}

        {/* face */}
        <circle cx="32" cy="42" r="4.5" fill="#0f172a" className={dancing ? 'bean-blink' : undefined} />
        <circle cx="48" cy="42" r="4.5" fill="#0f172a" className={dancing ? 'bean-blink' : undefined} />
        <circle cx="33.5" cy="40.5" r="1.4" fill="#fff" />
        <circle cx="49.5" cy="40.5" r="1.4" fill="#fff" />

        {/* hat */}
        {showHat && parts.hat.id === 'hat_crown' && (
          <g>
            <polygon points="28,22 32,10 36,20 40,8 44,20 48,10 52,22" fill={parts.hat.color} />
            <rect x="28" y="20" width="24" height="5" rx="1" fill={parts.hat.accent ?? parts.hat.color} />
          </g>
        )}
        {showHat && parts.hat.id === 'hat_cap' && (
          <g>
            <ellipse cx="40" cy="22" rx="18" ry="8" fill={parts.hat.color} />
            <rect x="40" y="18" width="22" height="6" rx="2" fill={parts.hat.accent ?? parts.hat.color} />
          </g>
        )}
        {showHat && parts.hat.id === 'hat_beanie' && (
          <path d="M22 28 Q40 8 58 28 Z" fill={parts.hat.color} />
        )}
        {showHat && parts.hat.id === 'hat_propeller' && (
          <g className={dancing ? 'bean-spin' : undefined} style={{ transformOrigin: '40px 14px' }}>
            <rect x="38" y="14" width="4" height="12" fill="#64748b" />
            <ellipse cx="40" cy="12" rx="14" ry="4" fill={parts.hat.color} />
          </g>
        )}
      </svg>

      <style>{`
        .bean-dance { animation: bean-bob 1.1s ease-in-out infinite; }
        .bean-shadow { animation: bean-shadow-pulse 1.1s ease-in-out infinite; }
        .bean-blink { animation: bean-blink 3.2s step-end infinite; }
        .bean-spin { animation: bean-spin 1.4s linear infinite; }
        @keyframes bean-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-6px) rotate(2deg); }
        }
        @keyframes bean-shadow-pulse {
          0%, 100% { transform: scaleX(1); opacity: 0.18; }
          50% { transform: scaleX(0.85); opacity: 0.12; }
        }
        @keyframes bean-blink {
          0%, 42%, 48%, 100% { opacity: 1; }
          45% { opacity: 0.1; }
        }
        @keyframes bean-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
