export function normalizeSpelling(value) {
  return (value || '')
    .toString().trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function matchesSpelling(answer, expected) {
  if (!normalizeSpelling(answer) || !normalizeSpelling(expected)) return false;
  return normalizeSpelling(answer) === normalizeSpelling(expected);
}

// This is a phonological learning activity, not an orthography examination.
// Only familiar, reasonably unambiguous French grapheme equivalents are
// folded here. Do not accept arbitrary one-letter edits (chat != rat).
function phonologicalKey(word) {
  return normalizeSpelling(word)
    .replace(/ph/g, 'f')
    .replace(/eaux?(?=$|\s)/g, 'o')
    .replace(/eau/g, 'o')
    .replace(/au/g, 'o')
    .replace(/qu/g, 'k')
    .replace(/ck/g, 'k')
    .replace(/c(?=[aou])/g, 'k')
    .replace(/ss/g, 's')
    .replace(/e$/g, '');
}

export function assessSpelling(answer, expected) {
  const given = normalizeSpelling(answer);
  const target = normalizeSpelling(expected);
  if (!given || !target) return 'retry';
  if (given === target) return 'correct';

  const givenWords = given.split(' ');
  const targetWords = target.split(' ');
  if (givenWords.length !== targetWords.length) return 'retry';
  if (givenWords.every((word, i) => phonologicalKey(word) === phonologicalKey(targetWords[i]))) {
    return 'phonologically_correct';
  }
  return 'retry';
}

export function extractDictationTarget(instruction) {
  const raw = (instruction || '').toString().trim();
  const found = raw.match(/^Écris\s+(?:le\s+mot|la\s+phrase)\s+(.+)$/i);
  return found ? found[1].replace(/[.]+$/g, '').trim() : '';
}
