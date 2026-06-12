// src/exerciseEngine.js

export const STEP_LISTEN = "listen";
export const STEP_READ = "read";
export const STEP_WRITE_WORD = "write_word";
export const STEP_WRITE_SENTENCE = "write_sentence";
export const STEP_CHALLENGE = "challenge";

export const DEFAULT_PROGRESS = {
  currentSoundIndex: 0,
  currentStepIndex: 0, // 0 listen, 1 read, 2 write_word, 3 write_sentence
  wordIndexInStep: 0, // used only for read step
  starsInCurrentSound: 0,
  exercisesSinceReview: 0,
  masteredSounds: [],
  masteredWords: [],
  helpLevel: 0, // 0 none, 1 first letter, 2 letter bank, 3 copy mode
  errorCount: 0,
  pendingChallengeSoundIndex: null,
  lastChallengeResult: null,
  sessionStarted: false,
};

export const STEP_ORDER = [
  STEP_LISTEN,
  STEP_READ,
  STEP_WRITE_WORD,
  STEP_WRITE_SENTENCE,
];

export function saveProgress(progress) {
  localStorage.setItem("audela-progress-v1", JSON.stringify(progress));
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem("audela-progress-v1");
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch (error) {
    console.error("Erreur chargement progression:", error);
    return { ...DEFAULT_PROGRESS };
  }
}

export function resetProgress() {
  localStorage.removeItem("audela-progress-v1");
  return { ...DEFAULT_PROGRESS };
}

export function normalizeText(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,!?;:()[\]{}"'`´’“-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLettersOnly(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-ZÀ-ÿœæ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareLetters(input = "", answer = "") {
  const cleanInput = normalizeLettersOnly(input);
  const cleanAnswer = normalizeLettersOnly(answer);

  const maxLen = Math.max(cleanInput.length, cleanAnswer.length);
  const result = [];

  for (let i = 0; i < maxLen; i += 1) {
    const actual = cleanInput[i] || "";
    const expected = cleanAnswer[i] || "";

    if (!expected && actual) {
      result.push({ index: i, status: "extra", expected, actual });
    } else if (actual === expected) {
      result.push({ index: i, status: "correct", expected, actual });
    } else {
      result.push({ index: i, status: "wrong", expected, actual });
    }
  }

  return result;
}

export function isPhraseAccepted(input = "", answer = "") {
  return normalizeText(input) === normalizeText(answer);
}

export function shouldTriggerRobotSurprise() {
  return Math.random() < 0.12;
}

export function getRobotSurprise() {
  const surprises = [
    { type: "blink", message: "Je suis avec toi." },
    { type: "jump", message: "On continue ?" },
    { type: "wave", message: "Tu travailles bien." },
  ];

  return surprises[Math.floor(Math.random() * surprises.length)];
}

/**
 * RAW JSON ADAPTER
 * Cette fonction essaie de convertir ton prototype_vfinal.json
 * vers une structure pédagogique unique.
 *
 * Elle est volontairement tolérante pour éviter de casser ton prototype.
 */
export function normalizePrototypeData(rawData) {
  if (!rawData) return [];

  // Si ton JSON contient déjà sounds: []
  if (Array.isArray(rawData.sounds)) {
    return rawData.sounds.map(normalizeSoundObject).filter(Boolean);
  }

  // Si ton JSON contient folders: []
  if (Array.isArray(rawData.folders)) {
    return rawData.folders
      .flatMap((folder, folderIndex) => normalizeFolder(folder, folderIndex))
      .filter(Boolean);
  }

  // Si c'est directement un tableau
  if (Array.isArray(rawData)) {
    return rawData.map(normalizeSoundObject).filter(Boolean);
  }

  return [];
}

function normalizeFolder(folder, folderIndex) {
  const folderName =
    folder?.name ||
    folder?.title ||
    folder?.folder ||
    "folder_" + (folderIndex + 1);

  const items =
    folder?.items ||
    folder?.sounds ||
    folder?.entries ||
    folder?.data ||
    [];

  return items.map((item, itemIndex) =>
    normalizeSoundObject(item, folderName, itemIndex)
  );
}

