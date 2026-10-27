// Supabase project for Home Heroes. The publishable key is public by design:
// every table is protected by Row Level Security and privileged work runs in Edge Functions.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://lxnoqfbtaaplcaypqsgb.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_vGID9JGJo8Aqeh4oUEbUpg_4sb_EaXI';

/** The current (React) website. Screens not yet converted open their page there. */
export const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://odaihatemese.github.io/home-herose/';

/** Marks the local demo / QA build (never set in the published app). */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
