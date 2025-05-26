
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function formatEFFRECACC(oreEff, rec, acc) {
  const h = Math.floor(oreEff / 60);
  const m = oreEff % 60;
  const effStr = (h > 0 ? h + "h" : "") + (m > 0 ? m + "m" : "");
  const parts = [`EFF ${effStr}`];
  if (rec > 0) parts.push(`REC ${rec} min`);
  if (acc > 0) parts.push(`ACC ${acc} min`);
  return parts.length ? "(" + parts.join(", ") + ")" : "";
}

function calcolaGiornata(tipo, IN1) {
  const pausa = 30;
  const ritardo = Math.max(0, IN1 - 540);
  const durata_teorica = tipo === "corta" ? 360 : 540;
  const uscita_stimata = IN1 + pausa + 361;

  let uscita_strategica, ore_eff_strategica, accumulo = 0;
  let stato = "green";
  let badge = "✅ BP";
  let suggerimento = "";

  if (tipo === "corta") {
    const accumulo_target = Math.min(29, 20 + ritardo);  // strategia desiderata
    const target_eff = 360 + accumulo_target;
    uscita_strategica = IN1 + pausa + target_eff;
    ore_eff_strategica = target_eff;
    accumulo = ore_eff_strategica - durata_teorica;

    suggerimento = "Esci alle " + minutesToTime(uscita_strategica) + " per accumulare " + accumulo + " minuti.";
    if (accumulo > 0) {
      stato = "yellow";
      badge = `↪︎ +${accumulo} min`;
    }
  } else {
    const uscita_normale = IN1 + pausa + durata_teorica;
    uscita_strategica = uscita_normale - 30;
    ore_eff_strategica = uscita_strategica - IN1 - pausa;
    if (uscita_stimata >= 1140) {
      stato = "red";
      badge = "⚠️ No BP";
      suggerimento = "Attenzione: orario oltre le 19:00. Inserisci recupero ore.";
    } else {
      if (ore_eff_strategica >= 510) {
        stato = "yellow";
        badge = "↪︎ -30 min";
        suggerimento = "Puoi anche uscire alle " + minutesToTime(uscita_normale) + " per non fare anticipo.";
      } else {
        suggerimento = "Buono pasto valido. Rispetta la pausa di 30 minuti.";
      }
    }
  }

  const ore_eff_stimata = uscita_stimata - IN1 - pausa;

  return {
    tipo,
    stato,
    badge,
    uscita_stimata: minutesToTime(uscita_stimata) + " " + formatEFFRECACC(ore_eff_stimata, ritardo, 0),
    uscita_strategica: minutesToTime(uscita_strategica) + " " + formatEFFRECACC(ore_eff_strategica, ritardo, accumulo),
    suggerimento
  };
}

function aggiornaRisultati() {
  const oraIngresso = document.getElementById('ora_ingresso').value;
  const tipoGiornata = document.getElementById('toggle_giornata').checked ? "lunga" : "corta";
  const labelToggle = document.getElementById('toggle_label');
  labelToggle.textContent = tipoGiornata.charAt(0).toUpperCase() + tipoGiornata.slice(1);

  if (!oraIngresso) {
    document.getElementById('output').innerHTML = "";
    return;
  }

  const IN1 = timeToMinutes(oraIngresso);
  const result = calcolaGiornata(tipoGiornata, IN1);

  const outputHTML = `
    <div class="result-card ${result.stato}">
      <div class="title">${tipoGiornata.charAt(0).toUpperCase() + tipoGiornata.slice(1)} <span>${result.badge}</span></div>
      <div class="time">🕓 Uscita per BP: ${result.uscita_stimata}</div>
      <div class="time">🎯 Uscita Strategica: ${result.uscita_strategica}</div>
      <div class="time">💡 ${result.suggerimento}</div>
    </div>
  `;

  document.getElementById('output').innerHTML = outputHTML;
}

document.getElementById('ora_ingresso').addEventListener('input', aggiornaRisultati);
document.getElementById('toggle_giornata').addEventListener('change', aggiornaRisultati);
window.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('ora_ingresso').value = `${hh}:${mm}`;
  aggiornaRisultati();
});
