import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { reloadOnceForNewVersion } from './utils/chunkReload'
// Vite fires this when a lazy chunk/CSS fails to load (usually a stale build after a deploy).
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
