import React, { useEffect, useMemo, useRef, useState } from "react";
import Tesseract from "tesseract.js";

const LABELS = {
  voyelles: "Voyelles",
  consonnes: "Consonnes",
  complement: "Sons complémentaires",
  diagrammes: "Diagrammes",
  sons_restants: "Sons restants",
  challenge_fluide: "Challenge fluide",
  lecture: "Lecture",
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

function normalizeText(s) {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isIntruderExercise(text) {
  return normalizeText(text).includes("trouve l'intrus");
}

function isTapExercise(text) {
  return normalizeText(text).includes("tape quand tu entends");
}

function extractWords(text) {
  const parts = text.split(".");
  if (parts.length < 2) return [];
  return parts[1]
    .replace(",", " ")
    .split(" ")
    .map((w) => w.trim())
    .filter(Boolean);
}

function isWriteInstruction(text) {
  const t = normalizeText(text);
  return t.includes("ecrit le mot") || t.includes("ecrit la phrase");
}

function isPhraseInstruction(text) {
  const t = normalizeText(text);
  return t.includes("ecrit la phrase");
}

function getDisplayedInstruction(text) {
  if (!text) return "";
  const t = normalizeText(text);
  if (t.includes("ecrit la phrase")) return "Écris la phrase";
  if (t.includes("ecrit le mot")) return "Écris le mot";
  return text;
}

function extractExpectedFromTexte(text) {
  const raw = (text || "").toString().trim();
  const parts = raw.split(/\s+/);
  if (parts.length <= 3) return "";
  return parts.slice(3).join(" ").trim();
}

function loadSuccessWords() {
  try {
    const saved = localStorage.getItem("successWords");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function splitScannerLines(text) {
  return (text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function cleanOCRText(text) {
  return (text || "")
    .replace(/[•]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [index, setIndex] = useState(
    Number(localStorage.getItem("progressIndex") || 0)
  );

  const [answer, setAnswer] = useState("");
  const [helpLevel, setHelpLevel] = useState(0);

  const encouragements = [
    "✓ Bravo !",
    "Super !",
    "Très bien !",
    "Tu progresses !",
    "Excellent !",
  ];

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
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    fetch("/prototype_vfinal.json")
      .then((r) => r.json())
      .then((json) => {
        setData(json);

        const keys = Object.keys(json || {});
        const list = keys.map((k) => ({
          key: k,
          label: LABELS[k] || k,
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

  const items = useMemo(() => {
    if (!data || !currentFolder) return [];
    return data[currentFolder] || [];
  }, [data, currentFolder]);

  const item = items[index] || null;
  const instructionText = item ? item.texte || "" : "";
  const needsWriting = isWriteInstruction(instructionText);
  const isPhrase = isPhraseInstruction(instructionText);

  const isIntruder = isIntruderExercise(instructionText);
const isTap = isTapExercise(instructionText);
const intruderWords = extractWords(instructionText);

  const expectedRaw = needsWriting ? extractExpectedFromTexte(instructionText) : "";
  const expectedNorm = normalizeText(expectedRaw);
  const answerNorm = normalizeText(answer);

  const audioPath =
    item && item.audio
      ? "/assets/audio/" + currentFolder + "/" + item.audio
      : "";

  const chooseAvatar = (type) => {
    setAvatar(type);
    localStorage.setItem("avatar", type);
    setScreen("home");
  };

  const startTraining = () => {
    if (!folders || folders.length === 0) return;
    setCurrentFolder(folders[0].key);
    setIndex(0);
    localStorage.setItem("progressIndex", "0");
    setAnswer("");
    setHelpLevel(0);
    setFeedback("");
    setRobotMood("normal");
    setShowStar(false);
    setReadingStep(false);
    setReadingTarget("");
    setLastReadingChoice("");
  };

  function checkAnswer() {
    if (!needsWriting || readingStep) return;

    if (answerNorm === expectedNorm) {
      const msg =
        encouragements[Math.floor(Math.random() * encouragements.length)];

      setFeedback(msg);
      setRobotMood("happy");
      setShowStar(true);
      setTimeout(() => setShowStar(false), 1200);

      const storedValue = isPhrase ? expectedRaw.split(" ")[0] : expectedRaw;
      const newWords = [...new Set([...successWords, storedValue])];
      setSuccessWords(newWords);
      localStorage.setItem("successWords", JSON.stringify(newWords));

      setReadingTarget(expectedRaw);
      setReadingStep(true);
      setLastReadingChoice("");
    } else {
      setFeedback("Ce n'est pas grave, réessaie 🙂");
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

  function next() {
    resetExerciseVisuals();

    if (index < items.length - 1) {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      localStorage.setItem("progressIndex", String(nextIndex));
    } else {
      setFeedback("🎉 Mission réussie !");
      setRobotMood("happy");
      setCurrentFolder(null);
      setIndex(0);
      localStorage.setItem("progressIndex", "0");
      setScreen("home");
    }
  }

  function handleReadingChoice(choice) {
    setLastReadingChoice(choice);
    setFeedback(
      choice === "success"
        ? "Bravo, on continue 👏"
        : "Ce n'est pas grave, tu continues très bien 🙂"
    );
    setTimeout(() => {
      next();
    }, 500);
  }

  function goBackToMenu() {
    setCurrentFolder(null);
    setIndex(0);
    resetExerciseVisuals();
    localStorage.setItem("progressIndex", "0");
    setScreen("home");
  }

  const readText = (text) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "fr-FR";
    speech.rate = 0.9;
    window.speechSynthesis.speak(speech);
  };

  const replayAudio = () => {
    const audio = document.querySelector("audio");
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
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
  };

  const capturePhoto = () => {
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
  };

  const runOCRFromImage = async (imageSource) => {
    try {
      setScannerLoading(true);
      setScannerStatus("Analyse de l’image en cours...");
      setScannedText("");
      setScannerLines([]);
      setActiveLineIndex(-1);

      const result = await Tesseract.recognize(imageSource, "fra", {
        logger: (m) => {
          if (m.status) {
           setScannerStatus(m.status + " " + (m.progress ? Math.round(m.progress * 100) + "%" : ""));
          }
        },
      });

      const cleanText = cleanOCRText(result?.data?.text || "");
      const lines = splitScannerLines(result?.data?.text || cleanText);

      setScannedText(cleanText);
      setScannerLines(lines);
      setScannerStatus(cleanText ? "Texte détecté." : "Aucun texte détecté.");
    } catch (err) {
      console.error("Erreur OCR :", err);
      setScannerStatus("Erreur pendant la lecture de l’image.");
    } finally {
      setScannerLoading(false);
    }
  };

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setScannedImage(imageUrl);
    await runOCRFromImage(file);
  };

  const speakScannerLines = () => {
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
  };

  const renderHighlightedLine = (line) => {
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
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <h1>Au-delà des Dys</h1>
        <p>Chargement...</p>
      </div>
    );
  }

  if (screen === "words") {
    const words = loadSuccessWords();

    return (
      <div style={styles.page}>
        <h2 style={styles.sectionTitle}>⭐ Mur des mots réussis</h2>

        {words.length === 0 && (
          <p style={styles.emptyText}>Aucun mot réussi pour l'instant.</p>
        )}

        <div style={{ marginTop: 30 }}>
          {words.map((w, i) => (
            <div key={i} style={styles.wordTag}>
              ⭐ {w}
            </div>
          ))}
        </div>

        <button style={styles.btn} onClick={() => setScreen("home")}>
          ← Retour
        </button>
      </div>
    );
  }

  if (screen === "scanner") {
    return (
      <div style={styles.page}>
        <h2 style={styles.sectionTitle}>📷 Scanner une consigne</h2>

        <div style={styles.card}>
          <p style={styles.scannerIntro}>
            Prends une photo de la consigne, puis laisse l’application la lire.
          </p>

          {!cameraOpen && (
            <>
              <button style={styles.btn} onClick={openCamera}>
                📷 Ouvrir la caméra
              </button>

              <label style={{ ...styles.btnSecondary, display: "block", textAlign: "center" }}>
                🖼️ Choisir une image
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageFile}
                  style={{ display: "none" }}
                />
              </label>
            </>
          )}

          {cameraError && <div style={styles.errorText}>{cameraError}</div>}

          {cameraOpen && (
            <div style={{ marginTop: 20 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={styles.video}
              />

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
                  ✖ Fermer la caméra
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

                <button
                  style={styles.btnSecondary}
                  onClick={() => readText(scannedText)}
                >
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
                          activeLineIndex === -1
                            ? 1
                            : activeLineIndex === i
                            ? 1
                            : 0.45,
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

        <button style={styles.btn} onClick={() => setScreen("home")}>
          ← Retour
        </button>
      </div>
    );
  }

  if (!avatar) {
    return (
      <div style={styles.page}>
        <h1 style={{ textAlign: "center" }}>Choisis ton robot</h1>

        <button style={styles.btn} onClick={() => chooseAvatar("girl")}>
          🤖 Robot fille
        </button>

        <button style={styles.btn} onClick={() => chooseAvatar("boy")}>
          🤖 Robot garçon
        </button>
      </div>
    );
  }

  if (!currentFolder) {
    return (
      <div style={styles.page}>
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <img
            src={
              avatar === "girl"
                ? "/robots/robot_girl.png"
                : "/robots/robot_boy.png"
            }
            alt="robot"
            style={{ width: 140 }}
          />
        </div>

        <h2 style={{ textAlign: "center", marginTop: 10 }}>Bonjour 👋</h2>

        <button style={styles.btn} onClick={startTraining}>
          🚀 Commencer mon entraînement
        </button>

        <button
          style={styles.btnSecondary}
          onClick={() => setScreen("words")}
        >
          ⭐ Voir mes mots réussis
        </button>

        <button
          style={styles.btnSecondary}
          onClick={() => setScreen("scanner")}
        >
          📷 Scanner une consigne
        </button>
      </div>
    );
  }

  let robotSrc = "/robots/robot_normal.png";
  if (robotMood === "happy") robotSrc = "/robots/robot_happy.png";
  if (robotMood === "think") robotSrc = "/robots/robot_think.png";

  const isPositiveFeedback =
    feedback.includes("Bravo") ||
    feedback.includes("Super") ||
    feedback.includes("Très bien") ||
    feedback.includes("Tu progresses") ||
    feedback.includes("Excellent") ||
    feedback.includes("on continue");

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={goBackToMenu}>
        ← Retour
      </button>

      <div style={styles.card}>
        <div style={{ textAlign: "center" }}>
          <img src={robotSrc} alt="robot" style={{ width: 120 }} />
          {showStar && <div style={{ fontSize: 40, marginTop: 8 }}>⭐</div>}
        </div>

        <h2>
          {needsWriting ? "✏️" : "👂"} {getDisplayedInstruction(instructionText)}
        </h2>

        {audioPath ? (
          <audio controls autoPlay src={audioPath} style={{ width: "100%" }} />
        ) : (
          <p>Aucun audio disponible.</p>
        )}

        <button style={{ marginTop: 10 }} onClick={replayAudio}>
          🎧 Réécouter
        </button>
 {isIntruder && intruderWords.length > 0 && (
  <div style={{ marginTop: 20 }}>
    {intruderWords.map((word, i) => (
      <button
        key={i}
        style={styles.btnSecondary}
        onClick={() => setFeedback("Bien joué !")}
      >
        {word}
      </button>
    ))}
  </div>
)}

{isTap && (
  <button
    style={{ ...styles.btn, marginTop: 20, fontSize: 22 }}
    onClick={() => setFeedback("Super !")}
  >
    👏 TAP
  </button>
)}

        {needsWriting && (
          <>
            <input
              style={{
                ...styles.input,
                ...(readingStep ? styles.inputSuccess : {}),
              }}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={readingStep}
            />

            {!readingStep && (
              <>
                <button style={styles.btnSecondary} onClick={checkAnswer}>
                  Valider
                </button>

                <button style={styles.btnSecondary} onClick={handleHelp}>
                  Je ne sais pas
                </button>
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

                <div style={styles.readingTarget}>
                  {readingTarget}
                </div>

                <p style={styles.readingHint}>
                  Quand tu as fini de lire, choisis :
                </p>

                <button
                  style={styles.btn}
                  onClick={() => handleReadingChoice("success")}
                >
                  👍 J’ai réussi
                </button>

                <button
                  style={styles.btnSecondary}
                  onClick={() => handleReadingChoice("difficult")}
                >
                  😕 C’était difficile
                </button>

                {lastReadingChoice && (
                  <div style={styles.readingMiniFeedback}>
                    {lastReadingChoice === "success"
                      ? "Super, on passe à la suite."
                      : "Pas grave, tu progresses quand même."}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {!needsWriting && (
          <button style={styles.btnSecondary} onClick={next}>
            Suivant
          </button>
        )}

        <div style={styles.successBox}>
          <h3>⭐ {successWords.length} mots réussis</h3>

          <div style={styles.successWordsWrap}>
            {successWords.map((word, i) => (
              <div key={i} style={styles.successWordChip}>
                {word}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: 20,
    maxWidth: 480,
    margin: "0 auto",
    fontFamily: "OpenDyslexic, Arial, sans-serif",
  },

  card: {
    background: "#fff",
    border: "1px solid #47E5BC",
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    boxShadow: "0 4px 14px rgba(63, 169, 245, 0.10)",
  },

  btn: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "none",
    background: "#47E5BC",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },

  btnSecondary: {
    width: "100%",
    padding: 12,
    marginTop: 10,
    borderRadius: 10,
    border: "none",
    background: "#3FA9F5",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },

  rowButtons: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 16,
  },

  input: {
    width: "100%",
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    border: "1px solid #ccc",
    fontSize: 18,
    boxSizing: "border-box",
  },

  inputSuccess: {
    border: "2px solid #4CAF50",
    background: "#F4FFF6",
    color: "#2E7D32",
    fontWeight: "bold",
  },

  feedback: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: "bold",
  },

  backBtn: {
    background: "none",
    border: "none",
    color: "#3FA9F5",
    cursor: "pointer",
    fontSize: 16,
  },

  sectionTitle: {
    textAlign: "center",
    marginTop: 10,
  },

  emptyText: {
    marginTop: 20,
    textAlign: "center",
  },

  scannerIntro: {
    marginTop: 0,
    marginBottom: 10,
    lineHeight: 1.5,
    textAlign: "center",
  },

  scannerText: {
    marginTop: 20,
    textAlign: "center",
    lineHeight: 1.5,
  },

  scannerTextBox: {
    background: "#F2F7FF",
    padding: 14,
    borderRadius: 12,
    fontSize: 18,
    lineHeight: 1.7,
  },

  scannerLine: {
    padding: "8px 10px",
    borderRadius: 10,
    transition: "all 0.2s ease",
    marginBottom: 6,
  },

  scannerLineActive: {
    background: "#FFF8D9",
    boxShadow: "0 0 0 1px #FFD54F inset",
  },

  scannerStatus: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    background: "#F8FBFF",
    border: "1px solid #D7E9FF",
    textAlign: "center",
    fontSize: 15,
  },

  scannedImage: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #ddd",
  },

  video: {
    width: "100%",
    borderRadius: 12,
    background: "#000",
  },

  keyword: {
    background: "#FFF3A3",
    borderRadius: 6,
    padding: "0 4px",
    fontWeight: "bold",
  },

  errorText: {
    marginTop: 14,
    color: "#D32F2F",
    fontWeight: "bold",
    textAlign: "center",
  },

  wordTag: {
    background: "#F2F7FF",
    padding: "14px",
    borderRadius: "14px",
    margin: "10px auto",
    marginBottom: "12px",
    fontSize: "22px",
    letterSpacing: "1px",
    textAlign: "center",
    fontWeight: "500",
    maxWidth: "400px",
  },

  successBox: {
    marginTop: 25,
    padding: 15,
    background: "#fff7d6",
    borderRadius: 12,
    border: "2px solid #ffd54f",
  },

  successWordsWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },

  successWordChip: {
    padding: "6px 12px",
    background: "#ffffff",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontWeight: "bold",
  },

  readingBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    background: "#F8FCFF",
    border: "1px solid #D9ECFF",
  },

  readingTarget: {
    marginTop: 10,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    background: "#FFFFFF",
    border: "1px solid #47E5BC",
    fontSize: 22,
    textAlign: "center",
    fontWeight: "bold",
    color: "#1E2A38",
  },

  readingHint: {
    textAlign: "center",
    marginBottom: 8,
  },

  readingMiniFeedback: {
    marginTop: 12,
    textAlign: "center",
    fontWeight: "bold",
    color: "#4A4A4A",
  },
};