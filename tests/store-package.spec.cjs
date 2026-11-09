const { test, expect, chromium } = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const extension = process.env.RTL_PACKAGE_DIR;
const fixture = `<!doctype html><html><head><meta charset="utf-8"><style>
body{font:16px Arial;margin:40px;color:#222} article{max-width:700px;margin:25px auto}
form{display:flex;max-width:700px;margin:auto;gap:10px} #prompt-textarea{width:450px;min-height:36px}
</style></head><body><main><article data-turn="assistant"><div data-message-author-role="assistant">
<div data-assistant-markdown><p id="hebrew">שלום עולם, hello world.</p><p id="english">An English sentence.</p>
<pre><code id="code">const x = 42;</code></pre><div class="katex" id="math">x = 2</div>
<ul><li>רשימה<ul><li>פריט</li></ul></li></ul><table><tr><td>א</td><td>ב</td></tr></table>
</div></div></article></main><form data-chatgpt-composer><div id="prompt-textarea" data-composer-markdown="true" contenteditable="true" role="textbox">בדיקה</div><button data-testid="send-button" type="submit">Send</button></form></body></html>`;

test('installed package preserves direction, streaming and tab safety', async () => {
  expect(extension, 'RTL_PACKAGE_DIR must point to the extracted ZIP').toBeTruthy();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rtl-store-profile-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium', headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    expect(await worker.evaluate(() => chrome.runtime.getManifest().version)).toBe(process.env.RTL_PACKAGE_VERSION);
    await context.route('https://chatgpt.com/**', route => route.fulfill({ status: 200, contentType: 'text/html', body: fixture }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://chatgpt.com/c/release-check');
    const host = page.locator('#chatgpt-rtl-toggle-host');
    await expect(host).toHaveCount(1);
    const button = host.locator('button');
    await expect(page.locator('html')).toHaveAttribute('data-chatgpt-rtl-mode', 'rtl');
    await expect(page.locator('#hebrew')).toHaveCSS('direction', 'rtl');
    await expect(page.locator('#code')).toHaveCSS('direction', 'ltr');
    await expect(page.locator('#math')).toHaveCSS('direction', 'ltr');
    await expect(page.locator('td')).toHaveCount(2);
    expect(await page.locator('td').allTextContents()).toEqual(['א', 'ב']);
    await expect(page.locator('#prompt-textarea')).toHaveCSS('direction', 'rtl');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-chatgpt-rtl-mode', 'ltr');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-chatgpt-rtl-mode', 'ltr');
    await page.locator('#chatgpt-rtl-toggle-host button').click();
    await expect(page.locator('html')).toHaveAttribute('data-chatgpt-rtl-mode', 'rtl');
    await page.evaluate(() => {
      const original = document.querySelector('#prompt-textarea');
      const replacement = original.cloneNode(true);
      original.replaceWith(replacement);
    });
    await expect(page.locator('#prompt-textarea')).toHaveAttribute('data-chatgpt-rtl-composer', '1');
    await page.evaluate(() => history.pushState({}, '', '/c/another-release-check'));
    await expect(page.locator('#chatgpt-rtl-toggle-host')).toHaveCount(1);
    await page.locator('#hebrew').evaluate(el => { el.textContent = 'שלום'; });
    await page.locator('#hebrew').evaluate(el => { el.append(' עולם חדש'); });
    await expect(page.locator('#hebrew')).toHaveCSS('direction', 'rtl');
    await page.waitForTimeout(500);
    const mutations = await page.evaluate(() => new Promise(resolve => {
      let count = 0;
      const observer = new MutationObserver(records => { count += records.length; });
      observer.observe(document.body, { subtree: true, attributes: true, childList: true, characterData: true });
      setTimeout(() => { observer.disconnect(); resolve(count); }, 2000);
    }));
    expect(mutations).toBe(0);
    expect(page.isClosed()).toBe(false);
    expect(errors).toEqual([]);
    const unrelated = await context.newPage();
    await unrelated.goto('data:text/html,<p>Unrelated page</p>');
    await expect(unrelated.locator('#chatgpt-rtl-toggle-host')).toHaveCount(0);
  } finally {
    await context.close();
    fs.rmSync(profile, { recursive: true, force: true });
  }
});
