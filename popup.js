(() => {
  "use strict";
  const { list, url, PREFIX } = PracticeLoopLibrary;
  const { formatTime } = PracticeLoopCore;
  const $ = id => document.getElementById(id);
  let data = {}, storageRevision = 0;
  function status(text, error = false) { $("status").textContent = text; $("status").classList.toggle("error", error); }
  function render() {
    const query = $("search").value.trim().toLowerCase();
    const loops = list(data).filter(loop => `${loop.name} ${loop.title}`.toLowerCase().includes(query));
    $("library").replaceChildren();
    if (!loops.length) {
      const empty = document.createElement("p"); empty.className = "empty";
      empty.textContent = query ? "No matching loops." : "No saved loops yet. Mark A and B on YouTube, then save a passage.";
      $("library").append(empty); return;
    }
    let group, previous;
    for (const loop of loops) {
      if (previous !== loop.videoId) {
        group = document.createElement("section");
        const title = document.createElement("h2"); title.textContent = loop.title;
        group.append(title); $("library").append(group); previous = loop.videoId;
      }
      const row = document.createElement("div"); row.className = "loop";
      const open = document.createElement("button"); open.className = "open"; open.textContent = loop.name;
      const times = document.createElement("small"); times.textContent = `${formatTime(loop.start)} → ${formatTime(loop.end)}`; open.append(times);
      open.title = "Open video at this loop";
      open.onclick = async () => {
        try { await chrome.tabs.create({ url: url(loop) }); window.close(); }
        catch { status("Could not open this video. Please try again.", true); }
      };
      const remove = document.createElement("button"); remove.className = "delete"; remove.textContent = "×"; remove.setAttribute("aria-label", "Delete " + loop.name);
      remove.onclick = async () => {
        try { await chrome.storage.local.remove(PREFIX + loop.id); delete data[PREFIX + loop.id]; render(); status("Loop deleted."); }
        catch { status("Could not delete this loop. Please try again.", true); }
      };
      row.append(open, remove); group.append(row);
    }
  }
  $("search").oninput = render;
  $("save-form").onsubmit = async event => {
    event.preventDefault();
    const button = event.submitter; button.disabled = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = tab && await chrome.tabs.sendMessage(tab.id, { type: "practice-loop-save", name: $("name").value });
      if (!response?.ok) throw new Error(response?.error || "Open a YouTube video and set valid A/B markers first.");
      status("Loop saved. Open it from this library anytime."); $("name").value = "";
    } catch (error) {
      status(error.message?.includes("Receiving end") || error.message?.includes("Could not establish") ? "Open or refresh a YouTube video, set A/B markers, then save." : error.message, true);
    } finally { button.disabled = false; }
  };
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    storageRevision++;
    for (const [key, change] of Object.entries(changes)) {
      if (change.newValue === undefined) delete data[key]; else data[key] = change.newValue;
    }
    render();
  });
  async function load() {
    const revision = storageRevision;
    try { const saved = await chrome.storage.local.get(null); if (revision !== storageRevision) return load(); data = saved; render(); }
    catch { status("Could not load saved loops. Reopen the extension to try again.", true); }
  }
  load();
})();
