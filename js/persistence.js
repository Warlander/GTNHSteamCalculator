// GTNH Steam Calculator — Persistence module
// Handles localStorage save/restore/reset for calculator inputs and settings.

const STORAGE_KEY_INPUTS    = 'gtnh-calc-inputs';
export const STORAGE_KEY_CALCIFIED = 'gtnh-calcified-solar';

export function saveInputs() {
  const data = {};
  document.querySelectorAll('.calc-input').forEach(input => { data[input.id] = input.value; });
  localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(data));
}

export function restoreInputs() {
  const raw = localStorage.getItem(STORAGE_KEY_INPUTS);
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { return; }
  Object.entries(data).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

export function resetInputs() {
  document.querySelectorAll('.calc-input').forEach(el => { el.value = '0'; });
  localStorage.removeItem(STORAGE_KEY_INPUTS);
}
