export default {
  '**/*.{ts,svelte}?(x)': () => 'tsc -p tsconfig.json --noEmit',
  '**/*.{js,ts,svelte,mjs}': 'eslint . --fix'
}
