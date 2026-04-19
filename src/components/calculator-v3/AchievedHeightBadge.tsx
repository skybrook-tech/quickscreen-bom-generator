interface AchievedHeightBadgeProps {
  computed: Record<string, Record<string, unknown>>;
  runId: string;
  segmentId: string;
  targetHeightMm?: number;
}

export function AchievedHeightBadge({ computed, runId, segmentId, targetHeightMm }: AchievedHeightBadgeProps) {
  const segData = computed?.[runId]?.[segmentId];
  const actualHeight = (segData as Record<string, unknown> | undefined)?.actual_height_mm as number | undefined;

  if (!actualHeight) return null;

  const diff = targetHeightMm != null ? Math.abs(actualHeight - targetHeightMm) : null;
  const isClose = diff !== null && diff <= 5;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
        isClose
          ? 'bg-green-500/10 border-green-500/30 text-green-400'
          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
      }`}
    >
      Achieved {Math.round(actualHeight)}mm
    </span>
  );
}
