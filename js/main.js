// GTNH Steam Calculator — Orchestrator

import { calculateBoilers } from './boiler-calc.js';
import { calculateTurbines } from './turbine-calc.js';
import { saveInputs, restoreInputs, resetInputs, STORAGE_KEY_CALCIFIED, STORAGE_KEY_AUTO_BALANCED } from './persistence.js';

const TICKS_PER_SECOND  = 20;
const DISPLAY_PRECISION = 3; // Decimal places shown for fractional EU/t values

// ===== DOM HELPERS =====

function getCount(id) {
  const v = parseInt(document.getElementById(id).value, 10);
  return isNaN(v) || v < 0 ? 0 : v;
}

function format(n) {
  const factor = 10 ** DISPLAY_PRECISION;
  return Math.round(n * factor) / factor === Math.floor(n)
    ? Math.round(n).toLocaleString('en-US')
    : parseFloat(n.toFixed(DISPLAY_PRECISION)).toLocaleString('en-US');
}

function formatSteam(n) {
  return Math.ceil(n).toLocaleString('en-US');
}

function setSteamText(id, valueLt) {
  const valueLS = valueLt * TICKS_PER_SECOND;
  document.getElementById(id).innerHTML =
    `<span class="unit-ls">${formatSteam(valueLS)} <span class="result-unit">L/s</span></span>` +
    `<span class="unit-lt">${formatSteam(valueLt)} <span class="result-unit">L/t</span></span>`;
}

function setEuText(id, value) {
  document.getElementById(id).innerHTML = `${format(value)} <span class="result-unit">EU/t</span>`;
}

// ===== SETTINGS =====

function isCalcified() {
  return document.getElementById('calcified-solar-boilers').checked;
}

function applyCalcifiedBadges(calcified) {
  document.querySelectorAll('.solar-stat-normal').forEach(el => {
    el.style.display = calcified ? 'none' : 'inline';
  });
  document.querySelectorAll('.solar-stat-calcified').forEach(el => {
    el.style.display = calcified ? 'inline' : 'none';
  });
}

// ===== INIT =====

