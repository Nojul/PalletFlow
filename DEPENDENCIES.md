# Dependency Inventory

This document records the purpose and licensing posture of every direct dependency declared in [package.json](package.json).

## Summary

- All current direct dependencies use permissive licenses: MIT, ISC, or Apache-2.0.
- These licenses are generally safe for personal projects, public GitHub repositories, portfolio work, and commercial use.
- No direct dependency uses GPL, AGPL, SSPL, or another strong copyleft license.
- `zustand` was removed as an unused direct dependency during the publication pass. It still appears transitively through the React Three Fiber ecosystem.

## Runtime Dependencies

| Package | Purpose | Website | Documentation | License | Commercial use | Attribution required | Modifications required | Actively maintained |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `next` | React application framework, routing, build pipeline | https://nextjs.org | https://nextjs.org/docs | MIT | Yes | No | No | Yes |
| `react` | Component runtime for the UI | https://react.dev | https://react.dev/reference/react | MIT | Yes | No | No | Yes |
| `react-dom` | Browser DOM renderer for React | https://react.dev | https://react.dev/reference/react-dom | MIT | Yes | No | No | Yes |
| `three` | Low-level 3D rendering engine | https://threejs.org | https://threejs.org/docs | MIT | Yes | No | No | Yes |
| `@react-three/fiber` | React renderer for Three.js scenes | https://github.com/pmndrs/react-three-fiber | https://docs.pmnd.rs/react-three-fiber | MIT | Yes | No | No | Yes |
| `@react-three/drei` | Utility helpers and controls for React Three Fiber | https://github.com/pmndrs/drei | https://docs.pmnd.rs/drei | MIT | Yes | No | No | Yes |
| `lucide-react` | SVG icon set used throughout the UI | https://lucide.dev | https://lucide.dev/guide/packages/lucide-react | ISC | Yes | No | No | Yes |

## Development Dependencies

| Package | Purpose | Website | Documentation | License | Commercial use | Attribution required | Modifications required | Actively maintained |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `typescript` | Static typing and compiler tooling | https://www.typescriptlang.org | https://www.typescriptlang.org/docs | Apache-2.0 | Yes | Preserve license and notices when redistributing TypeScript itself | No | Yes |
| `tailwindcss` | Utility-first styling framework | https://tailwindcss.com | https://tailwindcss.com/docs | MIT | Yes | No | No | Yes |
| `postcss` | CSS transformation pipeline | https://postcss.org | https://postcss.org/docs | MIT | Yes | No | No | Yes |
| `autoprefixer` | Adds vendor prefixes to generated CSS | https://github.com/postcss/autoprefixer | https://github.com/postcss/autoprefixer#readme | MIT | Yes | No | No | Yes |
| `eslint` | JavaScript and TypeScript linting | https://eslint.org | https://eslint.org/docs/latest | MIT | Yes | No | No | Yes |
| `eslint-config-next` | Next.js-specific ESLint rules and config | https://nextjs.org | https://nextjs.org/docs/app/building-your-application/configuring/eslint | MIT | Yes | No | No | Yes |
| `@types/node` | Type declarations for Node.js APIs | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/node | MIT | Yes | No | No | Yes |
| `@types/react` | Type declarations for React | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react | MIT | Yes | No | No | Yes |
| `@types/react-dom` | Type declarations for React DOM | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom | https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-dom | MIT | Yes | No | No | Yes |

## License Verification Notes

### Safe for personal projects

Yes. Every current direct dependency uses a permissive license.

### Safe for public GitHub repositories

Yes. None of the direct dependencies impose source-sharing obligations on this repository.

### Safe for portfolio projects

Yes. The current dependency set is suitable for public portfolio and resume projects.

### Safe for commercial use

Yes. MIT, ISC, and Apache-2.0 all allow commercial use.

### Restrictions or special handling

- `typescript` uses Apache-2.0. This is still commercial-friendly, but if you redistribute TypeScript itself you must preserve the applicable license and notice terms.
- DefinitelyTyped packages such as `@types/node`, `@types/react`, and `@types/react-dom` are MIT-licensed and commonly used in open-source and commercial projects.

## Packages Removed or Reviewed

- `zustand`: not imported anywhere in the application source. It was removed from direct dependencies and remains only as a transitive dependency of the React Three Fiber stack.