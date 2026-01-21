// multimode.js - MultiMode page utilities (non-search)

// Reuse homepage search behavior on multimode page
(function () {
  const homeSearch = document.getElementById('indexSearchInput');
  if (!homeSearch) return;
  if (homeSearch.dataset.boundHomeSearch === '1') return;
  homeSearch.dataset.boundHomeSearch = '1';

  homeSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const query = homeSearch.value.trim();
      if (!query) return;

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
  });
})();

// Local filter for multimode gesture list (page-specific, no side effects)
const multimodeSearch = document.getElementById("multimodeSearch");

if (multimodeSearch) {
  multimodeSearch.addEventListener("input", () => {
    const query = multimodeSearch.value.toLowerCase();

    const items = document.querySelectorAll(".multimode-gesture");

    items.forEach(item => {
      const text = item.innerText.toLowerCase();
      item.style.display = text.includes(query) ? "" : "none";
    });
  });
}

