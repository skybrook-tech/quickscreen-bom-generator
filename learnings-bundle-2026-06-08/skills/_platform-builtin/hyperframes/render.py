#!/usr/bin/env python3
"""
Render a HyperFrames composition (HTML) to MP4.

Usage (invoked by the agent via ExecuteSkillScript):
  - Place your composition HTML at /tmp/composition.html (the agent writes it
    here using the Write tool before calling this script).
  - The script invokes `npx --yes hyperframes@0.4.37 render` and drops the MP4 in
    /tmp/outputs/ where the orchestrator's output-file-processor picks it up
    and publishes it via file-storage.ts (media/ subdir, thumbnail enqueued).

Override the input/output paths via env vars:
  HYPERFRAMES_INPUT  (default: /tmp/composition.html)
  HYPERFRAMES_OUTPUT (default: /tmp/outputs/video.mp4)

The hyperframes CLI is pre-installed globally in the snapshot. If it is
missing for any reason, this script falls back to `npx --yes hyperframes@0.4.37`,
which pins the same version as the snapshot to avoid a moving `latest` tag.
"""

import os
import shutil
import subprocess
import sys

INPUT = os.environ.get("HYPERFRAMES_INPUT", "/tmp/composition.html")
OUTPUT = os.environ.get("HYPERFRAMES_OUTPUT", "/tmp/outputs/video.mp4")

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)

if not os.path.exists(INPUT):
    print(f"error: input composition not found at {INPUT}", file=sys.stderr)
    print("Write the composition HTML to that path before invoking this script.", file=sys.stderr)
    sys.exit(2)

cli = shutil.which("hyperframes")
cmd = [cli, "render", INPUT, "--output", OUTPUT] if cli else [
    "npx", "--yes", "hyperframes@0.4.37", "render", INPUT, "--output", OUTPUT,
]

print(f"$ {' '.join(cmd)}", flush=True)
result = subprocess.run(cmd, check=False)
sys.exit(result.returncode)
