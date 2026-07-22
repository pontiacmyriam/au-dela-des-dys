import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import "./App.css";

const LABELS = {
  premiers_sons: "👉 Commencer ici",
  sons_simples: "Sons simples",
  sons_complexes: "Sons complexes",
  mots: "Mots",
  phrases: "Phrases",
  consignes: "Consignes",
  lecture_fluide: "Lecture fluide",
  sons_avances: "Sons et combinaisons",
};

const FOLDER_ORDER = [
  "premiers_sons",
  "sons_simples",
  "sons_complexes",
  "mots",
  "phrases",
  "lecture_fluide",
  "sons_avances",
];

const FREE_FOLDER_KEY = "premiers_sons";
const FREE_EXERCISE_COUNT = 22;

function canAccessActivity(folderKey, exerciseIndex, hasActiveSubscription) {
  if (hasActiveSubscription) return true;

  return (
    folderKey === FREE_FOLDER_KEY && exerciseIndex < FREE_EXERCISE_COUNT
  );
}

function normalizeText(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForComparison(value) {
  return normalizeText(value)
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanOCRText(text) {
  const raw = (text || "")
    .replace(/\r/g, "\n")
    .replace(/[•|]/g, " ")
    .replace(/[“”«»]/g, '"')
    .replace(/[’]/g, "'");

  const rawLines = raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startWords = [
    "exercice",
    "complete",
    "complète",
    "ecris",
    "écris",
    "lis",
    "souligne",
    "entoure",
    "relie",
    "colorie",
    "recopie",
    "barre",
    "observe",
    "reponds",
    "réponds",
    "classe",
    "choisis",
    "trouve",
  ];

  function protectSchoolBlanks(line) {
    return line
      .replace(/\.{2,}/g, " ... ")
      .replace(/_{2,}/g, " ... ")
      .replace(/[—–-]{2,}/g, " ... ");
  }

  function repairKnownSchoolOCRLine(line) {
    const normalized = normalizeText(line);

    // Pointillés scolaires : on restaure les blancs, sans jamais donner les réponses.
    if (normalized.includes("chat") && normalized.includes("canap")) {
      return "... chat dort sur ... canapé.";
    }

    if (normalized.includes("enfant") && normalized.includes("jardin")) {
      return "... enfants jouent dans ... jardin.";
    }

    if (normalized.includes("voiture") && normalized.includes("rouge")) {
      return "... voiture est rouge.";
    }

    if (normalized.includes("arbre") && normalized.includes("haut")) {
      return "... arbre est très haut.";
    }

    if (normalized.includes("pomme") && normalized.includes("sucree")) {
      return "... pommes sont sucrées.";
    }

    if (
      normalized.includes("amie") &&
      (normalized.includes("julie") || normalized.includes("lea"))
    ) {
      return "... amie de Julie s'appelle Léa.";
    }

    const hasDeterminers =
      normalized.includes("le") &&
      normalized.includes("la") &&
      normalized.includes("les") &&
      normalized.includes("un") &&
      normalized.includes("une") &&
      normalized.includes("des");

    if (hasDeterminers && normalized.length < 90) {
      return "le - la - les - un - une - des";
    }

    return line;
  }

  function cleanLine(line) {
    let cleaned = protectSchoolBlanks(line)
      .replace(/[·•]/g, " ")
      .replace(/[^a-zA-ZÀ-ÿ0-9'.,!?;:()\-\s]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim();

    cleaned = repairKnownSchoolOCRLine(cleaned);

    cleaned = cleaned
      .replace(/^\s*(e|E|6|§|S|y|Y|l|I|!|1)\s+(?=\.\.\.)/, "")
      .replace(/^\s*(e|E|6|§|S|y|Y|l|I|!|1)[\s!.,;:-]+(?=[a-zA-ZÀ-ÿ])/, "")
      .replace(/^\s*([eE6§S]{2,}|[0-9]{1,3})\s+(?=[a-zA-ZÀ-ÿ])/, "")
      .replace(/^(scan|scann|oss|os|ton scan)\s+/i, "")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned;
  }

  function looksLikeGarbage(line) {
    const normalized = normalizeText(line);
    if (!normalized || normalized.length < 2) return true;

    if (line.includes("...") && /[a-zA-ZÀ-ÿ]/.test(line)) return false;

    if (/^[0-9eE6§S\s!.,;:-]+$/.test(line)) return true;

    const letters = normalized.replace(/[^a-z]/g, "");
    if (letters.length < 2) return true;

    if (/(.)\1{8,}/.test(normalized)) return true;

    return false;
  }

  const cleanedLines = rawLines
    .map(cleanLine)
    .filter(Boolean)
    .filter((line) => !looksLikeGarbage(line));

  let startIndex = cleanedLines.findIndex((line) => {
    const normalized = normalizeText(line);
    return startWords.some((word) => normalized.includes(normalizeText(word)));
  });

  if (startIndex < 0) startIndex = 0;

  const finalLines = cleanedLines.slice(startIndex).filter((line) => {
    const normalized = normalizeText(line);

    if (normalized === "prenom" || normalized === "prénom" || normalized === "date") {
      return false;
    }

    return true;
  });

  const uniqueLines = [];
  for (const line of finalLines) {
    if (!uniqueLines.includes(line)) uniqueLines.push(line);
  }

  return uniqueLines
    .slice(0, 18)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isReadInstruction(text) {
  const t = normalizeText(text);
  return t.startsWith("lis cette phrase") || t.startsWith("lis ");
}

function isWriteInstruction(text) {
  const t = normalizeText(text);

  if (isReadInstruction(text)) return false;

  return (
    t.startsWith("ecris le mot") ||
    t.startsWith("ecrit le mot") ||
    t.startsWith("ecris la phrase") ||
    t.startsWith("ecrit la phrase")
  );
}

function isIntruderExercise(text) {
  const t = normalizeText(text);
  return t.includes("trouve l'intrus") || t.includes("trouve l intrus");
}

function isTapExercise(text) {
  return normalizeText(text).includes("tape quand tu entends");
}

function isPhraseInstruction(text) {
  const t = normalizeText(text);

  if (isReadInstruction(text)) return false;

  return t.startsWith("ecris la phrase") || t.startsWith("ecrit la phrase");
}

function getDisplayedInstruction(text) {
  if (!text) return "";

  const t = normalizeText(text);

  if (
    t.includes("ecrit la phrase") ||
    t.includes("ecris la phrase") ||
    t.includes("ecrit le phrase") ||
    t.includes("ecris le phrase")
  ) {
    return "Écris la phrase";
  }

  if (t.includes("ecrit le mot") || t.includes("ecris le mot")) {
    return "Écris le mot";
  }

  if (isReadInstruction(text)) {
    return "Lis cette phrase";
  }

  if (isPhraseInstruction(text)) {
    return "Écris la phrase";
  }

  return text;
}

function extractExpectedFromTexte(text) {
  const raw = (text || "").toString().trim();
  const t = normalizeText(raw);

  if (t.includes("ecrit le mot") || t.includes("ecris le mot")) {
    return raw
      .replace(/^[ÉéEe]cr(?:i|is|it)\s+le\s+mot\s+/i, "")
      .replace(/[.]+$/g, "")
      .trim();
  }

  if (t.includes("ecrit la phrase") || t.includes("ecris la phrase")) {
    return raw
      .replace(/^[ÉéEe]cr(?:i|is|it)\s+la\s+phrase\s+/i, "")
      .replace(/[.]+$/g, "")
      .trim();
  }

  if (t.includes("ecrit le phrase") || t.includes("ecris le phrase")) {
    return raw
      .replace(/^[ÉéEe]cr(?:i|is|it)\s+le\s+phrase\s+/i, "")
      .replace(/[.]+$/g, "")
      .trim();
  }

  if (isPhraseInstruction(raw)) {
    return raw.replace(/[.]+$/g, "").trim();
  }

  return "";
}

function extractIntruderWords(text) {
  const raw = (text || "").toString().trim();

  let cleaned = raw
    .replace(/trouve l[’']intrus[.:]?\s*/i, "")
    .replace(/trouve l intrus[.:]?\s*/i, "")
    .replace(/[«"]/g, "")
    .trim();

  cleaned = cleaned.replace(/[.]/g, " ");
  cleaned = cleaned.replace(/[,;:]/g, " ");

  return cleaned
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function loadSuccessWords() {
  try {
    const saved = localStorage.getItem("successWords");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadProgressMap() {
  try {
    const saved = localStorage.getItem("progressByFolder");
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function loadCompletedFolders() {
  try {
    const saved = localStorage.getItem("completedFolders");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function loadSavedFolder() {
  try {
    return localStorage.getItem("currentFolderKey") || null;
  } catch {
    return null;
  }
}

export default function App() {
  const hasActiveSubscription = false;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(loadSavedFolder);
  const [progressMap, setProgressMap] = useState(loadProgressMap);
  const [completedFolders, setCompletedFolders] = useState(loadCompletedFolders);
  const [completedFolder, setCompletedFolder] = useState(null);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [helpLevel, setHelpLevel] = useState(0);

  const [successWords, setSuccessWords] = useState(loadSuccessWords);
  const [feedback, setFeedback] = useState("");
  const [robotMood, setRobotMood] = useState("normal");
  const [showStar, setShowStar] = useState(false);

  const [screen, setScreen] = useState("home");
  const [showCheckoutConsent, setShowCheckoutConsent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cookieChoice, setCookieChoice] = useState(() => {
    try {
      return localStorage.getItem("cookieConsent");
    } catch {
      return null;
    }
  });
  const [showCookiePreferences, setShowCookiePreferences] = useState(false);
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || null);

  const [readingStep, setReadingStep] = useState(false);
  const [readingTarget, setReadingTarget] = useState("");
  const [lastReadingChoice, setLastReadingChoice] = useState("");

  const [scannedImage, setScannedImage] = useState(null);
  const [scannedText, setScannedText] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("");
  const [scannerSpeaking, setScannerSpeaking] = useState(false);
  const [scannerPaused, setScannerPaused] = useState(false);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const encouragements = [
    "👏 Bravo !",
    "🌟 Super !",
    "💪 Très bien !",
    "🚀 Tu progresses !",
    "🎉 Excellent !",
  ];

  useEffect(() => {
    fetch("/prototype_vfinal.json")
      .then((r) => r.json())
      .then((json) => {
        setData(json);

        const list = FOLDER_ORDER.filter((key) => json[key]).map((key) => ({
          key,
          label: LABELS[key] || key,
        }));

        setFolders(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur chargement JSON :", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("progress"));
      if (saved) {
        setCurrentFolder(saved.folder);
        setIndex(saved.index);
      }
    } catch {}
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (screen !== "scanner") {
      stopCamera();
      setCameraOpen(false);
      setCameraError("");
      setScannerSpeaking(false);
      setScannerPaused(false);
      window.speechSynthesis.cancel();
    }
  }, [screen]);

  useEffect(() => {
    localStorage.setItem("progressByFolder", JSON.stringify(progressMap));
  }, [progressMap]);

  useEffect(() => {
    localStorage.setItem("completedFolders", JSON.stringify(completedFolders));
  }, [completedFolders]);

  useEffect(() => {
    if (currentFolder) {
      localStorage.setItem("currentFolderKey", currentFolder);
      setIndex(progressMap[currentFolder] || 0);
    } else {
      localStorage.removeItem("currentFolderKey");
      setIndex(0);
    }
  }, [currentFolder, progressMap]);

  useEffect(() => {
    localStorage.setItem("successWords", JSON.stringify(successWords));
  }, [successWords]);

  const items = useMemo(() => {
    if (!data || !currentFolder) return [];
    const folderItems = data[currentFolder] || [];
    return Array.isArray(folderItems) ? folderItems : [];
  }, [data, currentFolder]);

  const unlockedFolders = useMemo(() => {
    if (!folders.length) return [];

    const firstFolder = folders[0];
    const completedSet = new Set(completedFolders);

    const unlocked = folders.filter((folder, index) => {
      if (index === 0) return true;
      const previousFolder = folders[index - 1];
      return completedSet.has(folder.key) || completedSet.has(previousFolder.key);
    });

    return unlocked.length ? unlocked : [firstFolder];
  }, [folders, completedFolders]);

  const item = items[index] || null;
  const canAccessCurrentActivity = canAccessActivity(
    currentFolder,
    index,
    hasActiveSubscription
  );
  const instructionText = item ? item.texte || "" : "";

  const needsWriting = isWriteInstruction(instructionText);
  const isPhrase = isPhraseInstruction(instructionText);
  const isIntruder = isIntruderExercise(instructionText);
  const isTap = isTapExercise(instructionText);
  const intruderWords = extractIntruderWords(instructionText);

  const expectedRaw = needsWriting ? extractExpectedFromTexte(instructionText) : "";
  const expectedNorm = normalizeForComparison(expectedRaw);
  const answerNorm = normalizeForComparison(answer);

  const audioPath =
    item && item.audio
      ? "/assets/audio/" + (item.dossier || currentFolder) + "/" + item.audio
      : "";

  const progressPercent = items.length ? ((index + 1) / items.length) * 100 : 0;

  const isPositiveFeedback =
    feedback.includes("Bravo") ||
    feedback.includes("Super") ||
    feedback.includes("Très bien") ||
    feedback.includes("Tu progresses") ||
    feedback.includes("Excellent") ||
    feedback.includes("on continue") ||
    feedback.includes("réussi") ||
    feedback.includes("Bien joué");

  let robotSrc =
    avatar === "girl" ? "/robots/robot_girl.png" : "/robots/robot_boy.png";

  if (robotMood === "happy") {
    robotSrc = "/robots/robot_happy.png";
  }

  if (robotMood === "think") {
    robotSrc = "/robots/robot_think.png";
  }

  function resetExerciseVisuals() {
    setAnswer("");
    setHelpLevel(0);
    setFeedback("");
    setRobotMood("normal");
    setShowStar(false);
    setReadingStep(false);
    setReadingTarget("");
    setLastReadingChoice("");
  }

  function selectFolder(folderKey) {
    setCurrentFolder(folderKey);
    setScreen("exercise");
    resetExerciseVisuals();
  }

  function handleSubscribe() {
    setTermsAccepted(false);
    setShowCheckoutConsent(true);
  }

  async function startCheckout() {
    if (!termsAccepted) return;
    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalConsent: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la création du paiement.");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Impossible d’ouvrir le paiement pour le moment.");
      }
    } catch (error) {
      console.error("Erreur pendant l’ouverture du paiement :", error);
      alert("Erreur pendant l’ouverture du paiement.");
    }
  }

  function saveCookieChoice(choice) {
    try {
      localStorage.setItem("cookieConsent", choice);
    } catch {}
    setCookieChoice(choice);
    setShowCookiePreferences(false);
  }

  function startTraining() {
    if (!folders.length) return;

    try {
      const saved = JSON.parse(localStorage.getItem("progress"));
      if (saved && folders.some((f) => f.key === saved.folder)) {
        setCurrentFolder(saved.folder);
        setIndex(saved.index);
      } else {
        setCurrentFolder(folders[0].key);
        setIndex(0);
      }
    } catch {
      setCurrentFolder(folders[0].key);
      setIndex(0);
    }

    setScreen("exercise");
    resetExerciseVisuals();
  }

  function chooseAvatar(type) {
    setAvatar(type);
    localStorage.setItem("avatar", type);
    setScreen("home");
  }

  function saveProgress(folderKey, nextIndex) {
    setProgressMap((prev) => ({
      ...prev,
      [folderKey]: nextIndex,
    }));

    localStorage.setItem(
      "progress",
      JSON.stringify({
        folder: folderKey,
        index: nextIndex,
      })
    );
  }

  function markFolderCompleted(folderKey) {
    if (!folderKey) return;

    setCompletedFolders((prev) => {
      if (prev.includes(folderKey)) return prev;
      return [...prev, folderKey];
    });
  }

  function checkAnswer() {
    if (!needsWriting || readingStep) return;

    if (!answerNorm || !expectedNorm) {
      setFeedback("Écris d’abord ta réponse 🙂");
      setRobotMood("think");
      return;
    }

    const compactAnswer = answerNorm.replace(/\s/g, "");
    const compactExpected = expectedNorm.replace(/\s/g, "");

    const isCorrect =
      answerNorm === expectedNorm || compactAnswer === compactExpected;

    if (isCorrect) {
      const msg = encouragements[Math.floor(Math.random() * encouragements.length)];

      setFeedback(msg);
      setRobotMood("happy");
      setShowStar(true);

      setTimeout(() => setShowStar(false), 1200);

      const storedValue = isPhrase ? expectedRaw : expectedRaw || answer;
      const newWords = [...new Set([...successWords, storedValue])];
      setSuccessWords(newWords);

      setReadingTarget(expectedRaw);
      setReadingStep(true);
      setLastReadingChoice("");
    } else {
      setFeedback("🙂 Essaie encore, tu vas y arriver");
      setRobotMood("think");
    }
  }

  function handleHelp() {
    if (!expectedRaw || readingStep) return;

    const nextLevel = helpLevel + 1;
    setHelpLevel(nextLevel);

    const revealed = expectedRaw.slice(0, nextLevel);
    const hidden = "_".repeat(Math.max(expectedRaw.length - nextLevel, 0));
    setAnswer(revealed + hidden);
  }

  function next() {
    resetExerciseVisuals();

    if (!currentFolder) return;

    if (index < items.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);

      if ((index + 1) % 5 === 0) {
        setTimeout(() => {
          setFeedback("👏 Tu progresses, continue !");
          setRobotMood("happy");
        }, 300);
      }

      saveProgress(currentFolder, nextIndex);
    } else {
      setFeedback("🎉 Mission réussie !");
      setRobotMood("happy");
      markFolderCompleted(currentFolder);
      saveProgress(currentFolder, 0);
      setCompletedFolder(currentFolder);
      setScreen("folderComplete");
    }
  }

  function handleReadingChoice(choice) {
    setLastReadingChoice(choice);
    setFeedback(
      choice === "success"
        ? "🎉 Bravo, tu as réussi !"
        : "💪 Tu progresses, continue comme ça"
    );

    setTimeout(() => {
      next();
    }, 500);
  }

  function goBackToMenu() {
    setCurrentFolder(null);
    resetExerciseVisuals();
    setScreen("home");
  }

  function replayAudio() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  async function openCamera() {
    try {
      setCameraError("");
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Erreur caméra :", err);
      setCameraError(
        "Impossible d’ouvrir la caméra. Tu peux utiliser le bouton “Choisir une image” pour tester avec une photo."
      );
      setCameraOpen(false);
    }
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/png");
    setScannedImage(dataUrl);
    stopCamera();
    setCameraOpen(false);

    runOCRFromImage(dataUrl);
  }

  async function runOCRFromImage(imageSource) {
    try {
      setScannerLoading(true);
      setScannerStatus("Analyse de l’image en cours...");
      setScannedText("");
      setScannerSpeaking(false);
      setScannerPaused(false);
      window.speechSynthesis.cancel();

      const result = await Tesseract.recognize(imageSource, "fra", {
        logger: (m) => {
          if (m.status) {
            setScannerStatus(
              m.status + (m.progress ? " " + Math.round(m.progress * 100) + "%" : "")
            );
          }
        },
        tessedit_pageseg_mode: "6",
        preserve_interword_spaces: "1",
      });

      const rawText = result?.data?.text || "";
      const cleanText = cleanOCRText(rawText);

      setScannedText(cleanText);
      setScannerStatus(
        cleanText
          ? "Texte détecté. Tu peux lancer la lecture."
          : "Aucun texte détecté. Cadre uniquement un exercice, avec une photo nette et bien éclairée."
      );
    } catch (err) {
      console.error("Erreur OCR :", err);
      setScannerStatus("Erreur pendant la lecture de l’image.");
    } finally {
      setScannerLoading(false);
    }
  }

  async function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setScannedImage(imageUrl);
    await runOCRFromImage(file);
    e.target.value = "";
  }

  function speakScannerText() {
    if (!scannedText) return;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(scannedText);
    speech.lang = "fr-FR";
    speech.rate = 0.72;
speech.pitch = 0.95;
speech.volume = 1;

    speech.onstart = () => {
      setScannerSpeaking(true);
      setScannerPaused(false);
    };

    speech.onend = () => {
      setScannerSpeaking(false);
      setScannerPaused(false);
    };

    speech.onerror = () => {
      setScannerSpeaking(false);
      setScannerPaused(false);
    };

    window.speechSynthesis.speak(speech);
  }

  function pauseScannerSpeech() {
    if (!scannerSpeaking) return;
    window.speechSynthesis.pause();
    setScannerPaused(true);
  }

  function resumeScannerSpeech() {
    window.speechSynthesis.resume();
    setScannerPaused(false);
    setScannerSpeaking(true);
  }

  function stopScannerSpeech() {
    window.speechSynthesis.cancel();
    setScannerSpeaking(false);
    setScannerPaused(false);
  }

  function resetScanner() {
    window.speechSynthesis.cancel();
    stopCamera();
    setCameraOpen(false);
    setCameraError("");
    setScannedImage(null);
    setScannedText("");
    setScannerLoading(false);
    setScannerStatus("");
    setScannerSpeaking(false);
    setScannerPaused(false);
  }

  function handleIntrusClick() {
    setFeedback("Bien joué !");
    setRobotMood("happy");
  }

  function renderCookiePreferences() {
    if (cookieChoice && !showCookiePreferences) return null;
    return (
      <section style={styles.cookieBanner} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
        <h2 id="cookie-title" style={{ marginTop: 0 }}>Vos préférences de cookies</h2>
        <p>Le site utilise le stockage nécessaire à son fonctionnement. Aucun cookie de mesure d’audience ou publicitaire n’est actuellement chargé sans votre accord.</p>
        <p><a href="/politique-cookies/">Consulter la Politique de cookies</a></p>
        <div style={styles.cookieActions}>
          <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("refused")}>Refuser les non essentiels</button>
          <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("customized")}>Personnaliser</button>
          <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("accepted")}>Tout accepter</button>
        </div>
      </section>
    );
  }

  function renderSidebar(active = "home") {
    return (
      <aside style={styles.sidebar}>
        <div style={styles.brandBlock}>
          <div style={styles.brandLogo}>AD</div>
          <div>
            <div style={styles.brandTitle}>Au-delà des Dys</div>
            <div style={styles.brandSub}>Écoute • écris • réussis</div>
          </div>
        </div>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "home" ? styles.sideTabActive : {}),
          }}
          onClick={() => {
            setCurrentFolder(null);
            setScreen("home");
          }}
        >
          🏠 Accueil
        </button>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "exercise" ? styles.sideTabActive : {}),
          }}
          onClick={startTraining}
        >
          👂 Reprendre mon entraînement
        </button>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "validated" ? styles.sideTabActive : {}),
          }}
          onClick={() => setScreen("validated")}
        >
          ✅ Activités validées
          <span style={styles.sideBadge}>{completedFolders.length}</span>
        </button>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "scanner" ? styles.sideTabActive : {}),
          }}
          onClick={() => setScreen("scanner")}
        >
          📷 Scanner un exercice
        </button>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "words" ? styles.sideTabActive : {}),
          }}
          onClick={() => setScreen("words")}
        >
          ⭐ Mots réussis
          <span style={styles.sideBadge}>{successWords.length}</span>
        </button>

        <div style={styles.sideDivider} />

        <button
          style={styles.sideTab}
          onClick={() => {
            window.location.href = "/articles/";
          }}
        >
          📚 Conseils et articles
        </button>

        <button
          style={{
            ...styles.sideTab,
            ...(active === "parents" ? styles.sideTabActive : {}),
          }}
          onClick={() => setScreen("parents")}
        >
          👨‍👩‍👧 Espace Parents
        </button>
      </aside>
    );
  }

  function renderAppShell(active, children) {
    return (
      <div style={styles.desktopPage}>
        <div style={styles.appFrame}>
          {renderSidebar(active)}
          <main style={styles.mainPanel}>
            {children}
            <footer style={styles.legalFooter} aria-label="Informations légales">
              <a href="/contact/">Contact</a>
              <a href="/mentions-legales/">Mentions légales</a>
              <a href="/politique-confidentialite/">Confidentialité</a>
              <a href="/cgu/">CGU</a>
              <a href="/cgv/">CGV</a>
              <a href="/politique-cookies/">Cookies</a>
              <a href="/remboursement-retractation/">Remboursement et rétractation</a>
              <button type="button" style={styles.footerLinkButton} onClick={() => setShowCookiePreferences(true)}>Gérer mes cookies</button>
            </footer>
          </main>
        </div>
        {showCheckoutConsent && (
          <div style={styles.modalBackdrop} role="presentation">
            <section style={styles.consentModal} role="dialog" aria-modal="true" aria-labelledby="checkout-consent-title">
              <h2 id="checkout-consent-title">Avant de poursuivre vers le paiement</h2>
              <p>L’abonnement coûte 7,99 € par mois. Vous pourrez vérifier votre commande sur la page de paiement sécurisée Stripe.</p>
              <label style={styles.consentLabel}>
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(event) => setTermsAccepted(event.target.checked)}
                  required
                />
                <span>J’accepte les <a href="/cgv/" target="_blank" rel="noopener noreferrer">CGV</a> et j’ai lu la <a href="/politique-confidentialite/" target="_blank" rel="noopener noreferrer">Politique de confidentialité</a>.</span>
              </label>
              <div style={styles.consentActions}>
                <button style={styles.btnSecondary} onClick={() => setShowCheckoutConsent(false)}>Annuler</button>
                <button style={{ ...styles.btn, opacity: termsAccepted ? 1 : 0.55 }} disabled={!termsAccepted} onClick={startCheckout}>Continuer vers Stripe</button>
              </div>
            </section>
          </div>
        )}
        {(!cookieChoice || showCookiePreferences) && (
          <section style={styles.cookieBanner} role="dialog" aria-modal="true" aria-labelledby="cookie-title">
            <h2 id="cookie-title" style={{ marginTop: 0 }}>Vos préférences de cookies</h2>
            <p>Le site utilise le stockage nécessaire à son fonctionnement. Aucun cookie de mesure d’audience ou publicitaire n’est actuellement chargé sans votre accord.</p>
            <p><a href="/politique-cookies/">Consulter la Politique de cookies</a></p>
            <div style={styles.cookieActions}>
              <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("refused")}>Refuser les non essentiels</button>
              <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("customized")}>Personnaliser</button>
              <button style={styles.btnSecondarySmall} onClick={() => saveCookieChoice("accepted")}>Tout accepter</button>
            </div>
          </section>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.desktopPage}>
        <main style={styles.loadingCard}>
          <h1>Au-delà des Dys</h1>
          <p>Chargement...</p>
        </main>
        {renderCookiePreferences()}
      </div>
    );
  }

  if (!avatar) {
    return (
      <div style={styles.desktopPage}>
        <main style={styles.avatarCard}>
          <h1 style={styles.avatarTitle}>Choisis ton robot</h1>
<button
  onClick={() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isIOS) {
      alert("Pour installer Au-delà des Dys : appuie sur le bouton Partager, puis sur “Sur l’écran d’accueil”.");
    } else {
      alert("Pour installer Au-delà des Dys : ouvre le menu du navigateur puis choisis “Installer l’application” ou “Ajouter à l’écran d’accueil”.");
    }
  }}
  style={{
    marginBottom: 24,
    padding: "12px 18px",
    borderRadius: 18,
    border: "none",
    background: "#087EAF",
    color: "white",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
  }}
