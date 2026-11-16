import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#34D399',
      light: '#6EE7B7',
      dark: '#2ECD8F',
      contrastText: '#0A0A0B',
    },
    secondary: {
      main: '#00D4AA',
      contrastText: '#0A0A0B',
    },
    error: {
      main: '#F43F5E',
      dark: '#E11D48',
    },
    warning: {
      main: '#FBBF24',
    },
    background: {
      default: '#0A0A0B',
      paper: '#111113',
    },
    text: {
      primary: '#EDEDEF',
      secondary: '#A1A1AA',
      disabled: '#71717A',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: [
      'Geist',
      'Plus Jakarta Sans',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      'sans-serif',
    ].join(','),
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: '0.75rem',
        },
        containedPrimary: {
          backgroundColor: '#34D399',
          color: '#0A0A0B',
          '&:hover': {
            backgroundColor: '#2ECD8F',
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#18181B',
          borderRadius: '0.75rem',
          '& fieldset': {
            borderColor: 'rgba(255, 255, 255, 0.08)',
          },
          '&:hover fieldset': {
            borderColor: '#34D399',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#34D399',
            borderWidth: '2px',
          },
        },
        input: {
          color: '#EDEDEF',
          '&::placeholder': {
            color: '#71717A',
            opacity: 1,
          },
        },
      },
    },
  },
});

export default theme;
