const assert=require('node:assert/strict');
const {chromium}=require('playwright');
module.exports=async function quickEntry({base,adminToken,user,ids,outside}) {
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const origin=process.env.TEST_FRONTEND_URL||'http://localhost:5174';
 let loseTutor=true;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
  if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:adminToken,userId:user,expiresIn:3600},headers});
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
  const response=await route.fetch({url:base+url.pathname+url.search});
  if(loseTutor&&url.pathname.endsWith('/resources/tutor')&&route.request().method()==='POST'){loseTutor=false;return route.abort('failed');}
  await route.fulfill({response,headers:{...response.headers(),...headers}});
 });
 const saved=(resource)=>page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1/resources/${resource}`&&r.request().method()==='POST');
 try{
  await page.goto(origin);await page.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:'Agenda',exact:true}).click();
  await page.getByRole('button',{name:'Programar cita',exact:true}).click();
  const appointment=page.getByRole('dialog',{name:'Programar cita',exact:true});
  await appointment.locator('[name="notas"]').fill('Datos de la cita conservados');
  await appointment.locator('[name="inicio"]').fill('2027-06-15T09:00');await appointment.locator('[name="fin"]').fill('2027-06-15T09:30');
  await appointment.locator(`[name="sede_id"] option[value="${ids.sede}"]`).waitFor({state:'attached'});await appointment.locator('[name="sede_id"]').selectOption(ids.sede);
  await appointment.getByLabel('Buscar mascota',{exact:true}).fill('Busqueda lote');
  await page.waitForFunction(()=>document.querySelectorAll('#field-mascota_id option').length===26);
  const relation=appointment.locator('div').filter({has:page.locator(':scope > label[for="field-mascota_id-search"]')});
  await relation.getByRole('button',{name:'Cargar más opciones',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('#field-mascota_id option').length===29);
  await appointment.getByLabel('Buscar mascota',{exact:true}).fill(outside.codigo);
  await appointment.locator(`[name="mascota_id"] option[value="${outside.id}"]`).waitFor({state:'attached'});
  await appointment.locator('[name="mascota_id"]').selectOption(outside.id);
  await page.waitForFunction(id=>document.querySelector('#field-tutor_contacto_id').value===id,ids.tutor);
  await appointment.getByLabel('Buscar mascota',{exact:true}).fill('sin coincidencias');
  await relation.getByText('No hay coincidencias para esta búsqueda.',{exact:false}).waitFor();
  assert.equal(await appointment.locator('[name="mascota_id"]').inputValue(),outside.id);
  await appointment.getByLabel('Buscar mascota',{exact:true}).press('Enter');assert.ok(await appointment.isVisible());
  // Clear the suggested contact so the new patient's guardian is suggested again.
  await appointment.locator('[name="tutor_contacto_id"]').selectOption('');
  await appointment.getByRole('button',{name:'+ Nueva mascota',exact:true}).click();
  const pet=page.getByRole('dialog',{name:'Nueva mascota sin salir del formulario',exact:true});
  await pet.locator('[name="codigo"]').fill('INLINE-PET');await pet.locator('[name="nombre"]').fill('Luna');
  await pet.locator(`[name="especie_id"] option[value="${ids.especie}"]`).waitFor({state:'attached'});await pet.locator('[name="especie_id"]').selectOption(ids.especie);
  await pet.getByRole('button',{name:'+ Nuevo tutor',exact:true}).click();
  let tutor=page.getByRole('dialog',{name:'Nuevo tutor sin salir del formulario',exact:true});
  await tutor.locator('[name="nombres"]').fill('No guardar');await page.keyboard.press('Escape');
  await tutor.getByRole('button',{name:'Descartar cambios',exact:true}).click();
  assert.equal(await pet.locator('[name="nombre"]').inputValue(),'Luna');assert.equal(await pet.getByRole('button',{name:'Descartar cambios',exact:true}).count(),0);
  await pet.getByRole('button',{name:'+ Nuevo tutor',exact:true}).click();
  tutor=page.getByRole('dialog',{name:'Nuevo tutor sin salir del formulario',exact:true});
  await tutor.locator('[name="nombres"]').fill('Tutor contextual');await tutor.locator('[name="apellidos"]').fill('Prueba');
  assert.deepEqual(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)}),[]);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:'/tmp/superkanes-quick-entry-mobile.png'});
  await tutor.getByRole('button',{name:'Guardar',exact:true}).click();await tutor.getByRole('alert').filter({hasText:'Comprueba tu conexión'}).waitFor();
  const tutorResponse=saved('tutor');await tutor.getByRole('button',{name:'Guardar',exact:true}).click();const tutorResult=await tutorResponse;assert.equal(tutorResult.status(),201);const tutorId=(await tutorResult.json()).data.id;
  await page.waitForFunction(id=>document.querySelector('#nested-1-field-tutor_principal_id')?.value===id,tutorId);
  const petResponse=saved('mascota');await pet.getByRole('button',{name:'Guardar',exact:true}).click();const petResult=await petResponse;assert.equal(petResult.status(),201);const petId=(await petResult.json()).data.id;
  await page.waitForFunction(id=>document.querySelector('#field-mascota_id')?.value===id,petId);
  await page.waitForFunction(id=>document.querySelector('#field-tutor_contacto_id')?.value===id,tutorId);
  assert.equal(await appointment.locator('[name="notas"]').inputValue(),'Datos de la cita conservados');
  assert.equal(await appointment.locator('[name="inicio"]').inputValue(),'2027-06-15T09:00');
  assert.equal(await appointment.locator('[name="sede_id"]').inputValue(),ids.sede);
  const appointmentResponse=saved('cita');await appointment.getByRole('button',{name:'Guardar',exact:true}).click();const appointmentResult=await appointmentResponse;assert.equal(appointmentResult.status(),201);
  const appointmentId=(await appointmentResult.json()).data.id;
  assert.deepEqual(errors,[]);console.log('OK: Chromium: cita → mascota → tutor, cancelación, reintento idempotente, selección automática, búsqueda paginada y móvil.');
  return {petId,tutorId,appointmentId};
 }catch(e){await page.screenshot({path:'/tmp/superkanes-quick-entry-failure.png',fullPage:true});throw e;}finally{await page.unrouteAll({behavior:'wait'});await browser.close();}
};
