# PalletFlow

**Interactive 3D pallet packing optimizer for layout planning, visual validation, and packing strategy exploration.**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D-black?logo=three.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4?logo=tailwindcss&logoColor=white)
![App Router](https://img.shields.io/badge/App_Router-Next.js-111111)

<p align="center">
  <img src="docs/media/home-optimizer.png" alt="PalletFlow optimizer dashboard" width="31%" />
  <img src="docs/media/top-down-view.png" alt="PalletFlow top-down inspection" width="31%" />
  <img src="docs/media/box-presets.png" alt="PalletFlow preset manager" width="31%" />
</p>

---

## Project Overview

PalletFlow is a personal portfolio project built around a practical spatial optimization problem: placing boxes on a pallet in a way that is configurable, explainable, and easy to inspect visually.

The application exposes the full workflow through a product-style interface: users can define pallet constraints, create reusable box templates, run packing strategies, and inspect the result in both 3D and top-down views with live metrics and visibility feedback.

---

## Demo

<p align="center">
  <strong>Live Demo:</strong> add deployment URL here
  <br />
  <strong>Walkthrough Video:</strong> add demo video URL here
</p>

Suggested media assets for publication:

- `docs/media/home-optimizer.png`
- `docs/media/top-down-view.png`
- `docs/media/box-presets.png`
- `docs/media/palletflow-demo.mp4`

---

## What the Application Does

PalletFlow allows a user to:

- configure pallet dimensions, height limits, weight limits, and edge overflow tolerance
- define box templates with size, weight, quantity, and color
- reuse saved presets through local browser storage
- run the packing engine using interchangeable internal strategies
- inspect the output in both 3D and 2D views
- review packing metrics, visibility states, and warning conditions

The result is a tool that is part algorithm sandbox and part product interface.

---

## Why I Built It

When I was younger, I worked in a warehouse and regularly saw pallets being built by hand. Watching boxes get stacked and arranged, I kept thinking there had to be an algorithm behind it.

That curiosity led me to the [bin packing problem](https://en.wikipedia.org/wiki/Bin_packing_problem), a classic optimization problem centered on fitting objects efficiently within constrained space. PalletFlow is my own take on that idea. It does not claim to solve the full problem in a mathematically complete way, but it explores a practical approach to optimizing pallet layouts through heuristics, visualization, and interactive inspection.

---

## Feature Highlights

| Feature | Description |
| --- | --- |
| 3D Pallet Visualization | Inspect generated layouts in an interactive 3D scene built with React Three Fiber and Three.js. |
| Top-Down Validation | Review footprint placement layer by layer in a simplified 2D view. |
| Packing Strategy Abstraction | Switch between internal packing approaches through a single public API. |
| Preset Management | Save and reuse common box definitions directly in the browser. |
| Live Metrics | Review utilization, height usage, weight, and efficiency after each optimization run. |
| Visibility Analysis | Distinguish between side-visible, top-only, and hidden boxes to better interpret accessibility. |

---

## Screenshots

### Main Optimizer View

<p align="center">
  <img src="docs/media/home-optimizer.png" width="850" alt="Main optimizer dashboard" />
</p>

Shows the main workflow: pallet configuration, box template management, 3D scene rendering, and the optimization insights sidebar.

### Top-Down Inspection View

<p align="center">
  <img src="docs/media/top-down-view.png" width="850" alt="Top-down pallet inspection view" />
</p>

Used to validate layer organization and footprint placement from a simplified overhead perspective.

### Preset Management

<p align="center">
  <img src="docs/media/box-presets.png" width="850" alt="Preset management interface" />
</p>

Supports creating, editing, and reusing common box definitions without leaving the application.

---

## Technical Design

### Architecture

The project is organized so that rendering, UI state, and algorithm logic remain separate and readable:

- `app/` contains page composition and application metadata
- `components/` contains UI surfaces, controls, and visualization layers
- `lib/packing.ts` provides the public packing entry point used by the application
- `lib/packing.greedy.ts` and `lib/packing.layered.ts` contain the two algorithm implementations
- shared types, defaults, storage helpers, and UI utilities are kept in `lib/`

This keeps the application easy to reason about and lets the UI evolve independently from the packing engine.

### Packing Strategies

| Strategy | File | Role |
| --- | --- | --- |
| Greedy | `lib/packing.greedy.ts` | Evaluates candidate placements incrementally and selects high-scoring positions. |
| Layered | `lib/packing.layered.ts` | Builds more structured layouts with stronger emphasis on layer composition and stacking. |

Both strategies feed the same rendering and reporting pipeline, which keeps the rest of the application decoupled from implementation details.

### Engineering Focus

- algorithm-oriented problem solving inside dedicated packing modules
- strong TypeScript typing for pallets, templates, placements, and metrics
- lightweight client-side persistence without introducing unnecessary backend complexity
- interactive 3D rendering integrated into a real application workflow rather than a standalone graphics demo
- maintainable separation between public APIs and internal heuristics

---

## Tech Stack

| Category | Technology |
| --- | --- |
| Framework | Next.js 14 |
| Frontend | React 18 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| 3D Rendering | Three.js |
| React 3D Layer | React Three Fiber, Drei |
| Tooling | ESLint, PostCSS |

---

## Local Development

### Prerequisites

- Node.js 18+
- npm 9+

### Start the Application

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Validation Commands

```bash
npm run lint
npm run typecheck
npm run check
```

---

## Typical Workflow

1. Start from the default pallet configuration and sample box set.
2. Adjust dimensions, height limits, weight limits, or overflow tolerance.
3. Add new box types or reuse saved presets.
4. Run the optimizer.
5. Inspect the result in the 3D scene and the top-down layout view.
6. Review packing metrics and warning states.

---

## Repository Structure

```text
app/
  layout.tsx             Root layout and metadata
  page.tsx               Main application composition
components/
  AboutUsPage.tsx        Informational secondary page
  BoxManager.tsx         Box template creation and editing
  BoxPresetsManager.tsx  Preset management UI
  OptimizerSidebar.tsx   Metrics, warnings, and actions
  PalletConfigPanel.tsx  Pallet configuration controls
  PalletScene.tsx        3D scene rendering
  TopDownView.tsx        2D inspection view
  TopNavigation.tsx      Section navigation
lib/
  homePage.ts            Home-page defaults and derived view helpers
  packing.ts             Public packing API and summary helpers
  packing.greedy.ts      Greedy packing implementation
  packing.layered.ts     Layer-oriented packing implementation
  presetStorage.ts       Preset persistence helpers
  types.ts               Shared domain types
  ui.ts                  Shared UI constants and form helpers
docs/
  media/                 Screenshot and demo asset directory
```

---

## Acknowledgements

- Next.js for the application framework
- React and TypeScript for the frontend foundation
- Three.js, React Three Fiber, and Drei for 3D rendering and interaction
- Lucide for the icon set