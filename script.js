
const defaultSettings = {
  extraCorta: 20,
  recuperoLunga: 30,
  pausaMinima: 30
};

function loadSettings() {
  let savedSettings = {};
  try {
    savedSettings = JSON.parse(localStorage.getItem('mplus_settings')) || {};
  } catch (error) {
    console.warn('Impostazioni salvate non valide, uso i valori predefiniti.', error);
  }
  const obj = { ...defaultSettings, ...savedSettings };
  obj.pausaMinima = Math.min(Math.max(obj.pausaMinima, 20), 120);
  return obj;
}

let settings = loadSettings();

function saveSettings() {
  settings.pausaMinima = Math.min(Math.max(settings.pausaMinima, 20), 120);
  localStorage.setItem('mplus_settings', JSON.stringify(settings));
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const normalized = ((mins % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return h.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0');
}

function calcolaPausa(ingresso) {
  const start = Math.max(ingresso + 240, 720);
  return { inizio: start, fine: start + settings.pausaMinima };
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
  const pausa = settings.pausaMinima;
  const pausaEff = Math.max(pausa, 30);
  const pausaBP = Math.max(pausa, 20);
  const ingresso = Math.max(IN1, 465); // minimo 07:45
  const durata_teorica = tipo === "corta" ? 360 : 540;
  let uscita_bp = ingresso + pausaBP + 361;
  uscita_bp = Math.min(uscita_bp, 1170);
  const { inizio: pausaStart, fine: pausaEnd } = calcolaPausa(ingresso);

  let accumulo_dichiarato = tipo === "corta" ? settings.extraCorta : 0;
  const ritardo = Math.max(0, IN1 - 540);
  if (tipo === "corta") accumulo_dichiarato += ritardo;

  const max_totale = 29;
  const accumulo_effettivo = Math.min(accumulo_dichiarato, max_totale);
  const target_eff = 360 + accumulo_effettivo;
  let uscita_strategica = ingresso + pausaEff + target_eff;
  let ore_eff_strategica = target_eff;

  let stato = "green";
  let badge = "✅ BP";
  let suggerimento = "";

  if (tipo === "corta") {
    if (uscita_strategica > 1170) {
      uscita_strategica = 1170;
      ore_eff_strategica = uscita_strategica - ingresso - pausaEff;
      const accumulo = Math.max(0, ore_eff_strategica - durata_teorica);
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = `⚠️ Chiusura 19:30: accumulo max ${accumulo} min.`;
    } else if (accumulo_dichiarato > max_totale) {
      const ecc = ore_eff_strategica - durata_teorica;
      stato = "yellow";
      badge = `↪︎ +${ecc} min`;
      suggerimento = "⚠️ Massimo 29 min raggiunto, accumulo ridotto.";
    } else {
      const ecc = ore_eff_strategica - durata_teorica;
      if (ecc > 0) {
        stato = "yellow";
        badge = `↪︎ +${ecc} min`;
        suggerimento = `⏱️ Esci alle ${minutesToTime(uscita_strategica)} per +${ecc} min.`;
      } else {
        const bpMsg = settings.pausaMinima >= 20 ? 'Buono pasto ok.' : 'Pausa troppo breve per BP.';
        suggerimento = `🍽️ Pausa di ${settings.pausaMinima} min. ${bpMsg}`;
      }
    }
  } else {
    const uscita_normale = ingresso + pausaEff + durata_teorica;
    uscita_strategica = Math.min(uscita_normale - settings.recuperoLunga, 1170);
    ore_eff_strategica = uscita_strategica - ingresso - pausaEff;

    if (uscita_normale > 1170) {
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = "⚠️ Chiusura 19:30: pianifica un recupero.";
    } else if (uscita_bp >= 1170) {
      stato = "red";
      badge = "⚠️ 19:30";
      suggerimento = "⚠️ Chiusura 19:30: pianifica un recupero.";
    } else if (ore_eff_strategica >= 510) {
      stato = "yellow";
      badge = `↪︎ -${settings.recuperoLunga} min`;
      suggerimento = `↪️ Uscita normale ${minutesToTime(uscita_normale)} se vuoi evitare anticipo.`;
    } else {
      const bpMsg = settings.pausaMinima >= 20 ? 'Buono pasto ok.' : 'Pausa troppo breve per BP.';
      suggerimento = `🍽️ Pausa di ${settings.pausaMinima} min. ${bpMsg}`;
    }
  }

  const ore_eff_bp = uscita_bp - ingresso - pausaEff;

  return {
    tipo,
    stato,
    badge,
    uscita_stimata: minutesToTime(uscita_bp) + " " + formatEFFRECACC(ore_eff_bp, 0),
    uscita_strategica: minutesToTime(uscita_strategica) + " " + formatEFFRECACC(ore_eff_strategica, Math.max(0, ore_eff_strategica - durata_teorica)),
    pausa_inizio: minutesToTime(pausaStart),
    pausa_fine: minutesToTime(pausaEnd),
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
    document.getElementById('share_result').hidden = true;
    document.getElementById('countdown').textContent = '';
    return;
  }

  const IN1 = timeToMinutes(oraIngresso);
  const result = calcolaGiornata(tipoGiornata, IN1);

  const outputHTML = `
    <div class="result-card ${result.stato}">
      <div class="title">${tipoGiornata.charAt(0).toUpperCase() + tipoGiornata.slice(1)} <span>${result.badge}</span></div>
      <div class="time">🕓 Uscita per BP: ${result.uscita_stimata}</div>
      <div class="time">🎯 Uscita Strategica: ${result.uscita_strategica}</div>
      <div class="time">🍽️ Pausa: ${result.pausa_inizio} - ${result.pausa_fine}</div>
      <div class="time">💡 ${result.suggerimento}</div>
    </div>
  `;

  document.getElementById('output').innerHTML = outputHTML;
  document.getElementById('share_result').hidden = false;
  localStorage.setItem('mplus_last_entry', JSON.stringify({ ora: oraIngresso, tipo: tipoGiornata }));
  const oraStrategica = estraiOrario(result.uscita_strategica);
  if (oraStrategica) startCountdown(oraStrategica);
}

const ingressoEl = document.getElementById('ora_ingresso');
const toggleEl = document.getElementById('toggle_giornata');
if (ingressoEl && toggleEl) {
  ingressoEl.addEventListener('input', aggiornaRisultati);
  toggleEl.addEventListener('change', aggiornaRisultati);
  window.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
    const urlParams = new URLSearchParams(window.location.search);
    const paramOra = urlParams.get("ora");
    const oraInput = document.getElementById('ora_ingresso');
    const lastEntry = loadLastEntry();
    if (paramOra && isValidTime(paramOra)) {
      const [h, m] = paramOra.split(":");
      oraInput.value = h.padStart(2, "0") + ":" + m;
    } else if (lastEntry) {
      oraInput.value = lastEntry.ora;
      toggleEl.checked = lastEntry.tipo === 'lunga';
    } else {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      oraInput.value = `${hh}:${mm}`;
    }
    aggiornaRisultati();
    initSettings();
    initQuickActions();
  });
}

