# PalletFlow

**Interactive 3D pallet packing optimizer for layout planning, visual validation, and packing strategy exploration.**

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" />
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-R3F%20%2B%20Drei-black?logo=three.js" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?logo=tailwind-css&logoColor=white" />
</p>

<p align="center">
  <a href="https://pallet-flow-tau.vercel.app/"><strong>Live Demo</strong></a>
</p>

https://github.com/user-attachments/assets/69524dda-1866-41db-80ac-53af6760eddc

## Table of Contents

- [Overview](#overview)
- [Why I Built It](#why-i-built-it)
- [Features](#features)
- [Screenshots](#screenshots)
- [Technical Design](#technical-design)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Typical Workflow](#typical-workflow)
- [Repository Structure](#repository-structure)
- [Acknowledgements](#acknowledgements)

---

## Overview

PalletFlow is a personal portfolio project built around a practical spatial optimization problem: placing boxes on a pallet in a way that is configurable, explainable, and easy to inspect visually.

The application exposes the full workflow through a product-style interface — users can define pallet constraints, create reusable box templates, run packing strategies, and inspect the result in both 3D and top-down views with live metrics and visibility feedback.

## Why I Built It

When I was younger, I worked in a warehouse and regularly saw pallets being built by hand. Watching boxes get stacked and arranged, I kept thinking there had to be an algorithm behind it.

That curiosity led me to the [bin packing problem](https://en.wikipedia.org/wiki/Bin_packing_problem), a classic optimization problem centered on fitting objects efficiently within constrained space. PalletFlow is my own take on that idea. It doesn't claim to solve the full problem in a mathematically complete way, but it explores a practical approach to optimizing pallet layouts through heuristics, visualization, and interactive inspection.

## Features

| Feature | Description |
| --- | --- |
| **3D Pallet Visualization** | Inspect generated layouts in an interactive 3D scene built with React Three Fiber and Three.js. |
| **Top-Down Validation** | Review footprint placement layer by layer in a simplified 2D view. |
| **Packing Strategy Abstraction** | Switch between internal packing approaches through a single public API. |
| **Preset Management** | Save and reuse common box definitions directly in the browser. |
| **Live Metrics** | Review utilization, height usage, weight, and efficiency after each optimization run. |
| **Visibility Analysis** | Distinguish between side-visible, top-only, and hidden boxes to better interpret accessibility. |

## Screenshots

### Main Optimizer View

<p align="center">
  <img width="850" alt="Main optimizer dashboard" src="https://github.com/user-attachments/assets/9495485a-0e3b-4784-b444-5ca9db9ac9a7" />
</p>

Shows the main workflow: pallet configuration, box template management, 3D scene rendering, and the optimization insights sidebar.

### Top-Down Inspection View

<p align="center">
  <img width="575" alt="Top-down pallet inspection view" src="https://github.com/user-attachments/assets/10c8bfb2-26b4-4990-b54b-3a4d0efca607" />
</p>

Used to validate layer organization and footprint placement from a simplified overhead perspective.

### Preset Management

<p align="center">
  <img width="850" alt="Preset management interface" src="https://github.com/user-attachments/assets/0faa6b42-44f0-45d0-b60d-519f09fb2c39" />
</p>

Supports creating, editing, and reusing common box definitions without leaving the application.

---

## Technical Design

### Architecture

The project is organized so rendering, UI state, and algorithm logic remain separate and readable:

- `app/` — page composition and application metadata
- `components/` — UI surfaces, controls, and visualization layers
- `lib/packing.ts` — public packing entry point used by the application
- `lib/packing.greedy.ts` / `lib/packing.layered.ts` — the two algorithm implementations
- `lib/` — shared types, defaults, storage helpers, and UI utilities

This keeps the application easy to reason about and lets the UI evolve independently from the packing engine.

### Packing Strategies
 
| Strategy | File | Role |
| --- | --- | --- |
| **Greedy** | `lib/packing.greedy.ts` | Builds the pallet incrementally by finding the next best placement for each box and committing to it before placing the next one. |
| **Layered** | `lib/packing.layered.ts` | Builds more structured layouts with stronger emphasis on layer composition and stacking. |
 
Both strategies feed the same rendering and reporting pipeline, keeping the rest of the application decoupled from implementation details.
 
### Optimization Modes
 
| Mode | Strategy | Description | Best For | Algorithm |
| --- | --- | --- | --- | --- |
| **Fast placement** | Greedy | Prioritizes speed and quickly evaluates candidate positions to produce a layout fast. | Rapid iteration and quick what-if checks. | Greedy |
| **Optimized stacking** | Layered | Emphasizes structured layer composition and steadier stacking behavior. | Deliberate layouts where stack organization matters. | Layered |
 

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

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
npm run dev
```

Open [`http://localhost:3000`](http://localhost:3000) in your browser.

### Validation Commands

```bash
npm run lint       # Lint the codebase
npm run typecheck  # Run TypeScript checks
npm run check      # Run all checks
```

## Typical Workflow

1. Start from the default pallet configuration and sample box set.
2. Adjust dimensions, height limits, weight limits, or overflow tolerance.
3. Add new box types or reuse saved presets.
4. Run the optimizer.
5. Inspect the result in the 3D scene and the top-down layout view.
6. Review packing metrics and warning states.

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

## Acknowledgements

- [Next.js](https://nextjs.org/) for the application framework
- [React](https://react.dev/) and [TypeScript](https://www.typescriptlang.org/) for the frontend foundation
- [Three.js](https://threejs.org/), [React Three Fiber](https://docs.pmnd.rs/react-three-fiber), and [Drei](https://github.com/pmndrs/drei) for 3D rendering and interaction
- [Lucide](https://lucide.dev/) for the icon set
