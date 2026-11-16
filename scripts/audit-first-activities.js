const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/prototype_vfinal.json'), 'utf8'));
const firstActivities = data.premiers_sons.slice(0, 22);
const risks = [];

for (const [index, activity] of firstActivities.entries()) {
  const number = index + 1;
  const text = String(activity.texte || '');
  const audio = path.join(__dirname, '../public/assets/audio', activity.dossier || '', activity.audio || '');
  if (!fs.existsSync(audio) || !fs.statSync(audio).isFile()) {
    risks.push({ number, type: 'audio_missing', text });
  }
  if (/éléphant|enfant|forêt|uniforme|écureuil|fenêtre|père|chèvre|oiseau|orange/i.test(text)) {
    risks.push({ number, type: 'early_complex_vocabulary', text });
  }
  if (/^[a-zàâéèêîïôùûü]{1,2}(?:\s+[a-zàâéèêîïôùûü]{1,2})+$/i.test(text)) {
    risks.push({ number, type: 'passive_listening_without_response', text });
  }
}

console.log(JSON.stringify({ audited: firstActivities.length, risks }, null, 2));
if (process.argv.includes('--strict') && risks.length) process.exitCode = 1;
