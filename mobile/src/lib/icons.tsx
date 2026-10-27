import * as React from 'react';
import type { LucideIcon } from 'lucide-react-native';
// Deep imports keep the bundle small (one file per icon instead of the whole set).
import CircleCheckBig from 'lucide-react-native/icons/circle-check-big';
import Bed from 'lucide-react-native/icons/bed';
import BookOpen from 'lucide-react-native/icons/book-open';
import House from 'lucide-react-native/icons/house';
import MoonStar from 'lucide-react-native/icons/moon-star';
import BookHeart from 'lucide-react-native/icons/book-heart';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Backpack from 'lucide-react-native/icons/backpack';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Rocket from 'lucide-react-native/icons/rocket';
import LayoutGrid from 'lucide-react-native/icons/layout-grid';
import Clock from 'lucide-react-native/icons/clock';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import Users from 'lucide-react-native/icons/users';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MessageCircleHeart from 'lucide-react-native/icons/message-circle-heart';
import Heart from 'lucide-react-native/icons/heart';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import Puzzle from 'lucide-react-native/icons/puzzle';
import Sprout from 'lucide-react-native/icons/sprout';
import HeartHandshake from 'lucide-react-native/icons/heart-handshake';
import Handshake from 'lucide-react-native/icons/handshake';
import HandHeart from 'lucide-react-native/icons/hand-heart';
import Star from 'lucide-react-native/icons/star';
import Shirt from 'lucide-react-native/icons/shirt';
import Utensils from 'lucide-react-native/icons/utensils';
import Trash from 'lucide-react-native/icons/trash';
import Recycle from 'lucide-react-native/icons/recycle';
import Leaf from 'lucide-react-native/icons/leaf';
import Dog from 'lucide-react-native/icons/dog';
import Car from 'lucide-react-native/icons/car';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import Music from 'lucide-react-native/icons/eighth-notes';
import Palette from 'lucide-react-native/icons/palette';
import Brush from 'lucide-react-native/icons/brush';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Droplets from 'lucide-react-native/icons/droplets';
import Flower2 from 'lucide-react-native/icons/flower-2';
import ToyBrick from 'lucide-react-native/icons/toy-brick';
import Target from 'lucide-react-native/icons/target';
import Smile from 'lucide-react-native/icons/face-slightly-smiling';
import { brand, type Palette as ThemePalette } from './theme';

/** Icons parents pick for tasks, categories and skills. Keys are stored in the database (same as the website). */
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
  trash: Trash,
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

export function DynamicIcon({ name, size = 20, color, strokeWidth = 2 }: { name: string | null | undefined; size?: number; color: string; strokeWidth?: number }) {
  const Icon = (name && ICONS[name]) || CircleCheckBig;
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
}

/** Brand colour keys stored in the database → tile / text / solid colours. */
export type Tone = { tileBg: string; tileFg: string; text: string; solid: string; solidFg: string; hex: string };

export function colorStyle(key: string | null | undefined, c: ThemePalette): Tone {
  const d = c.dark;
  const map: Record<string, Tone> = {
    gold: { tileBg: d ? 'rgba(242,183,5,0.15)' : brand.gold100, tileFg: d ? brand.gold300 : brand.gold800, text: d ? brand.gold300 : brand.gold600, solid: brand.gold400, solidFg: brand.plum900, hex: brand.gold400 },
    purple: { tileBg: d ? 'rgba(109,63,214,0.2)' : brand.plum100, tileFg: d ? brand.plum200 : brand.plum700, text: d ? brand.plum200 : brand.plum600, solid: brand.plum500, solidFg: '#fff', hex: brand.plum500 },
    blue: { tileBg: d ? 'rgba(47,123,234,0.2)' : brand.sky100, tileFg: d ? brand.sky100 : brand.sky500, text: brand.sky500, solid: brand.sky500, solidFg: '#fff', hex: brand.sky500 },
    green: { tileBg: d ? 'rgba(31,169,113,0.2)' : brand.leaf100, tileFg: d ? brand.leaf100 : brand.leaf500, text: brand.leaf500, solid: brand.leaf500, solidFg: '#fff', hex: brand.leaf500 },
    pink: { tileBg: d ? 'rgba(240,90,155,0.2)' : brand.rose100, tileFg: d ? brand.rose100 : brand.rose500, text: brand.rose500, solid: brand.rose500, solidFg: '#fff', hex: brand.rose500 },
    silver: { tileBg: d ? 'rgba(169,180,198,0.2)' : brand.slate100, tileFg: d ? '#E2E8F0' : brand.slate600, text: '#64748B', solid: brand.silver400, solidFg: brand.plum900, hex: brand.silver400 },
    bronze: { tileBg: d ? 'rgba(192,116,61,0.2)' : brand.orange100, tileFg: d ? '#FED7AA' : brand.bronze500, text: brand.bronze500, solid: brand.bronze500, solidFg: '#fff', hex: brand.bronze500 },
  };
  return map[key ?? ''] ?? map.purple;
}

export const COLOR_KEYS = ['gold', 'purple', 'blue', 'green', 'pink', 'silver', 'bronze'] as const;

/** Child avatars: friendly emblems (never pictures of children). Same keys as the website. */
export const AVATARS: Record<string, string> = {
  star: '⭐', rocket: '🚀', lion: '🦁', falcon: '🦅', turtle: '🐢', cat: '🐱', butterfly: '🦋', moon: '🌙',
  sun: '☀️', rainbow: '🌈', crown: '👑', palm: '🌴', camel: '🐪', dolphin: '🐬', unicorn: '🦄', robot: '🤖',
  football: '⚽', paint: '🎨', book: '📚', flower: '🌸',
};
export const AVATAR_KEYS = Object.keys(AVATARS);
export function avatarEmoji(key: string | null | undefined) {
  return AVATARS[key ?? ''] ?? key ?? '⭐';
}
