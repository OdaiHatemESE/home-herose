import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { WEBSITE_URL } from './config';

/** Where e-mail links (confirm address, reset password) should land inside this app. */
export function appLink(path: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = String(Constants.expoConfig?.experiments?.baseUrl ?? '').replace(/\/$/, '');
    return `${window.location.origin}${base}${path}`;
  }
  return Linking.createURL(path);
}

/** Opens a page of the current website (screens not converted yet). */
export async function openWebsite(hashPath: string) {
  const url = `${WEBSITE_URL}#${hashPath}`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}
