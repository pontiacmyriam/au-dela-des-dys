const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const app = fs.readFileSync(path.join(__dirname, '../src/App.js'), 'utf8');

test('a difficult self-assessed reading never advances automatically', () => {
  const handler = app.slice(app.indexOf('function handleReadingChoice(choice)'), app.indexOf('function goBackToMenu()'));
  assert.match(handler, /if \(choice === "difficult"\)\s*\{[\s\S]*?return;/);
  assert.match(handler, /setTimeout\(\(\) => next\(\), 500\)/);
  assert.match(app, /Je veux réessayer/);
});

test('new exercises depend on valid responses and folders unlock in sequence', () => {
  assert.match(app, /isQuiz && quizChoice !== item\.quiz\.correct/);
  assert.match(app, /isPassiveListening && !passiveRepeated/);
  assert.match(app, /completedSet\.has\(previousFolder\.key\)/);
  assert.match(app, /FREE_EXERCISE_COUNT = 22/);
});
