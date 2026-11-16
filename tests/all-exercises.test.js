const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/prototype_vfinal.json'), 'utf8'));
const folderOrder = ['premiers_sons', 'sons_simples', 'sons_complexes', 'mots',
  'phrases', 'lecture_fluide', 'sons_avances'];

async function accessibleExercises() {
  const { buildIntroProgression, buildSimpleProgression } = await import('../src/curatedProgression.js');
  const { orderPedagogically } = await import('../src/pedagogicalOrder.js');
  return folderOrder.flatMap((folder) => {
    const entries = folder === 'premiers_sons' ? buildIntroProgression(data)
      : folder === 'sons_simples' ? buildSimpleProgression(data)
        : orderPedagogically(folder, data[folder]);
    return entries.map((entry, index) => ({ ...entry, folder, index }));
  });
}

test('all 241 accessible activities retain audio and all interactive options are valid', async () => {
  const exercises = await accessibleExercises();
  assert.equal(exercises.length, 241);
  const errors = [];
  let quizzes = 0;
  for (const entry of exercises) {
    const prefix = `${entry.folder}#${entry.index + 1}`;
    const file = entry.quiz ? `quiz/${entry.quiz.correct}.mp3`
      : `${entry.dossier || entry.folder}/${entry.audio}`;
    if (!fs.existsSync(path.join(__dirname, '../public/assets/audio', file))) {
      errors.push(`${prefix}: missing ${file}`);
    }
    if (entry.quiz) {
      quizzes++;
      if (entry.quiz.choices.length !== 3 || new Set(entry.quiz.choices).size !== 3 ||
        !entry.quiz.choices.includes(entry.quiz.correct)) {
        errors.push(`${prefix}: invalid choice set`);
      }
    }
  }
  assert.deepEqual(errors, []);
  assert.equal(quizzes, 31);
});

test('the /b/ syllable is introduced before the word bateau', async () => {
  const exercises = await accessibleExercises();
  const baIndex = exercises.findIndex((entry) => entry.quiz?.correct === 'ba');
  const bateauIndex = exercises.findIndex((entry) => entry.texte === 'Écris le mot bateau');
  assert.ok(baIndex >= 0 && bateauIndex > baIndex);
  assert.ok(exercises.slice(0, baIndex).some((entry) => entry.quiz?.correct === 'pa'));
  assert.ok(exercises.slice(baIndex, bateauIndex).some((entry) => entry.texte === 'eau'));
});

test('every dictation rejects empty, incorrect and collapsed-space answers', async () => {
  const { matchesSpelling, extractDictationTarget } = await import('../src/spellingValidation.js');
  const exercises = await accessibleExercises();
  const dictations = exercises.filter((item) => /^Écris (?:le mot|la phrase)/i.test(item.texte));
  const errors = [];
  for (const entry of dictations) {
    const label = `${entry.folder}#${entry.index + 1}`;
    const answer = extractDictationTarget(entry.texte);
    if (!answer || !matchesSpelling(answer, answer) || matchesSpelling('', answer)) {
      errors.push(`${label}: cannot validate the correct answer`);
    }
    if (answer.includes(' ') && matchesSpelling(answer.replaceAll(' ', ''), answer)) {
      errors.push(`${label}: accepts missing word boundaries`);
    }
    if (matchesSpelling(`${answer}x`, answer)) {
      errors.push(`${label}: accepts wrong final letter`);
    }
  }
  assert.deepEqual(errors, []);
  assert.equal(dictations.length, 82);
});

test('catalog identifies passive activities as requiring human pedagogical review', async () => {
  const exercises = await accessibleExercises();
  const passive = exercises.filter((item) => !item.quiz &&
    !/^Écris (?:le mot|la phrase)|^Lis cette phrase/i.test(item.texte));
  assert.equal(passive.length, 68);
});

test('phonological spelling assessment is encouraging but preserves sound differences', async () => {
  const { assessSpelling } = await import('../src/spellingValidation.js');
  assert.equal(assessSpelling('MIDI', 'midi'), 'correct');
  assert.equal(assessSpelling('ecole', 'école'), 'correct');
  assert.equal(assessSpelling('bateau', 'bato'), 'phonologically_correct');
  assert.equal(assessSpelling('foto', 'photo'), 'phonologically_correct');
  assert.equal(assessSpelling('ami', 'amie'), 'phonologically_correct');
  assert.equal(assessSpelling('rat', 'chat'), 'retry');
  assert.equal(assessSpelling('rue', 'roue'), 'retry');
  assert.equal(assessSpelling('lechatdort', 'le chat dort'), 'retry');
  assert.equal(assessSpelling('', 'midi'), 'retry');
});

test('Stripe Checkout carries the verified session back to the application', () => {
  const checkoutSource = fs.readFileSync(path.join(__dirname, '../api/create-checkout-session.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');
  assert.match(checkoutSource, /paiement=success&session_id=\{CHECKOUT_SESSION_ID\}/);
  assert.match(appSource, /params\.get\("session_id"\)/);
  assert.match(checkoutSource, /VERCEL_ENV === 'preview'/);
});
