import { create, all } from "https://esm.sh/mathjs@13";
const math = create(all);

function equalStrings(a, b) {
  return String(a) === String(b);
}

math.import({ equalStrings });

const ctx = {
  paling_style: 'butted',
};

try {
  console.log("equalStrings(paling_style, 'butted') =>", math.evaluate("equalStrings(paling_style, 'butted')", ctx));
  console.log("equalStrings(paling_style, 'lapped_capped') =>", math.evaluate("equalStrings(paling_style, 'lapped_capped')", ctx));
} catch (e) {
  console.error("failed:", e.message);
}
