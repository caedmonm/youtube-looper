(function (root) {
  "use strict";
  const MIN_LOOP = 0.2;
  function parseTime(value) {
    const text = String(value).trim();
    if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(text)) return null;
    const parts = text.split(":").map(Number);
    if (parts.length > 1 && parts.slice(1).some(part => part >= 60)) return null;
    const seconds = parts.reduce((total, part) => total * 60 + part, 0);
    return Number.isFinite(seconds) ? seconds : null;
  }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00.000";
    const ms = Math.round(seconds * 1000);
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor(ms / 60000) % 60;
    const secs = String(Math.floor(ms / 1000) % 60).padStart(2, "0");
    const fraction = String(ms % 1000).padStart(3, "0");
    return `${hours ? hours + ":" + String(minutes).padStart(2, "0") : Math.floor(ms / 60000)}:${secs}.${fraction}`;
  }
  function validRange(start, end, duration) {
    return Number.isFinite(duration) && duration > 0 && Number.isFinite(start) &&
      Number.isFinite(end) && start >= 0 && end <= duration && end - start >= MIN_LOOP - 1e-8;
  }
  function videoId(url) {
    const parsed = new URL(url);
    return parsed.pathname === "/watch" ? parsed.searchParams.get("v") : null;
  }
  const api = { MIN_LOOP, parseTime, formatTime, validRange, videoId };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PracticeLoopCore = api;
})(globalThis);
