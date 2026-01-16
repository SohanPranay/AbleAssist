exports.processMultiModeSearch = (query) => {
  if (query.toLowerCase().startsWith("open website")) {
    return { action: "redirect", url: query.split("open website")[1].trim() };
  }
  return {
    action: "search",
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
  };
};
