import prototype from '../public/prototype_vfinal.json';
import { buildIntroProgression } from './curatedProgression';

test('propose exactement 22 étapes et des questions sans doublons', () => {
  const activities = buildIntroProgression(prototype);
  expect(activities).toHaveLength(22);
  for (const activity of activities) {
    expect(activity.audio).toMatch(/\.mp3$/);
    if (activity.quiz) {
      expect(activity.quiz.choices).toContain(activity.quiz.correct);
      expect(new Set(activity.quiz.choices).size).toBe(activity.quiz.choices.length);
    }
  }
});

test('les premières activités n’imposent plus les mots les plus complexes signalés', () => {
  const texts = buildIntroProgression(prototype).slice(0, 16).map((item) => item.texte).join(' ');
  expect(texts).not.toMatch(/éléphant|enfant|forêt|uniforme|fenêtre/i);
});
