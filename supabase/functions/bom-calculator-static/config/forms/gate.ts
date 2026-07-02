// config/forms/gate.ts — QS_GATE segment form field defs.
//
// Encodes all GATE_SEGMENT_STUB_KEYS (src/lib/segmentTermination.ts) as
// segment-scope fields. GateSegmentDetails only actually mounts a curated
// subset of these per section (mirroring how RunCardSettings/
// FenceSegmentDetails pick fields out of formFields by key) — a few keys
// (match_run_height, gate_height_mm, include_lock_box, lock_box_type,
// hinge_side, sliding_motor_type, leaf_2_width_mm, and the individual
// automation_* fields folded into the automation_group renderer) are declared
// here for schema completeness but are not currently rendered, matching
// today's behaviour exactly.

import type { CalculatorConfig } from "../types.ts";

const GATE_COLOUR_OPTIONS = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S", "KWI", "WRC"];

const SWING_MOVEMENTS = ["single_swing", "double_swing"];

const EXTERNAL_ACCESS_LATCHES = ["LLAA", "LLAA-W", "LL-DL", "LL-DL-KA", "LL-DL-W"];

export const GATE_FORM_FIELDS: CalculatorConfig["formFields"] = {
  job: [],
  run: [],
  segment: [
    { field_key: "gate_movement", label: "Gate type", control_type: "select", data_type: "enum",
      options_json: [
        { value: "single_swing", label: "Single swing" },
        { value: "double_swing", label: "Double swing" },
        { value: "sliding", label: "Sliding" },
      ], default_value_json: "single_swing", sort_order: 10 },
    { field_key: "gate_build", label: "QSG gate system", control_type: "select", data_type: "enum",
      options_json: [
        { value: "qsg_hinged_horizontal", label: "QSG hinged horizontal" },
        { value: "qsg_hinged_vertical", label: "QSG hinged vertical" },
        { value: "qsg_sliding_horizontal", label: "QSG sliding horizontal" },
        { value: "qsg_sliding_vertical", label: "QSG sliding vertical" },
      ],
      default_value_json: "qsg_hinged_horizontal", sort_order: 5 },
    // options_json is overridden client-side per gate_movement (swing: out/in, sliding: left/right).
    { field_key: "opening_direction", label: "Opening direction", control_type: "select", data_type: "enum",
      options_json: [
        { value: "out", label: "Swing out" },
        { value: "in", label: "Swing in" },
      ], default_value_json: "out", sort_order: 20 },
    { field_key: "sliding_side", label: "Sliding side", control_type: "select", data_type: "enum",
      options_json: [
        { value: "front", label: "Slide in front of fence" },
        { value: "back", label: "Slide behind fence" },
      ], default_value_json: "front",
      visible_when_json: { gate_movement: "sliding" }, sort_order: 25 },
    { field_key: "leaf_1_width_mm", label: "Leaf widths", control_type: "leaf_width_pair", data_type: "number",
      visible_when_json: { gate_movement: "double_swing" }, unit: "mm", sort_order: 30 },
    { field_key: "leaf_2_width_mm", label: "Leaf 2 width", control_type: "leaf_width_pair", data_type: "number",
      visible_when_json: { gate_movement: "double_swing" }, unit: "mm", sort_order: 31 },
    { field_key: "leaf_count", label: "Leaf count", control_type: "number", data_type: "integer",
      default_value_json: 1, sort_order: 32 },
    { field_key: "match_run_height", label: "Match run height", control_type: "toggle", data_type: "boolean",
      default_value_json: true, sort_order: 33 },
    { field_key: "gate_height_mm", label: "Gate height", control_type: "number", data_type: "number",
      unit: "mm", sort_order: 34 },

    { field_key: "slat_size_mm", label: "Gate slat size", control_type: "select", data_type: "number",
      options_json: [65, 90], default_value_json: 65, unit: "mm", sort_order: 40 },
    { field_key: "slat_gap_mm", label: "Gate slat gap", control_type: "select", data_type: "number",
      options_json: [5, 9, 12, 15, 20, 30], default_value_json: 9, unit: "mm", sort_order: 41 },
    { field_key: "gate_post_size_mm", label: "Gate post", control_type: "select", data_type: "number",
      options_json: [50, 65], default_value_json: 50, unit: "mm", sort_order: 42 },
    { field_key: "colour_code", label: "Gate colour", control_type: "colour_palette", data_type: "enum",
      options_json: GATE_COLOUR_OPTIONS, default_value_json: "B", sort_order: 43 },
    { field_key: "use_gate_posts_as_fence_termination", label: "Use gate posts as fence termination posts",
      control_type: "toggle", data_type: "boolean", default_value_json: true, sort_order: 44 },

    { field_key: "hinge_type", label: "Hinge / closer", control_type: "hardware_ranked", data_type: "string",
      default_value_json: "TC-H-AT-HD-B", visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 50 },
    { field_key: "latch_type", label: "Latch / lock", control_type: "hardware_ranked", data_type: "string",
      default_value_json: "LL-DL-KA", visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 51 },
    { field_key: "optional_add_ons", label: "Optional add-ons", control_type: "optional_addons", data_type: "string",
      visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 52 },
    { field_key: "hardware_kit_sku", label: "Hardware kit", control_type: "kit_toggle", data_type: "string",
      default_value_json: "", visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 53 },
    { field_key: "include_external_access_kit", label: "Add external access kit (LLB)", control_type: "toggle",
      data_type: "boolean", default_value_json: false,
      visible_when_json: { gate_movement: SWING_MOVEMENTS, latch_type: EXTERNAL_ACCESS_LATCHES }, sort_order: 54 },
    { field_key: "drop_bolt_type", label: "Drop bolt", control_type: "hardware_dropdown", data_type: "string",
      default_value_json: "none", options_group: "gate,drop,bolt",
      visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 55 },
    { field_key: "gate_stop_type", label: "Gate stop", control_type: "hardware_dropdown", data_type: "string",
      default_value_json: "none", options_group: "gate,stop",
      visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 56 },
    { field_key: "include_lock_box", label: "Include lock box", control_type: "toggle", data_type: "boolean",
      default_value_json: false, visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 57 },
    { field_key: "lock_box_type", label: "Lock box type", control_type: "text", data_type: "string",
      visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 58 },
    { field_key: "hinge_side", label: "Hinge side", control_type: "select", data_type: "enum",
      options_json: ["left", "right"], visible_when_json: { gate_movement: SWING_MOVEMENTS }, sort_order: 59 },

    { field_key: "sliding_track_type", label: "Track", control_type: "hardware_dropdown", data_type: "string",
      default_value_json: "XPSG-6000-TRACK-ST", options_group: "track",
      visible_when_json: { gate_movement: "sliding" }, sort_order: 60 },
    { field_key: "sliding_guide_type", label: "Top guide system", control_type: "hardware_dropdown", data_type: "string",
      default_value_json: "XPSG-GUIDE", options_group: "guide,roller",
      visible_when_json: { gate_movement: "sliding" }, sort_order: 61 },
    { field_key: "sliding_catch_type", label: "Catch type", control_type: "hardware_dropdown", data_type: "string",
      default_value_json: "XPSG-CATCH-U", options_group: "catch",
      visible_when_json: { gate_movement: "sliding" }, sort_order: 62 },
    { field_key: "sliding_motor_type", label: "Motor kit", control_type: "select", data_type: "string",
      default_value_json: "none", visible_when_json: { gate_movement: "sliding" }, sort_order: 63 },
    { field_key: "automation_enabled", label: "Add automation kit?", control_type: "automation_group",
      data_type: "boolean", default_value_json: false, visible_when_json: { gate_movement: "sliding" }, sort_order: 64 },
    { field_key: "automation_power_source", label: "Power source", control_type: "select", data_type: "enum",
      options_json: ["mains", "solar"], default_value_json: "mains", sort_order: 65 },
    { field_key: "automation_cable_distance_m", label: "Motor distance from mains outlet", control_type: "number",
      data_type: "number", unit: "m", default_value_json: 0, sort_order: 66 },
    { field_key: "automation_battery", label: "Add backup battery for power outages", control_type: "toggle",
      data_type: "boolean", default_value_json: false, sort_order: 67 },
    { field_key: "automation_keypad", label: "Wireless keypad", control_type: "toggle", data_type: "boolean",
      default_value_json: false, sort_order: 68 },
    { field_key: "automation_extra_remotes", label: "Extra remotes", control_type: "number", data_type: "integer",
      default_value_json: 0, sort_order: 69 },
  ],
};
