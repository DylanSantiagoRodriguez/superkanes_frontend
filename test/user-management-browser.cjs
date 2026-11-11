const assert=require('node:assert/strict');
const {chromium}=require('playwright');
module.exports=async function({base,adminToken,staffToken,user,first,existingRole}){
 const browser=await chromium.launch();const origin=process.env.TEST_FRONTEND_URL||'http://localhost:5174';
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 async function wire(target,token){await target.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());const headers={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
  if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:token,userId:user,expiresIn:3600},headers});
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
  try{const response=await route.fetch({url:base+url.pathname+url.search});await route.fulfill({response,headers:{...response.headers(),...headers}});}catch(e){if(!/Route is already handled/.test(e.message))throw e;}
 });}
 const nav=page.getByRole('navigation',{name:'Navegación principal'});
 const panel=page.getByRole('region',{name:'Usuarios y accesos',exact:true});
 async function selectOrg(name,role){await panel.getByRole('checkbox',{name:new RegExp(name)}).check();await panel.getByLabel('Rol en '+name,{exact:true}).selectOption(role?role:{label:'Administrador de organización'});}
 async function submit(name,path){const response=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()==='POST');await panel.getByRole('button',{name,exact:true}).click();const res=await response;assert.equal(res.status(),201);return (await res.json()).data;}
 try{
  await wire(page,adminToken);await page.goto(origin);await nav.getByRole('button',{name:'Usuarios y accesos',exact:true}).click();
  await panel.getByLabel('Nombre completo',{exact:true}).fill('Profesional del navegador');
  await panel.getByLabel('Correo electrónico del usuario',{exact:true}).fill('navegador-accesos@example.test');
  await panel.getByLabel('Contraseña inicial').fill('Una clave de prueba para navegador 2026!');
  await selectOrg('Accesos Norte',existingRole);await selectOrg('Accesos Sur');
  await panel.getByRole('button',{name:'Vincular usuario existente',exact:true}).click();
  await panel.getByText('Guarda o descarta los cambios antes de cambiar de opción.').waitFor();
  await page.screenshot({path:'/tmp/superkanes-users-create.png',fullPage:true});
  const created=await submit('Crear usuario y vincular','/api/v1/auth/admin/users');
  await panel.getByText(/cuenta creada y acceso guardado en 2 organizaciones/).waitFor();
  await panel.getByRole('checkbox',{name:/Accesos Norte Ya pertenece/}).waitFor();
  await panel.getByLabel('Buscar por nombre o correo').fill('navegador-accesos');
  await panel.getByRole('button',{name:/Profesional del navegador.*navegador-accesos/}).click();
  await selectOrg('Accesos Centro');
  await submit('Guardar vínculos',`/api/v1/auth/admin/users/${created.user.id}/organizations`);
  await panel.getByText(/accesos vinculados en 1 organización/).waitFor();
  // Self-link refreshes the organization selector without logging out.
  await panel.getByLabel('Buscar por nombre o correo').fill('root@example.test');
  await panel.getByRole('button',{name:/Operador \(tu cuenta\)/}).click();
  await selectOrg('Accesos Norte',existingRole);
  await submit('Guardar vínculos',`/api/v1/auth/admin/users/${user}/organizations`);
  await page.getByRole('combobox',{name:'Organización',exact:true}).locator(`option[value="${first}"]`).waitFor({state:'attached'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/superkanes-users-mobile.png',fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile overflow');
  const limited=await browser.newPage();await wire(limited,staffToken);await limited.goto(origin);
  await limited.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:'Mascotas y tutores',exact:true}).waitFor();
  assert.equal(await limited.getByRole('navigation',{name:'Navegación principal'}).getByRole('button',{name:'Usuarios y accesos',exact:true}).count(),0);
  await limited.unrouteAll({behavior:'wait'});await limited.close();
  assert.deepEqual(errors,[]);
  console.log('OK: Chromium: crear cuenta para dos organizaciones, buscar/vincular cuenta existente, preservar vínculos, autovincular y actualizar selector, permisos y diseño móvil.');
 }catch(e){await page.screenshot({path:'/tmp/superkanes-users-failure.png',fullPage:true});throw e;}
 finally{await page.unrouteAll({behavior:'wait'});await browser.close();}
};
