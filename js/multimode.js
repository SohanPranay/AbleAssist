// multimode.js - MultiMode search functionality

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

  // Otherwise do Google search
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
  window.open(googleUrl, "_blank");
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
