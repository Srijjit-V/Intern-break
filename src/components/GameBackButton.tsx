import { useNavigate } from "react-router";
import { ArrowLeft } from 'lucide-react';
interface GameBackButtonProps {
  /** Where to go — defaults to /games */
  to?: string;
  label?: string;
  /** Extra Tailwind classes for positioning */
  className?: string;
}

/**
 * Consistent back-to-arcade button used across every game page.
 * Renders as a pill in the top-left corner of the game canvas.
 */
export default function GameBackButton({
  to = '/games',
  label = 'Arcade',
  className = ''
}: GameBackButtonProps) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)} aria-label={`Back to ${label}`} className={`inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-md backdrop-blur-sm transition hover:-translate-x-0.5 hover:border-primary/50 hover:bg-card active:scale-95 ${className}`}>
      <ArrowLeft size={13} aria-hidden="true" />
      {label}
    </button>;
}
