export type InstallVideoKey = "QSHS" | "VS" | "QS_GATE_PED" | "QS_GATE_SLIDE";

export const INSTALL_VIDEOS: Record<InstallVideoKey, { label: string; url: string }> = {
  QSHS: {
    label: "QSHS install",
    url: "https://glassoutlet.com.au/install/qshs",
  },
  VS: {
    label: "VS install",
    url: "https://glassoutlet.com.au/install/vs",
  },
  QS_GATE_PED: {
    label: "Pedestrian gate install",
    url: "https://glassoutlet.com.au/install/gate-ped",
  },
  QS_GATE_SLIDE: {
    label: "Sliding gate install",
    url: "https://glassoutlet.com.au/install/gate-slide",
  },
};

