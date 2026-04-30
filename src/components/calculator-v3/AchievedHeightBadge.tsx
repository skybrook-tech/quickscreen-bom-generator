import { Badge } from "../ui/Badge";

interface AchievedHeightBadgeProps {
  computed: Record<string, Record<string, unknown>>;
  runId: string;
  segmentId: string;
  targetHeightMm?: number;
}

export function AchievedHeightBadge({
  computed,
  runId,
  segmentId,
  targetHeightMm,
}: AchievedHeightBadgeProps) {
  const segData = computed?.[runId]?.[segmentId];
  const actualHeight = (segData as Record<string, unknown> | undefined)
    ?.actual_height_mm as number | undefined;

  if (!actualHeight) return null;

  const diff =
    targetHeightMm != null ? Math.abs(actualHeight - targetHeightMm) : null;
  const isClose = diff !== null && diff <= 5;

  const text = `Actual: ${Math.round(actualHeight)}mm`;

  return (
    <Badge variant={isClose ? "success" : "warning"} className=" text-xs">
      {text}
    </Badge>
  );
}