function normalizeSoundObject(item, folderName = "", itemIndex = 0) {
  if (!item) return null;

  const id =
    item.id ||
    item.soundId ||
    item.label ||
    item.title ||
    folderName + "_" + (itemIndex + 1);

  const soundLabel =
    item.label ||
    item.sound ||
    item.title ||
    item.name ||
    id;

  const listenAudio =
    item.listenAudio ||
    item.audio ||
    item.soundAudio ||
    item.mainAudio ||
    "";

  const readWordsRaw =
    item.readWords ||
    item.words ||
    item.examples ||
    item.reading ||
    [];

  const readWords = readWordsRaw
    .slice(0, 3)
    .map((w, index) => {
      if (typeof w === "string") {
        return { text: w, audio: "" };
      }

      return {
        text: w.text || w.word || w.label || "mot_" + (index + 1),
        audio: w.audio || w.wordAudio || "",
      };
    });

  while (readWords.length < 3) {
    readWords.push({
      text: soundLabel + "_" + (readWords.length + 1),
      audio: "",
    });
  }

  const writeWordObj =
    item.writeWord ||
    item.wordExercise ||
    item.write_word ||
    {};

  const writeSentenceObj =
    item.writeSentence ||
    item.sentenceExercise ||
    item.write_sentence ||
    {};

  const challengeObj = item.challenge || {};

  return {
    id,
    folderName,
    label: soundLabel,
    listen: {
      prompt: item.listenPrompt || "Écoute le son.",
      audio: listenAudio,
    },
    read: {
      prompt: item.readPrompt || "Lis le mot.",
      words: readWords,
    },
    writeWord: {
      prompt: writeWordObj.prompt || "Écris le mot.",
      answer:
        writeWordObj.answer ||
        item.word ||
        readWords[0]?.text ||
        "",
      audio: writeWordObj.audio || item.writeWordAudio || "",
    },
    writeSentence: {
      prompt: writeSentenceObj.prompt || "Écris la phrase.",
      answer:
        writeSentenceObj.answer ||
        item.phrase ||
        item.sentence ||
        "",
      audio: writeSentenceObj.audio || item.writeSentenceAudio || "",
    },
    challenge: {
      type: challengeObj.type || "intruder",
      prompt: challengeObj.prompt || "Trouve l’intrus.",
      choices:
        challengeObj.choices ||
        buildDefaultChallengeChoices(readWords, item),
      answer:
        challengeObj.answer ||
        buildDefaultChallengeAnswer(readWords, item),
      audio: challengeObj.audio || "",
    },
  };
}

function buildDefaultChallengeChoices(readWords, item) {
  const goodWords = readWords.map((w) => w.text);
  const fallbackIntruder =
    item.challengeIntruder ||
    item.intruder ||
    "soleil";

  return [...goodWords, fallbackIntruder].slice(0, 4);
}

function buildDefaultChallengeAnswer(readWords, item) {
  return (
    item.challengeAnswer ||
    item.intruder ||
    item.challengeIntruder ||
    "soleil"
  );
}

export function getCurrentStepType(progress) {
  if (
    progress.pendingChallengeSoundIndex !== null &&
    progress.pendingChallengeSoundIndex !== undefined
  ) {
    return STEP_CHALLENGE;
  }

  return STEP_ORDER[progress.currentStepIndex] || STEP_LISTEN;
}

export function getCurrentSound(sounds, progress) {
  const index =
    progress.pendingChallengeSoundIndex !== null &&
    progress.pendingChallengeSoundIndex !== undefined
      ? progress.pendingChallengeSoundIndex
      : progress.currentSoundIndex;

  return sounds[index] || null;
}

