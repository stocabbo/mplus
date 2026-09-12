const MAX_BALANCE_MINUTES = 240;
const MAX_DAILY_MINUTES = 29;
const STORAGE_KEY = 'mplusPlannerExclusions';
const allowedReasons = new Set(['Ferie', 'Smart working', 'Indisponibile']);

const form = document.getElementById('planner_form');
const exclusionsList = document.getElementById('exclusions');
const results = document.getElementById('planner_results');
const feedback = document.getElementById('planner_feedback');
const activePlan = document.getElementById('active_plan');
const progressHistory = document.getElementById('progress_history');
let exclusions = loadExclusions();
let latestRequest = null;

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && formatIsoDate(date) === value;
}

function loadExclusions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter(item => isIsoDate(item.date) && allowedReasons.has(item.reason)) : [];
  } catch (_) {
    return [];
  }
}

function formatIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderExclusions() {
  exclusionsList.replaceChildren(...exclusions.map(item => {
    const row = document.createElement('li');
    const label = document.createElement('span');
    label.textContent = `${new Date(`${item.date}T12:00:00`).toLocaleDateString('it-IT')} · ${item.reason}`;
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'text-btn'; remove.textContent = 'Rimuovi';
    remove.addEventListener('click', () => {
      exclusions = exclusions.filter(entry => entry.date !== item.date);
      saveExclusions(); renderExclusions(); refreshPlans();
    });
    row.append(label, remove); return row;
  }));
}

function saveExclusions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exclusions));
  } catch (_) {
    // Le esclusioni restano utilizzabili per la sessione corrente.
  }
}

function workingDays(totalDays, start = new Date()) {
  const blocked = new Set(exclusions.map(item => item.date));
  const days = [];
  for (let offset = 1; offset <= totalDays; offset += 1) {
    const date = new Date(start); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + offset);
    if (date.getDay() !== 0 && date.getDay() !== 6 && !blocked.has(formatIsoDate(date))) days.push(date);
  }
  return days;
}

function distribute(minutes, days) {
  if (!days.length || minutes > days.length * MAX_DAILY_MINUTES) return null;
  const usedDays = days.slice(0, Math.min(days.length, minutes));
  const base = Math.floor(minutes / usedDays.length);
  const remainder = minutes % usedDays.length;
  return usedDays.map((date, index) => ({ date, minutes: base + (index < remainder ? 1 : 0) }));
}

function buildPlans(minutes, days) {
  const minimumDays = Math.ceil(minutes / MAX_DAILY_MINUTES);
  const candidates = [
    ['Più rapido', minimumDays],
    ['Equilibrato', Math.ceil((minimumDays + days.length) / 2)],
    ['Più leggero', Math.min(days.length, minutes)]
  ];
  const seen = new Set();
  return candidates.flatMap(([name, count]) => {
    const effectiveCount = Math.min(count, days.length, minutes);
    if (seen.has(effectiveCount)) return [];
    seen.add(effectiveCount);
    const schedule = distribute(minutes, days.slice(0, effectiveCount));
    return schedule ? [{ name, schedule }] : [];
  });
}

function minimumCalendarDays(requiredWorkingDays, start = new Date()) {
  const blocked = new Set(exclusions.map(item => item.date));
  let available = 0;
  let totalDays = 0;
  while (available < requiredWorkingDays) {
    totalDays += 1;
    const date = new Date(start);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + totalDays);
    if (date.getDay() !== 0 && date.getDay() !== 6 && !blocked.has(formatIsoDate(date))) available += 1;
  }
  return totalDays;
}

