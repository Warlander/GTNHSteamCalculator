// GTNH Steam Calculator — Turbine module
// No imports. No DOM access. Pure calculation only.

function calculateTurbine(turbine, count) {
  return {
    steamConsumed: count * turbine.steamPerTick,
    euGenerated:   count * turbine.euPerTick,
  };
}

export function calculateTurbines(turbines, counts) {
  let steamConsumed = 0;
  let euGenerated   = 0;
  for (const [id, turbine] of Object.entries(turbines)) {
    const result = calculateTurbine(turbine, counts[id] ?? 0);
    steamConsumed += result.steamConsumed;
    euGenerated   += result.euGenerated;
  }
  return { steamConsumed, euGenerated };
}
