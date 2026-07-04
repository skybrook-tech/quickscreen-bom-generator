import { AppShell } from "../components/layout/AppShell";
import {
  CalculatorProvider,
  useCalculator,
} from "../context/CalculatorContext";
import { FenceConfigProvider } from "../context/FenceConfigContext";
import { GateProvider } from "../context/GateContext";
import { CalculatorLayoutProvider } from "../context/CalculatorLayoutContext";
import {
  CalculatorBomStateProvider,
  type CalculatorBomContextValue,
} from "../context/CalculatorBomStateContext";
import {
  CalculatorJobProvider,
  type CalculatorJobContextValue,
} from "../context/CalculatorJobContext";
import { CalculatorIntro } from "../components/calculator-v3/CalculatorIntro";
import { CalculatorDialogs } from "../components/calculator-v3/CalculatorDialogs";
import { CalculatorHeaderActions } from "../components/calculator-v3/CalculatorHeaderActions";
import { CalculatorWorkspace } from "../components/calculator-v3/CalculatorWorkspace";
import { useCalculatorBom } from "../hooks/useCalculatorBom";
import { useCalculatorPersistence } from "../hooks/useCalculatorPersistence";
import { useCalculatorLayout } from "../hooks/useCalculatorLayout";
import {
  createEmptyPayload,
  defaultSaveJobName,
  formatHeaderMoney,
  isAngleDrawingWarning,
  buildRunFromDescription,
  buildBomRunDetails,
  buildConfirmGatePayload,
  runLengthMm,
  payloadBomKey,
  productCodeFromParsedSystem,
  useAnimatedNumber,
  type PendingParsedGate,
} from "../lib/calculatorV3Helpers";
import { useQuote } from "../hooks/useQuote";
import { savedBomToEngineResult } from "../lib/savedBomToEngineResult";
import { jobNameFromQuote } from "../lib/quotePayload";
import { LegacyQuoteError } from "../types/quote.types";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import type { CanonicalPayload } from "../types/canonical.types";
import type { ParseResult } from "../lib/describeFenceParser";

