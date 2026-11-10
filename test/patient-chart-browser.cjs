const assert = require('node:assert/strict');
const { chromium } = require('playwright');
module.exports = async function chartBrowser({base,adminToken,renewedToken,user}) {
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  let loseNextSave=false, refreshCount=0;
  // Trigger the actual session renewal callback deterministically while typing.
  await page.addInitScript(() => {
    const original=window.setTimeout.bind(window);
    window.setTimeout=(handler,delay,...args)=>{
      const id=original(handler,delay,...args);
      if(delay===3540000 && typeof handler==='function')window.addEventListener('test:renew-session',()=>{window.clearTimeout(id);handler(...args)},{once:true});
      return id;
    };
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const origin=process.env.TEST_FRONTEND_URL || 'http://localhost:5174';
  await page.route('**/api/v1/**',async route=>{
    const url=new URL(route.request().url());
    const cors={'access-control-allow-origin':origin,'access-control-allow-credentials':'true'};
    if(url.pathname==='/api/v1/auth/refresh')return route.fulfill({json:{accessToken:++refreshCount===1?adminToken:renewedToken,userId:user,expiresIn:3600},headers:cors});
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{...cors,'access-control-allow-headers':'*','access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS'}});
    const response=await route.fetch({url:base+url.pathname+url.search});
    if(loseNextSave && url.pathname.endsWith('/guardar')){loseNextSave=false;return route.abort('failed')}
    await route.fulfill({response,headers:{...response.headers(),...cors}});
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

    await page.locator('#field-sede_id option').nth(1).waitFor({state:'attached'});
    await page.locator('#field-sede_id').selectOption({index:1});
    await page.locator('#field-motivo_consulta').fill('Consulta integrada desde ficha');
    await page.getByRole('button',{name:'Guardar atención e historia',exact:true}).click();
    const consultation=chart.getByRole('region',{name:'Consulta integrada'});
    await consultation.locator('textarea[name="anamnesis"]').fill('Antecedentes registrados en consulta');
    await consultation.locator('textarea[name="examen_fisico"]').fill('Examen objetivo registrado');
    await consultation.locator('textarea[name="evaluacion"]').fill('Evaluación de prueba');
    await consultation.locator('textarea[name="plan"]').fill('Control y recomendaciones de prueba');
    assert.equal(await chart.getByRole('button',{name:'Volver a la historia',exact:true}).isDisabled(),true);
    const renewedRequest=page.waitForResponse(response=>response.url().includes('/resources/revision_clinica?')&&response.request().headers().authorization===`Bearer ${renewedToken}`);
    await page.evaluate(()=>window.dispatchEvent(new Event('test:renew-session')));
    await renewedRequest;
    await page.waitForLoadState('networkidle');
    assert.equal(refreshCount,2);
    assert.equal(await consultation.locator('textarea[name="plan"]').inputValue(),'Control y recomendaciones de prueba');
    await consultation.getByRole('button',{name:'Añadir medición',exact:true}).click();
    await page.locator('#field-valor').fill('13.2');
    await page.getByRole('button',{name:'Guardar',exact:true}).click();
    await consultation.getByText('Peso: 13.200 kg',{exact:true}).waitFor();
    await chart.getByText(/Último peso registrado: 13.200 kg/).waitFor();
    assert.equal(await consultation.locator('textarea[name="examen_fisico"]').inputValue(),'Examen objetivo registrado');
    await consultation.locator('textarea[name="plan"]').fill('Control y recomendaciones de prueba');
    loseNextSave=true;
    await consultation.getByRole('button',{name:'Guardar consulta',exact:true}).click();
    await consultation.getByRole('alert').filter({hasText:'Comprueba tu conexión'}).waitFor();
    assert.equal(await consultation.locator('textarea[name="plan"]').inputValue(),'Control y recomendaciones de prueba');
    await consultation.getByRole('button',{name:'Guardar consulta',exact:true}).click();
    await consultation.getByText('Consulta guardada.',{exact:true}).waitFor();
    if(process.env.TEST_STORAGE==='true'){
      const {PDFDocument}=require('../../superkanes_backend/node_modules/pdf-lib');
      const pdf=await PDFDocument.create();pdf.addPage();
      await consultation.getByLabel('Adjuntar informe o imagen',{exact:true}).setInputFiles({name:'Informe.pdf',mimeType:'application/pdf',buffer:Buffer.from(await pdf.save())});
      await consultation.getByRole('button',{name:'Subir documento',exact:true}).click();
      await consultation.getByText('Informe.pdf',{exact:true}).waitFor();
    }

    const laboratory=consultation.getByRole('region',{name:'Laboratorio de la consulta'});
    await laboratory.getByRole('button',{name:'Solicitar exámenes',exact:true}).click();
    await laboratory.getByLabel('Laboratorio',{exact:true}).selectOption({index:1});
    await laboratory.getByLabel('Exámenes solicitados',{exact:true}).fill('Examen solicitado desde consulta');
    await laboratory.getByLabel('Indicación clínica',{exact:true}).fill('Indicación de prueba');
    await chart.getByRole('button',{name:'Resumen',exact:true}).click();
    await laboratory.getByText('Guarda o cancela el formulario de laboratorio antes de salir.',{exact:true}).waitFor();
    assert.equal(await laboratory.getByLabel('Exámenes solicitados',{exact:true}).inputValue(),'Examen solicitado desde consulta');
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByRole('button',{name:'Registrar muestra',exact:true}).click();
    await laboratory.getByLabel('Identificación y tipo de muestra',{exact:true}).fill('Muestra identificada');
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByRole('button',{name:'Registrar procesamiento',exact:true}).click();
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByRole('button',{name:'Registrar resultado',exact:true}).click();
    await laboratory.getByLabel('Resultado informado',{exact:true}).fill('Resultado de prueba');
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByRole('button',{name:'Registrar interpretación',exact:true}).click();
    await laboratory.getByLabel('Interpretación del profesional',{exact:true}).fill('Interpretación clínica de prueba');
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByRole('button',{name:'Documentar comunicación',exact:true}).click();
    await laboratory.getByLabel('Contacto realizado e indicaciones comunicadas',{exact:true}).fill('Se documenta contacto presencial de prueba');
    await laboratory.getByRole('button',{name:'Guardar laboratorio',exact:true}).click();
    await laboratory.getByText('Contacto documentado: Se documenta contacto presencial de prueba',{exact:true}).waitFor();
    if(process.env.TEST_STORAGE==='true'){
      const consents=consultation.getByRole('region',{name:'Consentimientos clínicos'});
      await consents.getByRole('button',{name:'Emitir consentimiento clínico',exact:true}).click();
      await page.locator('#field-plantilla_id option').nth(1).waitFor({state:'attached'});
      await page.locator('#field-plantilla_id').selectOption({index:1});
      await page.locator('#field-documento_archivo_id').selectOption({index:1});
      await page.locator('#field-procedimiento').fill('Procedimiento consentido de prueba');
      await page.getByRole('button',{name:'Guardar',exact:true}).click();
      await consents.getByRole('button',{name:'Registrar aceptación o rechazo',exact:true}).click();
      await page.locator('#field-tutor_id option').nth(1).waitFor({state:'attached'});
      await page.locator('#field-tutor_id').selectOption(await page.locator('#field-tutor_id option').filter({hasText:/^Ana Prueba ·/}).getAttribute('value'));
      await page.locator('#field-evidencia_archivo_id').selectOption({index:1});
      await page.getByRole('button',{name:'Guardar',exact:true}).click();
      await consents.getByRole('heading',{name:'Procedimiento consentido de prueba · aceptado',exact:true}).waitFor();
    }
    await consultation.getByRole('button',{name:'Revisar y cerrar consulta',exact:true}).click();
    await consultation.getByRole('button',{name:'Confirmar cierre de consulta',exact:true}).click();
    await consultation.getByText('Consulta cerrada. El original queda protegido.',{exact:true}).waitFor();
    assert.equal(await consultation.locator('textarea[name="anamnesis"]').isDisabled(),true);
    if(process.env.TEST_STORAGE==='true'){
      const downloaded=page.waitForEvent('download');
      await consultation.getByRole('button',{name:'Descargar historia de consulta PDF',exact:true}).click();
      const file=await downloaded;assert.match(file.suggestedFilename(),/historia-.*\.pdf$/);
      const fs=require('node:fs');assert.equal(fs.readFileSync(await file.path()).subarray(0,5).toString(),'%PDF-');
    }
    await consultation.getByLabel('Motivo de la corrección',{exact:true}).fill('Aclaración de seguimiento');
    await consultation.getByRole('button',{name:'Crear corrección vinculada',exact:true}).click();
    await consultation.locator('textarea[name="plan"]:enabled').waitFor();
    await consultation.locator('textarea[name="plan"]').fill('Plan aclarado en nueva revisión');
    await consultation.getByRole('button',{name:'Guardar consulta',exact:true}).click();
    await consultation.getByText('Consulta guardada.',{exact:true}).waitFor();
    await consultation.getByText('Comparar con la revisión anterior',{exact:true}).click();
    await consultation.getByText('Anterior: Control y recomendaciones de prueba',{exact:true}).waitFor();
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
    await page.screenshot({path:'/tmp/superkanes-patient-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('OK: Chromium: ficha, SOAP, medición, cierre, corrección preservada y vista móvil.');
  } catch(error) { await page.screenshot({path:'/tmp/superkanes-workflow-failure.png',fullPage:true}); throw error; } finally {await page.unrouteAll({behavior:'wait'}); await browser.close();}
};
