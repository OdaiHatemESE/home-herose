import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('CSV export', () => {
  it('starts with a BOM and quotes special characters', () => {
    const csv = toCsv([{ name: 'تُقى', note: 'قال "أحسنت", ثم ابتسم' }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"قال ""أحسنت"", ثم ابتسم"');
  });

  it('neutralises spreadsheet formula injection', () => {
    const csv = toCsv([{ v: '=HYPERLINK("x")' }, { v: '+1' }, { v: '-2' }, { v: '@SUM(A1)' }]);
    expect(csv).not.toMatch(/\r\n=HYPERLINK/);
    expect(csv).toContain("'+1");
    expect(csv).toContain("'@SUM(A1)");
  });

  it('uses custom column labels', () => {
    expect(toCsv([{ a: 1 }], [{ key: 'a', label: 'النقاط' }])).toBe('﻿النقاط\r\n1');
  });
});
