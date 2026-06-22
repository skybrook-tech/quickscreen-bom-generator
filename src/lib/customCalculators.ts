import type { SchemaField } from "../components/calculator-v3/SchemaDrivenForm";

export interface CustomMaterial {
  skuPattern: string;
  namePattern: string;
  category: string;
  unit: string;
  defaultPrice: number;
  formula: string;
  description: string;
}

export interface CustomCalculator {
  id: string;
  name: string;
  path: string[];
  description: string;
  variables: SchemaField[];
  materials: CustomMaterial[];
}

export interface CustomPrice {
  sku: string;
  price: number;
}

// Initial seeded custom calculators matching the user's requirements
export const SEED_CUSTOM_CALCULATORS: CustomCalculator[] = [
  {
    id: "tp-butted-palings",
    name: "Treated Pine Butted Palings",
    path: ["Treated Pine", "Standard Butted Palings"],
    description: "Standard vertical butted paling fence using treated pine posts, rails, and palings.",
    variables: [
      {
        id: "tp-butted-paling-height",
        field_key: "paling_height",
        label: "Paling Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["1200", "1500", "1800", "2100"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "tp-butted-post-size",
        field_key: "post_size",
        label: "Post Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "125x75",
        options_json: ["125x75", "100x75", "100x100"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "tp-butted-rail-size",
        field_key: "rail_size",
        label: "Rail Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "75x50",
        options_json: ["75x50", "75x38"],
        sort_order: 3,
        visible_when_json: {}},
      {
        id: "tp-butted-paling-width",
        field_key: "paling_width",
        label: "Paling Width",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "100",
        options_json: ["75", "100"],
        sort_order: 4,
        visible_when_json: {}},
      {
        id: "tp-butted-has-gap",
        field_key: "has_gap",
        label: "Specify Gaps?",
        control_type: "toggle",
        data_type: "boolean",
        required: false,
        default_value_json: false,
        sort_order: 5,
        visible_when_json: {},
        options_json: []},
      {
        id: "tp-butted-gap-size",
        field_key: "gap_size",
        label: "Gap Size",
        control_type: "number",
        data_type: "integer",
        unit: "mm",
        required: false,
        default_value_json: 10,
        sort_order: 6,
        visible_when_json: { has_gap: true },
        options_json: []},
      {
        id: "tp-butted-has-top-cap",
        field_key: "has_top_cap",
        label: "Add Top Cap?",
        control_type: "toggle",
        data_type: "boolean",
        required: false,
        default_value_json: false,
        sort_order: 7,
        visible_when_json: {},
        options_json: []},
      {
        id: "tp-butted-top-cap-size",
        field_key: "top_cap_size",
        label: "Top Cap Size",
        control_type: "select",
        data_type: "enum",
        required: false,
        default_value_json: "75x50",
        options_json: ["75x50", "100x50"],
        sort_order: 8,
        visible_when_json: { has_top_cap: true }}
    ],
    materials: [
      {
        skuPattern: "TP-POST-{post_size}",
        namePattern: "Treated Pine Post {post_size}",
        category: "post",
        unit: "each",
        defaultPrice: 28.50,
        formula: "ceil(length / 2.4) + 1",
        description: "Post spaced every 2.4 meters + 1 end post."
      },
      {
        skuPattern: "TP-RAIL-{rail_size}",
        namePattern: "Treated Pine Rail {rail_size} 4.8m",
        category: "rail",
        unit: "length",
        defaultPrice: 14.80,
        formula: "ceil(length / 4.8) * 3",
        description: "Three horizontal rails along the run (using 4.8m stock)."
      },
      {
        skuPattern: "TP-PALING-{paling_height}x{paling_width}",
        namePattern: "Treated Pine Paling {paling_height}mm x {paling_width}mm",
        category: "slat",
        unit: "each",
        defaultPrice: 3.40,
        formula: "ceil(length / ((paling_width + (has_gap ? gap_size : 0)) / 1000))",
        description: "Palings laid vertically with optional gaps."
      },
      {
        skuPattern: "TP-CAP-{top_cap_size}",
        namePattern: "Treated Pine Top Cap {top_cap_size} 4.8m",
        category: "accessory",
        unit: "length",
        defaultPrice: 19.50,
        formula: "has_top_cap ? ceil(length / 4.8) : 0",
        description: "Optional top capping rail."
      },
      {
        skuPattern: "TP-NAILS-500PK",
        namePattern: "Coil Nails 500 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 24.00,
        formula: "ceil((palings * 6) / 500)",
        description: "6 dome-head nails per paling (2 per rail)."
      },
      {
        skuPattern: "TP-SCREWS-100PK",
        namePattern: "10g Wood Screws 100 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 16.50,
        formula: "ceil((posts * 3 * 2) / 100)",
        description: "Screws for rail-to-post connections (2 per rail-post joint)."
      }
    ]
  },
  {
    id: "tp-lap-cap",
    name: "Treated Pine Lap and Cap",
    path: ["Treated Pine", "Lap and Cap"],
    description: "Premium lapped paling fence with top capping rail for complete privacy.",
    variables: [
      {
        id: "tp-lc-paling-height",
        field_key: "paling_height",
        label: "Paling Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["1500", "1800", "2100"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "tp-lc-post-size",
        field_key: "post_size",
        label: "Post Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "125x75",
        options_json: ["125x75", "100x75", "100x100"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "tp-lc-rail-size",
        field_key: "rail_size",
        label: "Rail Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "75x50",
        options_json: ["75x50", "75x38"],
        sort_order: 3,
        visible_when_json: {}},
      {
        id: "tp-lc-paling-width",
        field_key: "paling_width",
        label: "Paling Width",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "100",
        options_json: ["75", "100"],
        sort_order: 4,
        visible_when_json: {}},
      {
        id: "tp-lc-top-cap-size",
        field_key: "top_cap_size",
        label: "Top Cap Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "75x50",
        options_json: ["75x50", "100x50", "90x45"],
        sort_order: 5,
        visible_when_json: {}},
      {
        id: "tp-lc-overlap",
        field_key: "overlap",
        label: "Paling Overlap",
        control_type: "number",
        data_type: "integer",
        unit: "mm",
        required: true,
        default_value_json: 25,
        sort_order: 6,
        visible_when_json: {},
        options_json: []}
    ],
    materials: [
      {
        skuPattern: "TP-POST-{post_size}",
        namePattern: "Treated Pine Post {post_size}",
        category: "post",
        unit: "each",
        defaultPrice: 28.50,
        formula: "ceil(length / 2.4) + 1",
        description: "Post spaced every 2.4 meters + 1 end post."
      },
      {
        skuPattern: "TP-RAIL-{rail_size}",
        namePattern: "Treated Pine Rail {rail_size} 4.8m",
        category: "rail",
        unit: "length",
        defaultPrice: 14.80,
        formula: "ceil(length / 4.8) * 3",
        description: "Three horizontal rails along the run (using 4.8m stock)."
      },
      {
        skuPattern: "TP-PALING-{paling_height}x{paling_width}",
        namePattern: "Treated Pine Paling {paling_height}mm x {paling_width}mm (Lapped)",
        category: "slat",
        unit: "each",
        defaultPrice: 3.40,
        formula: "ceil(length / ((paling_width - overlap) / 1000)) * 2",
        description: "Double layered palings with overlap for privacy."
      },
      {
        skuPattern: "TP-CAP-{top_cap_size}",
        namePattern: "Treated Pine Top Cap {top_cap_size} 4.8m",
        category: "accessory",
        unit: "length",
        defaultPrice: 19.50,
        formula: "ceil(length / 4.8)",
        description: "Top capping rail."
      },
      {
        skuPattern: "TP-NAILS-500PK",
        namePattern: "Coil Nails 500 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 24.00,
        formula: "ceil((palings * 6) / 500)",
        description: "6 dome-head nails per paling (2 per rail)."
      },
      {
        skuPattern: "TP-SCREWS-100PK",
        namePattern: "10g Wood Screws 100 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 16.50,
        formula: "ceil((posts * 3 * 2) / 100)",
        description: "Screws for rail-to-post connections (2 per rail-post joint)."
      }
    ]
  },
  {
    id: "colorbond-fencing",
    name: "Colorbond Steel Fencing",
    path: ["Colorbond"],
    description: "Classic Colorbond steel fencing panels, tracks, and posts.",
    variables: [
      {
        id: "cb-profile",
        field_key: "profile",
        label: "Profile Type",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Trimclad",
        options_json: ["Trimclad", "Sawtooth", "Plinth"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "cb-color",
        field_key: "color",
        label: "Color",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Monument",
        options_json: ["Monument", "Woodland Grey", "Surfmist", "Paperbark", "Classic Cream"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "cb-post-size",
        field_key: "post_size",
        label: "Post Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "50x50",
        options_json: ["50x50", "60x60"],
        sort_order: 3,
        visible_when_json: {}},
      {
        id: "cb-height",
        field_key: "target_height_mm",
        label: "Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["1500", "1800", "2100"],
        sort_order: 4,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "CB-SHEET-{profile}-{color}",
        namePattern: "Colorbond Infill Sheet {profile} ({color})",
        category: "slat",
        unit: "each",
        defaultPrice: 42.00,
        formula: "ceil(length / 2.35) * 3",
        description: "3 overlapping infill sheets per 2.35m panel bay."
      },
      {
        skuPattern: "CB-POST-{post_size}-{color}",
        namePattern: "Colorbond Post {post_size} ({color})",
        category: "post",
        unit: "each",
        defaultPrice: 38.00,
        formula: "ceil(length / 2.35) + 1",
        description: "Colorbond posts spaced at max 2.35m."
      },
      {
        skuPattern: "CB-RAIL-{color}",
        namePattern: "Colorbond Universal Rail ({color}) 2.35m",
        category: "rail",
        unit: "length",
        defaultPrice: 26.50,
        formula: "ceil(length / 2.35) * 2",
        description: "Top and bottom framing rails."
      },
      {
        skuPattern: "CB-SCREWS-{color}",
        namePattern: "Colorbond Tek Screws 100 Pack ({color})",
        category: "screw",
        unit: "pack",
        defaultPrice: 14.00,
        formula: "ceil((ceil(length / 2.35) * 16) / 100)",
        description: "Fixing screws (16 screws per panel bay)."
      }
    ]
  },
  {
    id: "modular-walls",
    name: "Modular Walls System",
    path: ["Modular Walls"],
    description: "Premium acoustic composite panels and structural posts.",
    variables: [
      {
        id: "mw-wall-type",
        field_key: "wall_type",
        label: "Wall Model",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "SlimWall",
        options_json: ["SlimWall", "TrendWall", "VogueWall", "EstateWall"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "mw-height",
        field_key: "height",
        label: "Wall Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["1500", "1800", "2100", "2400", "3000"],
        sort_order: 2,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "MW-PANEL-{wall_type}-{height}",
        namePattern: "Modular Wall Composite Panel {wall_type} ({height}mm)",
        category: "slat",
        unit: "each",
        defaultPrice: 210.00,
        formula: "ceil(length / 2.5) * ceil(height / 900)",
        description: "900mm high modular panels stacked to reach height (2.5m span)."
      },
      {
        skuPattern: "MW-POST-{wall_type}-{height}",
        namePattern: "Modular Wall Structural Post {wall_type} ({height}mm)",
        category: "post",
        unit: "each",
        defaultPrice: 145.00,
        formula: "ceil(length / 2.5) + 1",
        description: "Post spaced at every 2.5m span."
      },
      {
        skuPattern: "MW-CAP-{wall_type}",
        namePattern: "Modular Wall Post Cap {wall_type}",
        category: "accessory",
        unit: "each",
        defaultPrice: 12.50,
        formula: "posts",
        description: "Aesthetic post cap."
      },
      {
        skuPattern: "MW-BRACKET",
        namePattern: "Panel Mounting Bracket (Pair)",
        category: "accessory",
        unit: "each",
        defaultPrice: 9.00,
        formula: "posts * 2",
        description: "Panel-to-post connection brackets."
      }
    ]
  },
  {
    id: "pool-fencing-aluminium",
    name: "Aluminium Pool Fencing",
    path: ["Pool Fencing", "Aluminium"],
    description: "Standard pool safety compliant tubular aluminium panel fencing.",
    variables: [
      {
        id: "pf-al-style",
        field_key: "style",
        label: "Panel Style",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Flat Top",
        options_json: ["Flat Top", "Loop Top"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "pf-al-color",
        field_key: "color",
        label: "Color",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Black",
        options_json: ["Black", "Primrose"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "pf-al-height",
        field_key: "target_height_mm",
        label: "Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1200",
        options_json: ["1200"],
        sort_order: 3,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "PF-AL-PANEL-{style}-{color}",
        namePattern: "Aluminium Pool Panel 2400x1200mm {style} ({color})",
        category: "slat",
        unit: "each",
        defaultPrice: 115.00,
        formula: "ceil(length / 2.4)",
        description: "Standard 2.4m width compliance panels."
      },
      {
        skuPattern: "PF-AL-POST-{color}",
        namePattern: "Pool Fence Post 50x50x1800mm ({color})",
        category: "post",
        unit: "each",
        defaultPrice: 34.00,
        formula: "ceil(length / 2.4) + 1",
        description: "50x50mm flanged or in-ground posts."
      },
      {
        skuPattern: "PF-AL-BRACKET-{color}",
        namePattern: "Pool Panel Bracket 4 Pack ({color})",
        category: "accessory",
        unit: "pack",
        defaultPrice: 18.00,
        formula: "panels",
        description: "4-pack brackets for top and bottom rails."
      },
      {
        skuPattern: "PF-AL-SCREWS",
        namePattern: "Tek Screws 50 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 8.50,
        formula: "ceil((panels * 8) / 50)",
        description: "Fixing screws."
      }
    ]
  },
  {
    id: "pool-fencing-glass",
    name: "Glass Pool Fencing",
    path: ["Pool Fencing", "Glass"],
    description: "Premium frameless and semi-frameless glass pool fencing.",
    variables: [
      {
        id: "pf-gl-type",
        field_key: "panel_type",
        label: "Mounting Type",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Spigot Mounted",
        options_json: ["Spigot Mounted", "Channel Mounted", "Semi-Frameless"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "pf-gl-thickness",
        field_key: "thickness",
        label: "Glass Thickness",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "12mm",
        options_json: ["12mm", "10mm"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "pf-gl-height",
        field_key: "target_height_mm",
        label: "Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1200",
        options_json: ["1200"],
        sort_order: 3,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "PF-GLASS-PANEL-{thickness}",
        namePattern: "Toughened Glass Pool Panel {thickness} (1200H)",
        category: "slat",
        unit: "each",
        defaultPrice: 195.00,
        formula: "ceil(length / 1.5)",
        description: "1200mm high toughened safety glass panels (approx. 1.5m panels)."
      },
      {
        skuPattern: "PF-GLASS-SPIGOT",
        namePattern: "SS2205 Core-Drill Spigot",
        category: "post",
        unit: "each",
        defaultPrice: 68.00,
        formula: "panel_type == 'Spigot Mounted' ? (panels * 2) : 0",
        description: "Duplex stainless steel spigots (2 per panel)."
      },
      {
        skuPattern: "PF-GLASS-CHANNEL",
        namePattern: "Aluminium Channel Track 3m",
        category: "rail",
        unit: "length",
        defaultPrice: 185.00,
        formula: "panel_type == 'Channel Mounted' ? ceil(length / 3.0) : 0",
        description: "Structural glazing channel track."
      },
      {
        skuPattern: "PF-GLASS-POST",
        namePattern: "Semi-Frameless Glazing Post",
        category: "post",
        unit: "each",
        defaultPrice: 95.00,
        formula: "panel_type == 'Semi-Frameless' ? (panels + 1) : 0",
        description: "Aluminium glazing slotted posts."
      }
    ]
  },
  {
    id: "retaining-walls",
    name: "Retaining Walls System",
    path: ["Retaining Walls"],
    description: "Multi-category retaining wall system supporting pine, hardwood, concrete and composite sleepers.",
    variables: [
      {
        id: "rw-category",
        field_key: "category",
        label: "Sleeper Material",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Treated Pine",
        options_json: ["Treated Pine", "Hardwood", "Concrete", "Composite"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "rw-sleeper-size",
        field_key: "sleeper_size",
        label: "Sleeper Size",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "200x50",
        options_json: ["200x50", "200x75", "200x100"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "rw-height",
        field_key: "height",
        label: "Wall Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "600",
        options_json: ["400", "600", "800", "1000"],
        sort_order: 3,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "RW-SLEEPER-{category}-{sleeper_size}",
        namePattern: "{category} Sleeper {sleeper_size} 2.4m",
        category: "slat",
        unit: "each",
        defaultPrice: 38.00,
        formula: "ceil(length / 2.4) * ceil(height / 200)",
        description: "Retaining sleepers (2.4m length, 200mm height)."
      },
      {
        skuPattern: "RW-POST-H",
        namePattern: "Galvanised H-Beam Retaining Post",
        category: "post",
        unit: "each",
        defaultPrice: 72.00,
        formula: "ceil(length / 2.4) - 1",
        description: "Joiner posts (H-beam) spaced at 2.4m intervals."
      },
      {
        skuPattern: "RW-POST-C",
        namePattern: "Galvanised C-Channel End Post",
        category: "post",
        unit: "each",
        defaultPrice: 48.00,
        formula: "2",
        description: "Terminal end posts (C-channel), 2 per wall."
      },
      {
        skuPattern: "RW-BOLT-PACK",
        namePattern: "M10 Sleeper Bolts 50 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 32.00,
        formula: "ceil((sleepers * 2) / 50)",
        description: "Securing bolts."
      }
    ]
  },
  {
    id: "chain-wire",
    name: "Chain Wire Mesh Fencing",
    path: ["Chain Wire"],
    description: "Commercial or boundary chain wire mesh fencing (black PVC or galvanized).",
    variables: [
      {
        id: "cw-coating",
        field_key: "coating",
        label: "Coating Style",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Black PVC Coated",
        options_json: ["Black PVC Coated", "Galvanized"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "cw-diamond",
        field_key: "diamond_size",
        label: "Diamond Aperture",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "50",
        options_json: ["50", "60"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "cw-gauge",
        field_key: "gauge",
        label: "Wire Gauge",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "2.5mm",
        options_json: ["2.5mm", "3.15mm"],
        sort_order: 3,
        visible_when_json: {}},
      {
        id: "cw-height",
        field_key: "target_height_mm",
        label: "Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["900", "1200", "1500", "1800", "2100", "2400", "3000"],
        sort_order: 4,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "CW-MESH-{coating}-{diamond_size}MM-{gauge}",
        namePattern: "Chain Wire Mesh Roll ({coating}, {diamond_size}mm diamond) 15m",
        category: "slat",
        unit: "each",
        defaultPrice: 145.00,
        formula: "ceil(length / 15)",
        description: "Mesh roll (15m lengths)."
      },
      {
        skuPattern: "CW-POST-INT",
        namePattern: "Intermediate Pipe Post 50mm OD",
        category: "post",
        unit: "each",
        defaultPrice: 32.00,
        formula: "ceil(length / 3.0) - 1",
        description: "Intermediate posts spaced every 3 meters."
      },
      {
        skuPattern: "CW-POST-TERM",
        namePattern: "Terminal Corner Post 65mm OD",
        category: "post",
        unit: "each",
        defaultPrice: 58.00,
        formula: "2",
        description: "End or corner posts."
      },
      {
        skuPattern: "CW-WIRE-TENSION",
        namePattern: "Tension Wire 3.15mm 100m Roll",
        category: "accessory",
        unit: "length",
        defaultPrice: 38.00,
        formula: "ceil((length * 3) / 100)",
        description: "3 horizontal strands of tension wire along the run."
      },
      {
        skuPattern: "CW-WIRE-TIE",
        namePattern: "Lacing Tie Wire 1.6mm Roll",
        category: "accessory",
        unit: "each",
        defaultPrice: 12.00,
        formula: "ceil(length / 10)",
        description: "Lacing wire to tie mesh to posts and tension lines."
      }
    ]
  },
  {
    id: "weld-mesh",
    name: "ARC Weld Mesh Fencing",
    path: ["Weld Mesh"],
    description: "Durable ARC weld mesh panel fence with wire grid aperture.",
    variables: [
      {
        id: "wm-mesh-type",
        field_key: "mesh_type",
        label: "Mesh Configuration",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "ARC Weldmesh Sheets",
        options_json: ["ARC Weldmesh Sheets", "ARC Weldmesh Roll"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "wm-aperture",
        field_key: "aperture",
        label: "Grid Aperture",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "50x50",
        options_json: ["50x50", "75x50"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "wm-gauge",
        field_key: "wire_gauge",
        label: "Wire Gauge",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "4mm",
        options_json: ["4mm", "5mm"],
        sort_order: 3,
        visible_when_json: {}},
      {
        id: "wm-height",
        field_key: "target_height_mm",
        label: "Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800",
        options_json: ["900", "1200", "1500", "1800", "2100", "2400"],
        sort_order: 4,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "WM-PANEL-{mesh_type}-{aperture}-{wire_gauge}",
        namePattern: "Weldmesh Panel {aperture}mm ({wire_gauge} wire) 2400x1200mm",
        category: "slat",
        unit: "each",
        defaultPrice: 85.00,
        formula: "ceil(length / 2.4)",
        description: "Standard 2.4m panels."
      },
      {
        skuPattern: "WM-POST",
        namePattern: "Weldmesh Post with Brackets H1800",
        category: "post",
        unit: "each",
        defaultPrice: 29.50,
        formula: "ceil(length / 2.4) + 1",
        description: "Fixing posts spaced at 2.4m."
      },
      {
        skuPattern: "WM-CLIPS-50PK",
        namePattern: "Panel Fixing Clips 50 Pack",
        category: "accessory",
        unit: "pack",
        defaultPrice: 22.00,
        formula: "ceil((panels * 6) / 50)",
        description: "6 clips per post to secure weld mesh."
      }
    ]
  },
  {
    id: "security-panels",
    name: "Zeus Security Fencing",
    path: ["Security Panels"],
    description: "Premium high-security Zeus spear-top panels from the Glass Outlet catalog.",
    variables: [
      {
        id: "sec-style",
        field_key: "style",
        label: "Panel Style",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Zeus Fencing",
        options_json: ["Zeus Fencing"],
        sort_order: 1,
        visible_when_json: {}},
      {
        id: "sec-height",
        field_key: "height",
        label: "Panel Height",
        control_type: "select",
        data_type: "enum",
        unit: "mm",
        required: true,
        default_value_json: "1800mm",
        options_json: ["1800mm", "2100mm"],
        sort_order: 2,
        visible_when_json: {}},
      {
        id: "sec-color",
        field_key: "color",
        label: "Color",
        control_type: "select",
        data_type: "enum",
        required: true,
        default_value_json: "Black Satin",
        options_json: ["Black Satin"],
        sort_order: 3,
        visible_when_json: {}}
    ],
    materials: [
      {
        skuPattern: "ZEUS-PANEL-{height}-{color}",
        namePattern: "Zeus Security Panel {height} ({color}) 2400W",
        category: "slat",
        unit: "each",
        defaultPrice: 245.00,
        formula: "ceil(length / 2.4)",
        description: "Zeus spear-top heavy duty security panel."
      },
      {
        skuPattern: "ZEUS-POST-{height}-{color}",
        namePattern: "Zeus Post 65x65mm {height} ({color})",
        category: "post",
        unit: "each",
        defaultPrice: 58.00,
        formula: "ceil(length / 2.4) + 1",
        description: "Heavy duty 65x65mm post."
      },
      {
        skuPattern: "ZEUS-SHROUD-{color}",
        namePattern: "Zeus Panel Shroud Bracket ({color})",
        category: "accessory",
        unit: "each",
        defaultPrice: 7.50,
        formula: "panels * 4",
        description: "Heavy duty security brackets (4 per panel)."
      },
      {
        skuPattern: "ZEUS-SCREWS",
        namePattern: "Security Anti-Tamper Screws 100 Pack",
        category: "screw",
        unit: "pack",
        defaultPrice: 29.00,
        formula: "ceil((panels * 8) / 100)",
        description: "Anti-tamper screws."
      }
    ]
  }
];

// Helper to load custom calculators from LocalStorage
export function getCustomCalculators(): CustomCalculator[] {
  if (typeof window === "undefined") return SEED_CUSTOM_CALCULATORS;
  const stored = localStorage.getItem("CUSTOM_CALCULATORS");
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as CustomCalculator[];
      let changed = false;
      const healed = parsed.map((calc) => {
        const seedCalc = SEED_CUSTOM_CALCULATORS.find((c) => c.id === calc.id);
        let currentVars = calc.variables;
        if (seedCalc) {
          const hasHeight = currentVars.some(
            (v) =>
              v.field_key === "target_height_mm" ||
              v.field_key === "paling_height" ||
              v.field_key === "height" ||
              v.field_key.toLowerCase().includes("height") ||
              v.label.toLowerCase().includes("height")
          );
          if (!hasHeight) {
            const seedHeightVar = seedCalc.variables.find(
              (v) =>
                v.field_key === "target_height_mm" ||
                v.field_key === "paling_height" ||
                v.field_key === "height"
            );
            if (seedHeightVar) {
              currentVars = [...currentVars, seedHeightVar].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
              );
              changed = true;
            }
          }
        }
        const variables = currentVars.map((v) => {
          let varChanged = false;
          const nextVar = { ...v };
          if (nextVar.visible_when_json === undefined) {
            nextVar.visible_when_json = {};
            varChanged = true;
          }
          if (nextVar.options_json === undefined) {
            nextVar.options_json = [];
            varChanged = true;
          }
          if (varChanged) changed = true;
          return nextVar;
        });
        return { ...calc, variables };
      });
      if (changed) {
        localStorage.setItem("CUSTOM_CALCULATORS", JSON.stringify(healed));
      }
      return healed;
    } catch (e) {
      console.error("Failed to parse custom calculators from localStorage", e);
    }
  }
  // If not present, seed it
  localStorage.setItem("CUSTOM_CALCULATORS", JSON.stringify(SEED_CUSTOM_CALCULATORS));
  return SEED_CUSTOM_CALCULATORS;
}

// Helper to save custom calculators to LocalStorage
export function saveCustomCalculators(calcs: CustomCalculator[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("CUSTOM_CALCULATORS", JSON.stringify(calcs));
}

// Helper to check if a product code is a custom calculator
export function isCustomCalculator(productCode: string): boolean {
  const calcs = getCustomCalculators();
  return calcs.some((c) => c.id === productCode);
}

// Helper to get custom prices uploaded by user
export function getCustomPrices(): Record<string, number> {
  if (typeof window === "undefined") return {};
  const stored = localStorage.getItem("CUSTOM_PRICES");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse custom prices", e);
    }
  }
  return {};
}

// Helper to save custom prices uploaded by user
export function saveCustomPrices(prices: Record<string, number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem("CUSTOM_PRICES", JSON.stringify(prices));
}

// Simple mathematical expression evaluator that supports context variables and functions
export function evaluateFormula(formula: string, context: Record<string, any>): number {
  // Replace standard Math functions
  let expr = formula.replace(/\b(ceil|floor|round|max|min|abs|sqrt)\b/g, "Math.$1");

  // Sort context keys by length descending to prevent partial replacements (e.g. replacing 'overlap' when variable 'overlap_size' is present)
  const keys = Object.keys(context).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    const val = context[key];
    const regex = new RegExp(`\\b${key}\\b`, "g");
    if (typeof val === "boolean") {
      expr = expr.replace(regex, val ? "1" : "0");
    } else if (typeof val === "number") {
      expr = expr.replace(regex, String(val));
    } else if (typeof val === "string") {
      // In comparisons, replace with quoted string. In general, try to quote it.
      expr = expr.replace(regex, `'${val}'`);
    }
  }

  try {
    // Safe evaluation using standard Function constructor (isolated execution context)
    const result = new Function(`return (${expr})`)();
    return Number(result) || 0;
  } catch (err) {
    console.warn(`Formula evaluation failed: "${formula}" -> "${expr}":`, err);
    return 0;
  }
}

// Pattern solver to replace placeholders like {post_size} with values from the context
export function resolvePattern(pattern: string, context: Record<string, any>): string {
  let result = pattern;
  const matches = pattern.match(/\{([a-zA-Z0-9_]+)\}/g) || [];
  for (const match of matches) {
    const key = match.slice(1, -1);
    const val = context[key] !== undefined ? String(context[key]) : "";
    result = result.replace(match, val);
  }
  return result;
}

// Helper to find the key of a variable that represents height in a custom calculator
export function findHeightVariableKey(fields: SchemaField[]): string | null {
  // Look for exact matches first
  const exactKeys = ["target_height_mm", "paling_height", "height", "paling_height_mm"];
  for (const k of exactKeys) {
    if (fields.some(f => f.field_key === k)) return k;
  }
  // Then look for keys or labels containing "height"
  const found = fields.find(f => 
    f.field_key.toLowerCase().includes("height") || 
    f.label.toLowerCase().includes("height")
  );
  return found ? found.field_key : null;
}

// Helper to format a numeric height value to match the type and format of a height variable's options
export function formatHeightForVariable(val: number, field?: SchemaField): string | number {
  if (!field) return val;
  if (field.data_type === "integer" || field.data_type === "number") {
    return val;
  }
  // Enum/string
  if (Array.isArray(field.options_json)) {
    const matched = field.options_json.find(
      (opt) => Number(String(opt).replace(/[^0-9]/g, "")) === val
    );
    if (matched !== undefined) return String(matched);
  }
  return String(val);
}

