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

export function extractDictationTarget(instruction) {
  const raw = (instruction || '').toString().trim();
  const found = raw.match(/^Écris\s+(?:le\s+mot|la\s+phrase)\s+(.+)$/i);
  return found ? found[1].replace(/[.]+$/g, '').trim() : '';
}
