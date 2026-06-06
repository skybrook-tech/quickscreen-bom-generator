import { readFileSync, writeFileSync } from "fs";

const path = "public/icons/glass-outlet-symbol-192.png";
const buffer = readFileSync(path);

// PNG IHDR width is at offset 16, height at offset 20
buffer.writeUInt32BE(192, 16);
buffer.writeUInt32BE(192, 20);

writeFileSync(path, buffer);
console.log("Patched PNG dimensions to 192x192");
