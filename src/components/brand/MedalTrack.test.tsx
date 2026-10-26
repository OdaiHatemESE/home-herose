import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MedalTrack } from './MedalTrack';
import { setLanguage } from '@/i18n';

const levels = [
  { id: 'g', code: 'gold', name_ar: 'الذهبي', name_en: 'Gold', icon: '🥇', color: 'gold', min_percent: 90, is_active: true },
  { id: 's', code: 'silver', name_ar: 'الفضي', name_en: 'Silver', icon: '🥈', color: 'silver', min_percent: 75, is_active: true },
  { id: 'n', code: 'growing', name_ar: 'في طريق التميز', name_en: 'Growing', icon: '🌱', color: 'green', min_percent: 0, is_active: true },
];

describe('MedalTrack', () => {
  it('exposes progress accessibly and pins only threshold medals', () => {
    setLanguage('ar');
    render(<MedalTrack percent={82.4} levels={levels} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '82');
    expect(screen.getByTitle('الفضي')).toBeInTheDocument();
    expect(screen.getByTitle('الذهبي')).toBeInTheDocument();
    expect(screen.queryByTitle('في طريق التميز')).toBeNull(); // 0% is the floor, not a medal
  });

  it('clamps out-of-range values', () => {
    render(<MedalTrack percent={140} levels={levels} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
