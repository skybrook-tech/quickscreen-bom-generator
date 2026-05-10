import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ConfirmButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onConfirm: () => void;
  children: ReactNode;
  confirmLabel?: ReactNode;
  timeoutMs?: number;
}

export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Click again to confirm",
  timeoutMs = 3000,
  className = "",
  disabled,
  ...props
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const resetOnOutsideClick = (event: PointerEvent) => {
      if (buttonRef.current?.contains(event.target as Node)) return;
      setConfirming(false);
    };
    timeoutRef.current = window.setTimeout(() => setConfirming(false), timeoutMs);
    window.addEventListener("pointerdown", resetOnOutsideClick, true);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      window.removeEventListener("pointerdown", resetOnOutsideClick, true);
    };
  }, [confirming, timeoutMs]);

  return (
    <button
      {...props}
      ref={buttonRef}
      type={props.type ?? "button"}
      disabled={disabled}
      aria-pressed={confirming}
      onClick={() => {
        if (disabled) return;
        if (!confirming) {
          setConfirming(true);
          return;
        }
        setConfirming(false);
        onConfirm();
      }}
      className={`${className} ${confirming ? "border-brand-danger bg-brand-danger text-white hover:bg-brand-danger/90" : ""}`}
    >
      {confirming ? confirmLabel : children}
    </button>
  );
}
