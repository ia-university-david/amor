import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ScrollToTop } from './components/ScrollToTop';
import { AppProvider } from './state/AppContext';
import { registerServiceWorker } from './lib/pwa';
import './styles/global.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProvider>
        <ScrollToTop />
        <App />
      </AppProvider>
    </BrowserRouter>
  </StrictMode>,
);
