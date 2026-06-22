import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const hideLaunchShell = () => {
  const launchShell = document.getElementById('app-launch-shell');
  if (!launchShell) return;

  launchShell.classList.add('is-hidden');
  window.setTimeout(() => launchShell.remove(), 220);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.requestAnimationFrame(() => {
  window.requestAnimationFrame(hideLaunchShell);
});