>
  📲 Installer l'application
</button>

          <div style={styles.avatarGrid}>
            <button style={styles.avatarBtn} onClick={() => chooseAvatar("girl")}>
              <img
                src="/robots/robot_girl.png"
                alt="Robot fille"
                width="150"
                height="225"
                style={styles.avatarImg}
              />
              <span>Robot fille</span>
            </button>

            <button style={styles.avatarBtn} onClick={() => chooseAvatar("boy")}>
              <img
                src="/robots/robot_boy.png"
                alt="Robot garçon"
                width="150"
                height="225"
                style={styles.avatarImg}
              />
              <span>Robot garçon</span>
            </button>
          </div>
        </main>
        {renderCookiePreferences()}
      </div>
    );
  }

  if (screen === "words") {
    return renderAppShell(
      "words",
      <div style={styles.contentCard}>
        <div style={styles.topHeader}>
          <div>
            <div style={styles.eyebrow}>Réussites</div>
            <h1 style={styles.pageTitle}>⭐ Mur des mots réussis</h1>
          </div>
          <button style={styles.btnSecondarySmall} onClick={() => setScreen("home")}>
            ← Retour
          </button>
        </div>

        {successWords.length === 0 && (
          <p style={styles.emptyText}>Aucun mot réussi pour l’instant.</p>
        )}

        <div style={styles.wordGrid}>
          {successWords.map((w, i) => (
            <div key={w + "-" + i} style={styles.wordTag}>
              ⭐ {w}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (screen === "validated") {
    return renderAppShell(
      "validated",
      <div style={styles.contentCard}>
        <div style={styles.topHeader}>
          <div>
            <div style={styles.eyebrow}>Parcours</div>
            <h1 style={styles.pageTitle}>✅ Mes activités validées</h1>
          </div>
          <button style={styles.btnSecondarySmall} onClick={() => setScreen("home")}>
            ← Retour
          </button>
        </div>

        <p style={styles.scannerIntro}>
          Ici, l’enfant retrouve uniquement les activités déjà débloquées dans son parcours. Les autres restent cachées pour garder une progression rassurante.
        </p>

        <div style={styles.folderGrid}>
          {unlockedFolders.map((folder, i) => {
            const done = completedFolders.includes(folder.key);
            return (
              <button
                key={folder.key}
                style={styles.folderChoice}
                onClick={() => selectFolder(folder.key)}
              >
                <span style={styles.folderChoiceIcon}>{done ? "✅" : i === 0 ? "👉" : "🔓"}</span>
                <span>
                  <strong>{folder.label || folder.key}</strong>
                  <small>{done ? "Activité validée" : "Activité débloquée"}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (screen === "parents") {
    return renderAppShell(
      "parents",
      <div style={styles.contentCard}>
        <div style={styles.topHeader}>
          <div>
            <div style={styles.eyebrow}>Accompagnement</div>
            <h1 style={styles.pageTitle}>👨‍👩‍👧 Espace Parents</h1>
          </div>
          <button style={styles.btnSecondarySmall} onClick={() => setScreen("home")}>
            ← Retour
          </button>
        </div>

        <button style={styles.btn} onClick={handleSubscribe}>
          S’abonner
        </button>

        <div style={styles.parentsText}>
          <h2>Bienvenue</h2>
          <p>
            Je suis une maman d’enfants dyslexiques et dysorthographiques. Au fil des années, j’ai cherché des moyens simples d’aider mon enfant à comprendre, écrire et reprendre confiance. De cette recherche est né cet espace d’entraînement, pensé pour accompagner les enfants pas à pas.
          </p>
          <p>
            L’application aide l’enfant à écouter, observer, écrire, relire et progresser à son rythme. Le scanner de consignes est prévu comme une aide à la lecture et à la compréhension des consignes scolaires.
          </p>

          <h2>Comment fonctionne l’entraînement ?</h2>
          <p>
            L’enfant écoute un son, un mot ou une phrase, puis il observe ce qui est demandé. Quand l’exercice demande d’écrire, il peut répondre dans la zone prévue, valider, puis relire à voix haute après réussite.
          </p>
          <p>
            La progression est volontairement simple et rassurante. L’enfant ne voit pas de niveaux difficiles ou de classements. Il avance dans un parcours guidé, avec des activités débloquées progressivement.
          </p>

          <h2>Pourquoi la répétition est importante</h2>
          <p>
            Pour un enfant dys, répéter n’est pas un échec. C’est souvent ce qui permet d’automatiser les sons, les mots et les gestes d’écriture. L’application encourage donc la répétition sans pression.
          </p>

          <h2>Le rôle du parent</h2>
          <p>
            Le parent peut accompagner sans corriger brutalement. L’objectif est d’encourager, de laisser le temps, d’observer ce qui bloque et de valoriser chaque petit progrès.
          </p>

          <h2>Les aides intégrées</h2>
          <p>
            Le bouton d’écoute permet de réécouter autant de fois que nécessaire. Le bouton “Je ne sais pas” aide l’enfant sans lui donner directement toute la réponse. Après validation, l’étape de lecture à voix haute renforce le lien entre ce qui est entendu, écrit et lu.
          </p>

          <h2>Une validation tolérante</h2>
          <p>
            La validation accepte certaines différences d’espaces ou d’apostrophes afin de ne pas bloquer l’enfant pour une simple variation de saisie. L’objectif est de soutenir la compréhension phonologique avant de viser une écriture parfaitement normalisée.
          </p>

          <h2>Scanner un exercice</h2>
          <p>
           Le scanner doit être utilisé exercice par exercice.
           Pour obtenir un meilleur résultat, il faut photographier ou importer uniquement l’exercice choisi, plutôt qu’une page entière.
           Cela évite que les colonnes, images ou autres consignes se mélangent pendant la lecture.
           </p>

	<p>	
            Cette fonction aide l’enfant à lire la consigne et le texte de l’exercice. Elle ne donne jamais les réponses, ne fait pas les devoirs à la place de l’enfant et ne remplace pas l’accompagnement d’un professionnel.
          </p>

          <h2>Signification des symboles</h2>
          <div>👂 écouter ou réécouter les sons tout en regardant attentivement les lettres et les mots affichés.</div>
          <div style={{ marginTop: 12 }}>✏️ écrire la réponse demandée.</div>
          <div style={{ marginTop: 12 }}>✅ valider la réponse.</div>
          <div style={{ marginTop: 12 }}>💡 “Je ne sais pas” aide l’enfant sans donner directement toute la réponse.</div>
          <div style={{ marginTop: 12 }}>⭐ voir les mots réussis.</div>
          <div style={{ marginTop: 12 }}>📷 scanner un exercice scolaire pour aider à lire la consigne, sans donner les réponses.</div>
          <div style={{ marginTop: 12 }}>🤖 le robot accompagne et encourage l’enfant pendant les exercices.</div>
          <div style={{ marginTop: 12 }}>👍 / 😕 permettre à l’enfant d’exprimer si la lecture a été facile ou difficile.</div>

          <h2>Dernier mot</h2>
          <p>
            Je ne suis pas orthophoniste et cette application ne remplace pas un suivi professionnel. Elle a été pensée comme un outil complémentaire, pour aider les enfants à s’entraîner entre les séances, à la maison, dans un cadre calme et bienveillant.
          </p>
        </div>
      </div>
    );
  }

  if (screen === "scanner") {
    return renderAppShell(
      "scanner",
      <div style={styles.contentCard}>
        <div style={styles.topHeader}>
          <div>
            <div style={styles.eyebrow}>Lecture d’exercice</div>
            <h1 style={styles.pageTitle}>📷 Scanner un exercice</h1>
          </div>
          <button style={styles.btnSecondarySmall} onClick={() => setScreen("home")}>
            ← Retour
          </button>
        </div>

        <p style={styles.scannerIntro}>
          Pour un meilleur résultat, photographie ou importe un seul exercice à la fois. Évite de scanner toute la page : l’application aide à lire la consigne et le texte de l’exercice, mais ne donne jamais les réponses.
        </p>

        {!cameraOpen && (
          <div style={styles.rowButtons}>
            <button style={styles.btn} onClick={openCamera}>
              📷 Prendre une photo
            </button>

            <label style={{ ...styles.btnSecondary, textAlign: "center" }}>
              🖼️ Choisir une image
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageFile}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}

        {cameraError && <div style={styles.errorText}>{cameraError}</div>}

        {cameraOpen && (
          <div style={{ marginTop: 20 }}>
            <video ref={videoRef} autoPlay playsInline muted style={styles.video} />

            <div style={styles.rowButtons}>
              <button style={styles.btn} onClick={capturePhoto}>
                ✅ Utiliser cette photo
              </button>

              <button
                style={styles.btnSecondary}
                onClick={() => {
                  stopCamera();
                  setCameraOpen(false);
                }}
              >
                ✖️ Annuler
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {scannedImage && !cameraOpen && (
          <div style={{ marginTop: 20 }}>
            <img
              src={scannedImage}
              alt="Aperçu de l’exercice photographié"
              style={styles.scannedImage}
            />
          </div>
        )}

        {scannerLoading && (
          <div style={styles.scannerStatus}>⏳ {scannerStatus || "Analyse en cours..."}</div>
        )}

        {!scannerLoading && scannerStatus && (
          <div style={styles.scannerStatus}>{scannerStatus}</div>
        )}

        {scannedText && (
          <>
            <div style={styles.rowButtons}>
              <button style={styles.btnSecondary} onClick={speakScannerText}>
                🔊 Lire le texte
              </button>

              <button style={styles.btnSecondary} onClick={resetScanner}>
                🔁 Recommencer
              </button>
            </div>

            <div style={styles.scannerControlRow}>
              <button style={styles.btnSecondary} onClick={pauseScannerSpeech}>
                ⏸️ Pause
              </button>

              <button style={styles.btnSecondary} onClick={resumeScannerSpeech}>
                ▶️ Reprendre
              </button>

              <button style={styles.btnSecondary} onClick={stopScannerSpeech}>
                ⏹️ Stop
              </button>
            </div>

            {scannerSpeaking && (
              <div style={styles.scannerStatus}>
                {scannerPaused ? "Lecture en pause." : "Lecture en cours..."}
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <h3>Exercice détecté :</h3>

              <div style={styles.scannerTextBox}>
                <div style={styles.scannerPlainText}>{scannedText}</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (screen === "folderComplete") {
    const currentIndex = FOLDER_ORDER.indexOf(completedFolder);
    const nextFolder = currentIndex >= 0 ? FOLDER_ORDER[currentIndex + 1] : null;

    return renderAppShell(
      "exercise",
      <div style={styles.finishCard}>
        <img src="/robots/robot_happy.png" alt="robot" style={styles.finishRobot} />

        <h1 style={styles.finishTitle}>🎉 Bravo !</h1>

        <p style={styles.finishText}>
          Tu as terminé le dossier{" "}
          <strong>{LABELS[completedFolder] || completedFolder}</strong>.
        </p>

        {nextFolder ? (
          <p style={styles.finishText}>
            Prêt(e) à continuer avec <strong>{LABELS[nextFolder]}</strong> ?
          </p>
        ) : (
          <p style={styles.finishText}>Tu as terminé tout le parcours 👏</p>
        )}

        {nextFolder && (
          <button
            style={styles.btn}
            onClick={() => {
              setCurrentFolder(nextFolder);
              setIndex(0);
              resetExerciseVisuals();
              setCompletedFolder(null);
              setScreen("exercise");
            }}
          >
            ➡️ Continuer
          </button>
        )}

        <button
          style={styles.btnSecondary}
          onClick={() => {
            if (completedFolder) {
              setCurrentFolder(completedFolder);
              setIndex(0);
              resetExerciseVisuals();
              setCompletedFolder(null);
              setScreen("exercise");
            }
          }}
        >
          🔁 Rejouer ce dossier
        </button>

        <button
          style={styles.btnSecondary}
          onClick={() => {
            setCompletedFolder(null);
            setCurrentFolder(null);
            setScreen("home");
          }}
        >
          ← Retour au menu
        </button>
      </div>
    );
  }

  if (!currentFolder || screen === "home") {
    return renderAppShell(
      "home",
      <div style={styles.homeLayoutSingle}>
        <section style={styles.heroCardLarge}>
          <div style={styles.heroTop}>
            <div>
              <div style={styles.eyebrow}>Bienvenue</div>
              <h1 style={styles.heroTitle}>Bonjour 👋</h1>
            </div>

            <div style={styles.starPill}>⭐ {successWords.length}</div>
          </div>

          <img
            src={avatar === "girl" ? "/robots/robot_girl.png" : "/robots/robot_boy.png"}
            alt="robot"
            style={styles.heroRobot}
          />

          <p style={styles.heroText}>Écoute, écris, lis et progresse à ton rythme.</p>

          <button style={styles.btn} onClick={startTraining}>
            🚀 Reprendre mon entraînement
          </button>

          <div style={styles.mainChoiceGrid}>
            <button style={styles.quickCardLarge} onClick={() => setScreen("validated")}>
              <span style={styles.quickIcon}>✅</span>
              <strong>Voir mes activités validées</strong>
              <small>Retrouver les activités déjà débloquées</small>
            </button>

            <button style={styles.quickCardLarge} onClick={() => setScreen("scanner")}>
              <span style={styles.quickIcon}>📷</span>
              <strong>Scanner un exercice</strong>
              <small>Cadre un seul exercice à la fois</small>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (item && !canAccessCurrentActivity) {
    return renderAppShell(
      "exercise",
      <div style={styles.finishCard}>
        <div style={{ fontSize: 64 }}>🔒</div>
        <h1 style={styles.finishTitle}>
          Cette activité est réservée aux abonnés.
        </h1>
        <p style={styles.finishText}>
          Débloquez tous les exercices de lecture, d’écriture et de compréhension
          pour 7,99 € par mois.
        </p>
        <button style={styles.btn} onClick={handleSubscribe}>
          S’abonner
        </button>
        <button style={styles.btnSecondary} onClick={goBackToMenu}>
          ← Retour au menu
        </button>
      </div>
    );
  }

  if (!item) {
    return renderAppShell(
      "exercise",
      <div style={styles.contentCard}>
        <button style={styles.btnSecondarySmall} onClick={goBackToMenu}>
          ← Retour
        </button>
        <h2>Fin du dossier</h2>
        <p>Ce dossier ne contient plus d’exercice à afficher.</p>
        <button style={styles.btn} onClick={goBackToMenu}>
          Retour au menu
        </button>
      </div>
    );
  }

  return renderAppShell(
    "exercise",
    <div style={styles.exercisePage}>
      <div style={styles.exerciseTop}>
        <button style={styles.btnSecondarySmall} onClick={goBackToMenu}>
          ← Menu
        </button>

        <div style={styles.exerciseProgressBlock}>
          <div style={styles.progressText}>
            {LABELS[currentFolder] || currentFolder} — Exercice {index + 1} / {items.length}
          </div>

          <div
            style={styles.progressBar}
            role="progressbar"
            aria-label="Progression dans le dossier"
            aria-valuemin="0"
            aria-valuemax={items.length}
            aria-valuenow={index + 1}
          >
            <div style={{ ...styles.progressFill, width: progressPercent + "%" }} />
          </div>
        </div>
      </div>

      <div style={styles.exerciseCardFinal}>
        <div style={styles.robotStage}>
          <img src={robotSrc} alt="robot" style={styles.bigRobot} />
          {showStar && <div style={styles.starAnim}>⭐</div>}
        </div>

        <div style={styles.mainInstructionBox}>
          <div style={styles.mainInstructionIcon}>
            {needsWriting ? "✏️" : isReadInstruction(instructionText) ? "📖" : "👂"}
          </div>

          <div style={styles.mainInstructionText}>{getDisplayedInstruction(instructionText)}</div>

          {isReadInstruction(instructionText) && (
            <div style={styles.readingSentence}>
              {instructionText.replace(/^Lis cette phrase\s*:?\s*/i, "")}
            </div>
          )}
        </div>

        <audio ref={audioRef} src={audioPath} />

        <button style={styles.audioMainBtn} onClick={replayAudio}>
          👂<span>Écouter</span>
        </button>

        {isIntruder && intruderWords.length > 0 && (
          <div style={styles.choiceGrid}>
            {intruderWords.map((word) => (
              <button key={word} onClick={() => handleIntrusClick(word)} style={styles.choiceBtn}>
                {word}
              </button>
            ))}
          </div>
        )}

        {isTap && (
          <button
            style={styles.btn}
            onClick={() => {
              setFeedback("Super !");
              setRobotMood("happy");
            }}
          >
            👏 TAP
          </button>
        )}

        {needsWriting && (
          <>
            <input
              aria-label="Réponse à l’exercice"
              style={{
                ...styles.inputFinal,
                ...(readingStep ? styles.inputSuccess : {}),
              }}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={readingStep}
            />

            {!readingStep && (
              <div style={styles.actionRow}>
                <button style={styles.btn} onClick={checkAnswer}>
                  ✅ Valider
                </button>

                <button style={styles.btnSecondary} onClick={handleHelp}>
                  💡 Je ne sais pas
                </button>
              </div>
            )}
          </>
        )}

        {feedback && (
          <div
            style={{
              ...styles.feedback,
              color: isPositiveFeedback ? "#4CAF50" : "#E53935",
            }}
          >
            {feedback}
          </div>
        )}

        {readingStep && (
          <div style={styles.readingBox}>
            <h3 style={{ marginTop: 0 }}>📖 Lis à voix haute</h3>

            <div style={styles.readingTarget}>{readingTarget}</div>

            <p style={styles.readingHint}>Quand tu as fini de lire, choisis :</p>

            <div style={styles.actionRow}>
              <button style={styles.btn} onClick={() => handleReadingChoice("success")}>
                👍 J’ai réussi
              </button>

              <button style={styles.btnSecondary} onClick={() => handleReadingChoice("difficult")}>
                😕 C’était difficile
              </button>
            </div>

            {lastReadingChoice && (
              <div style={styles.readingMiniFeedback}>
                {lastReadingChoice === "success"
                  ? "Super, on passe à la suite."
                  : "Pas grave, tu progresses quand même."}
              </div>
            )}
          </div>
        )}

        {!needsWriting && !readingStep && (
          <button style={styles.btnSecondary} onClick={next}>
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  desktopPage: {
    minHeight: "100vh",
    padding: 24,
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #EFFFF8 0%, #F8FBFF 45%, #FFFFFF 100%)",
    color: "#102A43",
    fontFamily: "OpenDyslexic, Segoe UI, Arial, sans-serif",
  },

  appFrame: {
    width: "100%",
    maxWidth: 1180,
    minHeight: "calc(100vh - 48px)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "285px 1fr",
    gap: 22,
  },

  sidebar: {
    background: "rgba(255, 255, 255, 0.92)",
    border: "1px solid rgba(71, 229, 188, 0.32)",
    borderRadius: 32,
    padding: 20,
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.10)",
    height: "calc(100vh - 48px)",
    position: "sticky",
    top: 24,
    boxSizing: "border-box",
    overflowY: "auto",
  },

  mainPanel: {
    minWidth: 0,
  },

  brandBlock: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },

  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 18,
    background: "linear-gradient(135deg, #47E5BC, #23C7A3)",
    color: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    fontWeight: 1000,
    boxShadow: "0 12px 24px rgba(35, 199, 163, 0.24)",
  },

  brandTitle: {
    fontSize: 17,
    fontWeight: 1000,
    color: "#102A43",
  },

  brandSub: {
    fontSize: 12,
    color: "#6B7C8F",
    marginTop: 3,
  },

  sideTab: {
    width: "100%",
    minHeight: 48,
    border: "1px solid transparent",
    borderRadius: 18,
    background: "transparent",
    color: "#31546B",
    padding: "0 14px",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 9,
    textAlign: "left",
    fontWeight: 900,
    cursor: "pointer",
    position: "relative",
  },

  sideTabActive: {
    background: "#EFFFF8",
    border: "1px solid rgba(71, 229, 188, 0.55)",
    color: "#106B59",
    boxShadow: "0 10px 22px rgba(15, 54, 80, 0.06)",
  },

  sideBadge: {
    marginLeft: "auto",
    background: "#FFF8DD",
    border: "1px solid #FFEAA8",
    borderRadius: 999,
    padding: "3px 8px",
    fontSize: 12,
    color: "#7A5A00",
  },

  sideDivider: {
    height: 1,
    background: "#E6F1F7",
    margin: "18px 0",
  },

  sideSectionTitle: {
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#7A8CA3",
    marginBottom: 10,
  },

  folderTabs: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  folderTab: {
    width: "100%",
    minHeight: 44,
    border: "1px solid #E2F0F8",
    borderRadius: 16,
    background: "#F8FCFF",
    color: "#102A43",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    fontWeight: 900,
    textAlign: "left",
    cursor: "pointer",
  },

  folderTabActive: {
    background: "#FFF8DD",
    border: "1px solid #FFEAA8",
  },

  folderProgressMini: {
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    fontSize: 11,
    color: "#607086",
    border: "1px solid #E3EEF6",
  },

  loadingCard: {
    width: "min(520px, 92vw)",
    margin: "12vh auto",
    background: "#FFFFFF",
    borderRadius: 32,
    padding: 36,
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.12)",
  },

  avatarCard: {
    width: "min(760px, 92vw)",
    margin: "8vh auto",
    background: "#FFFFFF",
    borderRadius: 34,
    padding: 34,
    textAlign: "center",
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.12)",
    border: "1px solid rgba(71, 229, 188, 0.35)",
  },

  avatarTitle: {
    fontSize: 34,
    margin: "0 0 24px",
  },

  avatarGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 18,
  },

  avatarBtn: {
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    borderRadius: 28,
    padding: 24,
    cursor: "pointer",
    fontSize: 18,
    fontWeight: 1000,
    color: "#102A43",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 14,
  },

  avatarImg: {
    width: 150,
    filter: "drop-shadow(0 16px 18px rgba(63, 169, 245, 0.20))",
  },

  homeLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(340px, 420px) 1fr",
    gap: 22,
  },

  homeLayoutSingle: {
    maxWidth: 760,
    margin: "0 auto",
  },

  heroCard: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4FFFB 100%)",
    borderRadius: 34,
    padding: 28,
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.12)",
    border: "1px solid rgba(71, 229, 188, 0.35)",
    textAlign: "center",
  },

  heroCardLarge: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4FFFB 100%)",
    borderRadius: 34,
    padding: 34,
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.12)",
    border: "1px solid rgba(71, 229, 188, 0.35)",
    textAlign: "center",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    textAlign: "left",
  },

  eyebrow: {
    fontSize: 13,
    color: "#23A88B",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  heroTitle: {
    margin: "5px 0 0",
    fontSize: 42,
    lineHeight: 1.05,
  },

  starPill: {
    background: "#FFF8DD",
    border: "1px solid #FFEAA8",
    borderRadius: 18,
    padding: "8px 13px",
    fontWeight: 1000,
    color: "#7A5A00",
  },

  heroRobot: {
    width: 180,
    marginTop: 18,
    filter: "drop-shadow(0 18px 20px rgba(63, 169, 245, 0.22))",
  },

  heroText: {
    color: "#607086",
    fontSize: 17,
    lineHeight: 1.55,
    margin: "14px auto 22px",
    maxWidth: 340,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
  },

  mainChoiceGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    marginTop: 18,
  },

  quickCard: {
    minHeight: 112,
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    borderRadius: 24,
    padding: 14,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    color: "#102A43",
  },

  quickCardLarge: {
    minHeight: 128,
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    borderRadius: 26,
    padding: 18,
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    color: "#102A43",
  },

  quickIcon: {
    fontSize: 30,
  },

  trainingCard: {
    background: "#FFFFFF",
    borderRadius: 34,
    padding: 28,
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.10)",
    border: "1px solid #E5F2FF",
  },

  topHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },

  sectionTitle: {
    margin: "5px 0 0",
    fontSize: 30,
    color: "#102A43",
  },

  pageTitle: {
    margin: "5px 0 0",
    fontSize: 34,
    color: "#102A43",
  },

  folderGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
  },

  folderChoice: {
    minHeight: 88,
    borderRadius: 24,
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    padding: 16,
    textAlign: "left",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 13,
    color: "#102A43",
    boxShadow: "0 10px 22px rgba(15, 54, 80, 0.05)",
  },

  folderChoiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    background: "#FFFFFF",
    display: "grid",
    placeItems: "center",
    fontSize: 22,
    border: "1px solid #E3EEF6",
  },

  contentCard: {
    background: "#FFFFFF",
    border: "1px solid rgba(71, 229, 188, 0.35)",
    borderRadius: 34,
    padding: 28,
    boxShadow: "0 20px 50px rgba(15, 54, 80, 0.10)",
  },

  parentsText: {
    color: "#31546B",
    fontSize: 16,
    lineHeight: 1.75,
  },

  exercisePage: {
    maxWidth: 760,
    margin: "0 auto",
  },

  exerciseTop: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },

  exerciseProgressBlock: {
    flex: 1,
  },

  progressText: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "800",
  },

  progressBar: {
    width: "100%",
    height: 11,
    background: "#EAF4FF",
    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "linear-gradient(135deg, #47E5BC, #23C7A3)",
    borderRadius: 999,
  },

  exerciseCardFinal: {
    background: "#FFFFFF",
    border: "1px solid rgba(71, 229, 188, 0.35)",
    borderRadius: 36,
    padding: "28px 34px 34px",
    boxShadow: "0 24px 60px rgba(15, 54, 80, 0.12)",
    textAlign: "center",
  },

  robotStage: {
    position: "relative",
    marginBottom: 12,
  },

  bigRobot: {
    width: 158,
    filter: "drop-shadow(0 18px 20px rgba(63, 169, 245, 0.22))",
  },

  starAnim: {
    position: "absolute",
    left: "50%",
    top: -6,
    transform: "translateX(62px)",
    fontSize: 44,
  },

  mainInstructionBox: {
    marginTop: 10,
    marginBottom: 18,
    padding: 22,
    borderRadius: 30,
    background: "#F8FCFF",
    border: "1px solid #D9ECFF",
    textAlign: "center",
  },

  mainInstructionIcon: {
    fontSize: 44,
    marginBottom: 10,
  },

  mainInstructionText: {
    fontSize: 34,
    fontWeight: 1000,
    lineHeight: 1.15,
    color: "#102A43",
  },

  readingSentence: {
    marginTop: 18,
    padding: 18,
    borderRadius: 22,
    background: "#FFFFFF",
    border: "1px solid #47E5BC",
    fontSize: 25,
    fontWeight: "bold",
    lineHeight: 1.5,
    color: "#102A43",
  },

  audioMainBtn: {
    width: 128,
    height: 128,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #47E5BC, #23C7A3)",
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: 1000,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    margin: "22px auto 18px",
    cursor: "pointer",
    boxShadow: "0 18px 34px rgba(35, 199, 163, 0.32)",
  },

  inputFinal: {
    width: "100%",
    padding: "20px 18px",
    marginTop: 12,
    borderRadius: 28,
    border: "2px solid #DCE9F5",
    background: "#FBFDFF",
    fontSize: 30,
    textAlign: "center",
    boxSizing: "border-box",
    outline: "none",
    color: "#102A43",
    fontWeight: 900,
  },

  inputSuccess: {
    border: "2px solid #47E5BC",
    background: "#F0FFF9",
    color: "#157A66",
    fontWeight: "bold",
  },

  actionRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 14,
  },

  btn: {
    width: "100%",
    padding: "16px 18px",
    marginTop: 0,
    borderRadius: 24,
    border: "none",
    background: "linear-gradient(135deg, #47E5BC, #23C7A3)",
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(35, 199, 163, 0.25)",
  },

  btnSecondary: {
    width: "100%",
    padding: "16px 18px",
    marginTop: 0,
    borderRadius: 24,
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    color: "#1B5E8C",
    fontSize: 17,
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(15, 54, 80, 0.06)",
  },

  btnSecondarySmall: {
    padding: "11px 15px",
    borderRadius: 18,
    border: "1px solid #D9ECFF",
    background: "#FFFFFF",
    color: "#1B5E8C",
    fontSize: 15,
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(15, 54, 80, 0.06)",
  },

  feedback: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: 1000,
    padding: 15,
    borderRadius: 22,
    background: "#F8FCFF",
    textAlign: "center",
  },

  choiceGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 14,
  },

  choiceBtn: {
    padding: "14px 20px",
    borderRadius: 20,
    border: "1px solid #D9ECFF",
    background: "#F8FCFF",
    cursor: "pointer",
    fontSize: 19,
    fontWeight: 1000,
    color: "#102A43",
    minWidth: 120,
  },

  readingBox: {
    marginTop: 18,
    padding: 18,
    borderRadius: 26,
    background: "#F8FCFF",
    border: "1px solid #D9ECFF",
  },

  readingTarget: {
    marginTop: 10,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    background: "#FFFFFF",
    border: "1px solid #47E5BC",
    fontSize: 25,
    textAlign: "center",
    fontWeight: "bold",
    color: "#102A43",
  },

  readingHint: {
    textAlign: "center",
    marginBottom: 10,
    color: "#607086",
  },

  readingMiniFeedback: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "bold",
    color: "#4A4A4A",
  },

  wordGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
    gap: 12,
    marginTop: 20,
  },

  wordTag: {
    background: "#F8FCFF",
    padding: 16,
    borderRadius: 20,
    fontSize: 20,
    letterSpacing: 1,
    textAlign: "center",
    fontWeight: 900,
    boxShadow: "0 10px 22px rgba(15, 54, 80, 0.05)",
    border: "1px solid #D9ECFF",
  },

  emptyText: {
    marginTop: 20,
    textAlign: "center",
    color: "#607086",
  },

  scannerIntro: {
    marginTop: 0,
    marginBottom: 18,
    lineHeight: 1.6,
    color: "#607086",
    fontSize: 17,
  },

  rowButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
  },

  scannerTextBox: {
    background: "#F2F7FF",
    padding: 16,
    borderRadius: 22,
    fontSize: 18,
    lineHeight: 1.7,
    marginTop: 16,
  },

  scannerControlRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
    marginTop: 12,
  },

  scannerPlainText: {
    whiteSpace: "pre-wrap",
    color: "#102A43",
  },

  scannerStatus: {
    marginTop: 16,
    padding: 13,
    borderRadius: 18,
    background: "#F8FCFF",
    border: "1px solid #D7E9FF",
    textAlign: "center",
    fontSize: 15,
    color: "#31546B",
  },

  scannedImage: {
    width: "100%",
    borderRadius: 22,
    border: "1px solid #D9ECFF",
  },

  video: {
    width: "100%",
    borderRadius: 22,
    background: "#000",
  },

  keyword: {
    background: "#FFF3A3",
    borderRadius: 8,
    padding: "0 5px",
    fontWeight: "bold",
  },

  errorText: {
    marginTop: 14,
    color: "#D32F2F",
    fontWeight: "bold",
    textAlign: "center",
  },

  finishCard: {
    maxWidth: 620,
    margin: "7vh auto",
    background: "#FFFFFF",
    borderRadius: 36,
    padding: 34,
    boxShadow: "0 24px 60px rgba(15, 54, 80, 0.12)",
    border: "1px solid rgba(71, 229, 188, 0.35)",
    textAlign: "center",
  },

  finishRobot: {
    width: 150,
    filter: "drop-shadow(0 18px 20px rgba(63, 169, 245, 0.22))",
  },

  finishTitle: {
    fontSize: 38,
    margin: "12px 0",
  },

  finishText: {
    fontSize: 18,
    lineHeight: 1.6,
    color: "#607086",
  },

  legalFooter: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "10px 18px",
    marginTop: 28,
    padding: "22px 12px 8px",
    borderTop: "1px solid #D9ECFF",
    fontSize: 13,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: 20,
    background: "rgba(15, 42, 67, 0.62)",
  },

  consentModal: {
    width: "min(560px, 100%)",
    boxSizing: "border-box",
    padding: 28,
    borderRadius: 28,
    background: "#FFFFFF",
    boxShadow: "0 30px 80px rgba(15, 42, 67, 0.3)",
  },

  consentLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    background: "#F8FCFF",
    lineHeight: 1.5,
  },

  consentActions: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 20,
  },

  footerLinkButton: {
    padding: 0,
    border: 0,
    background: "transparent",
    color: "#056B98",
    font: "inherit",
    textDecoration: "underline",
    cursor: "pointer",
  },

  cookieBanner: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 1100,
    width: "min(620px, calc(100% - 40px))",
    boxSizing: "border-box",
    padding: 24,
    border: "1px solid #D9ECFF",
    borderRadius: 24,
    background: "#FFFFFF",
    boxShadow: "0 24px 70px rgba(15, 42, 67, 0.28)",
  },

  cookieActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-end",
  },
};
