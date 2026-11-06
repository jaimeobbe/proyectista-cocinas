/* Versión instalable: conecta la app con la IA de Anthropic usando la clave del taller, gestiona descargas y ajustes. */
(function(){
  window.K = window.K || {};
  K.PWA = true;
  const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v==null? d : v; }catch(e){ return d; } }, set(k,v){ try{ v==null? localStorage.removeItem(k) : localStorage.setItem(k,v); return true; }catch(e){ return false; } } };
  const MODELS=[
    {k:'claude-sonnet-5-5', n:'Equilibrado (recomendado)'},
    {k:'claude-opus-5-5', n:'Máxima precisión (más caro)'},
    {k:'claude-haiku-5-5', n:'Rápido y económico'}
  ];
  const AI = K.AI = {
    models: MODELS,
    key(){ return LS.get('pc_ai_key',''); },
    model(){ return LS.get('pc_ai_model', MODELS[0].k); },
    setKey(v){ LS.set('pc_ai_key', v? v.trim() : null); },
    setModel(v){ LS.set('pc_ai_model', v); }
  };
  function err(code, message){ const e=new Error(message||code); e.code=code; return e; }
  function blobToB64(b){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(',')[1]); r.onerror=()=>rej(err('image_rejected')); r.readAsDataURL(b); }); }

  async function call(input, opts){
    opts=opts||{}; const key=AI.key(); if(!key) throw err('no_key');
    if(!navigator.onLine) throw err('offline');
    const content=[];
    for(const img of (opts.images||[])){ const data=await blobToB64(img); content.push({type:'image', source:{type:'base64', media_type: img.type||'image/jpeg', data}}); }
    let messages;
    if(typeof input==='string'){ content.push({type:'text', text: input}); messages=[{role:'user', content}]; }
    else { messages=input.map((m,i)=>({role:m.role, content: (i===input.length-1 && content.length)? [...content,{type:'text',text:m.content}] : m.content})); }
    let res;
    try{
      res = await fetch('https://api.anthropic.com/v1/messages', { method:'POST', signal: opts.signal,
        headers:{ 'content-type':'application/json', 'x-api-key': key, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
        body: JSON.stringify({ model: AI.model(), max_tokens: opts.maxTokens||4096, messages }) });
    }catch(e){ if(e && e.name==='AbortError') throw err('cancelled'); throw err('offline'); }
    if(!res.ok){
      let body=''; try{ body=await res.text(); }catch(e){}
      if(res.status===401||res.status===403) throw err('bad_key', body);
      if(res.status===429) throw err('rate_limited', body);
      if(res.status===400 && /credit|balance|billing/i.test(body)) throw err('no_credit', body);
      if(res.status===404 && /model/i.test(body)) throw err('bad_model', body);
      if(res.status>=500) throw err('overloaded', body);
      throw err('api_error', body);
    }
    const j=await res.json();
    const text=(j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
    if(opts.onText){ try{ opts.onText({text, delta:text}); }catch(e){} }
    return {text, truncated: j.stop_reason==='max_tokens'};
  }
  function parseJson(t){
    let s=String(t||'').trim().replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
    try{ return JSON.parse(s); }catch(e){}
    const a=s.indexOf('{'), b=s.lastIndexOf('}'); if(a>=0 && b>a){ try{ return JSON.parse(s.slice(a,b+1)); }catch(e){} }
    throw err('invalid_json');
  }
  const sample = async (input, opts)=> call(input, opts);
  sample.json = async (input, opts)=> parseJson((await call(input, Object.assign({maxTokens:6000}, opts||{}))).text);
  sample.limits = async ()=>({ images:{ maxCount: 8 } });

  async function save({filename, data}){
    const blob = data instanceof Blob ? data : new Blob([data], {type: /\.html$/.test(filename)? 'text/html;charset=utf-8' : /\.csv$/.test(filename)? 'text/csv;charset=utf-8' : /\.json$/.test(filename)? 'application/json' : 'application/octet-stream'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 30000);
    return {saved:true};
  }
  async function share({filename, data, title}){
    const blob = data instanceof Blob ? data : new Blob([data], {type:'text/html'}); const file=new File([blob], filename, {type: blob.type});
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title: title||filename}); return true; }
    return false;
  }
  K.share = share;

  window.claude = { use: async (name)=>{ if(name==='sample') return AI.key()? sample : null; if(name==='downloads') return {save}; return null; } };

  /* ---------- Panel de ajustes ---------- */
  const esc=(s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function panelAjustes(){
    const k=AI.key(); const masked = k? k.slice(0,10)+'…'+k.slice(-4) : '';
    return `<h4>Asistente de IA</h4>
    <p class="hint">El asistente de voz y el escáner de vídeo usan la IA de Anthropic con la clave de vuestro taller. Se paga sólo lo que se usa: una orden de voz cuesta unos céntimos y un escáner de vídeo algo más.</p>
    ${k? `<p class="hint">Clave guardada en este dispositivo: <b>${esc(masked)}</b></p>` : `<p class="empty">Todavía no hay clave. Sin ella el asistente funciona en modo básico (medidas, huecos, distribuciones y colores) y en el escáner las puertas y ventanas se marcan a mano.</p>`}
    <label class="fld"><span>${k?'Cambiar la clave':'Clave de la IA (empieza por sk-ant-)'}</span><input id="aiKey" type="password" autocomplete="off" inputmode="text" placeholder="sk-ant-…"></label>
    <label class="fld"><span>Nivel de la IA</span><select id="aiModel">${MODELS.map(m=>`<option value="${m.k}" ${m.k===AI.model()?'selected':''}>${esc(m.n)}</option>`).join('')}</select></label>
    <div class="btns"><button class="btn primary" data-act="aiSave">Guardar clave</button><button class="btn" data-act="aiTest">Probar conexión</button>${k?'<button class="btn ghost danger" data-act="aiDel">Borrar clave</button>':''}</div>
    <p class="hint" id="aiTestOut"></p>
    <details><summary>Cómo conseguir la clave</summary>
      <ol class="steps"><li>Entra en <a href="https://console.anthropic.com/" target="_blank" rel="noopener">console.anthropic.com</a> y crea una cuenta para el taller.</li><li>En «Billing», añade una tarjeta y un saldo inicial (con 10–20 € hay para mucho uso).</li><li>En «API Keys», pulsa «Create Key», cópiala y pégala aquí.</li><li>Haz lo mismo en el móvil de tu socio, o pásale la misma clave.</li></ol>
      <p class="hint">La clave se guarda sólo en este dispositivo y únicamente se envía a Anthropic.</p></details>
    <h4>Copia de seguridad</h4>
    <p class="hint">Los proyectos se guardan en este dispositivo. Haz una copia de vez en cuando o para pasarlos a otro móvil.</p>
    <div class="btns"><button class="btn" data-act="backupAll">Descargar copia de todo</button><label class="btn ghost file">Restaurar copia<input type="file" id="restoreAll" accept="application/json,.json"></label></div>
    <h4>Aplicación</h4>
    <p class="hint">Versión ${esc(K.VERSION||'')}. Funciona sin conexión salvo el asistente de IA.</p>
    <div class="btns"><button class="btn ghost" data-act="checkUpdate">Buscar actualización</button></div>`;
  }
  async function onAct(act, el){
    const A=K.app;
    if(act==='aiSave'){ const v=(document.getElementById('aiKey')||{}).value||''; if(!/^sk-ant-/.test(v.trim())){ A.toast('La clave debe empezar por sk-ant-'); return true; } AI.setKey(v); A.toast('Clave guardada'); if(K.AS && K.AS.reconnect) await K.AS.reconnect(); A.renderPanel(); return true; }
    if(act==='aiDel'){ AI.setKey(null); if(K.AS && K.AS.reconnect) await K.AS.reconnect(); A.renderPanel(); A.toast('Clave borrada'); return true; }
    if(act==='aiTest'){ const out=document.getElementById('aiTestOut'); const typed=(document.getElementById('aiKey')||{}).value; if(typed && /^sk-ant-/.test(typed.trim())) AI.setKey(typed);
      out.textContent='Probando…'; try{ const r=await call('Responde sólo con la palabra: OK', {maxTokens:10}); out.textContent = /ok/i.test(r.text)? 'Conexión correcta. El asistente está listo.' : 'Responde, pero de forma inesperada: '+r.text; if(K.AS && K.AS.reconnect) await K.AS.reconnect(); }
      catch(e){ out.textContent = K.AI.errorText(e); } return true; }
    if(act==='backupAll'){ const data={tipo:'copia-proyectista', fecha:new Date().toISOString(), actual: A.state, proyectos: (()=>{ try{ return JSON.parse(localStorage.getItem('pc_projects')||'[]'); }catch(e){ return []; } })()}; save({filename:'Copia proyectos cocinas '+new Date().toISOString().slice(0,10)+'.json', data: JSON.stringify(data)}); return true; }
    if(act==='checkUpdate'){ try{ const reg=await navigator.serviceWorker.getRegistration(); if(reg){ await reg.update(); A.toast(reg.installing||reg.waiting? 'Actualización descargada: se aplicará al reiniciar la app' : 'Tienes la última versión'); } else A.toast('Tienes la última versión'); }catch(e){ A.toast('Sin conexión: inténtalo más tarde'); } return true; }
    return false;
  }
  function onChange(id, t){
    const A=K.app;
    if(id==='aiModel'){ AI.setModel(t.value); A.toast('Nivel de IA cambiado'); return true; }
    if(id==='restoreAll'){ const f=t.files[0]; if(!f) return true; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(d.tipo!=='copia-proyectista') throw 0; localStorage.setItem('pc_projects', JSON.stringify(d.proyectos||[])); if(d.actual){ A.state=A.migrate(d.actual); A.hist=[]; A.commit('restaurar',{panel:true}); } A.toast('Copia restaurada: '+(d.proyectos||[]).length+' proyectos'); }catch(e){ A.toast('Ese archivo no es una copia de esta app'); } }; r.readAsText(f); return true; }
    return false;
  }
  AI.errorText = function(e){
    return ({no_key:'Falta la clave de IA. Añádela en Ajustes.', bad_key:'La clave de IA no es válida o está desactivada. Revísala en Ajustes.', no_credit:'La cuenta de IA no tiene saldo. Recárgala en console.anthropic.com.', rate_limited:'Demasiadas peticiones seguidas. Espera un momento.', overloaded:'El servicio de IA está saturado. Inténtalo en unos segundos.', offline:'No hay conexión a internet. El asistente completo necesita conexión.', bad_model:'Ese nivel de IA no está disponible para vuestra cuenta. Elige otro en Ajustes.', invalid_json:'No he entendido bien la respuesta. Prueba a decirlo de otra forma.', cancelled:'Cancelado.', image_rejected:'No se ha podido enviar alguna imagen.'})[e && e.code] || 'No se ha podido conectar con la IA.';
  };
  K.platformInit = function(){
    const A=K.app; if(!A.addPanel) return;
    A.addPanel('ajustes','Ajustes', panelAjustes, onAct, onChange);
    const rail=document.getElementById('rail');
    if(rail && !rail.querySelector('[data-p="ajustes"]')){ rail.insertAdjacentHTML('beforeend','<button data-p="ajustes"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>Ajustes</button>'); }
  };
})();
