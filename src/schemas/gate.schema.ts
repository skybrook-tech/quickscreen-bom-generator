import { z } from 'zod';
import { Colour, SlatGap, SlatSize } from './fence.schema';

export const GateType = z.enum(['single-swing', 'double-swing', 'sliding']);

export const GatePostSize = z.enum(['50x50', '65x65', '75x75', '100x100']);

export const HingeType = z.enum([
  'dd-kwik-fit-fixed',
  'dd-kwik-fit-adjustable',
  'heavy-duty-weld-on',
]);

export const LatchType = z.enum([
  'dd-magna-latch-top-pull',
  'dd-magna-latch-lock-box',
  'drop-bolt',
  'none',
]);

export const GateSchema = z.object({
  id:           z.string().uuid(),
  qty:          z.number().int().min(1).max(20),
  gateType:     GateType,
  openingWidth: z.number().min(400, 'Min opening width 400mm').max(6000, 'Max opening width 6000mm'),
  gateHeight:   z.union([z.literal('match-fence'), z.number().min(600).max(2500)]),
  colour:       z.union([z.literal('match-fence'), Colour]),
  slatGap:      z.union([z.literal('match-fence'), SlatGap]),
  slatSize:     z.union([z.literal('match-fence'), SlatSize]),
  gatePostSize: GatePostSize,
  hingeType:    HingeType,
  latchType:    LatchType,
});

export type GateConfig = z.infer<typeof GateSchema>;

export const defaultGateConfig: Omit<GateConfig, 'id'> = {
  qty:          1,
  gateType:     'single-swing',
  openingWidth: 900,
  gateHeight:   'match-fence',
  colour:       'match-fence',
  slatGap:      'match-fence',
  slatSize:     'match-fence',
  gatePostSize: '65x65',
  hingeType:    'dd-kwik-fit-adjustable',
  latchType:    'dd-magna-latch-top-pull',
};
