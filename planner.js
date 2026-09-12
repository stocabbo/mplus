const MAX_BALANCE_MINUTES = 240;
const MAX_DAILY_MINUTES = 29;
const STORAGE_KEY = 'mplusPlannerExclusions';
const allowedReasons = new Set(['Ferie', 'Smart working', 'Indisponibile']);

const form = document.getElementById('planner_form');
const exclusionsList = document.getElementById('exclusions');
const results = document.getElementById('planner_results');
let exclusions = loadExclusions();

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
    if (seen.has(count)) return [];
    seen.add(count);
    const schedule = distribute(minutes, days.slice(0, count));
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
    details.append(calendar); card.append(details); results.append(card);
  });
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60); const rest = minutes % 60;
  return [hours ? `${hours} h` : '', rest ? `${rest} min` : ''].filter(Boolean).join(' ');
}

document.getElementById('add_exclusion').addEventListener('click', () => {
  const date = document.getElementById('excluded_date').value;
  const reason = document.getElementById('excluded_reason').value;
  if (!isIsoDate(date) || exclusions.some(item => item.date === date)) return;
  exclusions.push({ date, reason }); exclusions.sort((a, b) => a.date.localeCompare(b.date));
  saveExclusions(); renderExclusions(); refreshPlans();
});

function createPlans() {
  const current = Math.round((Number(document.getElementById('current_balance').value) || 0) * 60);
  const target = Math.round(Number(document.getElementById('target_balance').value) * 60);
  const duration = Number(document.getElementById('duration').value);
  if (current < 0 || current > MAX_BALANCE_MINUTES || target <= current || target > MAX_BALANCE_MINUTES) {
    results.innerHTML = '<p class="planner-error">Inserisci un obiettivo maggiore del saldo attuale e non superiore a 4 ore.</p>';
    return;
  }
  const totalDays = document.getElementById('duration_unit').value === 'weeks' ? duration * 7 : duration;
  const days = workingDays(totalDays);
  const missing = target - current;
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js');
}