function isValidTime(value) {
  if (!/^\d{1,2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function loadLastEntry() {
  try {
    const entry = JSON.parse(localStorage.getItem('mplus_last_entry'));
    return entry && isValidTime(entry.ora) && ['corta', 'lunga'].includes(entry.tipo) ? entry : null;
  } catch (error) {
    console.warn('Ultimo ingresso salvato non valido.', error);
    return null;
  }
}

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

function initSettings() {
  const btn = document.getElementById('settings_btn');
  const panel = document.getElementById('settings_panel');
  if (!btn || !panel) return;
  const extra = document.getElementById('opt_extra_corta');
  const rec = document.getElementById('opt_recupero_lunga');
  const pausa = document.getElementById('opt_pausa');
  const save = document.getElementById('save_settings');
  const close = document.getElementById('close_settings');
  const reset = document.getElementById('reset_settings');
  const content = panel.querySelector('.settings-content');
  let previousFocus;

  function closePanel() {
    panel.hidden = true;
    previousFocus?.focus();
  }

  btn.addEventListener('click', () => {
    previousFocus = document.activeElement;
    extra.value = settings.extraCorta;
    rec.value = settings.recuperoLunga;
    pausa.value = settings.pausaMinima;
    panel.hidden = false;
    content.focus();
  });

  save.addEventListener('click', () => {
    settings.extraCorta = parseInt(extra.value) || 0;
    settings.recuperoLunga = parseInt(rec.value) || 0;
    settings.pausaMinima = parseInt(pausa.value) || 0;
    settings.pausaMinima = Math.min(Math.max(settings.pausaMinima, 20), 120);
    saveSettings();
    closePanel();
    aggiornaRisultati();
  });

  reset.addEventListener('click', () => {
    extra.value = defaultSettings.extraCorta;
    rec.value = defaultSettings.recuperoLunga;
    pausa.value = defaultSettings.pausaMinima;
  });

  close.addEventListener('click', closePanel);

  panel.addEventListener('click', e => {
    if (e.target === panel) closePanel();
  });

  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') closePanel();
  });
}

function initQuickActions() {
  const nowButton = document.getElementById('set_now');
  const shareButton = document.getElementById('share_result');
  const feedback = document.getElementById('feedback');

  nowButton.addEventListener('click', () => {
    const now = new Date();
    ingressoEl.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    aggiornaRisultati();
  });

  shareButton.addEventListener('click', async () => {
    const card = document.querySelector('.result-card');
    if (!card) return;
    const text = card.innerText.replace(/\n+/g, '\n').trim();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Riepilogo MPLUS', text });
        feedback.textContent = 'Riepilogo condiviso.';
      } else {
        await navigator.clipboard.writeText(text);
        feedback.textContent = 'Riepilogo copiato negli appunti.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') feedback.textContent = 'Non è stato possibile condividere il riepilogo.';
    }
  });
}





