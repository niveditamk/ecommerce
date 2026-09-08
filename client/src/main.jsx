import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { StoreProvider } from './context/StoreContext';

import './styles/core.css';
import './styles/views.css';
import './styles/admin.css';
import './styles/ml.css';
import './styles/viz.css';
/* Retro-Futuristic Commerce Terminal stylesheet — loaded last so its tokens govern the system. */
import './styles/terminal.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>
);
