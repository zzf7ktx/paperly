export function keepPopupToolActive() {
  try {
    return window.localStorage.getItem('paperly-auto-close-tool-popups') === 'true';
  } catch {
    return false;
  }
}
