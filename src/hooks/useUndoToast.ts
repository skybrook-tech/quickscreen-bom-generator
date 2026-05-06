import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Fires a Sonner toast with an "Undo" action button.
 *
 * @param label   - Toast message shown to the user.
 * @param onUndo  - Callback invoked when the user taps "Undo".
 * @param duration - How long (ms) the undo window stays open. Default 6 s.
 * @returns A stable `trigger` function to call immediately after performing the
 *          destructive action.
 */
export function useUndoToast(
  label: string,
  onUndo: () => void,
  duration = 6000,
): { trigger: () => void } {
  const onUndoRef = useRef(onUndo);
  useEffect(() => {
    onUndoRef.current = onUndo;
  });

  function trigger() {
    toast(label, {
      duration,
      action: {
        label: "Undo",
        onClick: () => onUndoRef.current(),
      },
    });
  }

  return { trigger };
}
