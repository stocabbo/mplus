
function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function formatEFFRECACC(oreEff, acc) {
  const h = Math.floor(oreEff / 60);
  const m = oreEff % 60;
  const effStr = (h > 0 ? h + "h" : "") + (m > 0 ? m + "m" : "");
  const parts = [`EFF ${effStr}`];
  if (acc > 0) parts.push(`ACC ${acc} min`);
  return parts.length ? "(" + parts.join(", ") + ")" : "";
}

function calcolaGiornata(tipo, IN1) {
  const pausa = 30;
  const ingresso = Math.max(IN1, 465); // minimo 07:45
  const durata_teorica = tipo === "corta" ? 360 : 540;
  const uscita_bp = ingresso + pausa + 361;

  let accumulo_dichiarato = tipo === "corta" ? 20 : 0;
  const ritardo = Math.max(0, IN1 - 540);
  if (tipo === "corta") accumulo_dichiarato += ritardo;

  const max_totale = 29;
  const accumulo_effettivo = Math.min(accumulo_dichiarato, max_totale);
  const target_eff = 360 + accumulo_effettivo;
  let uscita_strategica = ingresso + pausa + target_eff;
  let ore_eff_strategica = target_eff;

  let stato = "green";
  let badge = "✅ BP";
  let suggerimento = "";

  if (tipo === "corta") {
    if (uscita_strategica > 1170) {
      uscita_strategica = 1170;
      ore_eff_strategica = uscita_strategica - ingresso - pausa;
      const accumulo = Math.max(0, ore_eff_strategica - durata_teorica);
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = "La sede chiude alle 19:30. Accumulo limitato a " + accumulo + " min.";
    } else if (accumulo_dichiarato > max_totale) {
      const ecc = ore_eff_strategica - durata_teorica;
      stato = "yellow";
      badge = `↪︎ +${ecc} min`;
      suggerimento = "Limite massimo raggiunto (29 min). Accumulo ridotto.";
    } else {
      const ecc = ore_eff_strategica - durata_teorica;
      if (ecc > 0) {
        stato = "yellow";
        badge = `↪︎ +${ecc} min`;
        suggerimento = "Esci alle " + minutesToTime(uscita_strategica) + " per accumulare " + ecc + " minuti.";
      } else {
        suggerimento = "Buono pasto valido. Rispetta la pausa di 30 minuti.";
      }
    }
  } else {
    const uscita_normale = ingresso + pausa + durata_teorica;
    uscita_strategica = Math.min(uscita_normale - 30, 1170);
    ore_eff_strategica = uscita_strategica - ingresso - pausa;

    if (uscita_normale > 1170) {
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = "La sede chiude alle 19:30. Inserisci un recupero ore.";
    } else if (uscita_bp >= 1170) {
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = "La sede chiude alle 19:30. Inserisci un recupero ore.";
    } else if (ore_eff_strategica >= 510) {
      stato = "yellow";
      badge = "↪︎ -30 min";
      suggerimento = "Puoi anche uscire alle " + minutesToTime(uscita_normale) + " per non fare anticipo.";
    } else {
      suggerimento = "Buono pasto valido. Rispetta la pausa di 30 minuti.";
    }
  }

  const ore_eff_bp = uscita_bp - ingresso - pausa;

  return {
    tipo,
    stato,
    badge,
    uscita_stimata: minutesToTime(uscita_bp) + " " + formatEFFRECACC(ore_eff_bp, 0),
    uscita_strategica: minutesToTime(uscita_strategica) + " " + formatEFFRECACC(ore_eff_strategica, Math.max(0, ore_eff_strategica - durata_teorica)),
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
  const oraStrategica = estraiOrario(result.uscita_strategica);
  if (oraStrategica) startCountdown(oraStrategica);
}

document.getElementById('ora_ingresso').addEventListener('input', aggiornaRisultati);
document.getElementById('toggle_giornata').addEventListener('change', aggiornaRisultati);
window.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
  const urlParams = new URLSearchParams(window.location.search);
  const paramOra = urlParams.get("ora");
  const oraInput = document.getElementById('ora_ingresso');
  if (paramOra && /^\d{2}:\d{2}$/.test(paramOra)) {
    oraInput.value = paramOra;
  } else {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    oraInput.value = `${hh}:${mm}`;
  }
  aggiornaRisultati();
});

let countdownInterval;

function startCountdown(orarioTarget) {
  clearInterval(countdownInterval);
  const countdownEl = document.getElementById("countdown");

  function updateCountdown() {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [hh, mm] = orarioTarget.split(":").map(Number);
    const targetMin = hh * 60 + mm;
    const diffSec = (targetMin - nowMin) * 60 - now.getSeconds();

    if (diffSec <= 0) {
      countdownEl.textContent = "⏰ È ora di uscire!"; playPingSound(); if ("Notification" in window && Notification.permission === "granted") { new Notification("È ora di uscire!"); }
      clearInterval(countdownInterval);
      return;
    }

    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;

    countdownEl.textContent = `⏳ Esci tra: ${h.toString().padStart(2,'0')}h ${m.toString().padStart(2,'0')}m ${s.toString().padStart(2,'0')}s`;
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

// Estrae l'ora (hh:mm) da una stringa tipo "15:30 (EFF...)"
function estraiOrario(str) {
  const match = str.match(/^\d{2}:\d{2}/);
  return match ? match[0] : null;
}


function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

function playPingSound() {
  const audio = document.getElementById("ping");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}


