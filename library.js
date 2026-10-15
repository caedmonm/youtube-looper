(function (root) {
  "use strict";
  const PREFIX = "saved-loop:";
  function isLoop(loop) {
    return loop && typeof loop.id === "string" && typeof loop.videoId === "string" &&
      /^[\w-]+$/.test(loop.videoId) && typeof loop.name === "string" && typeof loop.title === "string" &&
      Number.isFinite(loop.start) && loop.start >= 0 && Number.isFinite(loop.end) && loop.end - loop.start >= 0.2 - 1e-8;
  }
  function list(data, videoId) {
    return Object.entries(data).filter(([key, loop]) => key.startsWith(PREFIX) && isLoop(loop) && key === PREFIX + loop.id && (!videoId || loop.videoId === videoId))
      .map(([, loop]) => loop).sort((a, b) => a.videoId.localeCompare(b.videoId) || a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));
  }
  function url(loop) {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(loop.videoId)}&t=${Math.floor(loop.start)}s#practice-loop=${encodeURIComponent(loop.id)}`;
  }
  const api = { PREFIX, isLoop, list, url };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PracticeLoopLibrary = api;
})(globalThis);
