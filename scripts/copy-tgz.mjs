import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ajustá el destino para Mac:
const destDir = path.resolve(__dirname, "../../ng-libs-local");

// El tgz queda en el root del repo donde corrés npm pack
const repoRoot = path.resolve(__dirname, "..");
const tgzs = fs.readdirSync(repoRoot).filter(f => f.endsWith(".tgz"));

if (tgzs.length === 0) {
  console.error("No se encontró ningún .tgz (¿se ejecutó npm pack?).");
  process.exit(1);
}

// Tomamos el más reciente
tgzs.sort((a, b) => fs.statSync(path.join(repoRoot, b)).mtimeMs - fs.statSync(path.join(repoRoot, a)).mtimeMs);
const tgz = tgzs[0];

fs.mkdirSync(destDir, { recursive: true });

const src = path.join(repoRoot, tgz);
const dst = path.join(destDir, tgz);

fs.copyFileSync(src, dst);
console.log(`Copied: ${src} -> ${dst}`);