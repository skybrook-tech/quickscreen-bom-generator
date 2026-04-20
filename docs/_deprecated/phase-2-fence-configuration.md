# Phase 2 — Fence Configuration

## Goal

Build the fence configuration form with full React Hook Form + Zod validation, context-driven state management, and all business rule enforcement (e.g. XPL forces 65mm slats).

## Steps

1. Build `FenceConfigContext` with reducer
2. Build `FenceConfigForm` with React Hook Form + Zod
3. Build all select components (colour, slat size, gap, system type, etc.)
4. Wire up conditional validation (XPL → 65mm, etc.)

## Components to Build

| Component | Description |
|-----------|-------------|
| `FenceConfigForm.tsx` | Main fence configuration form |
| `SystemTypeSelect.tsx` | QSHS / VS / XPL / BAYG selector |
| `ColourSelect.tsx` | Shared colour picker (fence + gate) |
| `SlatSizeSelect.tsx` | 65mm / 90mm |
| `SlatGapSelect.tsx` | 5mm / 9mm / 20mm |
| `PostMountingSelect.tsx` | Concreted / base-plated / core-drilled |
| `TerminationSelect.tsx` | Post vs Wall (F-section) |
| `CornerInput.tsx` | Number of 90° corners |

## Zod Schema

```typescript
// src/schemas/fence.schema.ts
export const FenceConfigSchema = z.object({
  systemType: SystemType.default('QSHS'),
  customerRef: z.string().optional(),
  totalRunLength: z.number().positive('Run length must be positive'),
  targetHeight: z.number().min(300).max(2400),
  slatSize: SlatSize.default('65'),
  slatGap: SlatGap.default('9'),
  colour: Colour.default('monument-matt'),
  maxPanelWidth: MaxPanelWidth.default('2600'),
  leftTermination: Termination.default('post'),
  rightTermination: Termination.default('post'),
  postMounting: PostMounting.default('concreted-in-ground'),
  corners: z.number().int().min(0).default(0),
});
```

## Context & Reducer

```typescript
// src/context/FenceConfigContext.tsx
type FenceAction =
  | { type: 'SET_FIELD'; field: keyof FenceConfig; value: any }
  | { type: 'SET_CONFIG'; config: Partial<FenceConfig> }  // for AI parse bulk update (v2)
  | { type: 'RESET' }
  | { type: 'LOAD_FROM_QUOTE'; config: FenceConfig };
```

### Business Rules Enforced in Reducer

- If `systemType` changes to `'XPL'`, force `slatSize` to `'65'`
- If `slatSize` changes to `'90'` and `systemType` is `'XPL'`, reject or revert

## Reference Data (from `src/lib/constants.ts`)

### System Types
| Value | Label | Description |
|-------|-------|-------------|
| `QSHS` | Horizontal Slat Screen | Standard horizontal system |
| `VS` | Vertical Slat Screen | Vertical slat orientation |
| `XPL` | XPress Plus Premium | 65mm only, insert/clip system |
| `BAYG` | Buy As You Go | Spacers sold separately |

### Colours (Colorbond names — must be spelled exactly)
| Value | Label | Limited |
|-------|-------|---------|
| `black-satin` | Black Satin | No |
| `monument-matt` | Monument Matt | No |
| `woodland-grey-matt` | Woodland Grey Matt | No |
| `surfmist-matt` | Surfmist Matt | No |
| `pearl-white-gloss` | Pearl White Gloss | No |
| `basalt-satin` | Basalt Satin | No |
| `dune-satin` | Dune Satin | No |
| `mill` | Mill (raw aluminium) | No |
| `primrose` | Primrose | **Yes** |
| `paperbark` | Paperbark | **Yes** |
| `palladium-silver-pearl` | Palladium Silver Pearl | No |

### Validation Rules
| Rule | Detail |
|------|--------|
| XPL forces 65mm slats | `xplForces65mmSlats: true` |
| Max swing gate width | 1200mm |
| Target height range | 300mm – 2400mm |
| Panel width options | 2600mm (standard) / 2000mm (windy areas) |
| Stock lengths | Slat: 5800mm, Rail: 5800mm, Post: 3000mm |

## Australian Context

- Currency: AUD
- GST: 10%
- All measurements metric (mm for heights/widths, m for run lengths)
- Postcodes are 4 digits

## Completion Criteria

- All fence config fields render and submit correctly
- XPL → 65mm constraint is enforced in the reducer and reflected in the UI
- Limited-availability colours are flagged visually
- Form validates with Zod before allowing BOM generation
- `FenceConfigContext` state is accessible to all downstream components
