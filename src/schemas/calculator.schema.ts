import { z } from "zod";
import { SlatSize, SlatGap, Colour, MaxPanelWidth, Termination, PostMounting } from "./fence.schema";

export const RunConfigSchema = z.object({
  id: z.string().uuid(),
  length: z.number().min(0.5, "Min 0.5m").max(100, "Max 100m"),
  targetHeight: z.number().min(300, "Min 300mm").max(2400, "Max 2400mm"),
  maxPanelWidth: MaxPanelWidth,
  slatSize: SlatSize.nullable(),
  slatGap: SlatGap.nullable(),
  colour: Colour.nullable(),
  leftTermination: Termination,
  rightTermination: Termination,
  postMounting: PostMounting,
  corners: z.number().int().min(0).max(10),
});

export type RunConfig = z.infer<typeof RunConfigSchema>;

export const defaultRunConfig: Omit<RunConfig, "id"> = {
  length: 5,
  targetHeight: 1800,
  maxPanelWidth: "2600",
  slatSize: null,
  slatGap: null,
  colour: null,
  leftTermination: "post",
  rightTermination: "post",
  postMounting: "concreted-in-ground",
  corners: 0,
};

export interface ProductOptions {
  slatSize: string[];
  slatGap: string[];
  colour: string[];
}

export interface CalculatorDefaults {
  slatSize: string;
  slatGap: string;
  colour: string;
}
