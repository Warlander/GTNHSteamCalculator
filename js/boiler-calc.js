// GTNH Steam Calculator — Boiler module
// No imports. No DOM access. Pure calculation only.

function calculateBoiler(boiler, count, calcified, ticksPerSecond) {
  const rateLS = (calcified && boiler.calcifiedPerSecond !== undefined)
    ? boiler.calcifiedPerSecond
    : boiler.steamPerSecond;
  return count * (rateLS / ticksPerSecond);
}

export function calculateBoilers(boilers, counts, calcified = false, ticksPerSecond = 20) {
  let steamGenerated = 0;
  for (const [id, boiler] of Object.entries(boilers)) {
    steamGenerated += calculateBoiler(boiler, counts[id] ?? 0, calcified, ticksPerSecond);
  }
  return { steamGenerated };
}
