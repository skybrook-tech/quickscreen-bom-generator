export type MobileCalculatorTab = "job" | "map" | "bom";

export const INITIAL_MOBILE_CALCULATOR_TAB: MobileCalculatorTab = "job";

export function calculatorPaneVisibility(
  mobileLayout: boolean,
  activeTab: MobileCalculatorTab,
) {
  if (!mobileLayout) {
    return { job: true, map: true, bom: true };
  }
  return {
    job: activeTab === "job",
    map: activeTab === "map",
    bom: activeTab === "bom",
  };
}

