-- Brief AT supplier portal pricing seed.
-- Source of truth: supabase/seeds/glass-outlet/pricing-2026-05-09.json
-- Captured from glassoutletonline.com.au on 2026-05-09.
-- Known anomalies were intentionally excluded pending supplier verification:
-- TC-H-AT-B / TC-H-AT-2L-B same price, ENDURO-SSC-60 / ENDURO-SSRES same price,
-- and MR-FLGG-S cheaper than MR-FLGG-P.

BEGIN;

DO $$
DECLARE
  org_id_value uuid;
  item jsonb;
  tier jsonb;
  tier_code_value text;
  component_id_value uuid;
  priority_value int;
  price_catalogue jsonb := $json$[
  {
    "sku": "BB-ML-TL",
    "name": "Magna Latch Top Pull (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 53.76
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "BB-MR-FLGGSS-P",
    "name": "Master Friction Latch - Polish (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 98.01
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "BB-MR-FLGGSS-S",
    "name": "Master Friction Latch - Satin (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 98.01
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "BB-MR-FMLSL",
    "name": "Master Face Mount Lock Latch (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 31.96
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "BB-MR-SFLSL-B",
    "name": "Master Lock Side Latch - Black (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 53.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "BB-SS-GS",
    "name": "D&D Gate Stop (BB)",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.58
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "ENDURO-GC-125",
    "name": "EnduroShield Glass Coat - 125ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 42.33
      },
      {
        "min_qty": 10,
        "unit_price": 38.09
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "ENDURO-GC-500",
    "name": "EnduroShield Glass Coat - 500ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 182.73
      },
      {
        "min_qty": 10,
        "unit_price": 160.81
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "FB-V60",
    "name": "Bostik V60 Silicone - 300ml Translucent",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 12.85
      },
      {
        "min_qty": 15,
        "unit_price": 11.68
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "GLASSBUDDY",
    "name": "GlassBuddy - Plywood Brace",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 12.58
      },
      {
        "min_qty": 80,
        "unit_price": 11.32
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "GLASSMATE",
    "name": "GlassMate Install Tool",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 54.5
      },
      {
        "min_qty": 80,
        "unit_price": 49.14
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "GLOVE",
    "name": "Safety Glove (M or L)",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.9
      },
      {
        "min_qty": 80,
        "unit_price": 5.3
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "GROUT-BOS",
    "name": "BOSTIK Grout HES - 20Kg Bag",
    "category": "accessory",
    "unit": "bag",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 49.04
      },
      {
        "min_qty": 30,
        "unit_price": 46.62
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/grout-n-cement",
    "source_section": "1. Accessories > Grout & Cement (5 items)"
  },
  {
    "sku": "GROUT-CONCRETE",
    "name": "Concrete Mix - 20Kg Bag",
    "category": "accessory",
    "unit": "bag",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 10.15
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/grout-n-cement",
    "source_section": "1. Accessories > Grout & Cement (5 items)"
  },
  {
    "sku": "GROUT-KWIKSET",
    "name": "Kwikset Concrete - 20Kg Bag",
    "category": "accessory",
    "unit": "bag",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 7.93
      },
      {
        "min_qty": 30,
        "unit_price": 7.53
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/grout-n-cement",
    "source_section": "1. Accessories > Grout & Cement (5 items)"
  },
  {
    "sku": "GROUT-RSC",
    "name": "Rapid Set Concrete - 20Kg Bag",
    "category": "accessory",
    "unit": "bag",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 12.08
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/grout-n-cement",
    "source_section": "1. Accessories > Grout & Cement (5 items)"
  },
  {
    "sku": "GROUT-SIKA",
    "name": "Sika Grout HES - 20Kg Bag",
    "category": "accessory",
    "unit": "bag",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 43.58
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/grout-n-cement",
    "source_section": "1. Accessories > Grout & Cement (5 items)"
  },
  {
    "sku": "GSTOOL",
    "name": "Stand-off Tightening Tool - SS304",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 9.03
      },
      {
        "min_qty": 10,
        "unit_price": 7.22
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "LAT180-B",
    "name": "Atlantic 180° - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 91.62
      },
      {
        "min_qty": 20,
        "unit_price": 84.3
      },
      {
        "min_qty": 40,
        "unit_price": 79.24
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT180-P",
    "name": "Atlantic 180° - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT180-S",
    "name": "Atlantic 180° - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT180-W",
    "name": "Atlantic 180° - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 91.62
      },
      {
        "min_qty": 20,
        "unit_price": 84.3
      },
      {
        "min_qty": 40,
        "unit_price": 79.24
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90EXT-B",
    "name": "Atlantic 90° External - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 91.62
      },
      {
        "min_qty": 20,
        "unit_price": 84.3
      },
      {
        "min_qty": 40,
        "unit_price": 79.24
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90EXT-P",
    "name": "Atlantic 90° External - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 85.07
      },
      {
        "min_qty": 20,
        "unit_price": 78.3
      },
      {
        "min_qty": 40,
        "unit_price": 73.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90EXT-S",
    "name": "Atlantic 90° External - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 85.07
      },
      {
        "min_qty": 20,
        "unit_price": 78.3
      },
      {
        "min_qty": 40,
        "unit_price": 73.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90EXT-W",
    "name": "Atlantic 90° External - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 91.62
      },
      {
        "min_qty": 20,
        "unit_price": 84.3
      },
      {
        "min_qty": 40,
        "unit_price": 79.24
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90INT-B",
    "name": "Atlantic 90° Internal - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 92.72
      },
      {
        "min_qty": 20,
        "unit_price": 85.34
      },
      {
        "min_qty": 40,
        "unit_price": 80.22
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90INT-P",
    "name": "Atlantic 90° Internal - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90INT-S",
    "name": "Atlantic 90° Internal - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LAT90INT-W",
    "name": "Atlantic 90° Internal - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 92.72
      },
      {
        "min_qty": 20,
        "unit_price": 85.34
      },
      {
        "min_qty": 40,
        "unit_price": 80.22
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LATWALL-B",
    "name": "Atlantic Wall/Post - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LATWALL-P",
    "name": "Atlantic Wall/Post - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 85.07
      },
      {
        "min_qty": 20,
        "unit_price": 78.3
      },
      {
        "min_qty": 40,
        "unit_price": 73.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LATWALL-S",
    "name": "Atlantic Wall/Post - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 85.07
      },
      {
        "min_qty": 20,
        "unit_price": 78.3
      },
      {
        "min_qty": 40,
        "unit_price": 73.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "LATWALL-W",
    "name": "Atlantic Wall/Post - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 87.26
      },
      {
        "min_qty": 20,
        "unit_price": 80.31
      },
      {
        "min_qty": 40,
        "unit_price": 75.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "ML-TL",
    "name": "Magna Latch Top Pull Kit",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 60.12
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90E-B",
    "name": "Master Friction 90° Ext - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 62.79
      },
      {
        "min_qty": 20,
        "unit_price": 57.77
      },
      {
        "min_qty": 40,
        "unit_price": 53.4
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90E-MW",
    "name": "Master Friction 90° Ext - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 62.79
      },
      {
        "min_qty": 20,
        "unit_price": 57.77
      },
      {
        "min_qty": 40,
        "unit_price": 53.4
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90E-P",
    "name": "Master Friction 90° Ext - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 59.51
      },
      {
        "min_qty": 20,
        "unit_price": 54.77
      },
      {
        "min_qty": 40,
        "unit_price": 50.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90E-S",
    "name": "Master Friction 90° Ext - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 59.51
      },
      {
        "min_qty": 20,
        "unit_price": 54.77
      },
      {
        "min_qty": 40,
        "unit_price": 50.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90I-B",
    "name": "Master Friction 90° Int - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 65.42
      },
      {
        "min_qty": 20,
        "unit_price": 60.23
      },
      {
        "min_qty": 40,
        "unit_price": 55.64
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90I-MW",
    "name": "Master Friction 90° Int - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 65.42
      },
      {
        "min_qty": 20,
        "unit_price": 60.23
      },
      {
        "min_qty": 40,
        "unit_price": 55.64
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90I-P",
    "name": "Master Friction 90° Int - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 61.05
      },
      {
        "min_qty": 20,
        "unit_price": 56.19
      },
      {
        "min_qty": 40,
        "unit_price": 51.92
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FL90I-S",
    "name": "Master Friction 90° Int - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 61.05
      },
      {
        "min_qty": 20,
        "unit_price": 56.19
      },
      {
        "min_qty": 40,
        "unit_price": 51.92
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FLGG-B",
    "name": "Master Friction 180° - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 52.31
      },
      {
        "min_qty": 20,
        "unit_price": 48.15
      },
      {
        "min_qty": 40,
        "unit_price": 44.5
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FLGG-MW",
    "name": "Master Friction 180° - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 52.31
      },
      {
        "min_qty": 20,
        "unit_price": 48.15
      },
      {
        "min_qty": 40,
        "unit_price": 44.5
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FLGG-P",
    "name": "Master Friction 180° - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 49.04
      },
      {
        "min_qty": 20,
        "unit_price": 45.15
      },
      {
        "min_qty": 40,
        "unit_price": 41.72
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FMLSL",
    "name": "Master Face Mount Lock Latch",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 38.22
      },
      {
        "min_qty": 20,
        "unit_price": 35.16
      },
      {
        "min_qty": 40,
        "unit_price": 32.49
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-FMSL-MW",
    "name": "Face Mount Latch - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 18.46
      },
      {
        "min_qty": 20,
        "unit_price": 16.98
      },
      {
        "min_qty": 40,
        "unit_price": 15.73
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-RPLSS-P",
    "name": "Master Round SS Latch - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 97.19
      },
      {
        "min_qty": 20,
        "unit_price": 89.44
      },
      {
        "min_qty": 40,
        "unit_price": 82.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-RPLSS-S",
    "name": "Master Round SS Latch - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 97.19
      },
      {
        "min_qty": 20,
        "unit_price": 89.44
      },
      {
        "min_qty": 40,
        "unit_price": 82.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-SF-SSS",
    "name": "Master SS Z-Profile Door Stop Plate",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 15.23
      },
      {
        "min_qty": 20,
        "unit_price": 14.05
      },
      {
        "min_qty": 40,
        "unit_price": 12.95
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-SFLSL-B",
    "name": "Master Lock Side Latch - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 64.43
      },
      {
        "min_qty": 20,
        "unit_price": 59.29
      },
      {
        "min_qty": 40,
        "unit_price": 54.77
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGL-B",
    "name": "Master Wall Latch Kit - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 52.31
      },
      {
        "min_qty": 20,
        "unit_price": 48.15
      },
      {
        "min_qty": 40,
        "unit_price": 44.5
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGL-MW",
    "name": "Master Wall Latch Kit - White",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 52.31
      },
      {
        "min_qty": 20,
        "unit_price": 48.15
      },
      {
        "min_qty": 40,
        "unit_price": 44.5
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGL-P",
    "name": "Master Wall Latch Kit - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 45.76
      },
      {
        "min_qty": 20,
        "unit_price": 42.09
      },
      {
        "min_qty": 40,
        "unit_price": 38.93
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGL-S",
    "name": "Master Wall Latch Kit - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 43.58
      },
      {
        "min_qty": 20,
        "unit_price": 40.13
      },
      {
        "min_qty": 40,
        "unit_price": 37.08
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGLSS-P",
    "name": "Master Wall SS Latch - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 99.9
      },
      {
        "min_qty": 20,
        "unit_price": 86.76
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "MR-WGLSS-S",
    "name": "Master Wall SS Latch - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 99.9
      },
      {
        "min_qty": 20,
        "unit_price": 86.76
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/latches",
    "source_section": "6. Pool Fencing > Latches (47 items, was 43 - count refreshed)"
  },
  {
    "sku": "P-BIT-6MM",
    "name": "Purity Tile Drill Bit - 6mm",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.33
      },
      {
        "min_qty": 20,
        "unit_price": 2.21
      },
      {
        "min_qty": 40,
        "unit_price": 2.03
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "P-BIT-7MM",
    "name": "Purity Tile Drill Bit - 7mm",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.33
      },
      {
        "min_qty": 20,
        "unit_price": 2.21
      },
      {
        "min_qty": 40,
        "unit_price": 2.03
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "P-BIT-8MM",
    "name": "Purity Tile Drill Bit - 8mm",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.98
      },
      {
        "min_qty": 20,
        "unit_price": 2.82
      },
      {
        "min_qty": 40,
        "unit_price": 2.61
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "P-S-6S",
    "name": "Purity Bostik Silicone 6S",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 11.74
      },
      {
        "min_qty": 20,
        "unit_price": 10.86
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "P-SS",
    "name": "Purity Silicone Spatula",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 3.82
      },
      {
        "min_qty": 20,
        "unit_price": 3.63
      },
      {
        "min_qty": 40,
        "unit_price": 3.34
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "POSTA-BLK-H050-/",
    "name": "50mm Black character - slash",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-0",
    "name": "50mm Black character - 0",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-1",
    "name": "50mm Black character - 1",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-2",
    "name": "50mm Black character - 2",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-3",
    "name": "50mm Black character - 3",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-4",
    "name": "50mm Black character - 4",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-5",
    "name": "50mm Black character - 5",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-6",
    "name": "50mm Black character - 6",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-7",
    "name": "50mm Black character - 7",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-8",
    "name": "50mm Black character - 8",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-9",
    "name": "50mm Black character - 9",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-A",
    "name": "50mm Black character - A",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-B",
    "name": "50mm Black character - B",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H050-C",
    "name": "50mm Black character - C",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-/",
    "name": "120mm Black character - slash",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-0",
    "name": "120mm Black character - 0",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-1",
    "name": "120mm Black character - 1",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-2",
    "name": "120mm Black character - 2",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-3",
    "name": "120mm Black character - 3",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-4",
    "name": "120mm Black character - 4",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-5",
    "name": "120mm Black character - 5",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-6",
    "name": "120mm Black character - 6",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-7",
    "name": "120mm Black character - 7",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-8",
    "name": "120mm Black character - 8",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-9",
    "name": "120mm Black character - 9",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-A",
    "name": "120mm Black character - A",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-B",
    "name": "120mm Black character - B",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-BLK-H120-C",
    "name": "120mm Black character - C",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-FML-B",
    "name": "Letterbox - Black",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 77.48
      },
      {
        "min_qty": 6,
        "unit_price": 72.06
      },
      {
        "min_qty": 12,
        "unit_price": 68.45
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-FML-SS316",
    "name": "Letterbox - Satin SS316",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 70
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-FML-W",
    "name": "Letterbox - White",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 77.48
      },
      {
        "min_qty": 6,
        "unit_price": 72.06
      },
      {
        "min_qty": 12,
        "unit_price": 68.45
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-/",
    "name": "50mm SS316 character - slash",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-0",
    "name": "50mm SS316 character - 0",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-1",
    "name": "50mm SS316 character - 1",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-2",
    "name": "50mm SS316 character - 2",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-3",
    "name": "50mm SS316 character - 3",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-4",
    "name": "50mm SS316 character - 4",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-5",
    "name": "50mm SS316 character - 5",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-6",
    "name": "50mm SS316 character - 6",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-7",
    "name": "50mm SS316 character - 7",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-8",
    "name": "50mm SS316 character - 8",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-9",
    "name": "50mm SS316 character - 9",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-A",
    "name": "50mm SS316 character - A",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-B",
    "name": "50mm SS316 character - B",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H050-C",
    "name": "50mm SS316 character - C",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-/",
    "name": "120mm SS316 character - slash",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-0",
    "name": "120mm SS316 character - 0",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-1",
    "name": "120mm SS316 character - 1",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-2",
    "name": "120mm SS316 character - 2",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-3",
    "name": "120mm SS316 character - 3",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-4",
    "name": "120mm SS316 character - 4",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-5",
    "name": "120mm SS316 character - 5",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-6",
    "name": "120mm SS316 character - 6",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-7",
    "name": "120mm SS316 character - 7",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-8",
    "name": "120mm SS316 character - 8",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-9",
    "name": "120mm SS316 character - 9",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-A",
    "name": "120mm SS316 character - A",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-B",
    "name": "120mm SS316 character - B",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-SS-H120-C",
    "name": "120mm SS316 character - C",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-/",
    "name": "120mm SS316 STUD character - slash",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-0",
    "name": "120mm SS316 STUD character - 0",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-1",
    "name": "120mm SS316 STUD character - 1",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-2",
    "name": "120mm SS316 STUD character - 2",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-3",
    "name": "120mm SS316 STUD character - 3",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-4",
    "name": "120mm SS316 STUD character - 4",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-5",
    "name": "120mm SS316 STUD character - 5",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-6",
    "name": "120mm SS316 STUD character - 6",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-7",
    "name": "120mm SS316 STUD character - 7",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-8",
    "name": "120mm SS316 STUD character - 8",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-9",
    "name": "120mm SS316 STUD character - 9",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-A",
    "name": "120mm SS316 STUD character - A",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-B",
    "name": "120mm SS316 STUD character - B",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "POSTA-STUD-H120-C",
    "name": "120mm SS316 STUD character - C",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 6.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/fencing/posta",
    "source_section": "4. Fencing > POSTA (73 items)"
  },
  {
    "sku": "PSC-125W-S",
    "name": "Polaris 125 Wall Hinge - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 294.62
      },
      {
        "min_qty": 6,
        "unit_price": 278.46
      },
      {
        "min_qty": 12,
        "unit_price": 260.99
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-GG-B",
    "name": "155 Polaris Glass-to-Glass - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 159
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-GG-P",
    "name": "155 Polaris Glass-to-Glass - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-GG-S",
    "name": "155 Polaris Glass-to-Glass - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-RP-P",
    "name": "155 Polaris Round Post Hinge - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-RP-S",
    "name": "155 Polaris Round Post Hinge - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-W-B",
    "name": "155 Polaris Wall Post Hinge - Black",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 159
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-W-P",
    "name": "155 Polaris Wall Post Hinge - Polish",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "PSC-S155-W-S",
    "name": "155 Polaris Wall Post Hinge - Satin",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 149
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "REV-BASE",
    "name": "Base for Core Drill Stand",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 84.38
      },
      {
        "min_qty": 80,
        "unit_price": 75.95
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-08",
    "name": "8mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 12.46
      },
      {
        "min_qty": 80,
        "unit_price": 10.92
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-10",
    "name": "10mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 14.55
      },
      {
        "min_qty": 80,
        "unit_price": 12.01
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-12",
    "name": "12mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 17.27
      },
      {
        "min_qty": 80,
        "unit_price": 14.2
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-14",
    "name": "14mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 19.89
      },
      {
        "min_qty": 80,
        "unit_price": 16.38
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-20",
    "name": "20mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 37.15
      },
      {
        "min_qty": 80,
        "unit_price": 32.76
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-42",
    "name": "42mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 42.71
      },
      {
        "min_qty": 80,
        "unit_price": 38.22
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-53",
    "name": "53mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 61.75
      },
      {
        "min_qty": 80,
        "unit_price": 53.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-63",
    "name": "63mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 67.92
      },
      {
        "min_qty": 80,
        "unit_price": 61.15
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-76",
    "name": "76mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 77.69
      },
      {
        "min_qty": 80,
        "unit_price": 70.98
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-83",
    "name": "83mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 85.53
      },
      {
        "min_qty": 80,
        "unit_price": 75.35
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-BIT-89",
    "name": "89mm Core Drill Bit",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 89.57
      },
      {
        "min_qty": 80,
        "unit_price": 80.81
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-CD-2S",
    "name": "Core Drill Machine - 2 Speed",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 239.2
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-GUARD",
    "name": "Splash Guard for Core Drill",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 33.02
      },
      {
        "min_qty": 80,
        "unit_price": 29.72
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-LEVEL",
    "name": "Level for Core Drill",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 11.76
      },
      {
        "min_qty": 80,
        "unit_price": 10.59
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-STAND",
    "name": "Stand for Core Drill",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 264.17
      },
      {
        "min_qty": 80,
        "unit_price": 237.75
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "REV-TEMPLATE",
    "name": "Template for Core Drill",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 38.31
      },
      {
        "min_qty": 80,
        "unit_price": 34.47
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "RIV-M6-LHM",
    "name": "M6 Left Hand Threaded Mandrel",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 7.53
      },
      {
        "min_qty": 80,
        "unit_price": 6.02
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "RIV-M6-RHM",
    "name": "M6 Right Hand Threaded Mandrel",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 7.53
      },
      {
        "min_qty": 80,
        "unit_price": 6.02
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "RIV-M8-RHM",
    "name": "M8 Right Hand Threaded Mandrel",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 8.79
      },
      {
        "min_qty": 80,
        "unit_price": 7.04
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "RIV-TOOL",
    "name": "Long Arm Nutsert Tool",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 171.99
      },
      {
        "min_qty": 80,
        "unit_price": 159.38
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "SOUD-APS-B",
    "name": "Soudal All Purpose Silicone - Black 300ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 8.19
      },
      {
        "min_qty": 12,
        "unit_price": 6.84
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-CA1400",
    "name": "Soudal CA1400 Chemical Anchor - 280ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 20.59
      },
      {
        "min_qty": 12,
        "unit_price": 19.57
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-EPOFIX",
    "name": "Soudal Epofix 82A - 24ml Epoxy",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 8.84
      },
      {
        "min_qty": 12,
        "unit_price": 8.41
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-GUN",
    "name": "Soudal Heavy Duty Cartridge Gun",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 32.66
      },
      {
        "min_qty": 4,
        "unit_price": 31.03
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-GUN380",
    "name": "Soudal Applicator Gun - 380ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 64.43
      },
      {
        "min_qty": 4,
        "unit_price": 61.2
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-KBS-TRANS",
    "name": "Soudal Bathroom Silicone - Trans 300ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 4.86
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-KBS-W",
    "name": "Soudal Bathroom Silicone - White 300ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 5.3
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-NOZ",
    "name": "Soudal Nozzle for Chemical Anchor",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 2.36
      },
      {
        "min_qty": 12,
        "unit_price": 2.24
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "SOUD-VE400",
    "name": "Soudal VE400 Chemical Anchor - 380ml",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 31.62
      },
      {
        "min_qty": 12,
        "unit_price": 30.03
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "TC-CAPS3",
    "name": "TruClose Hinge Safety Cap",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 1.46
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "TC-H-AT-HD-2L-B",
    "name": "TruClose Heavy Duty - 2 Alignment Legs",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 42.51
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "TC-H-AT-HD-B",
    "name": "TruClose Heavy Duty - 1 Alignment Leg",
    "category": "hardware",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 41.74
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/pool-fencing/hinges,-latches-n-accessories/hinges?page=3",
    "source_section": "5. Pool Fencing > Hinges - Page 3 (62 items total in category, 14 captured here)"
  },
  {
    "sku": "TROLLEY-FP",
    "name": "Trolley A-Frame - Flat Pack",
    "category": "accessory",
    "unit": "pack",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 1736.28
      },
      {
        "min_qty": 80,
        "unit_price": 1607.67
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  },
  {
    "sku": "ULTRALOC-3242",
    "name": "Ultraloc Threadlocker 3242 - 10mL",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 13.57
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/silicone,-adhesives-n-coatings",
    "source_section": "3. Accessories > Silicone, Adhesives & Coatings (16 items)"
  },
  {
    "sku": "VROLLER",
    "name": "Vinyl Wedge Roller - 10mm Wheel",
    "category": "accessory",
    "unit": "each",
    "system_types": [
      "QSHS",
      "VS",
      "XPL",
      "BAYG",
      "GATE"
    ],
    "tiers": [
      {
        "min_qty": 1,
        "unit_price": 16.28
      },
      {
        "min_qty": 10,
        "unit_price": 11.91
      }
    ],
    "captured_date": "2026-05-09",
    "source_url": "https://glassoutletonline.com.au/products/accessories/tools",
    "source_section": "2. Accessories > Tools (32 items)"
  }
]$json$::jsonb;
BEGIN
  SELECT id INTO org_id_value
  FROM organisations
  WHERE slug = 'glass-outlet';

  IF org_id_value IS NULL THEN
    -- Organisation not yet seeded (fresh migration run before seeds). Skip gracefully.
    -- In production the org already exists, so this branch is never taken.
    RAISE NOTICE 'glass-outlet organisation not found – skipping supplier price seed';
    RETURN;
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(price_catalogue)
  LOOP
    INSERT INTO product_components (
      org_id,
      sku,
      name,
      description,
      category,
      unit,
      default_price,
      system_types,
      metadata,
      active
    )
    VALUES (
      org_id_value,
      item->>'sku',
      item->>'name',
      item->>'name',
      COALESCE(item->>'category', 'accessory'),
      COALESCE(item->>'unit', 'each'),
      ((item->'tiers'->0)->>'unit_price')::numeric,
      ARRAY['QSHS','VS','XPL','BAYG','GATE']::text[],
      jsonb_build_object(
        'price_source', 'glassoutletonline.com.au supplier portal',
        'price_verified_date', '2026-05-09',
        'source_url', item->>'source_url',
        'source_section', item->>'source_section'
      ),
      true
    )
    ON CONFLICT (org_id, sku) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          default_price = EXCLUDED.default_price,
          system_types = EXCLUDED.system_types,
          metadata = COALESCE(product_components.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          active = true,
          updated_at = now()
    RETURNING id INTO component_id_value;

    FOR tier IN SELECT * FROM jsonb_array_elements(item->'tiers')
    LOOP
      priority_value := (tier->>'min_qty')::int;

      FOREACH tier_code_value IN ARRAY ARRAY['tier1','tier2','tier3']
      LOOP
        UPDATE pricing_rules
        SET org_id = org_id_value,
            rule = 'qty >= ' || priority_value::text,
            price = (tier->>'unit_price')::numeric,
            valid_from = '2026-05-09'::date,
            valid_to = NULL,
            notes = 'Glass Outlet supplier portal; captured 2026-05-09; ' || COALESCE(item->>'source_url', ''),
            active = true,
            updated_at = now()
        WHERE component_id = component_id_value
          AND tier_code = tier_code_value
          AND priority = priority_value
          AND active = true;

        IF NOT FOUND THEN
          INSERT INTO pricing_rules (
            org_id,
            component_id,
            tier_code,
            rule,
            price,
            priority,
            valid_from,
            valid_to,
            notes,
            active
          )
          VALUES (
            org_id_value,
            component_id_value,
            tier_code_value,
            'qty >= ' || priority_value::text,
            (tier->>'unit_price')::numeric,
            priority_value,
            '2026-05-09'::date,
            NULL,
            'Glass Outlet supplier portal; captured 2026-05-09; ' || COALESCE(item->>'source_url', ''),
            true
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
