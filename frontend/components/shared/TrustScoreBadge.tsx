"use client";

type TrustTier = "maximum" | "high" | "medium" | "low";

function getTrustTier(score: number): TrustTier {
  if (score >= 86) return "maximum";
  if (score >= 56) return "high";
  if (score >= 26) return "medium";
  return "low";
}

const tierConfig: Record<TrustTier, { label: string; classes: string }> = {
  maximum: {
    label: "Maximum",
    classes: "bg-gradient-to-r from-[#533afd] to-[#f96bee] text-white",
  },
  high: {
    label: "High",
    classes: "bg-[#533afd] text-white",
  },
  medium: {
    label: "Medium",
    classes: "bg-[#b9b9f9] text-[#061b31]",
  },
  low: {
    label: "Low",
    classes: "bg-[#64748d] text-white",
  },
};

interface TrustScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function TrustScoreBadge({ score, size = "sm" }: TrustScoreBadgeProps) {
  const tier = getTrustTier(score);
  const config = tierConfig[tier];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`rounded-sm font-mono font-medium uppercase tracking-wider ${config.classes} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}

interface TrustBarProps {
  score: number;
}

export function TrustBar({ score }: TrustBarProps) {
  const tier = getTrustTier(score);
  const fillClasses =
    tier === "maximum"
      ? "bg-gradient-to-r from-[#533afd] to-[#f96bee]"
      : tier === "high"
        ? "bg-[#533afd]"
        : tier === "medium"
          ? "bg-[#b9b9f9]"
          : "bg-[#64748d]";

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[12px] font-medium uppercase tracking-wider text-[#64748d]">
          Trust Score
        </span>
        <span className="font-mono text-[13px] text-navy">{score}/100</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[#e5edf5]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${fillClasses}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
