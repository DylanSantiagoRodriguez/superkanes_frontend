const assert = require('node:assert/strict');
const { chromium } = require('playwright');
module.exports = async function catalogs({ base, adminToken, staffToken, user, memberId }) {
  const browser = await chromium.launch();
  const origin = process.env.TEST_FRONTEND_URL || 'http://localhost:5174';
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  async function routePage(target, token) {
    await target.route('**/api/v1/**', async route => {
      const url = new URL(route.request().url());
      const headers = { 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true' };
      if (url.pathname === '/api/v1/auth/refresh') return route.fulfill({ json: { accessToken: token, userId: user, expiresIn: 3600 }, headers });
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...headers, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' } });
      try {
        const response = await route.fetch({ url: base + url.pathname + url.search });
        await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
      } catch (error) {
        // React cancels obsolete requests when switching modules or closing a dialog.
        if (!/Route is already handled/.test(error.message)) throw error;
      }
    });
  }
  await routePage(page, adminToken);
  const nav = page.getByRole('navigation', { name: 'Navegación principal' });
  const save = async resource => {
    const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/resources/${resource}` && r.request().method() === 'POST');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
    const result = await response; assert.equal(result.status(), 201); return (await result.json()).data;
  };
  try {
    await page.goto(origin); await nav.getByRole('button', { name: 'Catálogos', exact: true }).click();
    const hub = page.getByRole('region', { name: 'Catálogos de la clínica', exact: true });
    await hub.getByRole('button', { name: 'Abrir Sedes', exact: true }).waitFor();
    await page.screenshot({ path: '/tmp/superkanes-catalogs.png', fullPage: true });
    await hub.getByLabel('Buscar catálogo').fill('diagnosticos');
    await hub.getByRole('button', { name: 'Abrir Catálogo de diagnósticos', exact: true }).waitFor();
    assert.equal(await hub.getByRole('button', { name: 'Abrir Sedes', exact: true }).count(), 0);
    await hub.getByLabel('Buscar catálogo').fill('sin coincidencia');
    await hub.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
    await hub.getByRole('button', { name: 'Abrir Sedes', exact: true }).click();
    await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    await page.locator('#field-nombre').fill('Sede catálogo de prueba');
    await page.locator('#field-codigo').fill('CAT-PRUEBA');
    const site = await save('sede');
    await page.getByRole('button', { name: 'Ver Sede catálogo de prueba', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Editar', exact: true }).click();
    await page.locator('#field-direccion').fill('Dirección actualizada desde catálogos');
    await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByText('Cambios guardados.', { exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Catálogo', exact: true }).selectOption('profesional');
    await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    await page.locator(`#field-membresia_id option[value="${memberId}"]`).waitFor({ state: 'attached' });
    assert.match(await page.locator(`#field-membresia_id option[value="${memberId}"]`).textContent(), /Miembro para catálogos/);
    await page.locator('#field-membresia_id').selectOption(memberId);
    await page.locator('#field-nombre_profesional').fill('Profesional del catálogo');
    await save('profesional');
    await page.getByRole('button', { name: 'Ver Profesional del catálogo', exact: true }).waitFor();
    await page.getByRole('combobox', { name: 'Catálogo', exact: true }).selectOption('diagnostico');
    await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    await page.locator('#field-nombre').fill('Diagnóstico de catálogo de prueba');
    const diagnosis = await save('diagnostico');
    await page.getByRole('button', { name: '← Todos los catálogos', exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await hub.getByLabel('Área').selectOption({ label: 'Pacientes' });
    assert.equal(await hub.getByRole('button', { name: 'Abrir Sedes', exact: true }).count(), 0);
    await hub.getByRole('button', { name: 'Abrir Especies', exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: '/tmp/superkanes-catalogs-mobile.png', fullPage: true });
    await hub.getByRole('button', { name: 'Ir a citas', exact: true }).click();
    await page.getByRole('button', { name: 'Programar cita', exact: true }).click();
    await page.locator(`#field-sede_id option[value="${site.id}"]`).waitFor({ state: 'attached' });
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    await nav.getByRole('button', { name: 'Historia clínica', exact: true }).click();
    await page.getByRole('combobox', { name: 'Sección', exact: true }).selectOption('diagnostico_atencion');
    await page.getByRole('button', { name: 'Nuevo registro', exact: true }).click();
    await page.locator(`#field-diagnostico_id option[value="${diagnosis.id}"]`).waitFor({ state: 'attached' });
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    const limited = await browser.newPage();
    await routePage(limited, staffToken); await limited.goto(origin);
    await limited.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Mascotas y tutores', exact: true }).waitFor();
    await limited.getByRole('navigation', { name: 'Navegación principal' }).getByRole('button', { name: 'Catálogos', exact: true }).click();
    await limited.getByRole('button', { name: 'Abrir Sedes', exact: true }).waitFor();
    assert.equal(await limited.getByRole('button', { name: 'Abrir Catálogo de diagnósticos', exact: true }).count(), 0);
    await limited.getByRole('button', { name: 'Abrir Sedes', exact: true }).click();
    await limited.getByRole('button', { name: 'Actualizar', exact: true }).waitFor();
    assert.equal(await limited.getByRole('button', { name: 'Nuevo registro', exact: true }).count(), 0);
    await limited.waitForLoadState('networkidle');
    await limited.unrouteAll({ behavior: 'wait' }); await limited.close();
    assert.deepEqual(errors, []);
    console.log('OK: Chromium: catálogos por permisos, búsqueda, filtros, alta/edición de sede, profesional vinculado, diagnóstico reutilizado en historia y sede en citas; móvil.');
  } catch (e) { await page.screenshot({ path: '/tmp/superkanes-catalogs-failure.png', fullPage: true }); throw e; }
  finally { await page.unrouteAll({ behavior: 'wait' }); await browser.close(); }
};
