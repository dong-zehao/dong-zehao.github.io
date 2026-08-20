(function () {
  'use strict';

  var sectionUpdatePending = false;

  function normalizePath(value) {
    var path = (value || '/').split('#')[0].split('?')[0];
    if (!path.startsWith('/')) path = '/' + path;
    return path.replace(/index\.html$/, '').replace(/\/+$/, '') || '/';
  }

  function updateNavigation() {
    var current = normalizePath(window.location.pathname);
    document.querySelectorAll('.site-page[data-path]').forEach(function (link) {
      var target = normalizePath(link.getAttribute('data-path'));
      if (target === current) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function updateBodyPageClass() {
    if (!document.body) return;
    var current = normalizePath(window.location.pathname);
    var segments = current.split('/').filter(Boolean);
    var pageName = current === '/' ? 'home' : (segments[segments.length - 1] || 'page');
    pageName = pageName.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();

    Array.prototype.slice.call(document.body.classList).forEach(function (className) {
      if (className.indexOf('site-page-') === 0) document.body.classList.remove(className);
    });
    document.body.classList.add('site-page-' + pageName);
  }

  function getSectionLinks() {
    return Array.prototype.slice.call(document.querySelectorAll('.section-nav a[href^="#"]'));
  }

  function getSectionId(link) {
    var href = link && link.getAttribute('href');
    if (!href || href.charAt(0) !== '#') return '';
    try {
      return decodeURIComponent(href.slice(1));
    } catch (error) {
      return href.slice(1);
    }
  }

  function getSectionOffset() {
    var header = document.querySelector('#page_header');
    var sectionNav = document.querySelector('.section-nav');
    var headerHeight = header ? header.getBoundingClientRect().height : 0;
    var navHeight = sectionNav ? sectionNav.getBoundingClientRect().height : 0;
    return headerHeight + navHeight + 20;
  }

  function setActiveSection(activeId) {
    getSectionLinks().forEach(function (link) {
      if (getSectionId(link) === activeId) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function updateSectionNavigation() {
    sectionUpdatePending = false;
    var links = getSectionLinks();
    if (!links.length) return;

    var threshold = getSectionOffset() + 8;
    var activeId = '';
    links.forEach(function (link) {
      var id = getSectionId(link);
      var target = id && document.getElementById(id);
      if (target && target.getBoundingClientRect().top <= threshold) activeId = id;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      activeId = getSectionId(links[links.length - 1]);
    }
    setActiveSection(activeId);
  }

  function scheduleSectionUpdate() {
    if (sectionUpdatePending) return;
    sectionUpdatePending = true;
    window.requestAnimationFrame(updateSectionNavigation);
  }

  function scrollToSection(link, target) {
    var id = getSectionId(link);
    var top = window.scrollY + target.getBoundingClientRect().top - getSectionOffset();
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (link.focus) link.focus({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
    if (id && window.location.hash !== '#' + id) window.history.pushState(null, '', '#' + id);
    setActiveSection(id);
  }

  function upgradePublicationAbstracts() {
    document.querySelectorAll('.publications-page .pub-abstract').forEach(function (abstract) {
      if (abstract.closest('details')) return;

      var details = document.createElement('details');
      details.className = 'pub-abstract-details';
      var summary = document.createElement('summary');
      summary.textContent = 'Abstract';
      details.appendChild(summary);
      abstract.parentNode.insertBefore(details, abstract);
      details.appendChild(abstract);
    });
    document.querySelectorAll('.publications-page .abstract-toggle').forEach(function (toggle) {
      toggle.remove();
    });
  }

  function updateMenuState() {
    var header = document.querySelector('.header_wrap');
    var button = document.querySelector('.menus_icon');
    if (!header || !button) return;
    window.setTimeout(function () {
      button.setAttribute('aria-expanded', header.classList.contains('menus-open') ? 'true' : 'false');
    }, 0);
  }

  function initializeSite() {
    updateBodyPageClass();
    updateNavigation();
    upgradePublicationAbstracts();
    updateMenuState();
    updateSectionNavigation();
  }

  document.addEventListener('DOMContentLoaded', initializeSite);
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('.section-nav a[href^="#"]');
    if (!link) return;
    var id = getSectionId(link);
    var target = id && document.getElementById(id);
    if (!target) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    scrollToSection(link, target);
  }, true);
  document.addEventListener('click', function (event) {
    if (event.target.closest('.menus_icon') || event.target.closest('.site-page')) updateMenuState();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    var header = document.querySelector('.header_wrap');
    var button = document.querySelector('.menus_icon');
    if (header) header.classList.remove('menus-open');
    if (button) button.setAttribute('aria-expanded', 'false');
  });

  window.addEventListener('scroll', scheduleSectionUpdate, { passive: true });
  window.addEventListener('resize', scheduleSectionUpdate);
  window.addEventListener('popstate', function () {
    var id = window.location.hash.slice(1);
    var link = getSectionLinks().find(function (item) { return getSectionId(item) === id; });
    var target = id && document.getElementById(id);
    if (link && target) scrollToSection(link, target);
    else scheduleSectionUpdate();
  });

  if (window.jQuery) {
    window.jQuery(document).on('pjax:end', initializeSite);
  }
})();
