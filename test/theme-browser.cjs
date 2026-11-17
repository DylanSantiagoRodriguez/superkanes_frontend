// Appearance-only browser checks. API fixtures do not certify backend authorization.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const origin = process.env.TEST_FRONTEND_URL || 'http://localhost:5174';
function luminance(hex) {
  const value = hex.replace('#', '');
  const expanded = value.length === 3 ? [...value].map(c => c + c).join('') : value;
  const c = expanded.match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
}
function contrast(a, b) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let signedIn = false;
  await context.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    let json = { data: [], page: { next: null, limit: 25 }, unavailable: [] };
    if (path.endsWith('/auth/refresh')) {
      if (!signedIn) return route.fulfill({ status: 401, json: {}, headers });
      json = { accessToken: 'synthetic-theme-fixture', userId: 'theme-user', expiresIn: 3600 };
    } else if (path.endsWith('/auth/me')) json = { nombre: 'Prueba visual', platformAdmin: true, organizations: [{ id: 'theme-org', nombre: 'Clínica de prueba visual' }] };
    else if (path.endsWith('/resources')) json = { resources: [{ name: 'cita', fields: [], permissions: { create: false, update: false, delete: false }, deletion: 'none', deletionEffect: null, transitions: null }] };
    return route.fulfill({ json, headers });
  });
  const theme = value => page.waitForFunction(v => document.documentElement.dataset.theme === v, value);
  const select = () => page.getByRole('combobox', { name: 'Apariencia', exact: true });
  async function colors() {
    const pairs = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement);
      const token = name => s.getPropertyValue(name).trim();
      return [
        ['--color-text', '--surface'], ['--color-text', '--surface-page'],
        ['--color-muted', '--surface'], ['--color-placeholder', '--surface'],
        ['--color-primary-text', '--surface'], ['--color-primary-text', '--color-primary-soft'],
        ['--color-on-primary', '--color-primary'], ['--color-on-primary', '--color-primary-hover'],
        ['--color-danger', '--color-danger-bg'], ['--color-warning', '--color-warning-bg'],
        ['--color-success', '--color-success-bg']
      ].map(([a,b]) => [a, b, token(a), token(b)]);
    });
    for (const [a,b,x,y] of pairs) assert.ok(contrast(x,y) >= 4.5, `${a}/${b}: ${contrast(x,y)}`);
  }
  try {
    await page.goto(origin); await select().waitFor(); await theme('light'); await colors();
    assert.equal(luminance(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim())), 1);
    const email = page.locator('input[type=email]'); await email.fill('visual@example.test');
    await select().selectOption('dark'); await theme('dark'); await colors();
    assert.equal(await email.inputValue(), 'visual@example.test');
    await page.screenshot({ path: '/tmp/superkanes-login-dark.png', fullPage: true, animations: 'disabled' });
    await page.reload(); await select().waitFor(); await theme('dark');
    assert.equal(await select().inputValue(), 'dark');
    await select().selectOption('system'); await theme('light');
    await page.emulateMedia({ colorScheme: 'dark' }); await theme('dark');
    await select().selectOption('light'); await theme('light');
    await page.emulateMedia({ colorScheme: 'light' }); await page.emulateMedia({ colorScheme: 'dark' }); await theme('light');
    await page.screenshot({ path: '/tmp/superkanes-login-light.png', fullPage: true, animations: 'disabled' });
    signedIn = true; await page.reload(); await page.getByRole('navigation').waitFor();
    await select().selectOption('dark'); await theme('dark');
    await page.getByRole('heading', { name: /calendario/i }).waitFor();
    await page.waitForFunction(() => {
      const selected = document.querySelector('nav button[aria-current]');
      return selected && getComputedStyle(selected).backgroundColor === 'rgb(18, 52, 62)';
    });
    await page.screenshot({ path: '/tmp/superkanes-workspace-dark.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await select().selectOption('light'); await theme('light');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: '/tmp/superkanes-workspace-mobile.png', fullPage: true, animations: 'disabled' });
    signedIn = false;
    await page.evaluate(() => localStorage.setItem('superkanes.appearance', 'invalid'));
    await page.reload(); await select().waitFor(); await theme('dark');
    assert.equal(await select().inputValue(), 'system');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Blocked storage'); };
      Storage.prototype.setItem = () => { throw new Error('Blocked storage'); };
    });
    await page.reload(); await select().waitFor(); await theme('dark');
    await select().selectOption('light'); await theme('light');
    assert.deepEqual(errors, []);
    console.log('OK: Claro/Oscuro/Sistema, persistencia, sistema en vivo, controles, formulario conservado, calendario, móvil, storage bloqueado y 22 pares de contraste >=4.5.');
  } finally { await context.unrouteAll({ behavior: 'wait' }); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
