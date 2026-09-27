// Sets the theme attributes before first paint so there's no flash of the wrong theme.
// Kept as an external file so the Content-Security-Policy needs no inline scripts.
(function () {
  var root = document.documentElement;
  var theme = 'classic';
  var mode = 'system';
  try {
    theme = localStorage.getItem('sp.theme') || theme;
    mode = localStorage.getItem('sp.mode') || mode;
  } catch (e) {
    /* storage can be blocked; defaults are fine */
  }
  var dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-app-theme', theme);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
})();
