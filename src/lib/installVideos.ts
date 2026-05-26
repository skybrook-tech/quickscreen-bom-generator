export type InstallVideoKey = "QSHS" | "XPL" | "VS" | "BAYG" | "QS_GATE_PED" | "QS_GATE_SLIDE";

export const INSTALL_VIDEO_MENU_KEYS: InstallVideoKey[] = ["QSHS", "XPL", "VS", "BAYG"];

export const INSTALL_VIDEOS: Record<InstallVideoKey, { label: string; url: string }> = {
  QSHS: {
    label: "QSHS installation",
    url: "https://youtube.com/results?search_query=QuickScreen+QSHS+installation",
  },
  XPL: {
    label: "XPL installation",
    url: "https://youtube.com/results?search_query=XPress+Plus+slat+screening+installation",
  },
  VS: {
    label: "VS installation",
    url: "https://youtube.com/results?search_query=vertical+slat+screening+installation",
  },
  BAYG: {
    label: "BAYG installation",
    url: "https://youtube.com/results?search_query=BAYG+infill+screen+installation",
  },
  QS_GATE_PED: {
    label: "Pedestrian gate installation",
    url: "https://youtube.com/results?search_query=QuickScreen+pedestrian+gate+installation",
  },
  QS_GATE_SLIDE: {
    label: "Sliding gate installation",
    url: "https://youtube.com/results?search_query=QuickScreen+sliding+gate+installation",
  },
};

