// Never present likely OCR artefacts as a trustworthy school instruction.
export function assessOCRQuality(text, confidence) {
  const value = String(text || "").trim();
  const words = value.match(/[A-Za-zÀ-ÿ]{2,}/g) || [];
  const codeTokens = value.match(/\b(?:[A-Z]{1,4}\d{1,4}|\d{1,4}[A-Z]{1,4})\b/g) || [];
  const validWordCount = words.filter((word) => !/\d/.test(word)).length;

  if (!value || validWordCount < 3 || codeTokens.length >= Math.max(2, validWordCount / 2)) {
    return { usable: false, reason: "Le texte paraît incomplet ou contient des codes illisibles." };
  }

  if (typeof confidence === "number" && confidence < 45) {
    return { usable: false, reason: "La photo n'est pas assez nette pour une lecture fiable." };
  }

  return { usable: true, reason: "" };
}
