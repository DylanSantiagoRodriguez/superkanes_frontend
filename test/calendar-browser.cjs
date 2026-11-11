const assert = require('node:assert/strict');
const { chromium } = require('playwright');
module.exports = async function calendar({ base, adminToken, staffToken, user }) {
  const browser = await chromium.launch();
  const origin = process.env.TEST_FRONTEND_URL || 'http://127.0.0.1:5174';
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 }, timezoneId: 'America/Bogota' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  let pages = 0;
  async function configure(target, token) {
    await target.clock.setFixedTime(new Date('2029-01-02T15:00:00Z'));
    await target.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' };
      if (url.pathname === '/api/v1/auth/refresh') return route.fulfill({ json: { accessToken: token, userId: user, expiresIn: 3600 }, headers });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } });
      if (url.pathname.endsWith('/calendario')) { url.searchParams.set('limit', '2'); pages++; }
      try { const response = await route.fetch({ url: base + url.pathname + url.search }); await route.fulfill({ response, headers: { ...response.headers(), ...headers } }); }
      catch (error) { if (!/Route is already handled/.test(error.message)) throw error; }
    });
  }
  try {
    await configure(page, adminToken); await page.goto(origin);
    const calendar = page.getByRole('region', { name: 'Calendario de actividades', exact: true });
    await calendar.getByRole('status').filter({ hasText: '6 actividades' }).waitFor();
    assert.ok(pages >= 3, 'Load every page, not only the first response');
    const details = page.getByRole('complementary', { name: 'Actividades del día' });
    assert.equal(await details.getByRole('listitem').count(), 6);
    await calendar.getByLabel('Tipo de actividad').selectOption('pendiente_vacunal');
    assert.equal(await details.getByRole('listitem').count(), 1);
    await details.getByRole('button', { name: 'Editar Luna' }).click();
    assert.equal(await page.locator('#field-fecha_objetivo').inputValue(), '2029-01-02');
    await page.locator('#field-indicacion').fill('Esquema vacunal por revisar');
    await page.locator('#field-fecha_objetivo').fill('2029-01-03');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await calendar.locator('[data-day="2029-01-03"]').click();
    await details.getByText('Esquema vacunal por revisar').waitFor();
    await details.getByRole('button', { name: 'Editar Luna' }).click();
    assert.equal(await page.locator('#field-fecha_objetivo').inputValue(), '2029-01-03');
    await page.locator('#field-fecha_objetivo').fill('2029-01-02');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await details.getByText('No hay actividades de este tipo para este día.').waitFor();
    await calendar.getByLabel('Tipo de actividad').selectOption('');
    await calendar.locator('[data-day="2029-01-03"]').click();
    await details.getByText('No hay actividades para este día.').waitFor();
    await calendar.getByRole('button', { name: '+ Nueva cita', exact: true }).click();
    assert.equal(await page.locator('#field-inicio').inputValue(), '2029-01-03T09:00');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await calendar.getByRole('button', { name: 'Mes anterior' }).click();
    await calendar.getByRole('heading', { name: 'diciembre de 2028', exact: true }).waitFor();
    await calendar.getByRole('button', { name: 'Mes siguiente' }).click();
    await calendar.getByRole('button', { name: 'Hoy', exact: true }).click();
    await calendar.getByRole('status').filter({ hasText: '6 actividades' }).waitFor();
    await page.screenshot({ path: '/tmp/superkanes-calendar-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await calendar.locator('[data-day="2029-01-02"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await calendar.locator('[data-day="2029-01-03"]').getAttribute('aria-pressed'), 'true');
    await page.screenshot({ path: '/tmp/superkanes-calendar-mobile.png', fullPage: true });
    const limited = await browser.newPage({ timezoneId: 'America/Bogota' });
    await configure(limited, staffToken); await limited.goto(origin);
    const limitedCalendar = limited.getByRole('region', { name: 'Calendario de actividades' });
    await limitedCalendar.getByRole('status').filter({ hasText: '2 actividades' }).waitFor();
    assert.equal(await limitedCalendar.getByRole('button', { name: '+ Nueva cita', exact: true }).count(), 0);
    assert.equal(await limitedCalendar.getByRole('button', { name: /Editar/ }).count(), 0);
    await limited.unrouteAll({ behavior: 'wait' }); await limited.close();
    assert.deepEqual(errors, []);
    console.log('OK: Chromium calendario: todas las páginas, tipos, edición, nueva cita con fecha seleccionada, navegación anual, teclado, móvil y lectura por permisos.');
  } catch (error) { await page.screenshot({ path: '/tmp/superkanes-calendar-failure.png', fullPage: true }); throw error; }
  finally { await page.unrouteAll({ behavior: 'wait' }); await browser.close(); }
};
