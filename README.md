# Event history analysis visualizer

A static React + Vite + TypeScript teaching app for exploring how core event history functions relate to one another under a constant-hazard model.

## What it includes

- Study-definition form for the target population, event, time origin, time-scale, and exit rule
- A responsive four-panel figure for survival/cumulative incidence, density, hazard, and cumulative hazard
- Mirrored shared sliders inside every panel for real-time updates to the underlying study process
- Client-side calculations only, so the site can be built and deployed as static files

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Model assumption

The current implementation uses a constant hazard rate, which matches the requirement that the hazard function be constant. The same hazard-rate and follow-up controls drive all four panels so students can see how the functions remain mathematically linked.
