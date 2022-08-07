export default {
	'**/*.ts?(x)': () => 'tsc -p tsconfig.json --noEmit',
	'*.{js,ts,svelte,html,css}': 'prettier --ignore-unknown --write',
	'*{js,ts,svelte,html,css}': 'eslint --fix'
}
