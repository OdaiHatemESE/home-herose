import * as React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useDir } from '@/i18n';
import { F, useTheme } from '@/lib/theme';
import { Row, T } from './ui';

type Series = { key: string; label: string; color: string; values: (number | null)[] };

/** Small percentage line chart (0–100) for weekly trends; mirrors for Arabic like the website's chart. */
export function LineChart({ labels, series, height = 220 }: { labels: string[]; series: Series[]; height?: number }) {
  const { c } = useTheme();
  const dir = useDir();
  const [width, setWidth] = React.useState(0);
  const padStart = 34;
  const padEnd = 10;
  const padTop = 10;
  const padBottom = 26;
  const plotW = Math.max(0, width - padStart - padEnd);
  const plotH = height - padTop - padBottom;
  const n = labels.length;
  const xAt = (i: number) => {
    const frac = n <= 1 ? 0.5 : i / (n - 1);
    return dir.rtl ? width - padStart - frac * plotW : padStart + frac * plotW;
  };
  const yAt = (v: number) => padTop + plotH * (1 - Math.max(0, Math.min(100, v)) / 100);
  const axisX = dir.rtl ? width - padStart + 6 : padStart - 6;

  return (
    <View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
        {width > 0 && (
          <Svg width={width} height={height}>
            {[0, 25, 50, 75, 100].map((v) => (
              <G key={v}>
                <Line x1={dir.rtl ? 0 : padStart} x2={dir.rtl ? width - padStart : width - padEnd} y1={yAt(v)} y2={yAt(v)} stroke={c.border} strokeDasharray="3 3" />
                <SvgText x={axisX} y={yAt(v) + 4} fontSize={10.5} fill={c.muted} textAnchor={dir.rtl ? 'start' : 'end'} fontFamily={F.regular}>
                  {String(v)}
                </SvgText>
              </G>
            ))}
            {labels.map((l, i) =>
              i % (n > 6 && width < 420 ? 2 : 1) === 0 ? (
                <SvgText key={l + i} x={xAt(i)} y={height - 6} fontSize={10.5} fill={c.muted} textAnchor="middle" fontFamily={F.regular}>
                  {l}
                </SvgText>
              ) : null,
            )}
            {series.map((s) => {
              // connect points across gaps (connectNulls), as on the website
              const pts = s.values.map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) })).filter(Boolean) as { x: number; y: number }[];
              const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              return (
                <G key={s.key}>
                  {pts.length > 1 && <Path d={d} stroke={s.color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />}
                  {pts.map((p, i) => (
                    <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={s.color} />
                  ))}
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <Row wrap gap={12} justify="center" style={{ marginTop: 6 }}>
        {series.map((s) => (
          <Row key={s.key} gap={6}>
            <View style={{ width: 12, height: 3, borderRadius: 2, backgroundColor: s.color }} />
            <T size={12}>{s.label}</T>
          </Row>
        ))}
      </Row>
    </View>
  );
}
