# GTNH Steam Calculator

A browser-based calculator for planning boiler and steam turbine setups in [GT: New Horizons](https://www.gtnewhorizons.com), a GregTech-based Minecraft modpack.

Enter the number of boilers and turbines you have (or plan to build) and the tool instantly shows your steam production, steam consumption, surplus/deficit, and EU/t output.

> **Note:** This is a small experiment in AI-assisted engineering. The logic, data values, and UI were developed with AI tooling and outputs have been manually compared against in-game examples and in-game tooltips to verify correctness.

Verified against modpack version **2.8.4**.

---

## Features

- **Early game singleblock boilers supported**

- **Singleblock steam turbines supported**

- **Calcification toggle** — simulate the long-term output reduction of solar boilers (output drops to 1/3rd over time)

- **Steam balance display** — shows generated vs. consumed steam and whether you have a surplus or deficit

- **Deficit-aware EU output** — when steam supply falls short, the displayed EU/t reflects what the turbines can actually sustain rather than their theoretical maximum

- **Persistent inputs** — your boiler/turbine counts and settings are saved in `localStorage` so they survive page reloads

---

## How values were derived

Steam rates match the values shown in in-game tooltips (L/s). Turbine steam consumption is calculated from first principles:

```
steamConsumed (L/t) = (netEU/t + inherentLoss) × 2 L/EU ÷ efficiency
```

Results were cross-checked against in-game examples to confirm accuracy.

---

## Project structure

```
index.html              — UI layout (Bootstrap 5 dark theme)
css/custom.css          — Styling overrides and result card colours
js/config.json          — Boiler and turbine data (steam rates, EU/t, efficiency values)
js/boiler-calc.js       — Pure boiler calculation module (no DOM)
js/turbine-calc.js      — Pure turbine calculation module (no DOM)
js/persistence.js       — localStorage save/restore/reset for inputs and settings
js/main.js              — DOM orchestration: reads inputs, calls calc modules, renders results
```

---

## Running locally

No build step required - serve the folder with any static file server:

```bash
npx serve .
# or
python -m http.server
```

---

## Why?

I just wanted to have a quickly made, simple to use, easily accessible calculator for early game steam setups, while also having fun with a new software development tech. I might extend it later, but for now it suits my needs and hopefully others will find it useful as well! :)

I typically wouldn't leave so many comments in the code, but I'm aware LLM's likes comments in code for extra context, so I left the ones I feel make sense to be there.