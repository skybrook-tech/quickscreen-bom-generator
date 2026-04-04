import { z } from 'zod';

export const SystemType = z.enum(['QSHS', 'VS', 'XPL', 'BAYG']);
export const SlatSize = z.enum(['65', '90']);
export const SlatGap = z.enum(['5', '9', '20']);
export const MaxPanelWidth = z.enum(['2600', '2000']);
export const PostMounting = z.enum([
  'concreted-in-ground',
  'base-plated-to-slab',
  'core-drilled-into-concrete',
]);
export const Termination = z.enum(['post', 'wall']);
export const Colour = z.enum([
  'black-satin',
  'monument-matt',
  'woodland-grey-matt',
  'surfmist-matt',
  'pearl-white-gloss',
  'basalt-satin',
  'dune-satin',
  'mill',
  'primrose',
  'paperbark',
  'palladium-silver-pearl',
]);

export const FenceConfigSchema = z.object({
  systemType:       SystemType,
  customerRef:      z.string().optional(),
  totalRunLength:   z.number().min(0.5, 'Run length must be at least 0.5m'),
  targetHeight:     z.number().min(300, 'Min height 300mm').max(2400, 'Max height 2400mm'),
  slatSize:         SlatSize,
  slatGap:          SlatGap,
  colour:           Colour,
  maxPanelWidth:    MaxPanelWidth,
  leftTermination:  Termination,
  rightTermination: Termination,
  postMounting:     PostMounting,
  corners:          z.number().int().min(0).max(10),
});

export type FenceConfig = z.infer<typeof FenceConfigSchema>;

/** Sensible defaults used by both the form and the context. */
export const defaultFenceConfig: FenceConfig = {
  systemType:       'QSHS',
  customerRef:      '',
  totalRunLength:   20,
  targetHeight:     1800,
  slatSize:         '65',
  slatGap:          '9',
  colour:           'surfmist-matt',
  maxPanelWidth:    '2600',
  leftTermination:  'post',
  rightTermination: 'post',
  postMounting:     'concreted-in-ground',
  corners:          0,
};
