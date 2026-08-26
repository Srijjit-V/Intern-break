import { Eye, MousePointer, Trophy, Hash, Palette, Shapes, Layers } from 'lucide-react';

type IconName = 'eye' | 'click' | 'trophy' | 'number' | 'color' | 'shape' | 'fill';

interface Step {
  title: string;
  body: string;
  icon?: IconName;
}

interface HowToPlayGuideProps {
  title: string;
  steps: Step[];
  className?: string;
}

const ICONS: Record<IconName, React.ReactNode> = {
  eye: <Eye className="h-4 w-4" />,
  click: <MousePointer className="h-4 w-4" />,
  trophy: <Trophy className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  color: <Palette className="h-4 w-4" />,
  shape: <Shapes className="h-4 w-4" />,
  fill: <Layers className="h-4 w-4" />,
};

export default function HowToPlayGuide({ title, steps, className = '' }: HowToPlayGuideProps) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {step.icon ? ICONS[step.icon] : <span className="text-xs font-bold">{i + 1}</span>}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-foreground">{step.title}: </span>
              <span className="text-xs text-muted-foreground">{step.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
