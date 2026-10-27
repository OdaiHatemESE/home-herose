import AsyncStorage from '@react-native-async-storage/async-storage';

/** Small per-device preferences (language, theme, remembered family code). Never family data. */
type Key = 'lang' | 'theme' | 'family-code' | 'pending-invite';

export async function getPref(key: Key): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`hh-${key}`);
  } catch {
    return null;
  }
}

export async function setPref(key: Key, value: string | null): Promise<void> {
  try {
    if (value === null) await AsyncStorage.removeItem(`hh-${key}`);
    else await AsyncStorage.setItem(`hh-${key}`, value);
  } catch {
    /* storage unavailable: preferences are optional */
  }
}
