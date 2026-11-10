const assert = require('node:assert/strict');
const { chromium } = require('playwright');
module.exports = async function chartBrowser({base,adminToken,user}) {
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const origin=process.env.TEST_FRONTEND_URL || 'http://localhost:5174';
  await page.route('**/api/v1/**',async route=>{
    const url=new URL(route.request().url());
    const cors={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
    if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:adminToken,userId:user,expiresIn:3600},headers:cors});
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
    const response=await route.fetch({url:base+url.pathname+url.search});await route.fulfill({response,headers:{...response.headers(),...cors}});
  });
  try {
    await page.goto(origin);
    await page.getByRole('button',{name:'Mascotas y tutores',exact:true}).click();
    await page.getByRole('button',{name:'Ver Luna',exact:true}).click();
    await page.getByRole('button',{name:'Abrir ficha clínica',exact:true}).click();
    const chart=page.getByRole('article',{name:'Ficha clínica del paciente'});
    await chart.getByRole('heading',{name:'Luna',exact:true}).waitFor();
    await chart.getByText('Tutor principal: Ana Prueba',{exact:true}).waitFor();
    await chart.getByRole('button',{name:'Consultas',exact:true}).click();
    await chart.getByRole('button',{name:'Abrir consulta',exact:true}).first().click();
    await chart.getByRole('heading',{name:'Consulta seleccionada',exact:true}).waitFor();
    await chart.getByRole('button',{name:'Volver a la historia',exact:true}).click();
    await chart.getByRole('button',{name:'Iniciar consulta',exact:true}).click();
    await page.getByRole('heading',{name:'Nueva consulta del paciente',exact:true}).waitFor();
    assert.ok(await page.locator('#field-mascota_id').inputValue());
    await page.getByRole('button',{name:'Cerrar',exact:true}).click();
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await page.screenshot({path:'/tmp/superkanes-patient-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('OK: Chromium: ficha, antecedentes, consulta contextual y vista móvil.');
  } finally {await browser.close();}
};
