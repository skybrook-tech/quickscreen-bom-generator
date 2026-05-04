import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
} from "@floating-ui/react";
import type { Placement } from "@floating-ui/dom";
import {
  cloneElement,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../../lib";

export interface TooltipProps {
  content: ReactNode;
  /** Single element that receives hover listeners + merged ref (e.g. span, h2, button). */
  children: ReactElement;
  placement?: Placement;
  /** Extra classes on the floating tooltip panel (portal). */
  contentClassName?: string;
}

/**
 * Hover tooltip rendered in a portal so parent `overflow` cannot clip it.
 * Uses Floating UI (flip/shift) to stay on-screen.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  contentClassName,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: 0, close: 0 },
  });
  const role = useRole(context, { role: "tooltip" });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    role,
  ]);

  if (!isValidElement(children)) {
    throw new Error("Tooltip expects a single React element child");
  }

  const mergedRef = useMergeRefs([
    refs.setReference,
    // Support refs on the trigger when callers forward refs / use styled components
    (children as ReactElement & { ref?: React.Ref<Element | null> }).ref,
  ]);

  const trigger = cloneElement(children, {
    ...getReferenceProps(),
    ref: mergedRef,
  } as Record<string, unknown>);

  return (
    <>
      {trigger}
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={cn(
              "z-[10000] max-w-xs whitespace-normal rounded-lg border border-brand-border bg-brand-card px-2 py-1 text-xs text-brand-text shadow-md pointer-events-none",
              contentClassName,
            )}
            {...getFloatingProps()}
          >
            {content}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
