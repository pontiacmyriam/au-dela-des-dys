import { assessOCRQuality } from "./ocrQuality";

test("rejette les codes OCR tels que ceux signalés par l'orthophoniste", () => {
  expect(assessOCRQuality("EV5 SS32 EV7", 75).usable).toBe(false);
});

test("rejette un texte à faible confiance", () => {
  expect(assessOCRQuality("Lis cette phrase puis souligne les mots.", 22).usable).toBe(false);
});

test("propose un texte plausible pour vérification humaine", () => {
  expect(assessOCRQuality("Lis cette phrase puis souligne les mots.", 87).usable).toBe(true);
});
