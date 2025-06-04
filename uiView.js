// UiViewer.js
export function LoadingPage() {
  const div = document.createElement('div');
  div.id = 'loading-page';
  Object.assign(div.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    backgroundColor: '#ffffff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '1000'
  });
  const txt = document.createElement('div');
  txt.textContent = 'Loading…';
  txt.style.fontSize = '24px';
  txt.style.color = '#333';
  div.appendChild(txt);
  document.body.appendChild(div);
}

export function HideLoadingPage() {
  const div = document.getElementById('loading-page');
  if (div) div.remove();
}
