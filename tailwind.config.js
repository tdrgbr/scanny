/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './components/**/*.{js,ts,tsx}', './screens/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        anton: ['Anton-Regular'], 
        brico: ['Bricolage-Regular'],
        'brico-bold': ['Bricolage-Bold'],
      },
    },
  },
  plugins: [],
};
