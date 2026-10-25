const WORDS_AR = ['قمر', 'نجمة', 'صقر', 'نخلة', 'بحر', 'شمس', 'غيمة', 'وردة', 'جبل', 'فراشة', 'أسد', 'قوس', 'مطر', 'كوكب'];
const WORDS_EN = ['moon', 'star', 'falcon', 'palm', 'ocean', 'sun', 'cloud', 'rose', 'river', 'tiger', 'comet', 'rain', 'maple', 'rocket'];

function rand(n: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

/** A memorable child secret such as «قمر-صقر-47» (passes the server's strength rules). */
export function suggestSecret(lang: string): string {
  const words = lang === 'en' ? WORDS_EN : WORDS_AR;
  const a = words[rand(words.length)];
  let b = words[rand(words.length)];
  while (b === a) b = words[rand(words.length)];
  return `${a}-${b}-${10 + rand(90)}`;
}

/** Mirrors validateChildSecret in the Edge Function for instant feedback. */
export function secretProblem(secret: string): string | null {
  const s = secret.normalize('NFKC').trim();
  if (s.length < 6) return 'secret_too_short';
  if (s.length > 64) return 'secret_too_long';
  if (/^(.)\1+$/u.test(s)) return 'secret_too_simple';
  const lower = s.toLowerCase();
  if (['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl'].some((q) => q.includes(lower))) return 'secret_too_simple';
  if (['password', '123456', '654321', '111111', '000000', '121212'].includes(lower)) return 'secret_too_simple';
  return null;
}

export function suggestUsername(name: string, taken: string[]): string {
  const map: Record<string, string> = {
    ا: 'a', أ: 'a', إ: 'e', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh', د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's',
    ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
    ي: 'y', ى: 'a', ة: 'a', ؤ: 'o', ئ: 'e', ء: '',
  };
  let base = [...name.normalize('NFKD').replace(/[ً-ٰٟ]/g, '')]
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (base.length < 3) base = `hero${base}`;
  base = base.slice(0, 20);
  let candidate = base;
  let i = 2;
  while (taken.includes(candidate)) candidate = `${base}${i++}`;
  return candidate;
}
