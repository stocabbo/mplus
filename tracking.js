(function initMplusTracking(global) {
  const STORAGE_KEY = 'mplus_tracking';
  const MAX_DAILY_MINUTES = 29;
  const MIN_TARGET_MINUTES = 15;
  const MAX_BALANCE_MINUTES = 240;

  function formatIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function emptyState() {
    return { activePlan: null, entries: [] };
  }

  function isValidSchedule(schedule) {
    return Array.isArray(schedule)
      && schedule.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date)
        && Number.isInteger(day.minutes) && day.minutes >= 0 && day.minutes <= MAX_DAILY_MINUTES);
  }

  function load() {
    try {
      const state = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const validPlan = !state?.activePlan || (
        typeof state.activePlan.name === 'string'
        && Number.isInteger(state.activePlan.target)
        && state.activePlan.target >= MIN_TARGET_MINUTES
        && state.activePlan.target <= MAX_BALANCE_MINUTES
        && Number.isInteger(state.activePlan.startingBalance)
        && state.activePlan.startingBalance >= 0
        && state.activePlan.startingBalance < state.activePlan.target
        && isValidSchedule(state.activePlan.schedule)
        && (state.activePlan.baselineSchedule === undefined
          || isValidSchedule(state.activePlan.baselineSchedule))
      );
      const validEntries = Array.isArray(state?.entries)
        && state.entries.every(entry => /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
          && Number.isInteger(entry.minutes) && entry.minutes >= 0 && entry.minutes <= MAX_DAILY_MINUTES);
      if (!validPlan || !validEntries) return emptyState();
      return state;
    } catch (_) {
      return emptyState();
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function balance(state = load()) {
    if (!state.activePlan) return 0;
    return state.activePlan.startingBalance
      + state.entries.reduce((total, entry) => total + entry.minutes, 0);
  }

  function activatePlan(plan, startingBalance, target) {
    return save({
      activePlan: {
        name: plan.name,
        target,
        startingBalance,
        createdAt: formatIsoDate(),
        schedule: plan.schedule.map(day => ({
          date: typeof day.date === 'string' ? day.date : formatIsoDate(day.date),
          minutes: day.minutes
        })),
        baselineSchedule: plan.schedule.map(day => ({
          date: typeof day.date === 'string' ? day.date : formatIsoDate(day.date),
          minutes: day.minutes
        }))
      },
      entries: []
    });
  }

  function clearPlan() {
    return save(emptyState());
  }

  function loadBlockedDates() {
    try {
      const exclusions = JSON.parse(localStorage.getItem('mplusPlannerExclusions') || '[]');
      return new Set(Array.isArray(exclusions) ? exclusions.map(item => item.date) : []);
    } catch (_) {
      return new Set();
    }
  }

  function nextWorkingDates(startDate, count) {
    const blocked = loadBlockedDates();
    const dates = [];
    const cursor = new Date(`${startDate}T12:00:00`);
    while (dates.length < count) {
      cursor.setDate(cursor.getDate() + 1);
      const iso = formatIsoDate(cursor);
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6 && !blocked.has(iso)) dates.push(iso);
    }
    return dates;
  }

  function redistribute(state, fromDate, referenceSchedule = state.activePlan.schedule) {
    const plan = state.activePlan;
    const remaining = Math.max(0, plan.target - balance(state));
    const past = plan.schedule.filter(day => day.date <= fromDate);
    if (!remaining) {
      plan.schedule = past;
      return;
    }
    const oldFutureCount = referenceSchedule.filter(day => day.date > fromDate).length;
    const count = Math.max(Math.ceil(remaining / MAX_DAILY_MINUTES), Math.min(oldFutureCount, remaining));
    const dates = nextWorkingDates(fromDate, count);
    const base = Math.floor(remaining / count);
    const remainder = remaining % count;
    const future = dates.map((date, index) => ({ date, minutes: base + (index < remainder ? 1 : 0) }));
    plan.schedule = [...past, ...future];
  }

  function recordProgress(minutes, date = formatIsoDate()) {
    const state = load();
    if (!state.activePlan || !Number.isInteger(minutes) || minutes < 0 || minutes > MAX_DAILY_MINUTES) return null;
    state.entries = state.entries.filter(entry => entry.date !== date);
    state.entries.push({ date, minutes });
    state.entries.sort((a, b) => a.date.localeCompare(b.date));
    redistribute(state, date);
    return save(state);
  }

  function removeProgress(date = formatIsoDate()) {
    const state = load();
    if (!state.activePlan) return null;
    state.entries = state.entries.filter(entry => entry.date !== date);
    redistribute(state, date, state.activePlan.baselineSchedule || state.activePlan.schedule);
    return save(state);
  }

  function progressDelta(state = load(), date = formatIsoDate()) {
    if (!state.activePlan) return 0;
    const baseline = state.activePlan.baselineSchedule || state.activePlan.schedule;
    const expected = baseline.filter(day => day.date <= date).reduce((total, day) => total + day.minutes, 0);
    const actual = state.entries.filter(entry => entry.date <= date).reduce((total, entry) => total + entry.minutes, 0);
    return actual - expected;
  }

  function plannedForDate(state = load(), date = formatIsoDate()) {
    if (state.activePlan && balance(state) >= state.activePlan.target) return 0;
    return state.activePlan?.schedule.find(day => day.date === date)?.minutes || 0;
  }

  function parseBalance(text) {
    const normalized = text.trim().toLowerCase().replace(',', '.');
    const clock = normalized.match(/([+-]?)(\d{1,2}):([0-5]\d)/);
    if (clock) return (clock[1] === '-' ? -1 : 1) * (Number(clock[2]) * 60 + Number(clock[3]));
    const hours = normalized.match(/(\d+(?:\.\d+)?)\s*(?:h|ore?)/);
    const minutes = normalized.match(/(\d+)\s*(?:m|min|minuti?)/);
    if (hours || minutes) return Math.round(Number(hours?.[1] || 0) * 60) + Number(minutes?.[1] || 0);
    const raw = normalized.match(/(?:saldo[^\d+-]*)?([+-]?\d{1,3})/);
    return raw ? Number(raw[1]) : null;
  }

  global.MplusTracking = {
    MAX_DAILY_MINUTES,
    activatePlan,
    balance,
    clearPlan,
    formatIsoDate,
    load,
    parseBalance,
    plannedForDate,
    progressDelta,
    removeProgress,
    recordProgress
  };
})(window);
