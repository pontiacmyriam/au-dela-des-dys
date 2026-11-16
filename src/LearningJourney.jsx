import React from "react";
import "./premium.css";

const STEPS = [
  { icon: "🌱", title: "Les premiers sons", hint: "Je découvre et j'écoute", tone: "mint" },
  { icon: "🧩", title: "Les sons simples", hint: "Je relie les sons", tone: "peach" },
  { icon: "🎵", title: "Les sons complexes", hint: "Je joue avec les syllabes", tone: "lilac" },
  { icon: "📚", title: "Les mots", hint: "Je reconnais et j'écris", tone: "mint" },
  { icon: "✨", title: "Les phrases", hint: "Je construis du sens", tone: "peach" },
  { icon: "🚀", title: "Lecture fluide", hint: "Je lis à mon rythme", tone: "lilac" },
  { icon: "🌟", title: "Sons avancés", hint: "Je découvre de nouveaux défis", tone: "mint" },
];

export default function LearningJourney({ folders, unlockedFolders, completedFolders, onSelect }) {
  const unlocked = new Set(unlockedFolders.map((folder) => folder.key));
  const completed = new Set(completedFolders);
  const completedCount = folders.filter((folder) => completed.has(folder.key)).length;
  const upcoming = folders.find((folder) => unlocked.has(folder.key) && !completed.has(folder.key));
  const isAvailable = (folder) => unlocked.has(folder.key);
  return (
    <section className="ad-journey" aria-label="Mon chemin d'apprentissage">
      <div className="ad-journey-heading">
        <div>
          <p className="ad-kicker">MON AVENTURE</p>
          <h2>Mon chemin des découvertes</h2>
          <p>Chaque étape compte. Avance quand tu te sens prêt.</p>
        </div>
        <div className="ad-progress-bubble" aria-label={`${completedCount} niveaux terminés sur ${folders.length}`}>
          <strong>{completedCount}<span> / {folders.length}</span></strong>
          <small>étapes réussies</small>
        </div>
      </div>
      <div className="ad-progress-track" role="progressbar" aria-label="Niveaux terminés" aria-valuemin={0}
        aria-valuemax={folders.length} aria-valuenow={completedCount}>
        <div style={{ width: folders.length ? `${(completedCount / folders.length) * 100}%` : "0%" }} />
      </div>
      <div className="ad-journey-path">
        {folders.map((folder, index) => {
          const step = STEPS[index] || STEPS[0];
          const done = completed.has(folder.key);
          const available = isAvailable(folder);
          const next = upcoming?.key === folder.key;
          return (
            <button
              key={folder.key}
              type="button"
              className={`ad-journey-step ad-tone-${step.tone}${next ? " ad-next" : ""}${done ? " ad-done" : ""}`}
              disabled={!available}
              aria-label={`${step.title} : ${done ? "terminé" : available ? "accessible" : "à débloquer"}`}
              onClick={() => onSelect(folder.key)}
            >
              <span className="ad-step-orb" aria-hidden="true">{available ? step.icon : "🔒"}</span>
              <span className="ad-step-body">
                <span className="ad-step-number">ÉTAPE {index + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.hint}</small>
              </span>
              <span className="ad-step-state">{done ? "✓ Terminé" : available ? next ? "Continuer →" : "Découvrir →" : "Bientôt"}</span>
            </button>
          );
        })}
      </div>
      <p className="ad-journey-reassurance">💛 Ici, tu peux refaire une activité autant de fois que tu veux.</p>
    </section>
  );
}
