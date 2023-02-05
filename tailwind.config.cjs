module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  future: {
    hoverOnlyWhenSupported: true
  },
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#efe5fd',
          100: '#d5c0fa',
          200: '#b995f7',
          300: '#9a67f6',
          400: '#8040f4',
          500: '#6305f0',
          600: '#5600ea',
          700: '#4000e2',
          800: '#2200dd',
          900: '#0000d8'
        },
        bitcoin: {
          orange: '#f2a900'
        },
        utility: {
          success: '#39F35B',
          error: '#FF1F39',
          pending: '#FCBA04'
        },
        black: '#000000',
        white: '#ffffff',
        transparent: 'transparent'
      },
      screens: {
        tall: { raw: '(min-height: 900px)' }
      }
    }
  },
  variants: {
    width: ['responsive', 'hover', 'focus']
  },
  plugins: [],
  darkMode: 'class'
}
