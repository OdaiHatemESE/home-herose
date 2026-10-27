import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { brand, useTheme } from '@/lib/theme';

/** Circular weekly progress (0–100) with content in the middle, e.g. the child's emblem. */
export function ProgressRing({ percent, size = 96, stroke = 9, children }: { percent: number | null; size?: number; stroke?: number; children?: React.ReactNode }) {
  const { c } = useTheme();
  const p = Math.max(0, Math.min(100, percent ?? 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const id = React.useId().replace(/:/g, '');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`ring${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={brand.plum500} />
            <Stop offset="0.6" stopColor={brand.rose500} />
            <Stop offset="1" stopColor={brand.gold400} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.dark ? 'rgba(154,118,240,0.18)' : brand.plum100} strokeWidth={stroke} fill="none" />
        {p > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#ring${id})`}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(circ * p) / 100} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}
