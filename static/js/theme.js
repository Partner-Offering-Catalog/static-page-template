(function () {
  var key = 'static-page-template-theme';
  var toggle = document.querySelector('[data-theme-toggle]');

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(key, theme);
    } catch (error) {}
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
    });
  }
})();
