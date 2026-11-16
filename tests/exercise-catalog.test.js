const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/prototype_vfinal.json'), 'utf8'));

test('every catalog activity has a nonempty instruction and a playable MP3', () => {
  const missing = [];
  const paths = new Set();
  let count = 0;
  for (const [folder, activities] of Object.entries(catalog)) {
    assert.ok(activities.length > 0, `${folder} empty`);
    for (const activity of activities) {
      count += 1;
      assert.ok(activity.texte?.trim(), `${folder} has no instruction`);
      assert.match(activity.audio || '', /\.mp3$/i);
      const audioPath = path.join(root, 'public/assets/audio', activity.dossier || folder, activity.audio);
      if (!fs.existsSync(audioPath)) missing.push(audioPath);
      else paths.add(audioPath);
    }
  }
  assert.deepEqual(missing, []);
  assert.ok(count > 250, 'catalog unexpectedly shrank');

  const unusable = [];
  for (const audioPath of paths) {
    try {
      const duration = Number(execFileSync('ffprobe', [
        '-v', 'error', '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1', audioPath,
      ], { encoding: 'utf8' }).trim());
      if (!Number.isFinite(duration) || duration < 0.12 || duration > 90) unusable.push(audioPath);
    } catch { unusable.push(audioPath); }
  }
  assert.deepEqual(unusable, []);
});

test('introductory audio snippets are present, with realistic durations', () => {
  const quizFolder = path.join(root, 'public/assets/audio/quiz');
  const targets = ['a', 'o', 'u', 'ma', 'pa', 'la', 'na', 'ra', 'da', 'fa',
    'sa', 'mi', 'po', 'lu', 'ri', 'so', 'di', 'papa', 'ami', 'midi'];
  for (const target of targets) {
    const audioPath = path.join(quizFolder, `${target}.mp3`);
    assert.ok(fs.existsSync(audioPath), `missing ${target}`);
    const duration = Number(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', audioPath,
    ], { encoding: 'utf8' }).trim());
    assert.ok(duration > 0.12 && duration < 3, `invalid ${target} duration: ${duration}`);
  }
});
