// shadcn-svelte components (copy-owned, see src/lib/ui/{component}/index.ts for each)
// Import individual components directly from their folders for tree-shaking:
//   import { Button } from '$lib/ui/button';
//   import * as Card from '$lib/ui/card';
//
// This barrel re-exports project-owned layout components only.

// Project-owned layout components
export { default as Sidebar } from './Sidebar.svelte';
export { default as BottomNav } from './BottomNav.svelte';
export { default as TopBar } from './TopBar.svelte';
