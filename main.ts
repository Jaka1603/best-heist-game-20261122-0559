// THE GILDED VAULT — the hand-in program.
// Node 22, standard library only. It takes the entry as it stands — the
// playable game under game/, the screenshots under screenshots/ — and
// lays both out in the output directory together with dossier.json, the
// summary the judge reads, built by the vendored make.fun library.
//
// The game itself needs no build step: game/index.html and its ES
// modules load in a desktop browser straight off disk, offline, with no
// library and no network request.
//
// Run it locally:
//   node serve.ts            then open http://localhost:8080 to play
//   node main.ts             writes /output (the grader's container)
//   MAKEFUN_OUTPUT_DIR=out node main.ts   writes out/ instead

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The directory this file lives in, and the output directory: /output
// inside the grader, or MAKEFUN_OUTPUT_DIR anywhere else.
const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy a directory when it exists; the game always does, the
// screenshots may be empty while the entry is still being shot.
function copyIfPresent(name) {
  const from = join(here, name);
  if (!existsSync(from)) return;
  cpSync(from, join(outDir, name), { recursive: true });
}

mkdirSync(outDir, { recursive: true });
copyIfPresent('game');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
copyIfPresent('screenshots');

// The scorer's caps, from the competition's own rules: at most four
// screenshots of 256 KiB each, at most 993 files and 48 MiB under game/,
// no game/ path longer than 1000 bytes, and the dossier text capped at
// 160 KiB.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
