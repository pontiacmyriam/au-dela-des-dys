const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const names = ['a','o','u','ma','pa','la','na','ra','da','fa','sa','mi','po','lu','ri','so','papa','di','ami','midi'];
for (const name of names) {
  const file = path.join(__dirname, '../public/assets/audio/quiz', `${name}.mp3`);
  if (!fs.existsSync(file)) throw new Error(`Absent : ${file}`);
  const seconds = Number(execFileSync('ffprobe', [
    '-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file,
  ], { encoding: 'utf8' }).trim());
  if (!(seconds > 0.12 && seconds < 1.6)) throw new Error(`Durée anormale ${name}: ${seconds}`);
}
console.log(`${names.length} MP3 isolés présents et lisibles avec une durée plausible.`);
