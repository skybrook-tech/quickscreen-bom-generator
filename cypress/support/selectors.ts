/**
 * Selector abstraction layer — all DOM interactions go through this map.
 * Uses data-testid attributes so the same tests run against:
 *   1. The existing HTML app (QuickScreen-BOM-Generator.html)
 *   2. The new React app
 *
 * Both targets must use the same data-testid values.
 */
export const SEL = {
  // Fence config inputs
  systemType:       '[data-testid="system-type"]',
  runLength:        '[data-testid="run-length"]',
  targetHeight:     '[data-testid="target-height"]',
  slatSize:         '[data-testid="slat-size"]',
  slatGap:          '[data-testid="slat-gap"]',
  colour:           '[data-testid="colour"]',
  maxPanelWidth:    '[data-testid="max-panel-width"]',
  postMounting:     '[data-testid="post-mounting"]',
  leftTermination:  '[data-testid="left-termination"]',
  rightTermination: '[data-testid="right-termination"]',
  corners:          '[data-testid="corners"]',
  pricingTier:      '[data-testid="pricing-tier"]',

  // Gate config inputs
  addGateBtn:       '[data-testid="add-gate-btn"]',
  matchGateToFence: '[data-testid="match-gate-to-fence"]',
  gateType:         '[data-testid="gate-type"]',
  gateOpeningWidth: '[data-testid="gate-opening-width"]',
  gatePostSize:     '[data-testid="gate-post-size"]',
  gateHeight:       '[data-testid="gate-height"]',
  gateColour:       '[data-testid="gate-colour"]',
  gateSlatGap:      '[data-testid="gate-slat-gap"]',
  gateSlatSize:     '[data-testid="gate-slat-size"]',
  saveGateBtn:      '[data-testid="save-gate-btn"]',

  // Actions
  generateBomBtn:   '[data-testid="generate-bom-btn"]',

  // BOM output
  bomTable:         '[data-testid="bom-table"]',
  bomRow:           '[data-testid="bom-row"]',
  bomRowCode:       '[data-testid="bom-row-code"]',
  bomRowQty:        '[data-testid="bom-row-qty"]',
  bomRowUnitPrice:  '[data-testid="bom-row-unit-price"]',
  bomRowLineTotal:  '[data-testid="bom-row-line-total"]',
  bomGrandTotal:    '[data-testid="bom-grand-total"]',

  // BOM section filters
  bomViewAll:       '[data-testid="bom-view-all"]',
  bomViewFence:     '[data-testid="bom-view-fence"]',
  bomViewGates:     '[data-testid="bom-view-gates"]',
} as const;
