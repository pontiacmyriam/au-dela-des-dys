// Parcours pilote : réutilise uniquement des enregistrements existants,
// sans modifier le mot entendu. Validation orthophonique encore nécessaire.
export function buildIntroProgression(data) {
  function from(folder, texte, quiz) {
    const source = data?.[folder]?.find((item) => item.texte === texte);
    if (!source) throw new Error(`Activité audio introuvable : ${folder}/${texte}`);
    return quiz ? { ...source, quiz } : { ...source };
  }

  function generatedWord(word, quiz) {
    return {
      texte: quiz ? `Écoute le mot ${word}` : `Écris le mot ${word}`,
      dossier: 'quiz',
      audio: `${word}.mp3`,
      ...(quiz ? { quiz: {
        prompt: 'Écoute puis choisis le mot entendu.',
        correct: word,
        choices: [word, ...(['papa', 'ami', 'midi'].filter((other) => other !== word))],
      } } : {}),
    };
  }

  const sound = (folder, texte, correct, others) => from(folder, texte, {
    prompt: 'Écoute, puis touche ce que tu as entendu.',
    correct,
    choices: [correct, ...others],
  });

  return [
    sound('premiers_sons', 'a a a a', 'a', ['o', 'u']),
    sound('premiers_sons', 'o o o o', 'o', ['a', 'u']),
    sound('premiers_sons', 'u u u u', 'u', ['a', 'o']),
    sound('sons_simples', 'ma me mi mo mu', 'ma', ['pa', 'la']),
    sound('sons_simples', 'pa pe pi po pu', 'pa', ['ma', 'ra']),
    sound('sons_avances', 'la le li lo lu', 'la', ['ma', 'na']),
    sound('sons_simples', 'na ne ni no nu', 'na', ['la', 'ra']),
    sound('sons_simples', 'ra re ri ro ru', 'ra', ['pa', 'ma']),
    sound('sons_simples', 'da de di do du', 'da', ['ba', 'fa']),
    sound('sons_simples', 'fa fe fi fo fu', 'fa', ['da', 'sa']),
    sound('sons_simples', 'sa se si so su', 'sa', ['fa', 'ma']),
    // Révisions espacées, à écouter à nouveau avant de passer aux mots.
    sound('sons_simples', 'ma me mi mo mu', 'mi', ['si', 'li']),
    sound('sons_simples', 'pa pe pi po pu', 'po', ['mo', 'lo']),
    sound('sons_avances', 'la le li lo lu', 'lu', ['nu', 'ru']),
    sound('sons_simples', 'ra re ri ro ru', 'ri', ['li', 'mi']),
    sound('sons_simples', 'sa se si so su', 'so', ['fo', 'no']),
    sound('sons_simples', 'papa poule pain', 'papa', ['ami', 'midi']),
    from('sons_simples', 'Écris le mot papa'),
    generatedWord('ami', true),
    generatedWord('ami', false),
    generatedWord('midi', true),
    generatedWord('midi', false),
  ];
}

// Second stage: consolidate already acquired correspondences before introducing
// context-sensitive spellings (c/g), silent endings or long sentences. The
// single-syllable recordings are shared with the introductory stage.
export function buildSimpleProgression(data) {
  const listening = (folder, sourceText, syllable, distractors) => {
    const source = data?.[folder]?.find((entry) => entry.texte === sourceText);
    if (!source) throw new Error(`Missing audio for ${folder}/${sourceText}`);
    return {
      ...source,
      quiz: {
        prompt: 'Écoute, puis touche la syllabe entendue.',
        correct: syllable,
        choices: [syllable, ...distractors],
      },
    };
  };
  const word = (value, dictate = false) => ({
    texte: dictate ? `Écris le mot ${value}` : `Écoute le mot ${value}`,
    dossier: 'quiz',
    audio: `${value}.mp3`,
    ...(!dictate ? { quiz: {
      prompt: 'Écoute, puis touche le mot entendu.',
      correct: value,
      choices: [value, ...['papa', 'ami', 'midi'].filter((other) => other !== value)],
    } } : {}),
  });

  return [
    listening('sons_simples', 'ma me mi mo mu', 'mi', ['li', 'ri']),
    listening('sons_simples', 'pa pe pi po pu', 'po', ['so', 'mo']),
    listening('sons_avances', 'la le li lo lu', 'lu', ['nu', 'ru']),
    listening('sons_simples', 'ra re ri ro ru', 'ri', ['li', 'mi']),
    listening('sons_simples', 'sa se si so su', 'so', ['fo', 'po']),
    listening('sons_simples', 'na ne ni no nu', 'na', ['ma', 'la']),
    listening('sons_simples', 'da de di do du', 'di', ['mi', 'ri']),
    listening('sons_simples', 'fa fe fi fo fu', 'fa', ['sa', 'pa']),
    // Introduce /b/ explicitly before later words such as « bateau ».
    listening('sons_simples', 'ba bé bi bo bu', 'ba', ['pa', 'da']),
    word('papa'), word('papa', true),
    word('ami'), word('ami', true),
    word('midi'), word('midi', true),
  ];
}
