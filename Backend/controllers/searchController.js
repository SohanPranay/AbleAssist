exports.handleSearch = (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: "Empty query" });

  const lower = query.toLowerCase();

  if (lower.startsWith("open website")) {
    const site = lower.replace("open website", "").trim();
    const url = site.startsWith("http") ? site : `https://${site}`;
    return res.json({ action: "redirect", url });
  }

  return res.json({
    action: "search",
    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
  });
};
