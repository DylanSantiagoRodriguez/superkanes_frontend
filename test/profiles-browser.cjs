const assert=require('node:assert/strict');
const {chromium}=require('playwright');
module.exports=async function profiles({base,adminToken,user,pet,second,siteId}){
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:1100}});const origin=process.env.TEST_FRONTEND_URL||'http://localhost:5174';const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
  if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:adminToken,userId:user,expiresIn:3600},headers});
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
  const response=await route.fetch({url:base+url.pathname+url.search});await route.fulfill({response,headers:{...response.headers(),...headers}});
 });
 try{
  await page.goto(origin);await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:'Mascotas y tutores',exact:true}).click();
  await page.getByRole('combobox',{name:'Sección',exact:true}).selectOption('tutor');
  await page.getByRole('button',{name:'Ver Tutor perfil Prueba',exact:true}).click();
  const guardian=page.getByRole('article',{name:'Perfil del tutor'});
  await guardian.getByRole('heading',{name:'Tutor perfil Prueba',exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
  await guardian.getByRole('button',{name:'Ver perfil de '+second.nombre,exact:true}).waitFor();
  await page.screenshot({path:'/tmp/superkanes-tutor-profile.png',fullPage:true});
  await guardian.getByRole('button',{name:'Editar',exact:true}).click();await page.locator('#field-ciudad').fill('Ciudad de prueba');await page.getByRole('button',{name:'Guardar',exact:true}).click();await guardian.getByText('Ciudad de prueba',{exact:true}).waitFor();
  await guardian.getByRole('button',{name:'Ver perfil de '+pet.nombre,exact:true}).click();
  const chart=page.getByRole('article',{name:'Ficha clínica del paciente'});
  await chart.getByRole('heading',{name:pet.nombre,exact:true}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);
  const weights=chart.getByRole('region',{name:'Seguimiento del peso'});
  await weights.getByRole('img',{name:'Pesos observados por fecha, sin interpolación'}).waitFor();
  await chart.getByRole('button',{name:'Citas y controles',exact:true}).click();await chart.getByText('Control registrado en perfil',{exact:true}).waitFor();await chart.getByText('Citas · cancelada',{exact:true}).waitFor();
  await weights.getByRole('button',{name:'Registrar peso',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Registrar peso (kg)',exact:true});await dialog.locator('[name="valor"]').fill('14.1');
  await dialog.locator(`[name="sede_id"] option[value="${siteId}"]`).waitFor({state:'attached'});await dialog.locator('[name="sede_id"]').selectOption(siteId);
  const response=page.waitForResponse(r=>r.url().includes(`/pacientes/${pet.id}/pesos`)&&r.request().method()==='POST');
  await dialog.getByRole('button',{name:'Guardar',exact:true}).click();assert.equal((await response).status(),201);
  await chart.getByText(/Último peso registrado: 14.100 kg/).waitFor();await weights.getByText(/14,1 kg/).first().waitFor();
  await page.screenshot({path:'/tmp/superkanes-patient-profile.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/superkanes-profile-mobile.png',fullPage:true});
  await chart.getByRole('button',{name:'← Volver al tutor',exact:true}).click();await guardian.getByRole('heading',{name:'Tutor perfil Prueba',exact:true}).waitFor();
  await guardian.getByRole('button',{name:'← Volver a tutores',exact:true}).click();await page.getByRole('button',{name:'Ver Tutor perfil Prueba',exact:true}).waitFor();
  assert.deepEqual(errors,[]);console.log('OK: Chromium: perfiles en página, tarjetas, edición, regreso, citas canceladas, registro manual de peso y gráfica móvil.');
 }catch(e){await page.screenshot({path:'/tmp/superkanes-profiles-failure.png',fullPage:true});throw e;}finally{await page.unrouteAll({behavior:'wait'});await browser.close();}
};