// Avvio dei test automatici MPLUS
function testCalcolaBP() {
  console.group("🔍 Test calcolaBP()");
  console.assert(minutesToTime(timeToMinutes("08:30") + 361) === "14:31", "❌ Test 1 fallito: expected 14:31");
  console.assert(minutesToTime(timeToMinutes("07:59") + 361) === "14:00", "❌ Test 2 fallito: expected 14:00");
  console.assert(minutesToTime(timeToMinutes("09:00") + 361) === "15:01", "❌ Test 3 fallito: expected 15:01");
  console.log("✅ Tutti i test calcolaBP completati.");
  console.groupEnd();
}

function testEstratti() {
  console.group("🔍 Test estraiOrario()");
  const esempio = "15:28 (EFF 6h20m, ACC 20 min)";
  const parsed = estraiOrario(esempio);
  console.assert(parsed === "15:28", "❌ Test 1 fallito: estraiOrario");
  console.log("✅ Tutti i test estraiOrario completati.");
  console.groupEnd();
}

function testStrategico() {
  console.group("🔍 Test calcolaGiornata()");
  const r1 = calcolaGiornata("corta", timeToMinutes("09:32"));
  console.assert(r1.uscita_stimata.startsWith("16:03"), "❌ Test 1 stimata: expected 16:03");
  console.assert(r1.uscita_strategica.startsWith("16:22") === false, "✅ Test 2 strategica: acc e rec superano 29 min, ridotto");

  const r2 = calcolaGiornata("lunga", timeToMinutes("11:49"));
  console.assert(estraiOrario(r2.uscita_strategica) <= "19:30", "❌ Test 3: limite orario massimo superato");

  const r3 = calcolaGiornata("corta", timeToMinutes("08:38"));
  console.assert(r3.uscita_strategica.startsWith("15:28"), "❌ Test 4: strategica errata su caso classico");

  console.log("✅ Tutti i test calcolaGiornata completati.");
  console.groupEnd();
}

(function runTests() {
  console.groupCollapsed("🧪 Test Unitari MPLUS");
  testCalcolaBP();
  testEstratti();
  testStrategico();
  console.groupEnd();
})();