function renderPlans(plans, missing, suggestedDays) {
  feedback.textContent = '';
  results.replaceChildren();
  if (!plans.length) {
    const error = document.createElement('p');
    error.className = 'planner-error';
    error.textContent = 'Le giornate lavorative disponibili non bastano. Estendi il periodo o rimuovi alcune esclusioni.';
    const suggestion = document.createElement('button');
    suggestion.type = 'button';
    suggestion.className = 'secondary-btn planner-suggestion';
    suggestion.textContent = `Imposta ${suggestedDays} giorni`;
    suggestion.addEventListener('click', () => {
      document.getElementById('duration').value = suggestedDays;
      document.getElementById('duration_unit').value = 'days';
      createPlans();
    });
    results.append(error, suggestion);
    return;
  }
  const intro = document.createElement('p');
  intro.textContent = `Ti mancano ${formatMinutes(missing)}. Ecco le alternative possibili:`;
  results.append(intro);
  plans.forEach(plan => {
    const card = document.createElement('article'); card.className = 'plan-card';
    const end = plan.schedule.at(-1).date.toLocaleDateString('it-IT');
    const peak = Math.max(...plan.schedule.map(day => day.minutes));
    card.innerHTML = `<h2>${plan.name}</h2><p class="plan-meta">${plan.schedule.length} giorni · massimo ${peak} min/giorno · fine ${end}</p>`;
    const details = document.createElement('details');
    details.innerHTML = '<summary>Vedi calendario</summary>';
    const calendar = document.createElement('ul'); calendar.className = 'calendar';
    plan.schedule.forEach(day => {
      const item = document.createElement('li');
      item.innerHTML = `<span>${day.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}</span><strong>+${day.minutes} min</strong>`;
      calendar.append(item);
    });
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'secondary-btn plan-share';
    share.textContent = 'Condividi piano';
    share.addEventListener('click', () => sharePlan(plan));
    const activate = document.createElement('button');
    activate.type = 'button';
    activate.className = 'primary-btn plan-activate';
    activate.textContent = 'Usa questo piano';
    activate.addEventListener('click', () => {
      MplusTracking.activatePlan(plan, latestRequest.current, latestRequest.target);
      feedback.textContent = `${plan.name} impostato come piano attivo.`;
      renderTracking();
    });
    const actions = document.createElement('div');
    actions.className = 'plan-actions';
    actions.append(activate, share);
    details.append(calendar); card.append(details, actions); results.append(card);
  });
}

function renderTracking() {
  const state = MplusTracking.load();
  if (!state.activePlan) {
    activePlan.hidden = true;
    progressHistory.hidden = true;
    return;
  }
  const current = MplusTracking.balance(state);
  const missing = Math.max(0, state.activePlan.target - current);
  const percentage = Math.min(100, Math.round(current / state.activePlan.target * 100));
  activePlan.innerHTML = `
    <p class="eyebrow">PIANO ATTIVO</p>
    <h2>${state.activePlan.name}</h2>
    <p>${formatMinutes(current)} su ${formatMinutes(state.activePlan.target)} · mancano ${formatMinutes(missing)}</p>
    <div class="progress-bar" aria-label="Avanzamento ${percentage}%"><span style="width: ${percentage}%"></span></div>
    <button id="clear_plan" class="text-btn clear-plan" type="button">Chiudi piano e storico</button>
  `;
  document.getElementById('clear_plan').addEventListener('click', () => {
    if (!window.confirm('Chiudere il piano attivo e cancellare il relativo storico?')) return;
    MplusTracking.clearPlan();
    feedback.textContent = 'Piano attivo chiuso.';
    renderTracking();
  });
  activePlan.hidden = false;

  const entryMap = new Map(state.entries.map(entry => [entry.date, entry.minutes]));
  const rows = state.activePlan.schedule.map(day => ({ ...day, actual: entryMap.get(day.date) }));
  const extraEntries = state.entries
    .filter(entry => !state.activePlan.schedule.some(day => day.date === entry.date))
    .map(entry => ({ ...entry, actual: entry.minutes }));
  const allRows = [...rows, ...extraEntries].sort((a, b) => a.date.localeCompare(b.date));
  const groups = new Map();
  allRows.forEach(row => {
    const month = row.date.slice(0, 7);
    groups.set(month, [...(groups.get(month) || []), row]);
  });
  progressHistory.replaceChildren();
  const title = document.createElement('h2');
  title.textContent = 'Calendario e storico';
  progressHistory.append(title);
  groups.forEach((monthRows, month) => {
    const monthTitle = document.createElement('h3');
    monthTitle.textContent = new Date(`${month}-01T12:00:00`).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    const list = document.createElement('ul');
    list.className = 'tracking-days';
    monthRows.forEach(row => {
      const item = document.createElement('li');
      const label = new Date(`${row.date}T12:00:00`).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' });
      const value = row.actual === undefined ? `Previsti +${row.minutes} min` : `Registrati +${row.actual} min`;
      item.innerHTML = `<span>${label}</span><strong class="${row.actual === undefined ? '' : 'completed'}">${value}</strong>`;
      list.append(item);
    });
    progressHistory.append(monthTitle, list);
  });
  progressHistory.hidden = false;
}

