// Technical QA of source recordings and isolated QCM clips.
// Correct pronunciation still requires a human listening check.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'public/prototype_vfinal.json'), 'utf8'));
const files = new Set();
for (const entries of Object.values(data)) {
  if (!Array.isArray(entries)) continue;
  for (const entry of entries) {
    if (entry.audio) files.add(path.join(root, 'public/assets/audio', entry.dossier || '', entry.audio));
  }
}
const isolated = ['a','o','u','ma','pa','la','na','ra','da','fa','sa','mi','po','lu','ri','so','papa','di','ami','midi','ba','rat','lune'];
for (const name of isolated) files.add(path.join(root, 'public/assets/audio/quiz', name + '.mp3'));
const errors = [];
let verified = 0;
for (const file of files) {
  if (!fs.existsSync(file)) {
    errors.push('Absent : ' + path.relative(root, file));
    continue;
  }
  const probe = spawnSync('ffprobe', ['-v','error','-show_entries','format=duration',
    '-of','default=noprint_wrappers=1:nokey=1',file], { encoding: 'utf8' });
  const duration = Number(probe.stdout.trim());
  if (probe.status !== 0 || !Number.isFinite(duration) || duration < 0.1) {
    errors.push('Illisible : ' + path.relative(root, file));
    continue;
  }
  if (file.includes(path.sep + 'quiz' + path.sep) && duration > 2) {
    errors.push('QCM non isolé : ' + path.relative(root, file));
  }
  verified++;
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(verified + ' fichiers audios décodables ; QCM de durée contrôlée.');
}
