import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  safelist: [
    'bg-slate-50',
    'text-slate-700',
    'text-slate-800',
    'text-slate-900',
    'border-slate-200',
    'shadow-sm'
  ],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px'
      }
    },
    extend: {
      colors: {
        wellness: {
          blue: '#2A7FBA',
          teal: '#71C1B8',
          gold: '#E9C46A',
          violet: '#A78BFA',
          cream: '#FAFAFA',
          slate: '#334155'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'Inter', 'sans-serif']
      },
      animation: {
        'breathe': 'breathe 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.8s ease-out',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        'calm-wiggle': 'calm-wiggle 5s ease-in-out infinite',
        'ease-pop': 'ease-pop 0.35s ease-out',
        'slow-fade': 'slow-fade 1.5s ease-out',
        'slide-up': 'slide-up 0.6s ease-out'
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' }
        },
        'calm-wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '50%': { transform: 'rotate(1.3deg)' }
        },
        'ease-pop': {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'slow-fade': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: [
    forms,
    typography,
    containerQueries
  ]
};