function CalculatorV3Content({ quoteId }: { quoteId?: string }) {
  const { state, dispatch } = useCalculator();
  const payload = state.payload;
  const quoteQuery = useQuote(quoteId);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [jobName, setJobName] = useState("");
  const [introDismissed, setIntroDismissed] = useState(false);
  const [autoOpenFirstSectionRunId, setAutoOpenFirstSectionRunId] = useState<string | null>(null);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [printBomDialogOpen, setPrintBomDialogOpen] = useState(false);
  const [printBomIncludeMap, setPrintBomIncludeMap] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [clearJobDialogOpen, setClearJobDialogOpen] = useState(false);
  const [saveJobDialogOpen, setSaveJobDialogOpen] = useState(false);
  const [gatePositionTarget, setGatePositionTarget] = useState<PendingParsedGate | null>(null);

  // ── BOM pipeline hook ─────────────────────────────────────────────────────
  const bom = useCalculatorBom(introDismissed, quoteId);

  // ── Persistence hook ──────────────────────────────────────────────────────
  const persistence = useCalculatorPersistence(quoteId, setJobName, bom.bomResultForTabs);

  // ── Layout hook ───────────────────────────────────────────────────────────
  const layout = useCalculatorLayout({
    payload,
    dispatch,
    setIntroDismissed,
    onExportCsv: () => bom.bomResultForTabs && persistence.exportCsv(bom.bomResultForTabs),
    onToggleShortcuts: () => setShortcutsOpen((o) => !o),
  });

  // ── Quote loading ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!quoteId || !quoteQuery.data) return;
    const { quote, payload: loadedPayload } = quoteQuery.data;
    dispatch({ type: "SET_PAYLOAD", payload: loadedPayload });
    setJobName(jobNameFromQuote(quote.fence_config, quote.customer_ref));
    const bomResult = savedBomToEngineResult(quote.bom, quote.updated_at);
    if (bomResult) {
      dispatch({ type: "SET_BOM_RESULT", result: bomResult });
      bom.suppressNextAutoBom(payloadBomKey(loadedPayload));
    }
    setIntroDismissed(true);
    layout.setRightPaneView("bom");
    layout.setMobileTab("bom");
    // Only hydrate once per quoteId
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, quoteQuery.data]);

  useEffect(() => {
    if (quoteId || payload || introDismissed) return;
    dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
    dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "select" });
    setIntroDismissed(true);
    layout.setRightPaneView("bom");
    layout.setMobileTab("job");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, introDismissed, payload, quoteId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function startWorkspaceFromLanding() {
    if (!payload) {
      dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
      dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "select" });
    }
    setIntroDismissed(true);
    layout.setRightPaneView("bom");
    layout.setMapExpanded(false);
    layout.setMobileTab("job");
  }

  function handleApplyDescription(result: ParseResult) {
    const productCode = productCodeFromParsedSystem(result.attributes.systemType?.value);
    const base = payload ?? createEmptyPayload(productCode);
    const { run } = buildRunFromDescription(result, base);
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...base,
        productCode,
        // v3: runs carry the variables; payload.variables stays empty.
        variables: {},
        job: { ...(base.job ?? {}), description: result.description, pendingGates: [] },
        runs: [run, ...base.runs.slice(1)],
      },
    });
    dispatch({ type: "SET_ENTRY_METHOD", entryMethod: "describe" });
    setIntroDismissed(true);
    setAutoOpenFirstSectionRunId(run.runId);
    layout.setRightPaneView("bom");
    layout.setMapExpanded(false);
    layout.setMobileTab("bom");
    toast.success("Description applied");
  }

  function handleConfirmGatePosition(gate: PendingParsedGate, distanceFromStartMm: number) {
    if (!payload) return;
    dispatch({ type: "SET_PAYLOAD", payload: buildConfirmGatePayload(payload, gate, distanceFromStartMm) });
    setGatePositionTarget(null);
    toast.success("Gate position confirmed");
  }

  function handlePropertyAnchorConfirmed(anchor: {
    anchorLat: number;
    anchorLng: number;
    formattedAddress: string;
    snapshot: NonNullable<CanonicalPayload["snapshot"]>;
  }) {
    if (!payload) return;
    dispatch({
      type: "SET_PAYLOAD",
      payload: {
        ...payload,
        propertyAnchor: { lat: anchor.anchorLat, lng: anchor.anchorLng, address: anchor.formattedAddress },
        snapshot: anchor.snapshot,
      },
    });
    layout.setRightPaneView("map");
    toast.success("Property view captured");
  }

  function clearToFreshWorkspace() {
    dispatch({ type: "CLEAR_QUOTE" });
    bom.setExtraItems([]);
    bom.setLineEdits({});
    bom.setActiveBomSummary(null);
    setJobName("");
    dispatch({ type: "SET_PAYLOAD", payload: createEmptyPayload("QSHS") });
    setIntroDismissed(true);
    layout.setRightPaneView("bom");
    layout.setMapExpanded(false);
    setAutoOpenFirstSectionRunId(null);
    layout.setMobileTab("job");
    setClearJobDialogOpen(false);
  }

  const handleSaveDialogConfirm = useCallback(
    async (name: string) => {
      const saved = await persistence.saveJobWithName(name);
      if (saved) setSaveJobDialogOpen(false);
      return saved;
    },
    [persistence],
  );

  // ── Derived values ────────────────────────────────────────────────────────
  const lastBom = state.bomResult;
  const warnings = ((lastBom?.warnings as string[]) ?? []).filter((w) => !isAngleDrawingWarning(w));
  const errors = (lastBom?.errors as string[]) ?? [];

  const hasLegacyConfiguredPayload = Boolean(
    quoteId && payload && !payload.propertyAnchor && payload.runs.some((run) => run.segments.length > 0),
  );
  const propertyAnchorConfirmed = Boolean(payload?.propertyAnchor) || hasLegacyConfiguredPayload;

  const gateTargetRun = gatePositionTarget
    ? payload?.runs.find((run) => run.runId === gatePositionTarget.runId)
    : undefined;
  const gateTargetRunLength = gateTargetRun ? runLengthMm(gateTargetRun) : 0;

  const saveJobLabel = quoteId
    ? "Update Job"
    : "Save Job";

  const saveDialogInitialName = jobName.trim() || defaultSaveJobName();

  const bomRunDetails = useMemo(() => (payload ? buildBomRunDetails(payload) : []), [payload]);

  const headerGrandTotal = bom.activeBomSummary?.grandTotal ?? bom.bomResultForTabs?.grandTotal ?? 0;
  const animatedGrandTotal = useAnimatedNumber(headerGrandTotal);
  const headerPriceLabel = headerGrandTotal > 0 ? formatHeaderMoney(headerGrandTotal) : null;
  const mobileBomTotals = bom.bomResultForTabs
    ? {
      subtotal: bom.activeBomSummary?.subtotal ?? bom.bomResultForTabs.total,
      gst: bom.activeBomSummary?.gst ?? bom.bomResultForTabs.gst,
      grandTotal: bom.activeBomSummary?.grandTotal ?? bom.bomResultForTabs.grandTotal,
    }
    : null;

  const showIntro = !quoteId && !payload && !introDismissed;

  // ── Context values (published to the workspace subtree) ─────────────────────
  const bomCtx: CalculatorBomContextValue = {
    ...bom,
    bomRunDetails,
    animatedGrandTotal,
    mobileBomTotals,
    errors,
    warnings,
    isCalcError: !!bom.calcError,
  };

  const jobCtx: CalculatorJobContextValue = {
    jobName,
    onJobNameChange: setJobName,
    autoOpenFirstSectionRunId,
    onAutoOpenConsumed: () => setAutoOpenFirstSectionRunId(null),
    hasLegacyConfiguredPayload,
    propertyAnchorConfirmed,
    onAnchorConfirmed: handlePropertyAnchorConfirmed,
    onDescribeApply: handleApplyDescription,
    onGatePositionRequest: setGatePositionTarget,
    saving: persistence.saving,
    saveJobLabel,
    onSaveJob: () => void persistence.saveJobWithName(jobName),
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (quoteId && quoteQuery.isLoading) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-brand-muted">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          <p className="text-sm">Loading quote…</p>
        </div>
      </AppShell>
    );
  }

  if (quoteId && quoteQuery.isError) {
    const legacy = quoteQuery.error instanceof LegacyQuoteError;
    return (
      <AppShell>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
          <p className="text-sm text-brand-danger">
            {legacy
              ? quoteQuery.error.message
              : quoteQuery.error instanceof Error
                ? quoteQuery.error.message
                : "Failed to load quote."}
          </p>
          <Link to="/quotes" className="text-sm font-semibold text-brand-accent hover:underline">
            Back to quotes
          </Link>
        </div>
      </AppShell>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  const headerActions = !showIntro && !layout.mapExpanded ? (
    <CalculatorHeaderActions
      rightPaneView={layout.rightPaneView}
      runPaneWidth={layout.runPaneWidth}
      mobileLayout={layout.mobileLayout}
      bomResultForTabs={bom.bomResultForTabs}
      sharingPdf={persistence.sharingPdf}
      onRightPaneChange={layout.handleRightPaneChange}
      onOpenPrintDialog={() => { setPrintBomIncludeMap(false); setPrintBomDialogOpen(true); }}
      onExportCsv={() => bom.bomResultForTabs && persistence.exportCsv(bom.bomResultForTabs)}
      onSharePdf={() => {
        if (bom.bomResultForTabs) {
          void persistence.sharePdf(bom.bomResultForTabs, jobName, payload?.propertyAnchor?.address);
        }
      }}
      onOpenShortcuts={() => setShortcutsOpen(true)}
    />
  ) : null;

  return (
    <AppShell
      headerActions={headerActions}
      jobTitle={jobName.trim() || "New Quote"}
      headerPriceLabel={headerPriceLabel}
      onClearJobRequest={() => setClearJobDialogOpen(true)}
      clearJobDisabled={!payload && !jobName}
    >
      <CalculatorDialogs
        saveJobDialogOpen={saveJobDialogOpen}
        saveDialogInitialName={saveDialogInitialName}
        saving={persistence.saving}
        onSaveDialogCancel={() => setSaveJobDialogOpen(false)}
        onSaveDialogConfirm={handleSaveDialogConfirm}
        clearJobDialogOpen={clearJobDialogOpen}
        onClearCancel={() => setClearJobDialogOpen(false)}
        onClearConfirm={clearToFreshWorkspace}
        printBomDialogOpen={printBomDialogOpen}
        printBomIncludeMap={printBomIncludeMap}
        onPrintBomIncludeMapChange={setPrintBomIncludeMap}
        onPrintBomCancel={() => setPrintBomDialogOpen(false)}
        onPrintBomConfirm={() => {
          setPrintBomDialogOpen(false);
          persistence.printBom(printBomIncludeMap, layout.rightPaneView, layout.setRightPaneView);
        }}
        shortcutsOpen={shortcutsOpen}
        onShortcutsClose={() => setShortcutsOpen(false)}
        gatePositionTarget={gatePositionTarget}
        gateTargetRunLength={gateTargetRunLength}
        onGatePositionClose={() => setGatePositionTarget(null)}
        onGatePositionConfirm={handleConfirmGatePosition}
      />

      {showIntro ? (
        <CalculatorIntro jobName={jobName} onJobNameChange={setJobName} onStart={startWorkspaceFromLanding} />
      ) : (
        <CalculatorLayoutProvider value={layout}>
          <CalculatorBomStateProvider value={bomCtx}>
            <CalculatorJobProvider value={jobCtx}>
              <CalculatorWorkspace onSaveDialogOpen={() => setSaveJobDialogOpen(true)} />
            </CalculatorJobProvider>
          </CalculatorBomStateProvider>
        </CalculatorLayoutProvider>
      )}
    </AppShell>
  );
}

export function CalculatorV3Page() {
  const { quoteId } = useParams<{ quoteId: string }>();

  return (
    <CalculatorProvider key={quoteId ?? "new"}>
      <FenceConfigProvider>
        <GateProvider>
          <CalculatorV3Content quoteId={quoteId} />
        </GateProvider>
      </FenceConfigProvider>
    </CalculatorProvider>
  );
}
