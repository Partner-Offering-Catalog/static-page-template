(function () {
  'use strict';

  /**
   * Mobile navigation disclosure. The button stays hidden until this script
   * runs, so a browser without JavaScript keeps the nav permanently visible.
   */
  function setUpNavToggle() {
    var toggle = document.querySelector('[data-nav-toggle]');
    var nav = document.getElementById('site-nav');
    if (!toggle || !nav) {
      return;
    }

    var query = window.matchMedia('(max-width: 1023px)');

    function apply() {
      if (query.matches) {
        toggle.hidden = false;
        nav.dataset.navOpen = toggle.getAttribute('aria-expanded') === 'true' ? 'true' : 'false';
      } else {
        toggle.hidden = true;
        delete nav.dataset.navOpen;
      }
    }

    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      nav.dataset.navOpen = open ? 'false' : 'true';
    });

    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', apply);
    } else if (typeof query.addListener === 'function') {
      query.addListener(apply);
    }

    apply();
  }

  /**
   * Browse filtering for the offering catalog: keyword search plus facet
   * checkboxes, matching the pattern used on Microsoft Learn browse pages.
   * Without JavaScript the controls stay hidden and every card is listed.
   */
  function setUpBrowse() {
    var browse = document.querySelector('[data-browse]');
    if (!browse) {
      return;
    }

    var form = browse.querySelector('[data-browse-form]');
    var search = browse.querySelector('[data-browse-search]');
    var filters = browse.querySelector('[data-browse-filters]');
    var filterToggle = browse.querySelector('[data-browse-filter-toggle]');
    var count = browse.querySelector('[data-browse-count]');
    var empty = browse.querySelector('[data-browse-empty]');
    var cards = Array.prototype.slice.call(browse.querySelectorAll('[data-browse-card]'));

    browse.dataset.browseReady = 'true';
    if (form) {
      form.hidden = false;
    }
    if (filters) {
      filters.hidden = false;
    }

    function activeFilters() {
      var selected = {};
      var boxes = browse.querySelectorAll('.facet input[type="checkbox"]:checked');
      for (var i = 0; i < boxes.length; i += 1) {
        var box = boxes[i];
        if (!selected[box.name]) {
          selected[box.name] = [];
        }
        selected[box.name].push(box.value);
      }
      return selected;
    }

    function matchesFacet(card, name, values) {
      var raw = card.getAttribute('data-' + name);
      if (!raw) {
        return false;
      }
      var owned = raw.split('|');
      for (var i = 0; i < values.length; i += 1) {
        if (owned.indexOf(values[i]) !== -1) {
          return true;
        }
      }
      return false;
    }

    function apply() {
      var term = search && search.value ? search.value.trim().toLowerCase() : '';
      var selected = activeFilters();
      var names = Object.keys(selected);
      var visible = 0;

      for (var i = 0; i < cards.length; i += 1) {
        var card = cards[i];
        var show = true;

        if (term && (card.getAttribute('data-search') || '').indexOf(term) === -1) {
          show = false;
        }

        for (var n = 0; show && n < names.length; n += 1) {
          if (!matchesFacet(card, names[n], selected[names[n]])) {
            show = false;
          }
        }

        card.hidden = !show;
        if (show) {
          visible += 1;
        }
      }

      if (count) {
        count.textContent = visible + (visible === 1 ? ' offering' : ' offerings');
      }
      if (empty) {
        empty.hidden = visible !== 0;
      }
    }

    function clearAll() {
      var boxes = browse.querySelectorAll('.facet input[type="checkbox"]');
      for (var i = 0; i < boxes.length; i += 1) {
        boxes[i].checked = false;
      }
      if (search) {
        search.value = '';
      }
      apply();
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        apply();
      });
    }
    if (search) {
      search.addEventListener('input', apply);
    }
    browse.addEventListener('change', function (event) {
      if (event.target && event.target.matches('.facet input[type="checkbox"]')) {
        apply();
      }
    });
    browse.addEventListener('click', function (event) {
      if (event.target && event.target.closest('[data-browse-clear]')) {
        clearAll();
      }
    });

    if (filterToggle && filters) {
      var query = window.matchMedia('(max-width: 1099px)');

      function applyFilterToggle() {
        if (query.matches) {
          filterToggle.hidden = false;
          filters.dataset.filtersOpen = filterToggle.getAttribute('aria-expanded') === 'true' ? 'true' : 'false';
        } else {
          filterToggle.hidden = true;
          delete filters.dataset.filtersOpen;
        }
      }

      filterToggle.addEventListener('click', function () {
        var open = filterToggle.getAttribute('aria-expanded') === 'true';
        filterToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
        filters.dataset.filtersOpen = open ? 'false' : 'true';
      });

      if (typeof query.addEventListener === 'function') {
        query.addEventListener('change', applyFilterToggle);
      } else if (typeof query.addListener === 'function') {
        query.addListener(applyFilterToggle);
      }

      applyFilterToggle();
    }

    apply();
  }

  /**
   * Tables are wrapped in a focusable scroll region at build time so keyboard
   * users can always reach the scroll area. Where a table actually fits, the
   * tab stop is pure noise, so drop it again — and re-check on resize.
   */
  function setUpTableScrollers() {
    var regions = document.querySelectorAll('.table-scroll');
    if (!regions.length) {
      return;
    }

    function sync() {
      for (var i = 0; i < regions.length; i += 1) {
        var region = regions[i];
        if (region.scrollWidth > region.clientWidth + 1) {
          region.setAttribute('tabindex', '0');
          region.setAttribute('role', 'region');
        } else {
          region.removeAttribute('tabindex');
          region.removeAttribute('role');
        }
      }
    }

    sync();
    window.addEventListener('resize', sync);
  }

  setUpNavToggle();
  setUpBrowse();
  setUpTableScrollers();
})();
