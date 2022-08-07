export default {
	'**/*.{ts,svelte}': 'tsc -p tsconfig.json --noEmit',
	'**/*.{js,ts,svelte,html,css}': 'prettier --ignore-unknown --write',
	'**/*.{js,ts,svelte,html,css}': 'eslint --fix'
}
