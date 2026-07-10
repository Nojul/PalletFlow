// custom.d.ts
// Ambient module declarations for CSS in Next.js / TypeScript

// Side-effect CSS imports (e.g., import './globals.css')
declare module "*.css" {}

// CSS modules (e.g., import styles from './styles.module.css')
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}