document.addEventListener('DOMContentLoaded', async () => {
  const config = await fetch('./js/config.json').then(r => r.json());

  const BOILERS = Object.fromEntries(
    config.boilerGroups.flatMap(g => Object.entries(g.boilers))
  );

  const TURBINES = Object.fromEntries(
    Object.entries(config.turbines).map(([id, t]) => [id, {
      steamPerTick: ((t.euPerTick + t.lossPerTick) * 2) / t.efficiency,
      euPerTick:    t.euPerTick,
    }])
  );

  // ===== AUTO-BALANCE STATE =====

  let autoBalancedId = null;

  function computeAutoBalancedCount(id) {
    const calcified = isCalcified();
    if (BOILERS[id] !== undefined) {
      const otherBoilerCounts = Object.fromEntries(
        Object.keys(BOILERS).map(bid => [bid, bid === id ? 0 : getCount(bid)])
      );
      const { steamGenerated: otherSteam } = calculateBoilers(BOILERS, otherBoilerCounts, calcified, TICKS_PER_SECOND);
      const turbineCounts = Object.fromEntries(Object.keys(TURBINES).map(tid => [tid, getCount(tid)]));
      const { steamConsumed } = calculateTurbines(TURBINES, turbineCounts);
      const boiler = BOILERS[id];
      const rateLS = (calcified && boiler.calcifiedPerSecond !== undefined)
        ? boiler.calcifiedPerSecond
        : boiler.steamPerSecond;
      const steamPerTick = rateLS / TICKS_PER_SECOND;
      if (steamPerTick === 0) return 0;
      return Math.ceil(Math.max(0, steamConsumed - otherSteam) / steamPerTick);
    } else {
      const boilerCounts = Object.fromEntries(Object.keys(BOILERS).map(bid => [bid, getCount(bid)]));
      const { steamGenerated } = calculateBoilers(BOILERS, boilerCounts, calcified, TICKS_PER_SECOND);
      const otherTurbineCounts = Object.fromEntries(
        Object.keys(TURBINES).map(tid => [tid, tid === id ? 0 : getCount(tid)])
      );
      const { steamConsumed: otherConsumed } = calculateTurbines(TURBINES, otherTurbineCounts);
      const steamPerTick = TURBINES[id].steamPerTick;
      if (steamPerTick === 0) return 0;
      return Math.floor(Math.max(0, steamGenerated - otherConsumed) / steamPerTick);
    }
  }

  function setAutoBalance(id) {
    if (autoBalancedId) {
      const prevEl = document.getElementById(autoBalancedId);
      prevEl.removeAttribute('readonly');
      prevEl.classList.remove('is-auto-balanced');
      const prevBtn = document.querySelector(`[data-auto-for="${autoBalancedId}"]`);
      if (prevBtn) prevBtn.classList.remove('active');
    }
    autoBalancedId = id;
    if (id) {
      const el = document.getElementById(id);
      el.setAttribute('readonly', '');
      el.classList.add('is-auto-balanced');
      const btn = document.querySelector(`[data-auto-for="${id}"]`);
      if (btn) btn.classList.add('active');
      localStorage.setItem(STORAGE_KEY_AUTO_BALANCED, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTO_BALANCED);
    }
  }

  // ===== DOM GENERATION =====

  function renderBoilerInputs(container, boilerGroups) {
    for (const group of boilerGroups) {
      const groupLabel = document.createElement('p');
      groupLabel.className = 'boiler-group-label';
      groupLabel.textContent = group.label;
      container.appendChild(groupLabel);

      const row = document.createElement('div');
      row.className = 'row g-3 mb-4';

      for (const [id, boiler] of Object.entries(group.boilers)) {
        const isSolar = boiler.calcifiedPerSecond !== undefined;
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-lg-4';

        const badgeHTML = isSolar
          ? `<span class="stat-badge solar-stat-normal" data-stat-for="${id}"></span>
             <span class="stat-badge solar-stat-calcified" data-stat-for="${id}" data-stat-calcified></span>`
          : `<span class="stat-badge" data-stat-for="${id}"></span>`;

        col.innerHTML = `
          <label for="${id}" class="form-label">
            ${boiler.label}
            ${badgeHTML}
          </label>
          <div class="input-group">
            <input type="number" id="${id}" class="form-control calc-input"
                   min="0" value="0" autocomplete="off" />
            <button type="button" class="btn btn-auto-balance" data-auto-for="${id}" title="Auto-balance this value">⚖</button>
          </div>
        `;
        row.appendChild(col);
      }
      container.appendChild(row);
    }
  }

  function renderTurbineInputs(container, turbines) {
    for (const [id, turbine] of Object.entries(turbines)) {
      const efficiencyPct = Math.round(turbine.efficiency * 100);
      const col = document.createElement('div');
      col.className = 'col-12 col-sm-6 col-lg-4';
      col.innerHTML = `
        <label for="${id}" class="form-label">
          ${turbine.label}
          <span class="stat-badge" data-stat-for="${id}"></span>
        </label>
        <div class="input-group">
          <input type="number" id="${id}" class="form-control calc-input"
                 min="0" value="0" autocomplete="off" />
          <button type="button" class="btn btn-auto-balance" data-auto-for="${id}" title="Auto-balance this value">⚖</button>
        </div>
        <div class="form-text">${efficiencyPct}% efficiency</div>
      `;
      container.appendChild(col);
    }
  }

  renderBoilerInputs(document.getElementById('boilers-container'), config.boilerGroups);
  renderTurbineInputs(document.getElementById('turbines-container'), config.turbines);

  // ===== ORCHESTRATION =====

  function recalculate() {
    if (autoBalancedId) {
      document.getElementById(autoBalancedId).value = computeAutoBalancedCount(autoBalancedId);
    }

    const boilerCounts  = Object.fromEntries(Object.keys(BOILERS).map(id  => [id, getCount(id)]));
    const turbineCounts = Object.fromEntries(Object.keys(TURBINES).map(id => [id, getCount(id)]));

    const calcified = isCalcified();
    const { steamGenerated } = calculateBoilers(BOILERS, boilerCounts, calcified, TICKS_PER_SECOND);
    const { steamConsumed, euGenerated } = calculateTurbines(TURBINES, turbineCounts);
    const steamSurplus = steamGenerated - steamConsumed;

    const euSustainable = steamConsumed > 0
      ? euGenerated * (steamGenerated / steamConsumed)
      : 0;
    const steamDeficit = steamSurplus < 0;

    setSteamText('out-steam-generated', steamGenerated);
    setSteamText('out-steam-consumed',  steamConsumed);

    const euCardEl = document.getElementById('card-eu-generated');
    const euMaxEl = document.getElementById('out-eu-max');
    if (steamDeficit) {
      setEuText('out-eu-generated', euSustainable);
      euMaxEl.innerHTML = `${format(euGenerated)} <span class="result-unit">EU/t</span> max`;
      euCardEl.classList.add('result-card--eu-deficit');
    } else {
      setEuText('out-eu-generated', euGenerated);
      euMaxEl.innerHTML = '';
      euCardEl.classList.remove('result-card--eu-deficit');
    }

    const surplusEl = document.getElementById('out-steam-surplus');
    const cardEl    = document.getElementById('card-steam-surplus');
    const sign = steamSurplus < 0 ? '-' : '';
    const absSurplus = Math.abs(steamSurplus);
    surplusEl.innerHTML =
      `<span class="unit-ls">${sign}${formatSteam(absSurplus * TICKS_PER_SECOND)} <span class="result-unit">L/s</span></span>` +
      `<span class="unit-lt">${sign}${formatSteam(absSurplus)} <span class="result-unit">L/t</span></span>`;

    cardEl.classList.remove('result-card--surplus', 'result-card--deficit');
    if (steamSurplus > 0) {
      cardEl.classList.add('result-card--surplus');
    } else if (steamSurplus < 0) {
      cardEl.classList.add('result-card--deficit');
    }
  }

  // ===== STAT BADGES =====

  function formatStatRate(ls) {
    const lt = ls / TICKS_PER_SECOND;
    const lsStr = Number.isInteger(ls) ? ls.toLocaleString('en-US') : `~${parseFloat(ls.toFixed(1)).toLocaleString('en-US')}`;
    const ltStr = Number.isInteger(lt) ? lt.toLocaleString('en-US') : `~${parseFloat(lt.toFixed(1)).toLocaleString('en-US')}`;
    return `${lsStr} L/s \u2022 ${ltStr} L/t`;
  }

  function renderStatBadges() {
    // Boiler badges
    for (const [id, boiler] of Object.entries(BOILERS)) {
      document.querySelector(`[data-stat-for="${id}"]:not([data-stat-calcified])`).textContent =
        formatStatRate(boiler.steamPerSecond);

      if (boiler.calcifiedPerSecond !== undefined) {
        document.querySelector(`[data-stat-for="${id}"][data-stat-calcified]`).innerHTML =
          `<s>${formatStatRate(boiler.steamPerSecond)}</s> ${formatStatRate(boiler.calcifiedPerSecond)}`;
      }
    }

    // Turbine badges
    for (const [id, turbine] of Object.entries(TURBINES)) {
      document.querySelector(`[data-stat-for="${id}"]`).textContent =
        `${formatStatRate(turbine.steamPerTick * TICKS_PER_SECOND)} \u2192 ${turbine.euPerTick} EU/t`;
    }
  }

  // ===== SETUP =====

  const calcifiedEl = document.getElementById('calcified-solar-boilers');
  const stored = localStorage.getItem(STORAGE_KEY_CALCIFIED);
  calcifiedEl.checked = stored === null ? true : stored === 'true';

  calcifiedEl.addEventListener('change', () => {
    localStorage.setItem(STORAGE_KEY_CALCIFIED, calcifiedEl.checked);
    applyCalcifiedBadges(calcifiedEl.checked);
    recalculate();
  });

  applyCalcifiedBadges(calcifiedEl.checked);

  renderStatBadges();
  restoreInputs();

  const storedAB = localStorage.getItem(STORAGE_KEY_AUTO_BALANCED);
  if (storedAB && (BOILERS[storedAB] || TURBINES[storedAB])) setAutoBalance(storedAB);

  const inputs = document.querySelectorAll('.calc-input');
  inputs.forEach(input => input.addEventListener('input', () => {
    saveInputs();
    recalculate();
  }));

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-auto-for]');
    if (!btn) return;
    const id = btn.dataset.autoFor;
    setAutoBalance(autoBalancedId === id ? null : id);
    recalculate();
  });

  document.getElementById('btn-reset-inputs').addEventListener('click', () => {
    setAutoBalance(null);
    resetInputs();
    recalculate();
  });

  recalculate();
});
