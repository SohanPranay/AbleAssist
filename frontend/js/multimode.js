// multimode.js - MultiMode search functionality

// API Configuration
const API_BASE = "https://ableassist-project.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const multiSearch = document.getElementById("voiceSearch");

  if (!multiSearch) {
    console.error("MultiMode search bar not found");
    return;
  }

  // When user presses ENTER
  multiSearch.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleMultiModeSearch(multiSearch.value);
    }
  });
});

function handleMultiModeSearch(query) {
  if (!query || query.trim() === "") return;

  const text = query.trim().toLowerCase();

  // If user types a website or says "open youtube"
  if (text.startsWith("open ")) {
    const site = text.replace("open ", "").trim();
    openWebsite(site);
    return;
  }

  // If user types directly like "youtube"
  if (!text.includes(" ")) {
    openWebsite(text);
    return;
  }

  // BACKEND API SEARCH
  fetch(`${API_BASE}/search?q=${encodeURIComponent(text)}`)
    .then(response => response.json())
    .then(data => {
      if (data.results && data.results.length > 0) {
        // Open first result in new tab
        window.open(data.results[0].url || data.results[0], '_blank');
      } else {
        // Fallback to Google search if no results
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
        window.open(googleUrl, "_blank");
      }
    })
    .catch(error => {
      console.error('MultiMode search API error:', error);
      // Fallback to Google search on error
      const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
      window.open(googleUrl, "_blank");
    });
}

function openWebsite(name) {
  let url = name;

  // If no protocol, add https
  if (!url.startsWith("http")) {
    url = "https://www." + url;
  }

  // If no domain ending after www., add .com
  // Check if there's no dot after the protocol and www
  const urlWithoutProtocol = url.replace(/^https?:\/\/(www\.)?/, '');
  if (!urlWithoutProtocol.includes(".")) {
    url += ".com";
  }

  window.open(url, "_blank");
}

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

// Minimal keydown handler for the voice/multimode search box (Enter-only)
const voiceSearchInput = document.getElementById("voiceSearchInput");

if (voiceSearchInput) {
  voiceSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = voiceSearchInput.value.trim().toLowerCase();
      if (!query) return;

      handleSearchQuery(query);
    }
  });
}

function handleSearchQuery(query) {
  if (query.includes("youtube")) {
    window.open("https://www.youtube.com", "_blank");
    return;
  }

  window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank");
}
