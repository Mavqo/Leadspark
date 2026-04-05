/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/runtime/client/index.js';
  const component: AstroComponentFactory;
  export default component;
}