// Main script shared by pages.
// Keep all behaviors guarded by element existence so each page can safely load this file.

// API Configuration
const API_BASE = "https://ableassist-project.onrender.com";

// ----- index.html: intro overlay -> reveal homepage smoothly -----
(function initIndexIntroReveal() {
  try {
    if (!document.body || document.body.id !== 'indexPage') return;

    const intro = document.querySelector('.intro');
    const site = document.querySelector('.site');
    const searchBar = document.querySelector('.search-bar');

    // If there is no intro, nothing to do.
    if (!intro) return;

    // Ensure the main site becomes interactive even if CSS animation timings drift.
    const finish = () => {
      try {
        if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
      } catch (_) {}
      if (site) {
        site.style.opacity = '1';
        site.style.pointerEvents = 'auto';
      }
      if (searchBar) searchBar.style.pointerEvents = 'auto';
      // restore scrolling in case any CSS attempted to lock it
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };

    // Prefer waiting for the intro animation to end (smoothest).
    let done = false;
    const onEnd = (e) => {
      if (done) return;
      if (e && e.target !== intro.querySelector('h1')) return;
      done = true;
      finish();
    };
    const introH1 = intro.querySelector('h1');
    if (introH1) introH1.addEventListener('animationend', onEnd, { once: true });

    // Safety fallback: guarantee reveal even if animationend doesn't fire.
    window.setTimeout(() => {
      if (done) return;
      done = true;
      finish();
    }, 1900);
  } catch (e) {
    // As a last resort, don't leave the user on a blank screen.
    try {
      const intro = document.querySelector('.intro');
      if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
    } catch (_) {}
  }
})();

// ----- index.html: Guide me button -> camera + mic operations page -----
document.addEventListener('DOMContentLoaded', function () {
  const guideMeBtn = document.querySelector('.btn-primary');
  if (guideMeBtn && guideMeBtn.textContent.trim() === 'Guide me') {
    guideMeBtn.addEventListener('click', function () {
      window.location.href = 'voice.html';
    });
  }
});

// ----- index.html: About us modal toggle -----
document.addEventListener('DOMContentLoaded', function () {
  try {
    if (!document.body || document.body.id !== 'indexPage') return;
    const aboutBtn = Array.from(document.querySelectorAll('.btn-secondary')).find(b => (b.textContent || '').trim().toLowerCase() === 'about us');
    const modal = document.getElementById('aboutModal');
    const closeBtn = document.getElementById('aboutCloseBtn');
    if (aboutBtn && modal) {
      aboutBtn.addEventListener('click', function () {
        modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
      });
    }
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
      });
    }
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          modal.style.display = 'none';
          modal.setAttribute('aria-hidden', 'true');
        }
      });
    }
  } catch (_) {}
});

// ----- index1.html: Search bar with client-side handling -----
document.addEventListener('DOMContentLoaded', function () {
  const homeSearch = document.getElementById('indexSearchInput');
  if (homeSearch) {
    homeSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = homeSearch.value.trim();
        if (!query) return;

        handleSearch(query);
      }
    });

    function handleSearch(query) {
      const lower = query.toLowerCase();

      // OPEN WEBSITE COMMAND
      if (lower.startsWith('open ')) {
        let site = lower.replace('open ', '').trim();

        if (!site.startsWith('http')) {
          site = 'https://' + site;
        }

        window.open(site, '_blank');
        return;
      }

      // DIRECT WEBSITE NAME (youtube, google, etc.)
      const knownSites = {
        youtube: 'https://www.youtube.com',
        google: 'https://www.google.com',
        wikipedia: 'https://www.wikipedia.org'
      };

      if (knownSites[lower]) {
        window.open(knownSites[lower], '_blank');
        return;
      }

      // BACKEND API SEARCH
      fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
          if (data.results && data.results.length > 0) {
            // Open first result in new tab
            window.open(data.results[0].url || data.results[0], '_blank');
          } else {
            // Fallback to Google search if no results
            const googleSearch =
              'https://www.google.com/search?q=' + encodeURIComponent(query);
            window.open(googleSearch, '_blank');
          }
        })
        .catch(error => {
          console.error('Search API error:', error);
          // Fallback to Google search on error
          const googleSearch =
            'https://www.google.com/search?q=' + encodeURIComponent(query);
          window.open(googleSearch, '_blank');
        });
    }
  }
});
