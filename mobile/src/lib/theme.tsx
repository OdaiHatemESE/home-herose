import * as React from 'react';
import { useColorScheme } from 'react-native';
import { getPref, setPref } from './prefs';

/** Brand palette — the same tokens as the web app (gold achievement, plum progress, sky responsibility, leaf completion, rose encouragement). */
export const brand = {
  ink: '#241B3D',
  paper: '#FBF8FF',
  gold50: '#FFF8E1',
  gold100: '#FFEFB3',
  gold300: '#FFD54A',
  gold400: '#F2B705',
  gold600: '#C98A00',
  gold800: '#7A5300',
  plum50: '#F4EFFF',
  plum100: '#E9E0FF',
  plum200: '#D4C3FF',
  plum400: '#9A76F0',
  plum500: '#6D3FD6',
  plum600: '#5A2FBD',
  plum700: '#46229A',
  plum900: '#241B3D',
  plum950: '#16112A',
  sky100: '#DDEAFE',
  sky500: '#2F7BEA',
  leaf100: '#D5F5E7',
  leaf500: '#1FA971',
  emerald800: '#065F46',
  rose100: '#FDE0EE',
  rose500: '#F05A9B',
  silver400: '#A9B4C6',
  slate100: '#F1F5F9',
  slate600: '#475569',
  bronze500: '#C0743D',
  orange100: '#FFEDD5',
  red50: '#FEF2F2',
  red200: '#FECACA',
  red600: '#DC2626',
  red800: '#991B1B',
  white: '#FFFFFF',
};

export type Palette = {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  fg: string;
  muted: string;
  primary: string;
  primaryText: string;
  accentText: string;
  overlay: string;
};

const light: Palette = {
  dark: false,
  bg: brand.paper,
  surface: '#FFFFFF',
  surface2: '#F4EFFF',
  border: '#E6DEFA',
  fg: brand.ink,
  muted: '#6B6386',
  primary: brand.plum500,
  primaryText: brand.plum600,
  accentText: brand.gold800,
  overlay: 'rgba(22,17,42,0.5)',
};

const dark: Palette = {
  dark: true,
  bg: brand.plum950,
  surface: '#211A3B',
  surface2: '#2B2349',
  border: '#3A3060',
  fg: '#F3EFFC',
  muted: '#B5ABD3',
  primary: brand.plum400,
  primaryText: brand.plum200,
  accentText: brand.gold300,
  overlay: 'rgba(0,0,0,0.6)',
};

export const F = {
  regular: 'Readex400',
  medium: 'Readex500',
  semibold: 'Readex600',
  bold: 'Readex700',
  display: 'Lalezar',
};

export const R = { control: 12, card: 18, hero: 28 };

export const shadow = {
  soft: {
    shadowColor: '#46229A',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  lift: {
    shadowColor: '#46229A',
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
};

type Mode = 'light' | 'dark' | 'system';
type ThemeCtx = { c: Palette; mode: Mode; toggle: () => void };
const Ctx = React.createContext<ThemeCtx>({ c: light, mode: 'system', toggle: () => {} });

export function ThemeProvider({ children, initialMode }: { children: React.ReactNode; initialMode: Mode }) {
  const system = useColorScheme();
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const value = React.useMemo<ThemeCtx>(
    () => ({
      c: isDark ? dark : light,
      mode,
      toggle: () => {
        const next: Mode = isDark ? 'light' : 'dark';
        setMode(next);
        void setPref('theme', next);
      },
    }),
    [isDark, mode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => React.useContext(Ctx);

export async function loadThemeMode(): Promise<Mode> {
  const m = await getPref('theme');
  return m === 'dark' || m === 'light' ? m : 'system';
}
