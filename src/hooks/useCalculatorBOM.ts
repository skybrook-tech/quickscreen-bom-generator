import { useMutation } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import type { GateConfig } from "../schemas/gate.schema";
import type { RunConfig } from "../schemas/calculator.schema";
import type { CalculatorDefaults } from "../schemas/calculator.schema";
import type { CalculatorBOMResult, PricingTier } from "../types/bom.types";

interface CalculatorBOMParams {
  productId: string;
  systemType: string;
  defaults: CalculatorDefaults;
  runs: RunConfig[];
  gates: GateConfig[];
  pricingTier?: PricingTier;
}

export function useCalculatorBOM() {
  return useMutation({
    mutationFn: async (
      params: CalculatorBOMParams,
    ): Promise<CalculatorBOMResult> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("calculate-bom-v2", {
        body: params,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw response.error;
      return response.data as CalculatorBOMResult;
    },
  });
}
