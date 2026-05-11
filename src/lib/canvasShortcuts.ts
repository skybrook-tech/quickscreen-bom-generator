export interface CanvasShortcut {
  key: string;
  action: string;
  description: string;
}

export const CANVAS_SHORTCUTS: CanvasShortcut[] = [
  { key: "Ctrl/Cmd+Z", action: "Undo", description: "Undo the last drawing action" },
  { key: "Ctrl/Cmd+Shift+Z", action: "Redo", description: "Redo the last undone action" },
  { key: "Esc", action: "Cancel", description: "Cancel drawing or return to Move / Edit" },
  { key: "D", action: "Draw", description: "Switch to fence drawing mode" },
  { key: "E", action: "Edit", description: "Switch to Move / Edit mode" },
  { key: "G", action: "Gate", description: "Open gate placement mode" },
  { key: "+ / =", action: "Zoom in", description: "Zoom the map in" },
  { key: "- / _", action: "Zoom out", description: "Zoom the map out" },
  { key: "0", action: "Fit", description: "Fit the layout to the available canvas" },
  { key: "?", action: "Help", description: "Open this shortcut guide" },
];

export const TOOL_HOTKEYS = {
  draw: "D",
  move: "E",
  gate: "G",
  boundary: "B",
  building: "U",
  post: "P",
  pillar: "I",
  text: "T",
} as const;
