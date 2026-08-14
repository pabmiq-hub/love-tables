interface CompatRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * Circular progress ring used to display a compatibility percentage.
 * Purely presentational: colors come from design tokens.
 */
export default function CompatRing({ value, size = 52, strokeWidth = 5, className = "" }: CompatRingProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold text-primary" style={{ fontSize: size * 0.28 }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}
