(function () {
  var key = document.documentElement.dataset.themeStorageKey || 'static-page-template-theme';
  var toggle = document.querySelector('[data-theme-toggle]');

  function currentTheme() {
    var theme = document.documentElement.dataset.theme;
    return theme === 'dark' ? 'dark' : 'light';
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(key, theme);
    } catch (error) {}
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  }
})();
