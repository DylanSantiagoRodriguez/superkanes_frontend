const assert=require('node:assert/strict');
const {chromium}=require('playwright');
module.exports=async function documentSearch({base,adminToken,user,petName,first,fixture}) {
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const origin=process.env.TEST_FRONTEND_URL||'http://localhost:5174';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let failNext=false,holdNext=false,release,held;
  await page.route('**/api/v1/**',async route=>{
    const url=new URL(route.request().url());
    const cors={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
    if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:adminToken,userId:user,expiresIn:3600},headers:cors});
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
    if(url.pathname.endsWith('/documentos')) {
      if(failNext){return route.fulfill({status:503,json:{message:'Fallo de prueba'},headers:cors})}
      if(holdNext && url.searchParams.has('after')) {
        holdNext=false;
        held=new Promise(resolve=>{release=resolve});
        await held;
      }
    }
    const response=await route.fetch({url:base+url.pathname+url.search});
    await route.fulfill({response,headers:{...response.headers(),...cors}});
  });
  try {
    await page.goto(origin);
    await page.getByRole('button',{name:'Mascotas y tutores',exact:true}).click();
    await page.getByRole('button',{name:`Ver ${petName}`,exact:true}).click();
    const chart=page.getByRole('article',{name:'Ficha clínica del paciente'});
    await chart.getByRole('button',{name:'Documentos del editor',exact:true}).click();
    const section=chart.getByRole('region',{name:'Documentos guardados del paciente'});
    const input=section.getByRole('searchbox',{name:'Buscar por identificador del documento'});
    const search=async value=>{await input.fill(value);await section.getByRole('button',{name:'Buscar documentos',exact:true}).click()};
    await search(first.id.toUpperCase());
    await section.locator(`[data-document-id="${first.id}"]`).waitFor();
    assert.equal(await section.locator('[data-document-id]').count(),1);
    await section.getByRole('button',{name:'Ver documento guardado',exact:true}).click();
    await section.getByText('Contenido con formato pegado',{exact:true}).waitFor();
    const download=page.waitForEvent('download');
    await section.getByRole('button',{name:'Descargar original editable (JSON)',exact:true}).click();
    assert.match((await download).suggestedFilename(),/\.json$/);
    await search('ABCDEF');
    await section.locator(`[data-document-id="${fixture[24]}"]`).waitFor();
    assert.equal(await section.locator('[data-document-id]').count(),25);
    await section.getByRole('button',{name:'Cargar más documentos',exact:true}).click();
    await section.locator(`[data-document-id="${fixture[27]}"]`).waitFor();
    assert.equal(await section.locator('[data-document-id]').count(),28);
    await search('00000000-0000-0000-0000-000000000000');
    await section.getByText('No se encontraron documentos con ese identificador.',{exact:true}).waitFor();
    await search('ABCDEF');
    await section.locator(`[data-document-id="${fixture[24]}"]`).waitFor();
    holdNext=true;
    await section.getByRole('button',{name:'Cargar más documentos',exact:true}).click();
    // Wait for interception, not a timing-dependent sleep.
    for(let i=0;!release && i<100;i++)await new Promise(resolve=>setTimeout(resolve,10));
    assert.ok(release,'Pending pagination request intercepted');
    await search(first.id);
    await section.locator(`[data-document-id="${first.id}"]`).waitFor();
    release();
    await page.waitForLoadState('networkidle');
    assert.equal(await section.locator('[data-document-id]').count(),1);
    failNext=true;
    await search('abc');
    await section.getByRole('alert').waitFor();
    failNext=false;
    await section.getByRole('button',{name:'Reintentar documentos',exact:true}).click();
    await section.locator(`[data-document-id="${fixture[0]}"]`).waitFor();
    await section.getByRole('button',{name:'Limpiar búsqueda',exact:true}).click();
    await section.locator('[data-document-id]').first().waitFor();
    assert.equal(await input.inputValue(),'');
    await input.fill('xy');
    assert.equal(await input.evaluate(el=>el.checkValidity()),false);
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    assert.deepEqual(errors,[]);
    console.log('OK: Chromium búsqueda documental, descarga, filtro paginado, vacío, error/reintento, respuesta tardía y móvil.');
  } finally {if(release)release();await page.unrouteAll({behavior:'wait'});await browser.close()}
};
