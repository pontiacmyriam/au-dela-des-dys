// Parcours pilote : réutilise uniquement des enregistrements existants,
// sans modifier le mot entendu. Validation orthophonique encore nécessaire.
export function buildIntroProgression(data) {
  function from(folder, texte, quiz) {
    const source = data?.[folder]?.find((item) => item.texte === texte);
    if (!source) throw new Error(`Activité audio introuvable : ${folder}/${texte}`);
    return quiz ? { ...source, quiz } : { ...source };
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
    sound('sons_simples', 'papa poule pain', 'papa', ['moto', 'lune']),
    from('sons_simples', 'Écris le mot papa'),
    sound('sons_simples', 'rat rose rue', 'rat', ['papa', 'lune']),
    from('sons_simples', 'Écris le mot rat'),
    sound('sons_avances', 'lune lapin lit', 'lune', ['papa', 'rat']),
    from('sons_avances', 'Écris le mot lune'),
  ];
}
