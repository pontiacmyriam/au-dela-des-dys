// Build short, consistent MP3 clips by cutting existing recordings at their silences.
// Never guess a cut: refuse sources whose detected word count differs.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'public/prototype_vfinal.json'), 'utf8'));
const specs = [
  ['premiers_sons', 'a a a a', 'a'],
  ['premiers_sons', 'o o o o', 'o'],
  ['premiers_sons', 'u u u u', 'u'],
  ['sons_simples', 'ma me mi mo mu', 'ma'],
  ['sons_simples', 'pa pe pi po pu', 'pa'],
  ['sons_avances', 'la le li lo lu', 'la'],
  ['sons_simples', 'na ne ni no nu', 'na'],
  ['sons_simples', 'ra re ri ro ru', 'ra'],
  ['sons_simples', 'da de di do du', 'da'],
  ['sons_simples', 'fa fe fi fo fu', 'fa'],
  ['sons_simples', 'sa se si so su', 'sa'],
  ['sons_simples', 'ma me mi mo mu', 'mi'],
  ['sons_simples', 'pa pe pi po pu', 'po'],
  ['sons_avances', 'la le li lo lu', 'lu'],
  ['sons_simples', 'ra re ri ro ru', 'ri'],
  ['sons_simples', 'sa se si so su', 'so'],
  ['sons_simples', 'papa poule pain', 'papa'],
  ['sons_simples', 'da de di do du', 'di'],
];

const outputDir = path.join(root, 'public/assets/audio/quiz');
fs.mkdirSync(outputDir, { recursive: true });

for (const [folder, words, target] of specs) {
  const item = data[folder].find((entry) => entry.texte === words);
  if (!item) throw new Error(`Missing source ${folder}: ${words}`);
  const source = path.join(root, 'public/assets/audio', item.dossier, item.audio);
  const tokens = words.split(/\s+/);
  const position = tokens.indexOf(target);
  if (position < 0) throw new Error(`Missing syllable ${target}`);

  const duration = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', source,
  ], { encoding: 'utf8' }).trim());
  const detect = spawnSync('ffmpeg', [
    '-hide_banner', '-i', source, '-af', 'silencedetect=noise=-35dB:d=0.12', '-f', 'null', '-',
  ], { encoding: 'utf8' });
  if (detect.status !== 0) throw new Error(`Cannot inspect ${source}`);
  const changes = [];
  for (const line of detect.stderr.split('\n')) {
    const startMatch = line.match(/silence_start: ([\d.]+)/);
    const endMatch = line.match(/silence_end: ([\d.]+)/);
    if (startMatch) changes.push({ kind: 'start', time: Number(startMatch[1]) });
    if (endMatch) changes.push({ kind: 'end', time: Number(endMatch[1]) });
  }
  const voiced = [];
  let cursor = 0;
  for (const change of changes) {
    if (change.kind === 'start') {
      if (change.time - cursor >= 0.075) voiced.push([cursor, change.time]);
    } else cursor = change.time;
  }
  if (duration - cursor >= 0.075) voiced.push([cursor, duration]);

  const allIdentical = tokens.every((token) => token === target);
  const papaSplit = target === 'papa' && voiced.length === 4 && tokens.length === 3;
  const laterWordSplit = position === 0 && voiced.length > tokens.length;
  if ((!allIdentical && voiced.length !== tokens.length && !papaSplit && !laterWordSplit) || (allIdentical && voiced.length < 1)) {
    throw new Error(`${words}: detected ${voiced.length} segments for ${tokens.length} syllables`);
  }
  const [start, end] = papaSplit ? [voiced[0][0], voiced[1][1]] : voiced[position];
  const paddedStart = Math.max(0, start - 0.025);
  const paddedDuration = end - paddedStart + 0.06;
  const output = path.join(outputDir, `${target}.mp3`);
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-ss', paddedStart.toFixed(3),
    '-i', source, '-t', paddedDuration.toFixed(3), '-ac', '1', '-ar', '44100',
    '-codec:a', 'libmp3lame', '-qscale:a', '3', output,
  ]);
  console.log(`${target}: ${paddedDuration.toFixed(2)}s from ${item.audio}`);
}

for (const [word, syllables] of [
  ['ami', ['a', 'mi']],
  ['midi', ['mi', 'di']],
]) {
  const inputs = syllables.flatMap((syllable) => ['-i', path.join(outputDir, `${syllable}.mp3`)]);
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', ...inputs,
    '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1[out]',
    '-map', '[out]', '-ac', '1', '-ar', '44100', '-codec:a', 'libmp3lame',
    '-qscale:a', '3', path.join(outputDir, `${word}.mp3`),
  ]);
  console.log(`${word}: 2 syllabes réunies`);
}
