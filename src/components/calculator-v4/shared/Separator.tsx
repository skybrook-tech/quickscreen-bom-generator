import { cn } from "../../../lib";

interface SeparatorProps {
  className?: string;
}

const Separator = ({ className }: SeparatorProps) => {
  return (
    <span className={cn("opacity-60 select-none", className)} aria-hidden>
      ·
    </span>
  );
};

export default Separator;