export function getCurrentExercise(sounds, progress) {
  const sound = getCurrentSound(sounds, progress);
  if (!sound) return null;

  const stepType = getCurrentStepType(progress);

  if (stepType === STEP_LISTEN) {
    return {
      type: STEP_LISTEN,
      soundId: sound.id,
      soundLabel: sound.label,
      prompt: sound.listen.prompt,
      audio: sound.listen.audio,
      stepIndex: progress.currentStepIndex,
      stars: progress.starsInCurrentSound,
    };
  }

  if (stepType === STEP_READ) {
    const word = sound.read.words[progress.wordIndexInStep] || sound.read.words[0];

    return {
      type: STEP_READ,
      soundId: sound.id,
      soundLabel: sound.label,
      prompt: sound.read.prompt,
      word: word?.text || "",
      audio: word?.audio || "",
      index: progress.wordIndexInStep,
      total: sound.read.words.length,
      stepIndex: progress.currentStepIndex,
      stars: progress.starsInCurrentSound,
    };
  }

  if (stepType === STEP_WRITE_WORD) {
    return {
      type: STEP_WRITE_WORD,
      soundId: sound.id,
      soundLabel: sound.label,
      prompt: sound.writeWord.prompt,
      answer: sound.writeWord.answer,
      audio: sound.writeWord.audio,
      helpLevel: progress.helpLevel,
      errorCount: progress.errorCount,
      stepIndex: progress.currentStepIndex,
      stars: progress.starsInCurrentSound,
    };
  }

  if (stepType === STEP_WRITE_SENTENCE) {
    return {
      type: STEP_WRITE_SENTENCE,
      soundId: sound.id,
      soundLabel: sound.label,
      prompt: sound.writeSentence.prompt,
      answer: sound.writeSentence.answer,
      audio: sound.writeSentence.audio,
      helpLevel: progress.helpLevel,
      errorCount: progress.errorCount,
      stepIndex: progress.currentStepIndex,
      stars: progress.starsInCurrentSound,
    };
  }

  if (stepType === STEP_CHALLENGE) {
    return {
      type: STEP_CHALLENGE,
      soundId: sound.id,
      soundLabel: sound.label,
      prompt: sound.challenge.prompt,
      choices: sound.challenge.choices,
      answer: sound.challenge.answer,
      audio: sound.challenge.audio,
      stars: 4,
    };
  }

  return null;
}

function addMasteredWord(progress, word) {
  const cleanWord = String(word || "").trim();
  if (!cleanWord) return progress;

  if (!progress.masteredWords.includes(cleanWord)) {
    progress.masteredWords = [...progress.masteredWords, cleanWord];
  }

  return progress;
}

function markSoundAsMastered(progress, soundIndex) {
  if (!progress.masteredSounds.includes(soundIndex)) {
    progress.masteredSounds = [...progress.masteredSounds, soundIndex];
  }
  return progress;
}

function goToNextMainStep(progress) {
  return {
    ...progress,
    currentStepIndex: progress.currentStepIndex + 1,
    starsInCurrentSound: progress.starsInCurrentSound + 1,
    helpLevel: 0,
    errorCount: 0,
    exercisesSinceReview: progress.exercisesSinceReview + 1,
    wordIndexInStep: 0,
  };
}

export function validateListenStep(progress) {
  const next = goToNextMainStep({ ...progress });
  saveProgress(next);
  return next;
}

export function validateReadStep(progress, sounds) {
  const currentSound = sounds[progress.currentSoundIndex];
  const totalWords = currentSound?.read?.words?.length || 3;

  if (progress.wordIndexInStep < totalWords - 1) {
    const next = {
      ...progress,
      wordIndexInStep: progress.wordIndexInStep + 1,
      helpLevel: 0,
      errorCount: 0,
    };
    saveProgress(next);
    return next;
  }

  const next = goToNextMainStep({ ...progress });
  saveProgress(next);
  return next;
}

