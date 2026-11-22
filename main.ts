// Rampok Museum — the hand-in program (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library, no
// network request). This program copies game/ and screenshots/ from beside
// this file into /output and writes /output/dossier.json, the summary the
// judge reads, using the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

copyTree(join(here, 'game'), join(outDir, 'game'));
if (existsSync(join(here, 'screenshots'))) {
  copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in
// all, or a path under game/ over 1000 bytes — game/ counts beside
// /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossierPath = join(outDir, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// Read the dossier back and make sure the hand-in is whole: the file must
// parse, and both the game and the screenshots must have landed in /output.
// A broken copy here would only surface in the grader, so fail loudly now.
const dossier = JSON.parse(readFileSync(dossierPath, 'utf8'));
const shotNames = existsSync(join(outDir, 'screenshots'))
  ? readdirSync(join(outDir, 'screenshots')).filter((n) => !n.startsWith('.'))
  : [];
if (!existsSync(join(outDir, 'game', 'index.html'))) throw new Error('game/index.html missing from /output');
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3-4 screenshots in /output, found ${shotNames.length}`);
}
console.log(
  `hand-in ready: game/ + ${shotNames.length} screenshot(s) + dossier.json ` +
    `(${statSync(dossierPath).size} bytes, ${Object.keys(dossier).length} top-level keys)`,
);
