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
  defis: "Défis",
  sons_avances: "Sons et combinaisons",
};

const FOLDER_ORDER = [
  "premiers_sons",
  "sons_simples",
  "sons_complexes",
  "mots",
  "phrases",
  "lecture_fluide",
  "defis",
  "sons_avances",
];

const INTRUS_DATA = {
  "challenge_001.mp3": ["bateau", "ballon", "chat"],
  "challenge_002.mp3": ["chien", "chat", "maison"],
  "challenge_003.mp3": ["soleil", "lune", "vélo"],
};

const INTRUS_ANSWER = {
  "challenge_001.mp3": "chat",
  "challenge_002.mp3": "maison",
  "challenge_003.mp3": "vélo",
};

const TAP_DATA = {
  "challenge_004.mp3": ["poule", "chat", "moulin", "fou"],
  "challenge_005.mp3": ["maman", "chat", "moto", "soleil"],
  "challenge_006.mp3": ["maman", "gant", "orange", "poule"],
};

const KEYWORDS = [
  "ENTOURE",
  "SOULIGNE",
  "RECOPIE",
  "COMPLETE",
  "COMPLÈTE",
  "ECRIS",
  "ÉCRIS",
  "LIS",
  "RELIE",
  "COLORIE",
  "BARRE",
  "OBSERVE",
  "CHERCHE",
  "OU",
  "ON",
  "AN",
  "CH",
  "GN",
  "EAU",
  "OI",
  "IN",
  "AI",
  "EU",
];

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
  return (text || "")
    .replace(/[•]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitScannerLines(text) {
  return (text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    .replace(/[«»"]/g, "")
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

function loadSavedFolder() {
  try {
    return localStorage.getItem("currentFolderKey") || null;
  } catch {
    return null;
  }
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(loadSavedFolder);
  const [progressMap, setProgressMap] = useState(loadProgressMap);
  const [completedFolder, setCompletedFolder] = useState(null);

  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [helpLevel, setHelpLevel] = useState(0);

  const [successWords, setSuccessWords] = useState(loadSuccessWords);
  const [feedback, setFeedback] = useState("");
  const [robotMood, setRobotMood] = useState("normal");
  const [showStar, setShowStar] = useState(false);

  const [screen, setScreen] = useState("home");
  const [avatar, setAvatar] = useState(localStorage.getItem("avatar") || null);

  const [readingStep, setReadingStep] = useState(false);
  const [readingTarget, setReadingTarget] = useState("");
  const [lastReadingChoice, setLastReadingChoice] = useState("");

  const [scannedImage, setScannedImage] = useState(null);
  const [scannedText, setScannedText] = useState("");
  const [scannerLines, setScannerLines] = useState([]);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("");
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

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
      setActiveLineIndex(-1);
      window.speechSynthesis.cancel();
    }
  }, [screen]);

  useEffect(() => {
    localStorage.setItem("progressByFolder", JSON.stringify(progressMap));
  }, [progressMap]);

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

  const item = items[index] || null;
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
    feedback.includes("réussi");

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

  function readText(text) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "fr-FR";
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
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
        "Impossible d’ouvrir la caméra. Vérifie l’autorisation caméra ou utilise le bouton d’import d’image."
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
      setScannerLines([]);
      setActiveLineIndex(-1);

      const result = await Tesseract.recognize(imageSource, "fra", {
        logger: (m) => {
          if (m.status) {
            setScannerStatus(
              m.status + (m.progress ? " " + Math.round(m.progress * 100) + "%" : "")
            );
          }
        },
      });

      const rawText = result?.data?.text || "";
      const cleanText = cleanOCRText(rawText);
      const lines = splitScannerLines(cleanText);

      setScannedText(cleanText);
      setScannerLines(lines);
      setScannerStatus(cleanText ? "Texte détecté." : "Aucun texte détecté.");
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
  }

  function speakScannerLines() {
    if (!scannerLines.length) {
      readText(scannedText);
      return;
    }

    window.speechSynthesis.cancel();

    scannerLines.forEach((line, i) => {
      const speech = new SpeechSynthesisUtterance(line);
      speech.lang = "fr-FR";
      speech.rate = 0.88;
      speech.onstart = () => setActiveLineIndex(i);
      speech.onend = () => {
        if (i === scannerLines.length - 1) {
          setActiveLineIndex(-1);
        }
      };
      window.speechSynthesis.speak(speech);
    });
  }

  function renderHighlightedLine(line) {
    if (!line) return null;

    let parts = [line];

    KEYWORDS.forEach((keyword) => {
      const regex = new RegExp("(" + escapeRegExp(keyword) + ")", "gi");
      parts = parts.flatMap((part) => {
        if (typeof part !== "string") return [part];
        return part.split(regex);
      });
    });

    return parts.map((part, idx) => {
      const matched = KEYWORDS.some(
        (keyword) => normalizeText(keyword) === normalizeText(part)
      );

      if (matched) {
        return (
          <span key={idx} style={styles.keyword}>
            {part}
          </span>
        );
      }

      return <span key={idx}>{part}</span>;
    });
  }

  function handleIntrusClick(word) {
    if (!item) return;

    if (word === INTRUS_ANSWER[item.audio]) {
      setFeedback("Bien joué !");
      setRobotMood("happy");
    } else {
      setFeedback("Essaie encore.");
      setRobotMood("think");
    }
  }

  function handleTapClick(word) {
    if (!item) return;
    const normalizedWord = normalizeText(word);

    if (item.audio === "challenge_004.mp3") {
      if (normalizedWord.includes("ou")) {
        setFeedback("Bien joué !");
        setRobotMood("happy");
      } else {
        setFeedback("Essaie encore.");
        setRobotMood("think");
      }
    }

    if (item.audio === "challenge_005.mp3") {
      if (normalizedWord.includes("m")) {
        setFeedback("Bien joué !");
        setRobotMood("happy");
      } else {
        setFeedback("Essaie encore.");
        setRobotMood("think");
      }
    }

    if (item.audio === "challenge_006.mp3") {
      if (normalizedWord.includes("an") || normalizedWord.includes("am")) {
        setFeedback("Bien joué !");
        setRobotMood("happy");
      } else {
        setFeedback("Essaie encore.");
        setRobotMood("think");
      }
    }
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
          👂 Entraînement
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

        <button
          style={{
            ...styles.sideTab,
            ...(active === "scanner" ? styles.sideTabActive : {}),
          }}
          onClick={() => setScreen("scanner")}
        >
          📷 Scanner
        </button>

        <div style={styles.sideDivider} />

        <div style={styles.sideSectionTitle}>Parcours</div>

        <div style={styles.folderTabs}>
          {folders.map((folder, i) => {
            const folderProgress = progressMap[folder.key] || 0;
            const isActive = currentFolder === folder.key && active === "exercise";

            return (
              <button
                key={folder.key}
                style={{
                  ...styles.folderTab,
                  ...(isActive ? styles.folderTabActive : {}),
                }}
                onClick={() => selectFolder(folder.key)}
              >
                <span>{i === 0 ? "👉" : "🎧"}</span>
                <span style={{ flex: 1 }}>{folder.label}</span>
                <span style={styles.folderProgressMini}>{folderProgress + 1}</span>
              </button>
            );
          })}
        </div>
      </aside>
    );
  }

  function renderAppShell(active, children) {
    return (
      <div style={styles.desktopPage}>
        <div style={styles.appFrame}>
          {renderSidebar(active)}
          <main style={styles.mainPanel}>{children}</main>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.desktopPage}>
        <div style={styles.loadingCard}>
          <h1>Au-delà des Dys</h1>
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div style={styles.desktopPage}>
        <div style={styles.avatarCard}>
          <h1 style={styles.avatarTitle}>Choisis ton robot</h1>

          <div style={styles.avatarGrid}>
            <button style={styles.avatarBtn} onClick={() => chooseAvatar("girl")}>
              <img src="/robots/robot_girl.png" alt="Robot fille" style={styles.avatarImg} />
              <span>Robot fille</span>
            </button>

            <button style={styles.avatarBtn} onClick={() => chooseAvatar("boy")}>
              <img src="/robots/robot_boy.png" alt="Robot garçon" style={styles.avatarImg} />
              <span>Robot garçon</span>
            </button>
          </div>
        </div>
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

  if (screen === "scanner") {
    return renderAppShell(
      "scanner",
      <div style={styles.contentCard}>
        <div style={styles.topHeader}>
          <div>
            <div style={styles.eyebrow}>Aide aux devoirs</div>
            <h1 style={styles.pageTitle}>📷 Scanner une consigne</h1>
          </div>
          <button style={styles.btnSecondarySmall} onClick={() => setScreen("home")}>
            ← Retour
          </button>
        </div>

        <p style={styles.scannerIntro}>
          Prends une photo de la consigne. L’application la lit à voix haute et met en évidence les mots importants.
        </p>

        {!cameraOpen && (
          <div style={styles.rowButtons}>
            <button style={styles.btn} onClick={openCamera}>
              📷 Ouvrir la caméra
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
                ✅ Prendre la photo
              </button>

              <button
                style={styles.btnSecondary}
                onClick={() => {
                  stopCamera();
                  setCameraOpen(false);
                }}
              >
                ✖️ Fermer la caméra
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {scannedImage && !cameraOpen && (
          <div style={{ marginTop: 20 }}>
            <img src={scannedImage} alt="scan" style={styles.scannedImage} />
          </div>
        )}

        {scannerLoading && (
          <div style={styles.scannerStatus}>
            ⏳ {scannerStatus || "Analyse en cours..."}
          </div>
        )}

        {!scannerLoading && scannerStatus && (
          <div style={styles.scannerStatus}>{scannerStatus}</div>
        )}

        {scannedText && (
          <>
            <div style={styles.rowButtons}>
              <button style={styles.btnSecondary} onClick={speakScannerLines}>
                🔊 Lire la consigne
              </button>

              <button style={styles.btnSecondary} onClick={() => readText(scannedText)}>
                🔁 Relire tout le texte
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <h3>Texte détecté :</h3>

              <div style={styles.scannerTextBox}>
                {(scannerLines.length ? scannerLines : [scannedText]).map((line, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.scannerLine,
                      ...(activeLineIndex === i ? styles.scannerLineActive : {}),
                      opacity:
                        activeLineIndex === -1 ? 1 : activeLineIndex === i ? 1 : 0.45,
                    }}
                  >
                    {renderHighlightedLine(line)}
                  </div>
                ))}
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
      <div style={styles.homeLayout}>
        <section style={styles.heroCard}>
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

          <div style={styles.quickGrid}>
            <button style={styles.quickCard} onClick={() => setScreen("words")}>
              <span style={styles.quickIcon}>⭐</span>
              <strong>Mes mots</strong>
              <small>{successWords.length} réussites</small>
            </button>

            <button style={styles.quickCard} onClick={() => setScreen("scanner")}>
              <span style={styles.quickIcon}>📷</span>
              <strong>Scanner</strong>
              <small>Aide à la lecture</small>
            </button>
          </div>
        </section>

        <section style={styles.trainingCard}>
          <div style={styles.topHeader}>
            <div>
              <div style={styles.eyebrow}>Parcours</div>
              <h2 style={styles.sectionTitle}>Choisis ton entraînement</h2>
            </div>
          </div>

          <div style={styles.folderGrid}>
            {folders.map((folder, i) => (
              <button
                key={folder.key}
                style={styles.folderChoice}
                onClick={() => {
                  setCurrentFolder(folder.key);
                  setIndex(progressMap[folder.key] || 0);
                  resetExerciseVisuals();
                  setScreen("exercise");
                }}
              >
                <span style={styles.folderChoiceIcon}>{i === 0 ? "👉" : "🎧"}</span>
                <span>
                  <strong>{folder.label || folder.key}</strong>
                  <small>Reprendre exercice {(progressMap[folder.key] || 0) + 1}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
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

          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: ${progressPercent}% }} />
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

          <div style={styles.mainInstructionText}>
            {getDisplayedInstruction(instructionText)}
          </div>

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

        {(INTRUS_DATA[item.audio] || (isIntruder && intruderWords.length > 0)) && (
          <div style={styles.choiceGrid}>
            {(INTRUS_DATA[item.audio] || intruderWords).map((word) => (
              <button key={word} onClick={() => handleIntrusClick(word)} style={styles.choiceBtn}>
                {word}
              </button>
            ))}
          </div>
        )}

        {TAP_DATA[item.audio] && (
          <div style={styles.choiceGrid}>
            {TAP_DATA[item.audio].map((word) => (
              <button key={word} onClick={() => handleTapClick(word)} style={styles.choiceBtn}>
                {word}
              </button>
            ))}
          </div>
        )}

        {isTap && !TAP_DATA[item.audio] && (
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

  heroCard: {
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4FFFB 100%)",
    borderRadius: 34,
    padding: 28,
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

  scannerLine: {
    padding: "9px 10px",
    borderRadius: 14,
    transition: "all 0.2s ease",
    marginBottom: 6,
  },

  scannerLineActive: {
    background: "#FFF8D9",
    boxShadow: "0 0 0 1px #FFD54F inset",
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
};