export function validateWriteWordStep(progress, sounds, inputValue) {
  const currentSound = sounds[progress.currentSoundIndex];
  const answer = currentSound?.writeWord?.answer || "";

  const compare = compareLetters(inputValue, answer);
  const hasWrong = compare.some(
    (item) => item.status === "wrong" || item.status === "extra"
  );

  if (hasWrong) {
    const nextErrors = progress.errorCount + 1;

    let nextHelpLevel = progress.helpLevel;
    if (nextErrors >= 5) nextHelpLevel = 3;
    else if (nextErrors >= 4) nextHelpLevel = 2;
    else if (nextErrors >= 3) nextHelpLevel = 1;

    const next = {
      ...progress,
      errorCount: nextErrors,
      helpLevel: nextHelpLevel,
    };

    saveProgress(next);

    return {
      progress: next,
      success: false,
      compare,
      accepted: false,
      correctionText: answer,
      message: "Essaie encore.",
      showCorrection: nextHelpLevel >= 3,
    };
  }

  let next = goToNextMainStep({ ...progress });
  next = addMasteredWord(next, answer);

  saveProgress(next);

  return {
    progress: next,
    success: true,
    compare,
    accepted: true,
    correctionText: answer,
    message: "Bravo !",
    showCorrection: false,
  };
}

export function validateWriteSentenceStep(progress, sounds, inputValue) {
  const currentSound = sounds[progress.currentSoundIndex];
  const answer = currentSound?.writeSentence?.answer || "";

  const accepted = isPhraseAccepted(inputValue, answer);

  if (!accepted) {
    const nextErrors = progress.errorCount + 1;

    let nextHelpLevel = progress.helpLevel;
    if (nextErrors >= 5) nextHelpLevel = 3;
    else if (nextErrors >= 4) nextHelpLevel = 2;
    else if (nextErrors >= 3) nextHelpLevel = 1;

    const next = {
      ...progress,
      errorCount: nextErrors,
      helpLevel: nextHelpLevel,
    };

    saveProgress(next);

    return {
      progress: next,
      success: false,
      accepted: false,
      correctionText: answer,
      message: "Essaie encore.",
      showCorrection: nextHelpLevel >= 3,
    };
  }

  let next = goToNextMainStep({ ...progress });
  next.pendingChallengeSoundIndex = progress.currentSoundIndex;

  saveProgress(next);

  return {
    progress: next,
    success: true,
    accepted: true,
    correctionText: answer,
    message: "Bravo !",
    showCorrection: true,
  };
}

export function validateChallengeStep(progress, sounds, selectedChoice) {
  const soundIndex = progress.pendingChallengeSoundIndex;
  const sound = sounds[soundIndex];
  const goodAnswer = sound?.challenge?.answer || "";

  const success =
    normalizeText(selectedChoice) === normalizeText(goodAnswer);

  let next = { ...progress, lastChallengeResult: success };

  next = markSoundAsMastered(next, soundIndex);

  next.currentSoundIndex = soundIndex + 1;
  next.currentStepIndex = 0;
  next.wordIndexInStep = 0;
  next.starsInCurrentSound = 0;
  next.helpLevel = 0;
  next.errorCount = 0;
  next.pendingChallengeSoundIndex = null;

  saveProgress(next);

  return {
    progress: next,
    success,
    accepted: success,
    correctionText: goodAnswer,
    message: success ? "Super défi !" : "On continue ensemble.",
    showCorrection: !success,
  };
}

export function getHelpPayload(exercise, inputValue = "") {
  if (!exercise) return null;

  if (exercise.type === STEP_WRITE_WORD) {
    const answer = exercise.answer || "";

    if (exercise.helpLevel === 1) {
      return {
        type: "first_letter",
        value: answer.slice(0, 1),
      };
    }

    if (exercise.helpLevel === 2) {
      return {
        type: "letter_bank",
        value: shuffleArray(answer.split("")),
      };
    }

    if (exercise.helpLevel >= 3) {
      return {
        type: "copy_mode",
        value: answer,
      };
    }

    return null;
  }

  if (exercise.type === STEP_WRITE_SENTENCE) {
    const answer = exercise.answer || "";

    if (exercise.helpLevel === 1) {
      return {
        type: "first_letter",
        value: answer.slice(0, 1),
      };
    }

    if (exercise.helpLevel === 2) {
      return {
        type: "word_bank",
        value: shuffleArray(answer.split(" ")),
      };
    }

    if (exercise.helpLevel >= 3) {
      return {
        type: "copy_mode",
        value: answer,
      };
    }

    return null;
  }

  return null;
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}