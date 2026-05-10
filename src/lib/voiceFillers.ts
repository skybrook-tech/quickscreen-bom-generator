export const VOICE_FILLERS = [
  "umm",
  "um",
  "uhh",
  "uh",
  "like",
  "yeah",
  "you know",
  "so",
  "basically",
  "kind of",
  "sort of",
  "i guess",
  "i mean",
] as const;

export function stripVoiceFillers(input: string): string {
  let output = ` ${input} `;
  for (const filler of VOICE_FILLERS) {
    output = output.replace(new RegExp(`\\b${filler.replace(/\s+/g, "\\s+")}\\b`, "gi"), " ");
  }
  return output.replace(/\s+/g, " ").trim();
}
