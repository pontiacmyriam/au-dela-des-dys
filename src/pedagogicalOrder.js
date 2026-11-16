// Keep the existing recordings and exercises, but present them in a more
// predictable order. In particular, do not begin the phrase level with a
// difficult dictation before the child has had a chance to read a phrase.
const COMPLEX_GROUPS = [
  [4, 5, 6, 7],       // ou
  [0, 1, 2, 3],       // ch
  [8, 9],             // on
  [10, 11, 12, 13],  // an
  [14, 15, 16, 17],  // in
  [18, 19, 20],      // oi
  [33, 34, 35, 36],  // oi : révision
  [29, 30, 31, 32],  // eau
  [21, 22, 23, 24],  // gn
  [25, 26, 27, 28],  // ill
  [41, 42, 43, 44],  // ail
  [45, 46, 47, 48],  // eille / aille
  [37, 38, 39, 40],  // ouille
];

const ADVANCED_GROUPS = [
  [11, 12, 13, 14],  // l : révision
  [18, 19, 20, 21],  // v
  [3, 4, 5, 6],      // j
  [29, 30, 31, 32],  // z
  [15, 16, 17],      // qu
  [7, 8, 9, 10],     // k
  [0, 1, 2],         // h muet et mots complexes : plus tard
  [22, 23, 24, 25],  // w
  [26, 27, 28],      // x
  [33, 34, 35],      // ph
  [36, 37, 38],      // th
  [39, 40, 41],      // sc
  [42, 43, 44],      // gu
  [45, 46, 47],      // ge / gi
  [48, 49],          // tion
  [50, 51],          // un
  [52, 53, 54],      // im / ym
  [55, 56, 57],      // ien
  [58, 59, 60],      // ion
  [61, 62, 63],      // ien, suites
];

const WORD_GROUPS = [
  [0],
  [9, 10, 11],     // maman
  [12, 13, 14],    // ballon
  [6, 7, 8],       // lapin
  [5],             // pause / réécoute
  [17, 18],        // balai
  [15, 16],        // chanter
  [19, 20],        // jouer
  [21, 22],        // heureux
  [1, 2],          // igloo : groupes consonantiques
  [3, 4],          // yacht : graphie très irrégulière, tout à la fin
];

function arrangedGroups(items, groups) {
  if (!Array.isArray(items)) return [];
  const indices = groups.flat();
  if (new Set(indices).size !== indices.length ||
      indices.length !== items.length ||
      indices.some((index) => index >= items.length || index < 0)) {
    throw new Error('Invalid pedagogical sequence: exercises would be lost or duplicated');
  }
  return indices.map((index) => items[index]);
}

const wordCount = (item) => (item.texte || '').trim().split(/\s+/).length;

function orderedSentences(items) {
  if (!Array.isArray(items)) return [];
  const reads = items.filter((item) => /^Lis cette phrase/i.test(item.texte));
  const writes = items.filter((item) => /^Écris la phrase/i.test(item.texte));
  const other = items.filter((item) => !reads.includes(item) && !writes.includes(item));
  return [...reads.sort((a, b) => wordCount(a) - wordCount(b)),
    ...writes.sort((a, b) => wordCount(a) - wordCount(b)), ...other];
}

export function orderPedagogically(folder, items) {
  if (folder === 'sons_complexes') return arrangedGroups(items, COMPLEX_GROUPS);
  if (folder === 'sons_avances') return arrangedGroups(items, ADVANCED_GROUPS);
  if (folder === 'mots') return arrangedGroups(items, WORD_GROUPS);
  if (folder === 'phrases') return orderedSentences(items);
  if (folder === 'lecture_fluide') return [...(items || [])].sort((a, b) => wordCount(a) - wordCount(b));
  return items || [];
}
