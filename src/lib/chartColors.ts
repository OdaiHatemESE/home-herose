export const CHART_HEX: Record<string, string> = {
  gold: '#E0A800',
  purple: '#6D3FD6',
  blue: '#2F7BEA',
  green: '#1FA971',
  pink: '#F05A9B',
  silver: '#8A97AD',
  bronze: '#C0743D',
};
export const SERIES = ['#6D3FD6', '#F05A9B', '#2F7BEA', '#1FA971', '#E0A800', '#C0743D', '#8A97AD'];
export function colorHex(key: string | null | undefined, i = 0) {
  return CHART_HEX[key ?? ''] ?? SERIES[i % SERIES.length];
}
