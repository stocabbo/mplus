const MAX_BALANCE_MINUTES = 240;
const MAX_DAILY_MINUTES = 29;
const storageKey = 'mplus_planner_exclusions';

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('it-IT', options).format(parseLocalDate(value));
}

function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  if (!remainder) return `${hours} ${hours === 1 ? 'ora' : 'ore'}`;
  return `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

function getAvailableDays(startValue, calendarDays, excludedDates) {
  const available = [];
  const start = parseLocalDate(startValue);
  for (let offset = 0; offset < calendarDays; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const isoDate = toISODate(date);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6 && !excludedDates.has(isoDate)) available.push(isoDate);
  }
  return available;
}

function distributeMinutes(totalMinutes, dates) {
  const base = Math.floor(totalMinutes / dates.length);
  let remainder = totalMinutes % dates.length;
  return dates.map(date => {
    const minutes = base + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    return { date, minutes };
  });
}

function buildPlans(totalMinutes, availableDays) {
  const minimumDays = Math.ceil(totalMinutes / MAX_DAILY_MINUTES);
  if (availableDays.length < minimumDays) return [];

  const candidates = [
    { count: minimumDays, label: 'Più rapido', description: 'Concentra l’accumulo nel minor numero di giorni.' },
    { count: Math.ceil((minimumDays + availableDays.length) / 2), label: 'Equilibrato', description: 'Bilancia durata e impegno quotidiano.' },
    { count: availableDays.length, label: 'Più leggero', description: 'Distribuisce l’obiettivo su tutti i giorni disponibili.' }
  ].filter((candidate, index, all) => all.findIndex(item => item.count === candidate.count) === index);

  return candidates.map(candidate => {
    const count = candidate.count;
    const dates = availableDays.slice(0, count);
    const entries = distributeMinutes(totalMinutes, dates);
    return {
      label: candidate.label,
      description: candidate.description,
      entries,
      dailyMax: Math.max(...entries.map(entry => entry.minutes)),
      endDate: entries[entries.length - 1].date
    };
  });
}

function loadExclusions() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved.filter(item => item.date && item.reason) : [];
  } catch (error) {
    console.warn('Giorni esclusi non validi, elenco azzerato.', error);
    return [];
  }
}

function initPlanner() {
  const form = document.getElementById('planner_form');
  if (!form) return;

  const currentInput = document.getElementById('current_balance');
  const targetInput = document.getElementById('target_balance');
  const durationInput = document.getElementById('duration_value');
  const unitInput = document.getElementById('duration_unit');
  const startInput = document.getElementById('start_date');
  const excludedDateInput = document.getElementById('excluded_date');
  const reasonInput = document.getElementById('excluded_reason');
  const exclusionList = document.getElementById('exclusion_list');
  const errorElement = document.getElementById('planner_error');
  const results = document.getElementById('plan_results');
  const summary = document.getElementById('plan_summary');
  const options = document.getElementById('plan_options');
  let exclusions = loadExclusions();

  const today = toISODate(new Date());
  startInput.min = today;
  startInput.value = today;
  excludedDateInput.min = today;

  function renderExclusions() {
    exclusionList.innerHTML = exclusions.map((item, index) => `
      <li><span>${formatDate(item.date)} · ${item.reason}</span><button type="button" data-remove="${index}" aria-label="Rimuovi ${item.reason} del ${formatDate(item.date)}">×</button></li>
    `).join('');
    localStorage.setItem(storageKey, JSON.stringify(exclusions));
  }

  document.getElementById('add_exclusion').addEventListener('click', () => {
    const date = excludedDateInput.value;
    if (!date) {
      errorElement.textContent = 'Scegli prima una data da evitare.';
      excludedDateInput.focus();
      return;
    }
    if (!exclusions.some(item => item.date === date)) {
      exclusions.push({ date, reason: reasonInput.value });
      exclusions.sort((a, b) => a.date.localeCompare(b.date));
    }
    errorElement.textContent = '';
    excludedDateInput.value = '';
    renderExclusions();
  });

  exclusionList.addEventListener('click', event => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    exclusions.splice(Number(button.dataset.remove), 1);
    renderExclusions();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    errorElement.textContent = '';
    results.hidden = true;

    const currentMinutes = Math.round((Number(currentInput.value) || 0) * 60);
    const targetMinutes = Math.round(Number(targetInput.value) * 60);
    if (!Number.isFinite(targetMinutes) || targetMinutes < 15 || targetMinutes > MAX_BALANCE_MINUTES) {
      errorElement.textContent = 'Inserisci un obiettivo compreso tra 15 minuti e 4 ore.';
      targetInput.focus();
      return;
    }
    if (currentMinutes < 0 || currentMinutes > MAX_BALANCE_MINUTES) {
      errorElement.textContent = 'Il saldo attuale deve essere compreso tra 0 e 4 ore.';
      currentInput.focus();
      return;
    }
    if (targetMinutes <= currentMinutes) {
      errorElement.textContent = 'L’obiettivo deve essere maggiore del saldo attuale.';
      targetInput.focus();
      return;
    }

    const duration = Number(durationInput.value);
    const calendarDays = unitInput.value === 'weeks' ? duration * 7 : duration;
    const excludedDates = new Set(exclusions.map(item => item.date));
    const availableDays = getAvailableDays(startInput.value, calendarDays, excludedDates);
    const minutesToAccumulate = targetMinutes - currentMinutes;
    const plans = buildPlans(minutesToAccumulate, availableDays);

    if (!plans.length) {
      const needed = Math.ceil(minutesToAccumulate / MAX_DAILY_MINUTES);
      errorElement.textContent = `Servono almeno ${needed} giorni lavorativi disponibili. Aumenta la durata o rimuovi qualche esclusione.`;
      durationInput.focus();
      return;
    }

    summary.innerHTML = `<strong>${formatMinutes(minutesToAccumulate)} da accumulare</strong><span>Da ${formatMinutes(currentMinutes)} a ${formatMinutes(targetMinutes)} · ${availableDays.length} giorni disponibili</span>`;
    options.innerHTML = plans.map((plan, index) => `
      <article class="plan-card">
        <div class="plan-card-heading">
          <div><span class="plan-number">0${index + 1}</span><h3>${plan.label}</h3></div>
          <strong>fino a ${plan.dailyMax} min/giorno</strong>
        </div>
        <p>${plan.description} Obiettivo raggiunto entro ${formatDate(plan.endDate, { day: 'numeric', month: 'long' })}.</p>
        <details${index === 1 || plans.length === 1 ? ' open' : ''}>
          <summary>Vedi calendario · ${plan.entries.length} giorni</summary>
          <ol class="calendar-list">
            ${plan.entries.map(entry => `<li><time datetime="${entry.date}">${formatDate(entry.date)}</time><strong>+${entry.minutes} min</strong></li>`).join('')}
          </ol>
        </details>
      </article>
    `).join('');
    results.hidden = false;
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  renderExclusions();
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', initPlanner);

if (typeof module !== 'undefined') {
  module.exports = { getAvailableDays, distributeMinutes, buildPlans, formatMinutes };
}
