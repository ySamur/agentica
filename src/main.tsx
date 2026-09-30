import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/golos-text';
import '@fontsource-variable/cormorant/wght-italic.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import App from './app/App';
import './styles.css';
import './account.css';
import './landing.css';
import './guide.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
