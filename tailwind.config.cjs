module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  future: {
    hoverOnlyWhenSupported: true
  },
  theme: {
    extend: {
      colors: {
        purple: {
          50: '#DFCCFF',
          100: '#C099FF',
          200: '#A066FF',
          300: '#904DFF',
          400: '#8133FF',
          500: '#7400FF',
          600: '#4E00CC',
          700: '#4400B3',
          800: '#310080',
          900: '#270066'
        },
        bitcoin: {
          orange: '#f2a900',
          yellow: '#FFF300'
        },
        utility: {
          // success: '#39F35B',
          error: '#FF1F39',
          // pending: '#FCBA04'
          success: '#31FF00',
          // error: '#FF0031',
          pending: '#FFCE00'
        },
        black: '#000000',
        white: '#ffffff',
        neutral: {
          50: '#fafafa',
          900: '#171717'
        },
        transparent: 'transparent'
      },
      screens: {
        xs: '420px'
      },
      height: {
        screen: ['100vh', '100dvh']
      }
    }
  },
  variants: {
    width: ['responsive', 'hover', 'focus']
  },
  plugins: [require('@tailwindcss/forms')]
}
