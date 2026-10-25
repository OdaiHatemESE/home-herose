import * as React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeartHandshake, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MedalTrack } from '@/components/brand/MedalTrack';
import { LevelBadge } from '@/components/brand/LevelBadge';
import { TrophyMark } from '@/components/brand/Logo';

const DEMO_LEVELS = [
  { id: 'b', code: 'bronze', name_ar: 'البرونزي', name_en: 'Bronze', icon: '🥉', color: 'bronze', min_percent: 60, is_active: true },
  { id: 's', code: 'silver', name_ar: 'الفضي', name_en: 'Silver', icon: '🥈', color: 'silver', min_percent: 75, is_active: true },
  { id: 'g', code: 'gold', name_ar: 'الذهبي', name_en: 'Gold', icon: '🥇', color: 'gold', min_percent: 90, is_active: true },
];

export function Landing() {
  const { t } = useTranslation();
  // a single orchestrated moment: the star travels along the ribbon once on load
  const [p, setP] = React.useState(8);
  React.useEffect(() => {
    const id = setTimeout(() => setP(93), 350);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <div>
          <h1 className="font-display text-[clamp(3rem,9vw,5.6rem)] leading-[1.05] text-plum-600 dark:text-plum-200">{t('landing.heroTitle')}</h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">{t('landing.heroBody')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary">
              <Link to="/register">{t('landing.startFamily')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">{t('landing.parentLogin')}</Link>
            </Button>
          </div>
          <Link
            to="/child-login"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-gold-100 py-2 ps-2 pe-5 font-medium text-gold-800 transition-colors hover:bg-gold-300/60 dark:bg-gold-400/15 dark:text-gold-300"
          >
            <span className="grid size-10 place-items-center rounded-full bg-gold-400 text-xl text-plum-900" aria-hidden>
              ⭐
            </span>
            {t('landing.childLogin')}
          </Link>
        </div>

        {/* the week, as a child sees it */}
        <div className="relative">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-plum-100 via-rose-100 to-gold-100 opacity-70 blur-2xl dark:from-plum-900 dark:via-plum-950 dark:to-plum-900" />
          <div className="surface rounded-[var(--radius-hero)] p-6 shadow-[var(--shadow-lift)] sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-full bg-sky-100 text-3xl" aria-hidden>🦅</span>
                <div>
                  <p className="font-display text-2xl">{t('child.hello')}</p>
                  <p className="text-sm text-muted">{t('progress.weekly')}</p>
                </div>
              </div>
              <TrophyMark className="size-12" />
            </div>
            <MedalTrack percent={p} levels={DEMO_LEVELS} size="lg" className="mt-4" />
            <div className="mt-2 flex items-center justify-between">
              <LevelBadge level={p >= 90 ? DEMO_LEVELS[2] : DEMO_LEVELS[0]} />
              <span className="text-2xl font-semibold tabular-nums">{p}%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10" aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">{t('landing.howTitle')}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { icon: KeyRound, title: t('landing.how1Title'), body: t('landing.how1Body'), tone: 'text-sky-500' },
            { icon: Sparkles, title: t('landing.how2Title'), body: t('landing.how2Body'), tone: 'text-gold-600' },
            { icon: TrophyIcon, title: t('landing.how3Title'), body: t('landing.how3Body'), tone: 'text-plum-500' },
          ].map((s, i) => (
            <div key={i} className="border-s-4 border-plum-200 ps-4 dark:border-plum-700">
              <s.icon className={`size-7 ${s.tone}`} aria-hidden />
              <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="my-10 rounded-[var(--radius-hero)] bg-plum-900 px-6 py-8 text-white sm:px-10" aria-labelledby="values">
        <h2 id="values" className="flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="size-6 text-gold-300" aria-hidden />
          {t('landing.valuesTitle')}
        </h2>
        <ul className="mt-4 grid gap-3 text-plum-100 sm:grid-cols-3">
          {[t('landing.values1'), t('landing.values2'), t('landing.values3')].map((v) => (
            <li key={v} className="flex gap-2">
              <HeartHandshake className="mt-1 size-5 shrink-0 text-rose-500" aria-hidden />
              {v}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function TrophyIcon({ className }: { className?: string }) {
  return <TrophyMark className={className} />;
}
