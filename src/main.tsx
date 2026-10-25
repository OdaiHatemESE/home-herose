import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/readex-pro';
import '@fontsource/lalezar/arabic.css';
import '@fontsource/lalezar/latin.css';
import './i18n';
import './index.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
