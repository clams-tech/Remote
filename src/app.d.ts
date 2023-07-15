/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
  // interface Locals {}
  // interface Platform {}
  // interface Session {}
  // interface Stuff {}
}

declare namespace svelteHTML {
  interface HTMLAttributes {
    'on:swipe'?: (event: string) => void
  }
}

declare interface Window {
  __TAURI__: boolean
}

declare module 'light-bolt11-decoder'
