import { cn } from "../../../lib";

interface SeparatorProps {
  className?: string;
  character?: string;
}

const Separator = ({ className, character = "·" }: SeparatorProps) => {
  return (
    <span className={cn("opacity-60 select-none", className)} aria-hidden>
      {character}
    </span>
  );
};

export default Separator;
