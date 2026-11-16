import prototype from '../public/prototype_vfinal.json';
import { orderPedagogically } from './pedagogicalOrder';

test('all later-level exercises are retained without duplicates', () => {
  for (const folder of ['sons_complexes', 'sons_avances', 'mots', 'phrases', 'lecture_fluide']) {
    const originals = prototype[folder];
    const reordered = orderPedagogically(folder, originals);
    expect(reordered).toHaveLength(originals.length);
    expect(new Set(reordered).size).toBe(originals.length);
  }
});

test('short reading sentences precede phrase dictations', () => {
  const sentences = orderPedagogically('phrases', prototype.phrases);
  const firstWriting = sentences.findIndex((item) => /^Écris la phrase/.test(item.texte));
  expect(firstWriting).toBeGreaterThan(0);
  expect(sentences.slice(0, firstWriting).every((item) => /^Lis cette phrase/.test(item.texte))).toBe(true);
});

test('irregular words and advanced spellings come later', () => {
  const words = orderPedagogically('mots', prototype.mots);
  const yacht = words.findIndex((item) => /Écris le mot yacht/.test(item.texte));
  const maman = words.findIndex((item) => /Écris le mot maman/.test(item.texte));
  expect(yacht).toBeGreaterThan(maman);
  expect(orderPedagogically('sons_complexes', prototype.sons_complexes)[0].texte).toBe('ou');
});
