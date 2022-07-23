/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface Platform {}
	interface Session {
		credentials: string | { node: string; rune: string }
	}
	// interface Stuff {}
}

declare namespace svelte.JSX {
	interface HTMLAttributes<T> {
		onswipe?: (event: string) => void
	}
}
