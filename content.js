(() => {
  "use strict";
  if (document.getElementById("practice-loop-extension")) return;
  const { parseTime, formatTime, validRange, videoId } = PracticeLoopCore;
  const { PREFIX, list, isLoop } = PracticeLoopLibrary;
  const host = document.createElement("div");
  host.id = "practice-loop-extension";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { all: initial; position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; color-scheme: dark; font: 14px/1.45 system-ui, sans-serif; color: #edf2f7; }
      :host([hidden]) { display: none !important; }
      * { box-sizing: border-box; } [hidden] { display: none !important; }
      .panel { width: 328px; max-width: calc(100vw - 32px); background: #151c25; border: 1px solid #354353; border-radius: 18px; box-shadow: 0 12px 48px #0008; overflow: hidden; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid #2b3745; }
      .brand { display: flex; align-items: center; gap: 9px; font-weight: 700; letter-spacing: -.2px; }
      .logo { display: block; width: 26px; height: 26px; flex-shrink: 0; } .tag { color: #9aaabc; font-size: 11px; font-weight: 500; }
      button, input, select { font: inherit; } button { cursor: pointer; border: 1px solid #405164; border-radius: 8px; color: #edf2f7; background: #253140; padding: 8px 11px; } button:hover { background: #354559; } button:disabled { opacity: .4; cursor: default; }
      button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid #8ce8b8; outline-offset: 2px; }
      .collapse { border: 0; background: transparent; font-size: 18px; padding: 0 6px; } .body { padding: 16px 18px 14px; }
      .now { display: flex; justify-content: space-between; color: #a9b8c8; font-size: 12px; margin-bottom: 15px; } #position { color: #e5edf5; font-variant-numeric: tabular-nums; }
      .marker { display: grid; grid-template-columns: 22px 1fr auto; gap: 8px; align-items: center; margin-bottom: 12px; } label { font-weight: 700; color: #8ce8b8; }
      input { width: 100%; min-width: 0; color: #edf2f7; background: #0d141d; border: 1px solid #405164; border-radius: 8px; padding: 9px; font-variant-numeric: tabular-nums; }
      .adjust { grid-column: 2 / 4; display: flex; gap: 6px; margin-top: -5px; } .adjust button { font-size: 11px; padding: 3px 8px; color: #b8c8d8; background: transparent; }
      .actions { display: grid; grid-template-columns: 1fr auto; gap: 8px; margin: 16px 0 13px; } #toggle { background: #8ce8b8; border-color: #8ce8b8; color: #102b20; font-weight: 750; } #toggle:hover { background: #aaf5cd; } #toggle[aria-pressed="true"] { background: #203f33; color: #aaf5cd; }
      .settings { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #b8c8d8; } select { padding: 5px; background: #0d141d; color: #edf2f7; border: 1px solid #405164; border-radius: 6px; } #clear { border: 0; background: transparent; color: #a9b8c8; font-size: 12px; padding: 5px; }
      #status { font-size: 12px; color: #a9b8c8; min-height: 35px; margin: 13px 0 0; } #status.error { color: #ffb4aa; }
      .body { max-height: calc(100vh - 130px); overflow-y: auto; }
      .library { border-top: 1px solid #354353; margin-top: 14px; padding-top: 12px; } .library label { display: block; font-size: 12px; margin-bottom: 6px; }
      .save-row, .jump-row { display: flex; gap: 6px; margin-bottom: 8px; } .jump-row select { min-width: 0; flex: 1; width: 100%; } .jump-row button { padding: 5px 10px; }
      #loop-name { font-size: 12px; } #save-loop { white-space: nowrap; font-size: 12px; }
      footer { font-size: 10px; color: #94a6ba; padding: 10px 18px; background: #101720; } kbd { font: inherit; color: #d6e1ed; }
      .panel.compact { width: 210px; } .compact header { border: 0; } @media (max-width: 600px) { :host { right: 16px; bottom: 16px; } }
    </style>
    <section class="panel" aria-label="YouTube music practice loop">
      <header><div class="brand"><img class="logo" src="${chrome.runtime.getURL("icons/icon-48.png")}" alt=""><div>Practice Loop <span class="tag">A–B</span></div></div><button class="collapse" id="collapse" aria-label="Minimize practice controls" aria-expanded="true">−</button></header>
      <div class="body" id="body">
        <div class="now"><span>PLAYHEAD</span><output id="position">0:00.000</output></div>
        <div class="marker"><label for="start">A</label><input id="start" value="0:00.000" aria-label="Loop start time" spellcheck="false"><button id="mark-start" title="Set start to current time (Alt+Shift+A)">Set start</button><div class="adjust"><button data-nudge="start:-0.1" aria-label="Move start earlier by 0.1 seconds">−0.1s</button><button data-nudge="start:0.1" aria-label="Move start later by 0.1 seconds">+0.1s</button></div></div>
        <div class="marker"><label for="end">B</label><input id="end" placeholder="m:ss.mmm" aria-label="Loop end time" spellcheck="false"><button id="mark-end" title="Set end to current time (Alt+Shift+B)">Set end</button><div class="adjust"><button data-nudge="end:-0.1" aria-label="Move end earlier by 0.1 seconds">−0.1s</button><button data-nudge="end:0.1" aria-label="Move end later by 0.1 seconds">+0.1s</button></div></div>
        <div class="actions"><button id="toggle" aria-pressed="false">↻ Start looping</button><button id="restart" title="Play from A">↤ To start</button></div>
        <div class="settings"><span><label for="speed" style="font-weight:400;color:inherit">Speed </label><select id="speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="0.6">0.6×</option><option value="0.7">0.7×</option><option value="0.75">0.75×</option><option value="0.8">0.8×</option><option value="0.9">0.9×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></span><button id="clear">Clear markers</button></div>
        <div class="library"><label for="loop-name">Save this passage</label><div class="save-row"><input id="loop-name" maxlength="100" placeholder="Name, e.g. Chorus"><button id="save-loop">Save loop</button></div><label for="saved-loops">Loops in this video</label><div class="jump-row"><button id="previous-loop" aria-label="Previous saved loop">‹</button><select id="saved-loops" aria-label="Jump to saved loop"><option value="">No saved loops</option></select><button id="next-loop" aria-label="Next saved loop">›</button></div></div>
        <p id="status" role="status" aria-live="polite">Play a passage, mark A, then mark B.</p>
      </div>
      <footer id="footer"><kbd>Alt + Shift + A</kbd> start · <kbd>B</kbd> end · <kbd>L</kbd> loop</footer>
    </section>`;
  const $ = id => shadow.getElementById(id);
  let id = null, video = null, start = 0, end = null, enabled = false;
  let generation = 0, revision = 0, frame = null, compact = false;
  let library = {}, libraryRevision = 0, selected = "", pending = null, lastRequest = "";
  const isAd = () => !!document.querySelector("#movie_player.ad-showing, #movie_player.ad-interrupting");
  const usable = () => video && Number.isFinite(video.duration) && video.duration > 0 && !isAd();
  const rangeOK = () => usable() && validRange(start, end, video.duration);
  function status(message, error = false) { $("status").textContent = message; $("status").classList.toggle("error", error); }
  function render() {
    $("start").value = formatTime(start);
    $("end").value = end === null ? "" : formatTime(end);
    $("toggle").textContent = enabled ? "Ⅱ Stop looping" : "↻ Start looping";
    $("toggle").setAttribute("aria-pressed", String(enabled));
  }
  function stop() { enabled = false; render(); }
  function renderLibrary() {
    const loops = list(library, id);
    const select = $("saved-loops"); select.replaceChildren();
    const placeholder = document.createElement("option"); placeholder.value = "";
    placeholder.textContent = loops.length ? "Choose a saved loop…" : "No saved loops";
    select.append(placeholder);
    for (const loop of loops) {
      const option = document.createElement("option"); option.value = loop.id;
      option.textContent = `${loop.name} · ${formatTime(loop.start)} → ${formatTime(loop.end)}`;
      select.append(option);
    }
    select.value = selected;
    $("previous-loop").disabled = $("next-loop").disabled = !loops.length;
    select.disabled = !loops.length;
  }
  async function saveLoop(name) {
    if (!id || !rangeOK()) throw new Error("Set valid A/B markers on a loaded YouTube video before saving.");
    const loop = {
      id: crypto.randomUUID(), videoId: id, start, end,
      name: String(name || "").trim().slice(0, 100) || `Passage ${formatTime(start)} → ${formatTime(end)}`,
      title: (document.querySelector("ytd-watch-metadata h1 yt-formatted-string, h1.title")?.textContent || document.title.replace(/ - YouTube$/, "") || "YouTube video").trim(),
      createdAt: Date.now()
    };
    const currentGeneration = generation;
    await chrome.storage.local.set({ [PREFIX + loop.id]: loop });
    library[PREFIX + loop.id] = loop;
    if (generation === currentGeneration) { selected = loop.id; $("loop-name").value = ""; renderLibrary(); status("Loop saved. Find it here or in the browser button's library."); }
    return loop;
  }
  function chooseLoop(loop) {
    if (!isLoop(loop) || loop.videoId !== id) return;
    revision++; pending = loop; selected = loop.id; start = loop.start; end = loop.end;
    render(); renderLibrary();
    status("Saved passage selected. Waiting for the video to be ready…");
    applyPending();
  }
  function applyPending() {
    if (!pending || !usable() || video.seeking) return;
    if (!validRange(pending.start, pending.end, video.duration)) {
      pending = null; stop(); status("This saved passage is outside the video's duration.", true); return;
    }
    video.currentTime = start; pending = null; persist();
    status(enabled ? "Looping selected passage." : "Saved passage loaded. Press Start looping to practice.");
  }
  function requestFromUrl() {
    const request = new URLSearchParams(location.hash.slice(1)).get("practice-loop");
    if (!id || !request || request === lastRequest) return;
    lastRequest = request;
    const currentGeneration = generation, currentRevision = ++revision;
    chrome.storage.local.get(PREFIX + request).then(data => {
      if (generation !== currentGeneration || revision !== currentRevision) return;
      const loop = data[PREFIX + request];
      if (isLoop(loop) && loop.videoId === id) chooseLoop(loop);
      else status("This saved loop no longer exists. Choose another from your library.", true);
    }).catch(() => status("Could not load the saved loop. Please try again.", true));
  }
  async function loadLibrary() {
    const currentRevision = libraryRevision;
    try {
      const data = await chrome.storage.local.get(null);
      if (currentRevision !== libraryRevision) return loadLibrary();
      library = data; renderLibrary();
    } catch { status("Could not load your loop library.", true); }
  }
  function persist() {
    revision++;
    if (!id) return;
    chrome.storage.local.set({ ["loop:" + id]: { start, end } }).catch(() => status("Markers work, but could not be saved. Refresh after reloading the extension.", true));
  }
  function changed() {
    selected = ""; pending = null; renderLibrary();
    if (enabled && !rangeOK()) stop();
    render(); persist();
    status(rangeOK() ? "Markers saved for this video. Ready to practice." : "Set B at least 0.2 seconds after A, within the video.");
  }
  function mark(which) {
    if (!usable()) return status("Wait for the video to load and any ads to finish.", true);
    if (which === "start") start = video.currentTime; else end = video.currentTime;
    changed();
  }
  async function play() {
    try { await video.play(); } catch { stop(); status("Press play on YouTube, then start looping again.", true); }
  }
  function toggle() {
    if (enabled) { stop(); status("Loop paused. Your markers are saved."); return; }
    if (!rangeOK()) return status("Set A and B at least 0.2 seconds apart, within a loaded video. Ads and live streams cannot loop.", true);
    enabled = true; video.currentTime = start; render();
    status("Looping A → B. Keep playing."); play();
  }
  function tick() {
    if (!video) return;
    applyPending();
    $("position").textContent = formatTime(video.currentTime);
    if (!enabled || isAd() || video.seeking || !rangeOK()) return;
    if ((!video.paused || video.ended) && (video.currentTime >= end || video.currentTime < start - 0.05)) {
      video.currentTime = start;
      if (video.ended || video.paused) play();
    }
  }
  function animate() { tick(); frame = requestAnimationFrame(animate); }
  function syncSpeed() {
    if (!video) return;
    const value = String(video.playbackRate);
    for (const option of [...$("speed").options]) if (option.dataset.custom) option.remove();
    if (![...$("speed").options].some(option => option.value === value)) {
      const option = document.createElement("option"); option.value = value; option.textContent = value + "×"; option.dataset.custom = "true"; $("speed").append(option);
    }
    $("speed").value = value;
  }
  function reconcile() {
    const nextId = videoId(location.href);
    host.hidden = !nextId;
    const parent = document.fullscreenElement || document.body;
    if (parent && host.parentNode !== parent) parent.append(host);
    if (nextId !== id) {
      id = nextId; generation++; revision++; start = 0; end = null; selected = ""; pending = null; lastRequest = ""; stop(); renderLibrary();
      status("Play a passage, mark A, then mark B.");
      if (id) {
        const currentGeneration = generation, currentRevision = revision;
        chrome.storage.local.get("loop:" + id).then(data => {
          if (currentGeneration !== generation || currentRevision !== revision) return;
          const saved = data["loop:" + id];
          if (saved && Number.isFinite(saved.start) && saved.start >= 0 && (saved.end === null || (Number.isFinite(saved.end) && saved.end >= 0))) {
            start = saved.start; end = saved.end; render(); status("Saved markers restored. Press Start looping to practice.");
          }
        }).catch(() => status("Storage unavailable. You can still set and loop a passage.", true));
      }
    }
    const nextVideo = nextId ? document.querySelector("#movie_player video, video.html5-main-video") : null;
    if (nextVideo !== video) {
      if (video) { video.removeEventListener("timeupdate", tick); video.removeEventListener("ended", tick); video.removeEventListener("ratechange", syncSpeed); }
      video = nextVideo;
      if (video) { video.addEventListener("timeupdate", tick); video.addEventListener("ended", tick); video.addEventListener("ratechange", syncSpeed); syncSpeed(); }
    }
    requestFromUrl();
  }
  $("mark-start").onclick = () => mark("start");
  $("mark-end").onclick = () => mark("end");
  $("toggle").onclick = toggle;
  $("restart").onclick = () => { if (usable() && start < video.duration) { video.currentTime = start; play(); } };
  $("clear").onclick = () => { start = 0; end = null; selected = ""; pending = null; stop(); persist(); renderLibrary(); status("Working markers cleared. Saved loops are still in your library."); };
  $("save-loop").onclick = async () => {
    $("save-loop").disabled = true;
    try { await saveLoop($("loop-name").value); }
    catch (error) { status(error.message || "Could not save this loop.", true); }
    finally { $("save-loop").disabled = false; }
  };
  $("saved-loops").onchange = () => chooseLoop(library[PREFIX + $("saved-loops").value]);
  function jump(delta) {
    const loops = list(library, id); if (!loops.length) return;
    const index = loops.findIndex(loop => loop.id === selected);
    chooseLoop(loops[index < 0 ? (delta > 0 ? 0 : loops.length - 1) : (index + delta + loops.length) % loops.length]);
  }
  $("previous-loop").onclick = () => jump(-1);
  $("next-loop").onclick = () => jump(1);
  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type !== "practice-loop-save") return;
    saveLoop(message.name).then(() => respond({ ok: true })).catch(error => respond({ ok: false, error: error.message }));
    return true;
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    libraryRevision++;
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete library[key]; else library[key] = change.newValue;
    }
    if (selected && !library[PREFIX + selected]) selected = "";
    renderLibrary();
  });
  for (const which of ["start", "end"]) {
    $(which).addEventListener("change", () => {
      const value = parseTime($(which).value);
      if (value === null) { render(); return status("Enter seconds, m:ss, or h:mm:ss (up to 3 decimal places).", true); }
      if (which === "start") start = value; else end = value;
      changed();
    });
  }
  for (const button of shadow.querySelectorAll("[data-nudge]")) button.onclick = () => {
    const [which, delta] = button.dataset.nudge.split(":");
    if (which === "end" && end === null) return status("Set an end marker first.", true);
    const value = Math.max(0, Math.round(((which === "start" ? start : end) + Number(delta)) * 1000) / 1000);
    if (which === "start") start = value; else end = value;
    changed();
  };
  $("speed").onchange = () => { if (usable()) { video.preservesPitch = true; video.playbackRate = Number($("speed").value); } };
  $("collapse").onclick = () => {
    compact = !compact; shadow.querySelector(".panel").classList.toggle("compact", compact);
    $("body").hidden = compact; $("footer").hidden = compact;
    $("collapse").textContent = compact ? "+" : "−";
    $("collapse").setAttribute("aria-expanded", String(!compact));
    $("collapse").setAttribute("aria-label", compact ? "Expand practice controls" : "Minimize practice controls");
  };
  // Outside the shadow root, YouTube sees the host rather than the focused input.
  // Intercept before document-level shortcut handlers, without cancelling native
  // typing, selection, clipboard shortcuts, or Tab navigation.
  for (const type of ["keydown", "keypress", "keyup"]) {
    window.addEventListener(type, event => {
      const path = event.composedPath();
      if (path.includes(host) && path.some(node => node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName))) {
        event.stopImmediatePropagation();
      }
    }, true);
  }
  document.addEventListener("keydown", event => {
    if (!id || !event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey || event.repeat) return;
    const path = event.composedPath();
    if (path.some(node => node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName))) return;
    const action = { KeyA: () => mark("start"), KeyB: () => mark("end"), KeyL: toggle }[event.code];
    if (action) { event.preventDefault(); event.stopPropagation(); action(); }
  }, true);
  document.addEventListener("yt-navigate-finish", reconcile);
  document.addEventListener("fullscreenchange", reconcile);
  // The interval catches replaced players and URL changes; timeupdate also works in background tabs.
  setInterval(() => { reconcile(); tick(); }, 150);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = null; }
    else if (frame === null) animate();
  });
  reconcile();
  loadLibrary();
  if (!document.hidden) animate();
})();