function formatPlanText(plan) {
  const days = plan.schedule.map(day => {
    const date = day.date.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
    return `${date}: +${day.minutes} min`;
  });
  return [`Piano MPLUS · ${plan.name}`, ...days].join('\n');
}

async function sharePlan(plan) {
  const text = formatPlanText(plan);
  try {
    if (navigator.share) {
      await navigator.share({ title: `Piano MPLUS · ${plan.name}`, text });
      feedback.textContent = 'Piano condiviso.';
    } else {
      await navigator.clipboard.writeText(text);
      feedback.textContent = 'Piano copiato negli appunti.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') feedback.textContent = 'Non è stato possibile condividere il piano.';
  }
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : '', !minutes ? '0 min' : ''].filter(Boolean).join(' ');
}

document.getElementById('add_exclusion').addEventListener('click', () => {
  const date = document.getElementById('excluded_date').value;
  const reason = document.getElementById('excluded_reason').value;
  if (!isIsoDate(date) || exclusions.some(item => item.date === date)) return;
  exclusions.push({ date, reason }); exclusions.sort((a, b) => a.date.localeCompare(b.date));
  saveExclusions(); renderExclusions(); refreshPlans();
});

function isValidPlanRequest(current, target, duration) {
  return Number.isFinite(current) && Number.isInteger(current)
    && Number.isFinite(target) && Number.isInteger(target) && target % 15 === 0
    && Number.isFinite(duration) && Number.isInteger(duration) && duration >= 1 && duration <= 365
    && current >= 0 && current <= MAX_BALANCE_MINUTES
    && target >= 15 && target <= MAX_BALANCE_MINUTES && target > current;
}

function createPlans() {
  const currentValue = document.getElementById('current_balance').value;
  const current = currentValue === '' ? 0 : Number(currentValue);
  const target = Number(document.getElementById('target_balance').value) * 60;
  const duration = Number(document.getElementById('duration').value);
  if (!isValidPlanRequest(current, target, duration)) {
    results.innerHTML = '<p class="planner-error">Controlla saldo, obiettivo e durata. L’obiettivo deve superare il saldo e non può eccedere 4 ore.</p>';
    return;
  }
  const totalDays = document.getElementById('duration_unit').value === 'weeks' ? duration * 7 : duration;
  const days = workingDays(totalDays);
  const missing = target - current;
  latestRequest = { current, target };
  const suggestedDays = minimumCalendarDays(Math.ceil(missing / MAX_DAILY_MINUTES));
  renderPlans(buildPlans(missing, days), missing, suggestedDays);
}

function refreshPlans() {
  if (results.hasChildNodes()) createPlans();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  createPlans();
});

renderExclusions();
renderTracking();

document.getElementById('import_balance').addEventListener('click', () => {
  const text = document.getElementById('balance_text').value;
  const imported = MplusTracking.parseBalance(text);
  const message = document.getElementById('import_feedback');
  if (!Number.isInteger(imported) || imported < 0 || imported > MAX_BALANCE_MINUTES) {
    message.textContent = 'Saldo non riconosciuto o fuori dall’intervallo 0-240 minuti.';
    return;
  }
  document.getElementById('current_balance').value = imported;
  message.textContent = `Saldo rilevato: ${formatMinutes(imported)}.`;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
