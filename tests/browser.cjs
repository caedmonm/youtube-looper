// Run with Playwright on NODE_PATH, or installed locally: node tests/browser.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.route('https://extension.test/icons/**', route => route.fulfill({ contentType: 'image/png', body: fs.readFileSync(path.join(__dirname, '..', new URL(route.request().url()).pathname)) }));
    await page.route('https://www.youtube.com/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body style="background:#0f0f0f"><div id="movie_player"><video class="html5-main-video"></video></div></body></html>' }));
    await page.goto('https://www.youtube.com/watch?v=test-one');
    await page.evaluate(() => {
      window.saved = {};
      window.storageListeners = [];
      window.chrome = { runtime: { getURL: file => 'https://extension.test/' + file, onMessage: { addListener: listener => { window.messageListener = listener; } } }, storage: {
        onChanged: { addListener: listener => storageListeners.push(listener) }, local: {
          get: async key => key === null ? structuredClone(saved) : ({ [key]: saved[key] }),
          set: async values => {
            Object.assign(saved, values);
            for (const listener of storageListeners) listener(Object.fromEntries(Object.entries(values).map(([key, newValue]) => [key, { newValue }])), 'local');
          }
      } } };
      const video = document.querySelector('video');
      window.media = { currentTime: 0, duration: 120, paused: true, ended: false, seeking: false };
      for (const key of Object.keys(media)) Object.defineProperty(video, key, { configurable: true, get: () => media[key], set: value => { media[key] = value; if (key === 'currentTime') media.ended = false; } });
      video.play = async () => { media.paused = false; };
      // Mimic page shortcuts registered before the extension, in both phases.
      window.pageKeys = [];
      for (const type of ['keydown', 'keypress', 'keyup']) {
        for (const capture of [true, false]) document.addEventListener(type, event => {
          pageKeys.push([type, event.key, capture]);
        }, capture);
      }
    });
    for (const file of ['loop-core.js', 'library.js', 'content.js']) await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '..', file), 'utf8') });
    const control = name => page.locator('#practice-loop-extension').locator('#' + name);
    await control('loop-name').focus();
    await page.keyboard.type('jklfm 123 Chorus');
    assert.equal(await control('loop-name').inputValue(), 'jklfm 123 Chorus', 'native typing still works');
    await page.keyboard.press('Control+a');
    await page.keyboard.type('Verse');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Backspace');
    assert.equal(await control('loop-name').inputValue(), 'Vere', 'selection and cursor editing still work');
    assert.deepEqual(await page.evaluate(() => pageKeys), [], 'name keystrokes never reach page shortcut handlers');
    await page.keyboard.press('Tab');
    assert.equal(await control('save-loop').evaluate(element => element === element.getRootNode().activeElement), true, 'Tab still moves focus');
    // Tab's keyup now targets the button, outside the protected editing fields.
    await page.evaluate(() => { pageKeys.length = 0; });
    await control('start').focus();
    await page.keyboard.press('ArrowLeft');
    await control('speed').focus();
    await page.keyboard.press('ArrowDown');
    assert.deepEqual(await page.evaluate(() => pageKeys), [], 'time and speed inputs also isolate keyboard events');
    await page.evaluate(() => document.querySelector('#practice-loop-extension').shadowRoot.activeElement.blur());
    await page.keyboard.press('k');
    assert.ok(await page.evaluate(() => pageKeys.some(([, key]) => key === 'k')), 'page shortcuts remain available outside the fields');
    await control('loop-name').fill('');
    const setTime = seconds => page.evaluate(seconds => { media.currentTime = seconds; document.querySelector('video').dispatchEvent(new Event('timeupdate')); }, seconds);
    const time = () => page.evaluate(() => media.currentTime);
    await setTime(10); await control('mark-start').click();
    await setTime(15); await control('mark-end').click();
    await control('toggle').click();
    assert.equal(await time(), 10);
    for (let i = 0; i < 3; i++) { await setTime(15); assert.equal(await time(), 10); }
    await page.evaluate(() => { media.paused = true; });
    await setTime(15); assert.equal(await time(), 15, 'paused player stays paused');
    await page.evaluate(() => { media.paused = false; });
    await setTime(3); assert.equal(await time(), 10, 'playing seek outside range returns to A');
    await control('toggle').click();
    await setTime(20); assert.equal(await time(), 20, 'disabled loop does not seek');
    await control('end').fill('10.1'); await control('end').dispatchEvent('change');
    await control('toggle').click();
    assert.equal(await control('toggle').getAttribute('aria-pressed'), 'false', 'reject short ranges');
    await control('end').fill('120'); await control('end').dispatchEvent('change');
    await control('toggle').click();
    await page.evaluate(() => { media.currentTime = 120; media.paused = true; media.ended = true; document.querySelector('video').dispatchEvent(new Event('ended')); });
    assert.equal(await time(), 10, 'end-of-video loops');
    assert.equal(await page.evaluate(() => media.paused), false);
    await control('speed').selectOption('0.75');
    assert.equal(await page.evaluate(() => document.querySelector('video').playbackRate), 0.75);
    await page.evaluate(() => document.querySelector('#movie_player').classList.add('ad-showing'));
    await setTime(121); assert.equal(await time(), 121, 'ads suspend seeking');
    await page.evaluate(() => document.querySelector('#movie_player').classList.remove('ad-showing'));
    await page.evaluate(() => { history.pushState({}, '', '/watch?v=test-two'); document.dispatchEvent(new Event('yt-navigate-finish')); });
    assert.equal(await control('toggle').getAttribute('aria-pressed'), 'false');
    assert.equal(await control('end').inputValue(), '');
    await page.evaluate(() => { history.pushState({}, '', '/watch?v=test-one'); document.dispatchEvent(new Event('yt-navigate-finish')); });
    await page.waitForFunction(() => document.querySelector('#practice-loop-extension').shadowRoot.getElementById('end').value === '2:00.000');
    assert.equal(await control('start').inputValue(), '0:10.000');
    assert.equal(await control('toggle').getAttribute('aria-pressed'), 'false', 'restore never autoplays');
    await control('loop-name').fill('First passage'); await control('save-loop').click();
    await page.waitForFunction(() => Object.keys(saved).some(key => key.startsWith('saved-loop:')));
    const first = await control('saved-loops').inputValue();
    await control('start').fill('30.125'); await control('start').dispatchEvent('change');
    await control('end').fill('40.875'); await control('end').dispatchEvent('change');
    await control('loop-name').fill('Second passage'); await control('save-loop').click();
    const second = await control('saved-loops').inputValue();
    assert.notEqual(first, second);
    await control('previous-loop').click(); assert.equal(await time(), 10);
    await control('toggle').click();
    await control('next-loop').click(); assert.equal(await time(), 30.125);
    assert.equal(await control('toggle').getAttribute('aria-pressed'), 'true', 'jump keeps looping enabled');
    await setTime(40.875); assert.equal(await time(), 30.125);
    await control('toggle').click();
    await page.evaluate(first => {
      history.pushState({}, '', '/watch?v=test-one#practice-loop=' + first);
      document.dispatchEvent(new Event('yt-navigate-finish'));
    }, first);
    await page.waitForFunction(() => media.currentTime === 10);
    assert.equal(await control('end').inputValue(), '2:00.000', 'library link restores exact range');
    await page.evaluate(() => { history.pushState({}, '', '/watch?v=test-two'); document.dispatchEvent(new Event('yt-navigate-finish')); });
    assert.equal(await control('saved-loops').locator('option').count(), 1, 'other videos have separate loops');
    await page.evaluate(() => { history.pushState({}, '', '/watch?v=test-one'); document.dispatchEvent(new Event('yt-navigate-finish')); });
    await page.waitForFunction(() => document.querySelector('#practice-loop-extension').shadowRoot.getElementById('end').value === '2:00.000');
    const popup = await browser.newPage({ viewport: { width: 420, height: 800 } });
    await popup.route('https://extension.test/**', route => {
      const file = new URL(route.request().url()).pathname.slice(1) || 'popup.html';
      route.fulfill({ contentType: file.endsWith('.png') ? 'image/png' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html', body: fs.readFileSync(path.join(__dirname, '..', file)) });
    });
    await popup.exposeFunction('getSaved', () => page.evaluate(() => saved));
    await popup.exposeFunction('saveCurrent', name => page.evaluate(name => new Promise(resolve => messageListener({ type: 'practice-loop-save', name }, {}, resolve)), name));
    await popup.exposeFunction('removeSaved', key => page.evaluate(key => {
      delete saved[key]; for (const listener of storageListeners) listener({ [key]: {} }, 'local');
    }, key));
    await popup.addInitScript(() => {
      window.chrome = {
        storage: { local: { get: () => getSaved(), remove: key => removeSaved(key) }, onChanged: { addListener: listener => { window.storageListener = listener; } } },
        tabs: { query: async () => [{ id: 1 }], sendMessage: (_, message) => saveCurrent(message.name), create: async ({ url }) => { window.openedUrl = url; } }
      };
      window.close = () => {};
    });
    await popup.goto('https://extension.test/popup.html');
    await popup.waitForFunction(() => document.querySelectorAll('.open').length === 2);
    await popup.locator('#search').fill('Second'); assert.equal(await popup.locator('.open').count(), 1);
    await popup.locator('.open').click();
    const opened = new URL(await popup.evaluate(() => openedUrl));
    assert.equal(opened.searchParams.get('v'), 'test-one');
    assert.equal(opened.hash, '#practice-loop=' + second);
    await popup.locator('.delete').click();
    await popup.waitForFunction(() => document.querySelectorAll('.open').length === 0);
    assert.equal(await control('saved-loops').locator('option').count(), 2, 'popup deletion updates on-video list');
    await popup.locator('#search').fill('');
    await popup.locator('#name').fill('Saved from toolbar');
    await popup.locator('button[type=submit]').click();
    await popup.waitForFunction(() => document.getElementById('status').textContent.includes('Loop saved'));
    assert.equal(await control('saved-loops').locator('option').count(), 3, 'toolbar save reaches content script');
    // Real chrome.storage.onChanged delivers this event to the popup automatically.
    await popup.evaluate(async () => { const data = await getSaved(); storageListener(Object.fromEntries(Object.entries(data).map(([key, newValue]) => [key, { newValue }])), 'local'); });
    assert.equal(await popup.locator('.open').count(), 2);
    await popup.screenshot({ path: path.join(__dirname, '..', 'library-preview.png') });
    await popup.close();
    await control('collapse').click(); assert.equal(await control('body').isVisible(), false);
    await control('collapse').click();
    await page.screenshot({ path: path.join(__dirname, '..', 'preview.png') });
    await page.evaluate(() => { history.pushState({}, '', '/'); document.dispatchEvent(new Event('yt-navigate-finish')); });
    assert.equal(await page.locator('#practice-loop-extension').isVisible(), false);
    console.log('Browser checks passed: keyboard isolation and native editing, playback, saved loops, previous/next, deep links, popup search/open/save/delete, storage synchronization, navigation, minimize, home.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
