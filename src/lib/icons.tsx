import {
  Backpack, BadgeCheck, Bed, BookHeart, BookOpen, Brush, Car, CircleCheckBig, Clock, Dog, Droplets, Dumbbell,
  Flower2, Gamepad2, Heart, HeartHandshake, House, Handshake, LayoutGrid, Leaf, Lightbulb, MessageCircle,
  MessageCircleHeart, MoonStar, Music, Palette, Puzzle, Recycle, Rocket, Shirt, ShieldCheck, Sparkles, Sprout,
  Star, ToyBrick, Trash2, Users, Utensils, HandHeart, Target, Smile, type LucideIcon,
} from 'lucide-react';
import { cn } from './utils';

/** Icons parents can pick for tasks, categories, skills and family rules. Keys are stored in the database. */
export const ICONS: Record<string, LucideIcon> = {
  'check-circle': CircleCheckBig,
  bed: Bed,
  'book-open': BookOpen,
  home: House,
  'moon-star': MoonStar,
  'book-heart': BookHeart,
  sparkles: Sparkles,
  backpack: Backpack,
  'shield-check': ShieldCheck,
  rocket: Rocket,
  'layout-grid': LayoutGrid,
  clock: Clock,
  lightbulb: Lightbulb,
  users: Users,
  'message-circle': MessageCircle,
  'message-heart': MessageCircleHeart,
  heart: Heart,
  'badge-check': BadgeCheck,
  puzzle: Puzzle,
  sprout: Sprout,
  'heart-handshake': HeartHandshake,
  handshake: Handshake,
  'hand-heart': HandHeart,
  star: Star,
  shirt: Shirt,
  utensils: Utensils,
  trash: Trash2,
  recycle: Recycle,
  leaf: Leaf,
  dog: Dog,
  car: Car,
  gamepad: Gamepad2,
  music: Music,
  palette: Palette,
  brush: Brush,
  dumbbell: Dumbbell,
  droplets: Droplets,
  flower: Flower2,
  toy: ToyBrick,
  target: Target,
  smile: Smile,
};

export const ICON_KEYS = Object.keys(ICONS);

export function DynamicIcon({ name, className, strokeWidth = 2 }: { name: string | null | undefined; className?: string; strokeWidth?: number }) {
  const Icon = (name && ICONS[name]) || CircleCheckBig;
  return <Icon aria-hidden className={cn('size-5 shrink-0', className)} strokeWidth={strokeWidth} />;
}

/** Brand colour keys stored in the database → Tailwind classes. */
export const COLOR_KEYS = ['gold', 'purple', 'blue', 'green', 'pink', 'silver', 'bronze'] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

export const COLOR_STYLES: Record<string, { tile: string; text: string; ring: string; solid: string }> = {
  gold: { tile: 'bg-gold-100 text-gold-800 dark:bg-gold-400/15 dark:text-gold-300', text: 'text-gold-600 dark:text-gold-300', ring: 'ring-gold-400', solid: 'bg-gold-400 text-plum-900' },
  purple: { tile: 'bg-plum-100 text-plum-700 dark:bg-plum-500/20 dark:text-plum-200', text: 'text-plum-600 dark:text-plum-200', ring: 'ring-plum-500', solid: 'bg-plum-500 text-white' },
  blue: { tile: 'bg-sky-100 text-sky-500 dark:bg-sky-500/20 dark:text-sky-100', text: 'text-sky-500', ring: 'ring-sky-500', solid: 'bg-sky-500 text-white' },
  green: { tile: 'bg-leaf-100 text-leaf-500 dark:bg-leaf-500/20 dark:text-leaf-100', text: 'text-leaf-500', ring: 'ring-leaf-500', solid: 'bg-leaf-500 text-white' },
  pink: { tile: 'bg-rose-100 text-rose-500 dark:bg-rose-500/20 dark:text-rose-100', text: 'text-rose-500', ring: 'ring-rose-500', solid: 'bg-rose-500 text-white' },
  silver: { tile: 'bg-slate-100 text-slate-600 dark:bg-slate-400/20 dark:text-slate-200', text: 'text-slate-500', ring: 'ring-silver-400', solid: 'bg-silver-400 text-plum-900' },
  bronze: { tile: 'bg-orange-100 text-bronze-500 dark:bg-bronze-500/20 dark:text-orange-200', text: 'text-bronze-500', ring: 'ring-bronze-500', solid: 'bg-bronze-500 text-white' },
};

export function colorStyle(key: string | null | undefined) {
  return COLOR_STYLES[key ?? ''] ?? COLOR_STYLES.purple;
}

/** Child avatars: friendly emblems (no pictures of children). */
export const AVATARS: Record<string, string> = {
  star: '⭐', rocket: '🚀', lion: '🦁', falcon: '🦅', turtle: '🐢', cat: '🐱', butterfly: '🦋', moon: '🌙',
  sun: '☀️', rainbow: '🌈', crown: '👑', palm: '🌴', camel: '🐪', dolphin: '🐬', unicorn: '🦄', robot: '🤖',
  football: '⚽', paint: '🎨', book: '📚', flower: '🌸',
};
export const AVATAR_KEYS = Object.keys(AVATARS);
export function avatarEmoji(key: string | null | undefined) {
  return AVATARS[key ?? ''] ?? key ?? '⭐';
}
