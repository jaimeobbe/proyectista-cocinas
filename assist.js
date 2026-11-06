/* Asistente por voz/texto y escáner de vídeo 360°. Usa la capacidad "sample" (Claude) cuando el visor la ofrece. */
(function(){
  const AS = K.AS = {};
  const $=(s,el)=>(el||document).querySelector(s), $$=(s,el)=>[...(el||document).querySelectorAll(s)];
  const esc=(s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const A=()=>K.app; const C=()=>K.CATALOG;
  let sample=null, sampleImgs=false, maxImgs=0, ctl=null; const chat=[];

  AS.init = async function(){
    $('#aiBtn').onclick=()=>{ const s=$('#aiSheet'); s.hidden=!s.hidden; if(!s.hidden) setTimeout(()=>$('#aiText').focus(),50); };
    $('#aiClose').onclick=()=>$('#aiSheet').hidden=true;
    $('#aiSend').onclick=send; $('#aiText').addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
    $('#aiStop').onclick=()=>{ if(ctl) ctl.abort(); };
    $('#aiMic').onclick=mic;
    $$('#aiSug button').forEach(b=>b.onclick=()=>{ $('#aiText').value=b.textContent; send(); });
    renderChat();
    try{ if(window.claude && window.claude.use){ sample = await window.claude.use('sample'); if(sample){ const lim=await sample.limits().catch(()=>null); if(lim && lim.images){ sampleImgs=true; maxImgs=lim.images.maxCount||8; } } } }catch(e){ sample=null; }
    setMode();
    if(A().panel==='escaner') A().renderPanel();
  };
  function setMode(){ $('#aiMode').textContent = sample? 'Interpreta lo que dices y modifica el diseño' : (K.PWA? 'Modo básico · añade la clave de IA en Ajustes' : 'Modo básico: medidas, huecos, distribución y acabados'); }
  AS.reconnect = async function(){ sample=null; sampleImgs=false; try{ sample = await window.claude.use('sample'); if(sample){ const lim=await sample.limits().catch(()=>null); if(lim && lim.images){ sampleImgs=true; maxImgs=lim.images.maxCount||8; } } }catch(e){ sample=null; } setMode(); };

  /* ---------- Voz ---------- */
  function mic(){
    if(AS._rec){ try{ AS._rec.stop(); }catch(e){} return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const tip = 'Para dictar, pulsa el micrófono del teclado de la tablet o el móvil dentro del cuadro de texto.';
    if(!SR){ note(tip); $('#aiText').focus(); return; }
    try{ const r=new SR(); r.lang='es-ES'; r.interimResults=true; r.continuous=true; const base=$('#aiText').value; $('#aiMic').setAttribute('aria-pressed','true');
      r.onresult=(e)=>{ let t=''; for(let i=0;i<e.results.length;i++) t+=e.results[i][0].transcript; $('#aiText').value=(base?base+' ':'')+t; };
      r.onerror=()=>{ note(tip); $('#aiMic').setAttribute('aria-pressed','false'); $('#aiText').focus(); };
      r.onend=()=>{ $('#aiMic').setAttribute('aria-pressed','false'); AS._rec=null; };
      AS._rec=r; r.start(); }catch(e){ note(tip); $('#aiText').focus(); }
  }
  function note(t){ chat.push({role:'note',content:t}); renderChat(); }
  function renderChat(){
    const box=$('#aiLog');
    if(!chat.length){ box.innerHTML=`<p class="hint">Habla o escribe con naturalidad. Por ejemplo: «La cocina mide 3,40 por 2,80 y 2,55 de alto. Hay una ventana de 1,20 en la pared del fondo a 1 metro del suelo. Quiero una cocina en L con el frigorífico a la derecha, frentes verde salvia y encimera blanca».</p>`; return; }
    box.innerHTML=chat.map(m=>`<div class="msg ${m.role}">${m.role==='user'?'<small>Tú</small>':m.role==='assistant'?'<small>Asistente</small>':''}<div>${esc(m.content).replace(/\n/g,'<br>')}</div>${m.acts?`<ul>${m.acts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:''}</div>`).join('');
    box.scrollTop=box.scrollHeight;
  }

  /* ---------- Contexto para Claude ---------- */
  function summary(){
    const st=A().state, r=st.room;
    const ops=st.openings.map(o=>({id:o.id,type:o.type,wall:K.WALL_NAMES[o.wall],pos:o.pos,width:o.width,height:o.height,sill:o.sill}));
    const mods=st.modules.map(m=>{ const wo=K.wallOf(m,r); return {id:m.id,kind:m.kind,name:(C()[m.kind]||{}).n,wall:wo?K.WALL_NAMES[wo.wall]:null,pos:wo?Math.round(wo.pos*10)/10:null,x:Math.round(m.x),z:Math.round(m.z),w:m.w,h:m.h,d:m.d,y:m.y,o:m.o}; });
    const F=st.finish;
    return {room:{W:r.W,D:r.D,H:r.H,floor:r.floor,wallColor:r.wallColor}, openings:ops, modules:mods, finish:{zones:F.zones, top:F.top, topIsla:F.topIsla, handle:F.handle, splash:F.splash.k, applColor:F.applColor, applGama:F.applGama, casco:F.casco, plinth:F.plinth.mat}, conf:st.conf, selected:A().selId};
  }
  const LISTS = ()=>({
    kinds: Object.values(C()).map(c=>c.k+'='+c.n+' ['+c.cat+']').join('; '),
    openings: K.OPENINGS.map(o=>o.k+'='+o.n).join('; '),
    frontMats: K.FRONT_MATS.map(f=>f.k+'='+f.n).join('; '),
    models: K.DOOR_MODELS.map(f=>f.k+'='+f.n).join('; '), gloss: K.GLOSS.map(f=>f.k+'='+f.n).join('; '), types: K.FRONT_TYPES.map(f=>f.k).join(', '),
    tops: K.TOP_MATS.map(f=>f.k+'='+f.n).join('; '), handles: K.HANDLES.map(f=>f.k+'='+f.n).join('; '), hcolors: K.HANDLE_COLORS.map(f=>f.k+'='+f.n).join('; '),
    splash: K.SPLASH.map(f=>f.k+'='+f.n).join('; '), floors: K.FLOORS.map(f=>f.k+'='+f.n).join('; '), appl: K.APPL_COLORS.map(f=>f.k+'='+f.n).join('; '),
    hobs: K.HOBS.map(f=>f.k).join(', '), sinks: K.SINKS.map(f=>f.k).join(', '), taps: K.TAPS.map(f=>f.k).join(', ')
  });
  function wallInfo(){
    const st=A().state, r=st.room; const out={};
    for(let w=0;w<4;w++){
      const L=K.wallLen(r,w);
      const ops=st.openings.filter(o=>o.wall===w).map(o=>`${(K.OPENINGS.find(t=>t.k===o.type)||{n:o.type}).n} ${o.width} cm en pos ${o.pos}`+(o.sill?` a ${o.sill} del suelo`:''));
      const mods=st.modules.map(m=>({m,wo:K.wallOf(m,r)})).filter(x=>x.wo&&x.wo.wall===w).sort((a,b)=>a.wo.pos-b.wo.pos).map(x=>`${x.m.id}:${(C()[x.m.kind]||{}).n} ${Math.round(x.m.w*10)/10}cm [${Math.round(x.wo.pos*10)/10}→${Math.round((x.wo.pos+x.m.w)*10)/10}]`);
      out[K.WALL_NAMES[w]]={longitud:L, lado:['fondo','derecha','enfrente (detrás de quien mira la pared A)','izquierda'][w], huecos:ops, muebles:mods};
    }
    const isla=st.modules.filter(m=>!K.wallOf(m,r)).map(m=>`${m.id}:${(C()[m.kind]||{}).n} ${m.w}cm`);
    if(isla.length) out.exentos=isla;
    return out;
  }
  const GLOSARIO = `VOCABULARIO DEL OFICIO (lo que dice el usuario → lo que significa en la app):
- nevera, frigo, frigorífico → si es "integrado/panelable/escondido" CFRIGO (columna); si es "de libre instalación", "normal", "combi suelto" EFRIGO; "americano", "de dos puertas" EAMER; "puerta francesa" EFRENCH; "congelador" CCONG.
- horno en alto / torre / columna de horno → CHC (con micro: CHM; dos hornos: CHH). Horno bajo encimera / debajo de la placa → BHORNO (90 cm: BHORNO90).
- micro, microondas: en columna con el horno (CHM), en mueble alto (AMIC) o sobre la encimera (EMIC).
- placa, vitro, vitrocerámica, inducción, fuegos, cocina de gas → opción "hob" del mueble bajo de placa (BPLACA). "Cocina de pie / con horno abajo / de libre instalación" → ECOCINA.
- fregadero, pila, seno, "con escurridor", "de dos senos", "bajo encimera" → BFREG con o.sink. Grifo extraíble, de muelle/industrial, alto, bajo → o.tap.
- lavavajillas, lavaplatos → BLV (integrable, 60 o 45) o BLVV (visto). Lavadora → BLAV (integrable) o ELAV (libre). Secadora → ESEC o CLAV (columna lavadora+secadora).
- campana, extractor, extractora: de pared pirámide → HPIR; recta/caja → HREC; de cristal inclinada → HINC; de isla → HISLA; de techo → HTECHO; integrada/telescópica en el mueble → ACAMP; "extractor en la placa / placa con extractor" → hob "indext".
- cajonera, cajonero, cajones → BCAJ2 (2 caceroleros), BCAJ3 (3), BCAJ4 (4). Cacerolero = cajón grande. "Cajón y puerta" → BC1P.
- mueble bajo de una puerta → B1P; de dos puertas → B2P; botellero, especiero, sacabotellas → BBOT; cubos de basura, reciclaje → BBAS; rinconero, esquinero, rincón → BRINC (bajo) o ARINC (alto); fondo reducido → BFR.
- alacena, mueble alto, colgado, de arriba → A1P/A2P; abatible, de puerta hacia arriba → AABAT; elevable doble → AELEV; vitrina, con cristal → AVIT; escurreplatos → AESC; persiana → APERS; estante, balda → ABALDA; alto abierto → AABI; puente sobre la nevera → APUENTE.
- despensa, despensero, columna → CDESP/CDESP2; columna extraíble, despensa extraíble → CDESPX; escobero, armario de escobas → CESCOB; estantería alta → CABI.
- isla → módulos exentos con isla:true o generate type "isla"; península → generate type "peninsula"; barra, desayunador → PBARRA; costado, panel lateral, terminal → PCOST; regleta, relleno, suplemento → PREG.
- zócalo, rodapié de mueble → zócalo (setConf plinthH / acabados). Copete → setSplash copete. Frontal, salpicadero, aplacado, revestimiento entre muebles → setSplash.
- tirador, asa, pomo, uñero, gola, push/sin tirador, perfil → setHandle. Colores: dorado/oro/latón → laton; negro → negro; acero/inox/plata/cromado → inox; bronce; cobre; blanco; titanio/gunmetal → titanio.
- Materiales de frente: lacado → type lacado; laminado/formica → laminado; melamina → melamina; madera natural/chapa → chapa; madera maciza → maciza; antihuellas/fenix → supermate (gloss supermate). Brillo/mate/satinado → gloss.
- Colores habituales: blanco → blanco_polar; blanco roto/hueso → blanco_roto; crema/beige → marfil o arena; gris claro → gris_perla; gris → gris_piedra; gris oscuro/marengo → grafito o antracita; negro → negro; verde → salvia (claro) / oliva / bosque (oscuro); azul → azul_niebla (claro) / azul_marino (oscuro) / azul_petroleo; madera clara → roble_nordico; madera → roble_natural; madera oscura → nogal o roble_ahumado.
- Encimeras: si dicen una marca comercial de cuarzo (por ejemplo Silestone) → familia cuarzo; marcas de porcelánico/sinterizado (Dekton, Neolith, Laminam) → porcelánico; Corian → compacto/solid surface (usa comp_blanco). Nunca escribas la marca en la respuesta: di el tipo genérico. Blanca → cuarzo_blanco; mármol blanco/calacatta/con vetas → porc_calacatta o cuarzo_veta; negra → porc_negro o cuarzo_negro o gran_negro; gris/cemento → porc_cemento; madera → mad_roble o lam_roble.
- Grosores de encimera: "de doce", "1,2" → 1.2 cm; "de dos" → 2; "de tres" → 3.
MEDIDAS HABLADAS (todo pasa a centímetros):
- "tres cuarenta", "3,40", "tres coma cuarenta", "tres metros cuarenta" = 340 cm. "dos ochenta" = 280. "un metro veinte" = 120. "dos cincuenta de alto" = 250. "sesenta", "de sesenta" en un mueble = 60 cm. "noventa centímetros" = 90. "mil doscientos milímetros" = 120 cm. "medio metro" = 50.
- Cuando el usuario dice un número suelto sin unidad, si es menor de 10 son metros; si es mayor, centímetros.
- El dictado a veces confunde palabras: "por" puede ser "x"; "pared de" puede venir como "pared D"; "isla" como "Isla" o "y la"; "L" puede venir escrito como "ele" o "en ele"; "U" como "u" o "en u". Interpreta por el contexto.
REFERENCIAS A PAREDES: usa la ficha de PAREDES. "La de la ventana", "la del fregadero", "la de la puerta", "la del agua", "la de la campana", "la larga", "la corta" → busca la pared que lo cumple. "Fondo" = A, "derecha" = B, "enfrente/la de la entrada" = C, "izquierda" = D si no hay otra pista.
POSICIONES RELATIVAS: "al lado del fregadero", "a la derecha de la nevera", "entre el horno y el fregadero" → usa addModule/updateModule con "next_to" (id del mueble de referencia) y "side":"izq"|"der" (izquierda/derecha mirando la pared). "Pegado a la esquina" → pos 0 o pos = longitud - ancho.`;

  function prompt(text){
    const L=LISTS();
    const hist = chat.filter(m=>m.role==='user'||m.role==='assistant').slice(-9,-1).map(m=> (m.role==='user'?'USUARIO: ':'ASISTENTE: ')+m.content+(m.acts&&m.acts.length?' [hecho: '+m.acts.join('; ')+']':'')).join('\n');
    return `Eres el asistente de una aplicación de diseño de cocinas a medida (fabricación propia, sin marcas) que usa un carpintero en la obra delante de su cliente. Te habla por voz con el dictado del móvil: la transcripción trae errores, frases incompletas, números escritos en palabras y vocabulario de obra. Tu trabajo es entender lo que quiere decir de verdad, como lo entendería un compañero del oficio, y convertirlo en acciones de la aplicación. Todas las medidas de la aplicación son en centímetros.

${GLOSARIO}

GEOMETRÍA: la habitación es rectangular. W = longitud de las paredes A (fondo) y C (enfrente). D = longitud de las paredes B (derecha) y D (izquierda), mirando hacia la pared A. Orden A→B→C→D en sentido horario. "pos" = distancia desde la esquina izquierda de esa pared (mirándola desde dentro) hasta el borde izquierdo del elemento. "sill" = altura desde el suelo hasta la parte inferior del hueco. Ventana sin altura dicha: sill 100. Puerta sin medidas: 82 × 203.

PAREDES (lo que hay ahora en cada una; los muebles van como id:nombre ancho [desde→hasta]):
${JSON.stringify(wallInfo())}

ESTADO COMPLETO (JSON):
${JSON.stringify(summary())}

CATÁLOGOS (clave=nombre):
Tipos de mueble: ${L.kinds}
Huecos y elementos de obra: ${L.openings}
Materiales de frente: ${L.frontMats}
Modelos de frente: ${L.models}
Acabados (brillo): ${L.gloss}
Fabricación del frente: ${L.types}
Encimeras: ${L.tops}
Tiradores: ${L.handles}
Colores de tirador: ${L.hcolors}
Frente de pared: ${L.splash}
Suelos: ${L.floors}
Colores de electrodomésticos: ${L.appl}
Placas: ${L.hobs}. Fregaderos: ${L.sinks}. Grifos: ${L.taps}.

ACCIONES (usa sólo estas, con las claves exactas):
{"a":"setRoom","W":340,"D":280,"H":250}
{"a":"addOpening","type":"ventana","wall":"A","pos":100,"width":120,"height":120,"sill":100,"hingeR":false}
{"a":"updateOpening","id":"...","pos":..,"width":..,"height":..,"sill":..,"wall":"B"}
{"a":"removeOpening","id":"..."}
{"a":"generate","type":"lineal|L|U|paralela|peninsula|isla","main":"A|B|C|D|auto","frigo":"integrado|libre|americano|ninguno","horno":"columna|bajo","micro":"columna|ninguno","lv":60,"lav":false,"altos":true,"despensa":false,"hood":"pir|rec|inc|int|ext|none","colSide":"end|start","flip":false,"islaHob":false}
{"a":"addModule","kind":"BCAJ3","wall":"A","pos":120,"w":60,"h":75,"d":58,"y":12,"isla":false,"next_to":"id","side":"izq|der","o":{"apertura":"izq|der","sink":"s1","tap":"alto","hob":"ind60","mat":"...","model":"...","color":"inox","voladizo":30}}
{"a":"updateModule","id":"...","w":..,"h":..,"d":..,"y":..,"wall":"A","pos":..,"next_to":"id","side":"izq|der","kind":"...","o":{...}}
{"a":"removeModule","id":"..."}
{"a":"clearModules"}
{"a":"setFinish","zone":"bajos|altos|columnas|isla|todas","mat":"...","model":"...","gloss":"...","type":"..."}
{"a":"setTop","mat":"...","thick":2,"edge":"recto|biselado|redondeado|inglete","isla":false}
{"a":"setHandle","k":"...","color":"...","orient":"auto|horizontal|vertical"}
{"a":"setSplash","k":"..."}
{"a":"setFloor","k":"..."}
{"a":"setWallColor","hex":"#EFEDE8"}
{"a":"setAppliances","color":"...","gama":"basica|media|alta"}
{"a":"setConf","plinthH":12,"baseH":75,"baseD":58,"wallBottom":144,"wallH":72,"wallD":35,"tallH":204,"tallD":58}
{"a":"setClient","nombre":"...","tel":"...","direccion":"...","notas":"..."}
{"a":"view","name":"3d|plan|elev","wall":"A"}
{"a":"undo"}

EJEMPLOS:
Usuario: "la cocina tiene tres cuarenta por dos ochenta y dos cincuenta de alto la ventana está en la pared del fondo centrada de uno veinte"
→ {"understood":"Cocina de 340 × 280 cm y 250 de alto. Ventana de 120 cm centrada en la pared del fondo.","reply":"Hecho. ¿Dónde está la puerta?","actions":[{"a":"setRoom","W":340,"D":280,"H":250},{"a":"addOpening","type":"ventana","wall":"A","pos":110,"width":120,"height":120,"sill":100}]}
Usuario: "ponme una ele con la nevera integrada a la derecha y el horno en columna campana de cristal"
→ {"understood":"Cocina en L hacia la pared derecha, con frigorífico integrado y horno en columna, campana de cristal inclinada.","reply":"Te he montado la L.","actions":[{"a":"generate","type":"L","main":"A","flip":false,"frigo":"integrado","horno":"columna","micro":"columna","lv":60,"altos":true,"hood":"inc"}]}
Usuario: "al lado del fregadero mete un lavavajillas de cuarenta y cinco"
→ {"understood":"Lavavajillas integrable de 45 cm junto al fregadero.","reply":"Puesto a la derecha del fregadero.","actions":[{"a":"addModule","kind":"BLV","w":45,"next_to":"(id del fregadero)","side":"der"}]}
Usuario: "los de abajo en nogal y los de arriba blancos mate encimera blanca de doce"
→ {"understood":"Bajos en nogal, altos en blanco mate y encimera blanca de 1,2 cm.","reply":"Cambiado.","actions":[{"a":"setFinish","zone":"bajos","mat":"nogal"},{"a":"setFinish","zone":"altos","mat":"blanco_polar","gloss":"mate"},{"a":"setTop","mat":"cuarzo_blanco","thick":1.2}]}

NORMAS:
- Piensa qué quiere conseguir el usuario, no sólo las palabras sueltas. Usa la conversación previa: "ponle otro igual", "más ancho", "quítalo", "eso no, el de arriba" se refieren a lo último que se habló o al mueble seleccionado (selected).
- Si da medidas de la habitación y huecos y pide distribución: setRoom, addOpening y después generate. Si sólo describe la habitación, no inventes muebles.
- Si una petición no se puede entender ni con el contexto, no hagas nada y pregunta en "reply" con una sola pregunta concreta. Si se puede entender razonablemente, hazlo y di qué has supuesto.
- No borres nada que el usuario no haya pedido quitar. Para modificar un mueble concreto usa su id.
- "understood": una frase que resuma lo que has entendido, en lenguaje de obra, con las medidas en cm o m tal como las diría el usuario.
- "reply": breve, en español, sin tecnicismos de programación ni claves internas.

${hist? 'CONVERSACIÓN PREVIA:\n'+hist+'\n\n' : ''}Responde SOLO con un objeto JSON: {"understood":"...","reply":"...","actions":[ ... ]}

MENSAJE DICTADO AHORA:
${text}`;
  }

  /* ---------- Enviar ---------- */
  async function send(){
    const ta=$('#aiText'); const text=ta.value.trim(); if(!text) return; ta.value='';
    chat.push({role:'user',content:text}); renderChat();
    if(!sample){ const r=localParse(text); const done=applyActions(r.acts); chat.push({role:'assistant',content: done.length? (r.understood? 'He entendido: '+r.understood : 'Hecho.') : 'No lo he entendido. En este modo entiendo medidas («tres cuarenta por dos ochenta»), huecos («ventana de uno veinte en el fondo a un metro del suelo»), distribuciones («en ele», «con isla»), colores de frentes y encimera. '+(K.PWA? 'Añade la clave de IA en Ajustes para usar el asistente completo.' : 'Ábrela dentro de Claude para usar el asistente completo.'), acts:done}); renderChat(); return; }
    $('#aiBusy').hidden=false; $('#aiSend').disabled=true; ctl=new AbortController();
    try{
      const res = await sample.json(prompt(text), {signal:ctl.signal, cache:false});
      const acts = Array.isArray(res.actions)? res.actions : [];
      const done = applyActions(acts);
      const msg = (res.understood? 'He entendido: '+res.understood+'\n' : '') + String(res.reply||'Hecho.');
      chat.push({role:'assistant', content: msg, acts: done});
    }catch(e){
      const msg= K.AI? K.AI.errorText(e) : ({not_granted:'No se ha dado permiso para usar el asistente.', rate_limited:'Demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.', invalid_json:'No he entendido bien la respuesta. Prueba a decirlo de otra forma.', cancelled:'Cancelado.', sampling_disabled:'El asistente no está disponible en esta cuenta.'}[e && e.code] || 'No se ha podido completar. Vuelve a intentarlo.');
      chat.push({role:'note', content: msg});
      if(e && (e.code==='not_granted'||e.code==='sampling_disabled'||e.code==='no_key')) { sample=null; setMode(); }
    }finally{ $('#aiBusy').hidden=true; $('#aiSend').disabled=false; ctl=null; renderChat(); }
  }

  /* ---------- Aplicar acciones ---------- */
  const WI=(w)=>{ if(w==null) return null; if(typeof w==='number') return w; const i=K.WALL_NAMES.indexOf(String(w).toUpperCase().trim()); return i<0? null : i; };
  const N=(v)=>{ const n=parseFloat(String(v).replace(',','.')); return isNaN(n)? undefined : n; };
  function applyActions(acts){
    const app=A(), st=app.state, done=[]; let viewTo=null, undoReq=false;
    acts.forEach(a=>{ try{
      switch(a.a){
        case 'setRoom': ['W','D','H'].forEach(k=>{ const v=N(a[k]); if(v) st.room[k]=Math.max(100,v); }); done.push(`Estancia ${st.room.W} × ${st.room.D} cm, altura ${st.room.H} cm`); break;
        case 'addOpening': { const t=K.OPENINGS.find(x=>x.k===a.type); const w=WI(a.wall); if(!t||w==null) break; const o={id:K.uid('o'),type:t.k,wall:w,pos:N(a.pos)??Math.max(0,(K.wallLen(st.room,w)-t.w)/2),width:N(a.width)??t.w,height:N(a.height)??t.h,sill:N(a.sill)??t.s,hingeR:!!a.hingeR}; st.openings.push(o); done.push(`${t.n} en pared ${K.WALL_NAMES[w]} (${o.width} cm a ${o.pos} cm de la esquina)`); break; }
        case 'updateOpening': { const o=st.openings.find(x=>x.id===a.id); if(!o) break; ['pos','width','height','sill'].forEach(k=>{ const v=N(a[k]); if(v!==undefined) o[k]=v; }); const w=WI(a.wall); if(w!=null) o.wall=w; if(a.hingeR!==undefined) o.hingeR=!!a.hingeR; done.push('Hueco actualizado'); break; }
        case 'removeOpening': st.openings=st.openings.filter(o=>o.id!==a.id); done.push('Hueco eliminado'); break;
        case 'generate': { const opt=Object.assign({},a); delete opt.a; opt.main = (a.main && a.main!=='auto')? WI(a.main) : null; if(opt.lv!==undefined) opt.lv=+opt.lv; const r=K.generate(st,opt); if(r.modules.length){ st.modules=r.modules; done.push(`Distribución ${(K.LAYOUTS.find(l=>l.k===r.type)||{n:r.type}).n.toLowerCase()} con ${r.modules.length} elementos`); } else done.push('No caben muebles con esas medidas'); break; }
        case 'addModule': { const c=C()[a.kind]; if(!c) break; const m=K.newModule(a.kind,st); ['w','h','d','y'].forEach(k=>{ const v=N(a[k]); if(v!==undefined) m[k]=v; }); Object.assign(m.o, a.o||{}); const w=WI(a.wall);
          if(a.isla){ m.x=st.room.W/2; m.z=st.room.D/2; m.rot=180; if(c.cat==='bajo') m.o.voladizo=m.o.voladizo||30; }
          else if(a.next_to && nextTo(m,a.next_to,a.side,st)){ }
          else if(w!=null){ K.placeOnWall(m,st.room,w, N(a.pos)??0); } else { m.x=st.room.W/2; m.z=st.room.D/2; }
          st.modules.push(m); app.selId=m.id; done.push(`${c.n} ${Math.round(m.w)} cm${w!=null?' en pared '+K.WALL_NAMES[w]:''}`); break; }
        case 'updateModule': { const m=st.modules.find(x=>x.id===a.id); if(!m) break; if(a.kind && C()[a.kind]) m.kind=a.kind; ['w','h','d','y'].forEach(k=>{ const v=N(a[k]); if(v!==undefined) m[k]=v; }); Object.assign(m.o,a.o||{}); if(a.next_to && nextTo(m,a.next_to,a.side,st)){ done.push(`${(C()[m.kind]||{}).n} movido`); break; } const wo=K.wallOf(m,st.room); const w=WI(a.wall); const pos=N(a.pos); if(w!=null || pos!==undefined || wo){ const ww = w!=null? w : (wo? wo.wall : null); if(ww!=null) K.placeOnWall(m,st.room,ww, pos!==undefined? pos : (wo? wo.pos : 0)); } done.push(`${(C()[m.kind]||{}).n} modificado`); break; }
        case 'removeModule': st.modules=st.modules.filter(m=>m.id!==a.id); done.push('Mueble eliminado'); break;
        case 'clearModules': st.modules=[]; done.push('Muebles retirados'); break;
        case 'setFinish': { const zs = a.zone==='todas'||!a.zone? ['bajos','altos','columnas','isla'] : [a.zone]; zs.forEach(z=>{ const zf=st.finish.zones[z]; if(!zf) return; if(a.mat && K.FRONT_MATS.find(f=>f.k===a.mat)) zf.mat=a.mat; if(a.model && K.DOOR_MODELS.find(f=>f.k===a.model)) zf.model=a.model; if(a.gloss && K.GLOSS.find(f=>f.k===a.gloss)) zf.gloss=a.gloss; if(a.type && K.FRONT_TYPES.find(f=>f.k===a.type)) zf.type=a.type; }); done.push(`Frentes (${zs.join(', ')}): ${(K.FRONT_MATS.find(f=>f.k===a.mat)||{n:'actualizados'}).n}`); break; }
        case 'setTop': { if(a.isla){ st.finish.topIsla=Object.assign({},st.finish.top, st.finish.topIsla||{}); } const t=a.isla? st.finish.topIsla : st.finish.top; if(a.mat && K.TOP_MATS.find(x=>x.k===a.mat)) t.mat=a.mat; const th=N(a.thick); if(th) t.thick=th; if(a.edge) t.edge=a.edge; done.push(`Encimera${a.isla?' de isla':''}: ${(K.TOP_MATS.find(x=>x.k===t.mat)||{}).n} ${t.thick} cm`); break; }
        case 'setHandle': { const h=st.finish.handle; if(a.k && K.HANDLES.find(x=>x.k===a.k)) h.k=a.k; if(a.color && K.HANDLE_COLORS.find(x=>x.k===a.color)) h.color=a.color; if(a.orient) h.orient=a.orient; done.push(`Tirador: ${(K.HANDLES.find(x=>x.k===h.k)||{}).n}`); break; }
        case 'setSplash': if(K.SPLASH.find(x=>x.k===a.k)){ st.finish.splash.k=a.k; done.push('Frente de pared: '+K.SPLASH.find(x=>x.k===a.k).n); } break;
        case 'setFloor': if(K.FLOORS.find(x=>x.k===a.k)){ st.room.floor=a.k; done.push('Suelo: '+K.FLOORS.find(x=>x.k===a.k).n); } break;
        case 'setWallColor': if(/^#[0-9a-f]{6}$/i.test(a.hex||'')){ st.room.wallColor=a.hex; done.push('Color de paredes cambiado'); } break;
        case 'setAppliances': if(a.color && K.APPL_COLORS.find(x=>x.k===a.color)) st.finish.applColor=a.color; if(a.gama) st.finish.applGama=a.gama; done.push('Electrodomésticos actualizados'); break;
        case 'setConf': Object.keys(a).forEach(k=>{ if(k!=='a' && k in st.conf){ const v=N(a[k]); if(v!==undefined) st.conf[k]=v; } }); done.push('Medidas generales actualizadas'); break;
        case 'setClient': ['nombre','tel','direccion','notas'].forEach(k=>{ if(a[k]!=null) st.meta.client[k]=String(a[k]); }); done.push('Datos del cliente guardados'); break;
        case 'view': viewTo=a; break;
        case 'undo': undoReq=true; break;
      }
    }catch(err){ console.warn('acción', a, err); } });
    if(undoReq && !done.length){ app.undo(); done.push('Deshecho el último cambio'); return done; }
    if(done.length){ app.commit('asistente',{panel:true}); }
    if(viewTo){ if(viewTo.name==='elev'){ const w=WI(viewTo.wall); if(w!=null) app.elevWall=w; } app.setView(viewTo.name||'3d'); }
    return done;
  }
  function nextTo(m, refId, side, st){
    const ref=st.modules.find(x=>x.id===refId); if(!ref) return false; const r=st.room; const wo=K.wallOf(ref,r);
    const lvlUp = (k)=>['alto','campana'].includes(K.cat(k));
    if(wo){ const L=K.wallLen(r,wo.wall); let pos = side==='izq'? wo.pos-m.w : wo.pos+ref.w;
      // si choca con otro mueble del mismo nivel, desplaza los que haya en ese lado
      const same=st.modules.filter(o=>o!==m && o!==ref && lvlUp(o)===lvlUp(m)).map(o=>({o,w:K.wallOf(o,r)})).filter(x=>x.w&&x.w.wall===wo.wall);
      if(side==='izq'){ same.filter(x=>x.w.pos<wo.pos && x.w.pos+x.o.w>pos+0.5).forEach(x=>K.placeOnWall(x.o,r,wo.wall,Math.max(0,x.w.pos-(x.w.pos+x.o.w-pos)))); }
      else { const over=same.filter(x=>x.w.pos>=wo.pos+ref.w-0.5 && x.w.pos<pos+m.w-0.5); over.forEach(x=>K.placeOnWall(x.o,r,wo.wall,Math.min(L-x.o.w,x.w.pos+(pos+m.w-x.w.pos)))); }
      K.placeOnWall(m,r,wo.wall,Math.max(0,Math.min(L-m.w,pos))); return true; }
    const a=K.axes(ref.rot); const need=(ref.w+m.w)/2*(side==='izq'?-1:1); m.rot=ref.rot; m.x=ref.x+a.ux*need; m.z=ref.z+a.uz*need; return true;
  }
  AS.applyActions = applyActions;

  /* ---------- Intérprete básico sin Claude ---------- */
  const strip=(t)=>t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const UN={cero:0,un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12,trece:13,catorce:14,quince:15,dieciseis:16,diecisiete:17,dieciocho:18,diecinueve:19,veinte:20,veintiun:21,veintiuno:21,veintidos:22,veintitres:23,veinticuatro:24,veinticinco:25,veintiseis:26,veintisiete:27,veintiocho:28,veintinueve:29,treinta:30,cuarenta:40,cincuenta:50,sesenta:60,setenta:70,ochenta:80,noventa:90,cien:100,ciento:100,doscientos:200,trescientos:300,cuatrocientos:400,quinientos:500,seiscientos:600,setecientos:700,ochocientos:800,novecientos:900,mil:1000};
  // convierte números dichos en palabras a cifras ("tres cuarenta" → "3,40 m", "un metro veinte" → "1,20 m", "ochenta y cinco" → "85")
  function spoken(t){
    let s=' '+strip(t).replace(/[,;:]/g,m=>' '+m+' ')+' ';
    const W='(?:'+Object.keys(UN).sort((a,b)=>b.length-a.length).join('|')+')';
    // compuestos "ochenta y cinco", "ciento veinte", "mil doscientos"
    s=s.replace(new RegExp('\\b('+W+')(?:\\s+y\\s+|\\s+)('+W+')(?:\\s+y\\s+('+W+'))?\\b','g'),(m,a,b,c)=>{ const A=UN[a],B=UN[b],Cc=c?UN[c]:0;
      if(A>=100 && B<100 && (!c||Cc<10)) return ' '+(A+B+Cc)+' ';
      if(A===1000) return ' '+(1000+B+Cc)+' ';
      if(A>=20 && A<100 && A%10===0 && B<10 && !c) return ' '+(A+B)+' ';
      return m; });
    s=s.replace(new RegExp('\\b('+W+')\\b','g'),(m,a)=>' '+UN[a]+' ');
    s=s.replace(/\b(\d+)\s+coma\s+(\d+)\b/g,'$1,$2');
    s=s.replace(/\b(\d)\s+metros?\s+(?:con\s+)?(\d{1,2})\b/g,(m,a,b)=>a+','+(b.length===1?b+'0':b)+' m');
    s=s.replace(/\b(\d)\s+(\d{2})\b/g,'$1,$2 m');          // "3 40" → "3,40 m"
    s=s.replace(/\bmedio metro\b/g,'50 cm');
    return s.replace(/\s+/g,' ').trim();
  }
  function cm(v,unit){ if(v==null) return null; let n=parseFloat(String(v).replace(',','.')); if(isNaN(n)) return null; if(unit&&/mm|milim/.test(unit)) return Math.round(n/10); if(unit&&/^m$|metro/.test(unit)) return Math.round(n*100); return n<10? Math.round(n*100) : n; }
  const NUM='(\\d+(?:[.,]\\d+)?)\\s*(m|metros?|cm|centimetros?|mm|milimetros?)?';
  function wallFrom(fr){ const st=A().state;
    let m=fr.match(/pared\s+([abcd])\b/); if(m) return m[1].toUpperCase();
    if(/fondo/.test(fr)) return 'A'; if(/derech/.test(fr)) return 'B'; if(/enfrente|entrada|frente a/.test(fr)) return 'C'; if(/izquierd/.test(fr)) return 'D';
    const ref=(t)=>{ const o=st.openings.find(o=>t.includes(o.type)); return o? K.WALL_NAMES[o.wall] : null; };
    if(/la de la ventana/.test(fr)) return ref(['ventana','ventana_alta','balconera']); if(/la de la puerta/.test(fr)) return ref(['puerta','corredera','paso']); if(/del agua|del fregadero/.test(fr)) return ref(['agua','desague']);
    return null; }
  function findMat(list, txt){ let best=null, bl=0; list.forEach(it=>{ const n=strip(it.n); const words=n.split(/\s+/).filter(w=>w.length>2); if(txt.includes(n) && n.length>bl){ best=it; bl=n.length+100; } else if(words.length && words.every(w=>txt.includes(w)) && n.length>bl){ best=it; bl=n.length; } }); return best; }
  const COLOR_ALIAS={'blanco roto':'blanco_roto','hueso':'blanco_roto','blanco':'blanco_polar','crema':'marfil','beige':'arena','gris claro':'gris_perla','gris oscuro':'antracita','marengo':'grafito','gris':'gris_piedra','negro':'negro','verde claro':'salvia','verde oscuro':'bosque','verde':'salvia','azul oscuro':'azul_marino','azul claro':'azul_niebla','azul':'azul_niebla','madera clara':'roble_nordico','madera oscura':'nogal','madera':'roble_natural','roble':'roble_natural'};
  function colorIn(txt){ const m=findMat(K.FRONT_MATS,txt); if(m) return m.k; for(const k of Object.keys(COLOR_ALIAS)) if(new RegExp('\\b'+k+'\\b').test(txt)) return COLOR_ALIAS[k]; return null; }
  function localParse(t){
    const s=spoken(t); const acts=[]; const und=[];
    if(/\b(deshaz|deshacer|vuelve atras|quita lo ultimo)\b/.test(s)){ acts.push({a:'undo'}); return {acts, understood:'deshacer el último cambio'}; }
    const dim=s.match(new RegExp('(?:mide|tiene|de|cocina|habitacion)\\s+'+NUM+'\\s*(?:por|x|\\*)\\s*'+NUM+'(?:\\s*(?:por|x)\\s*'+NUM+')?'));
    if(dim){ const a={a:'setRoom',W:cm(dim[1],dim[2]),D:cm(dim[3],dim[4])}; if(dim[5]) a.H=cm(dim[5],dim[6]); acts.push(a); und.push(`habitación de ${a.W} × ${a.D} cm`+(a.H?` y ${a.H} de alto`:'')); }
    const alt=s.match(new RegExp('(?:alto|altura|techo)(?:\\s+de\\s+techo)?\\s+(?:de\\s+|a\\s+)?'+NUM)) || s.match(new RegExp(NUM+'\\s+de\\s+(?:alto|altura)'));
    if(alt && !(dim&&dim[5])){ const H=cm(alt[1],alt[2]); if(H>150&&H<450){ acts.push({a:'setRoom',H}); und.push(`techo a ${H} cm`); } }
    // huecos
    s.split(/\.|;|\by (?=(?:una|un|la|el|hay)\b)|\bluego\b|\bdespues\b/).forEach(fr=>{
      const kind = /balconera/.test(fr)? 'balconera' : /ventana/.test(fr)? 'ventana' : /corredera/.test(fr)? 'corredera' : /puerta/.test(fr)&&!/puertas? (de|del) (los )?mueble/.test(fr)? 'puerta' : /toma de agua|el agua|grifo de la pared/.test(fr)? 'agua' : /desague/.test(fr)? 'desague' : /humos/.test(fr)? 'humos' : /radiador/.test(fr)? 'radiador' : /caldera|termo/.test(fr)? 'caldera' : null; if(!kind) return;
      if(/(quita|elimina|borra)/.test(fr)) return;
      const t=K.OPENINGS.find(o=>o.k===kind);
      const w=fr.match(new RegExp('(?:de|mide)\\s+'+NUM+'(?:\\s+de\\s+ancho)?')); const pos=fr.match(new RegExp('a\\s+'+NUM+'\\s+de\\s+la\\s+esquina')); const sill=fr.match(new RegExp('a\\s+'+NUM+'\\s+del\\s+suelo')); const hh=fr.match(new RegExp(NUM+'\\s+de\\s+alto'));
      const wall=wallFrom(fr)||'A'; const width= w? cm(w[1],w[2]) : t.w; const L=K.wallLen(A().state.room,K.WALL_NAMES.indexOf(wall));
      const a={a:'addOpening',type:kind,wall,width, pos: pos? cm(pos[1],pos[2]) : (/centrad|en medio|en el centro/.test(fr)? Math.round((L-width)/2) : undefined), sill: sill? cm(sill[1],sill[2]) : t.s}; if(hh) a.height=cm(hh[1],hh[2]);
      acts.push(a); und.push(`${t.n.toLowerCase()} de ${width} cm en la pared ${wall}`);
    });
    // distribución
    const lay = /\ben (l|ele)\b|\bforma de (l|ele)\b/.test(s)? 'L' : /\ben (u)\b|forma de u\b/.test(s)? 'U' : /\bisla\b/.test(s)&&/(pon|haz|monta|quiero|con)/.test(s)? 'isla' : /peninsula/.test(s)? 'peninsula' : /paralel|dos frentes/.test(s)? 'paralela' : /\blineal\b|en linea|una sola pared/.test(s)? 'lineal' : null;
    if(lay && /(cocina|haz|hazme|monta|pon|quiero|distribu|propon)/.test(s)){
      const g={a:'generate',type:lay, frigo: /americano/.test(s)?'americano': /(frigo|nevera|frigorifico)[^.]*\b(libre|suelt|normal)/.test(s)?'libre':'integrado', horno: /horno[^.]*(bajo|debajo|abajo)/.test(s)?'bajo':'columna', micro: /sin micro/.test(s)?'ninguno':'columna', lv: /sin lavavajillas/.test(s)?0: /lavavajillas[^.]*45/.test(s)?45:60, lav:/lavadora/.test(s), altos:!/sin (muebles )?altos/.test(s), despensa:/despensa/.test(s), hood: /campana[^.]*integrad|telescop/.test(s)?'int': /campana[^.]*(cristal|inclinad)/.test(s)?'inc': /campana[^.]*recta/.test(s)?'rec': /sin campana/.test(s)?'none':'pir', flip:/izquierd/.test(s)&&lay==='L', islaHob:/placa[^.]*isla|isla[^.]*placa/.test(s)};
      const mw=s.match(/(?:fregadero|pila)[^.]*pared\s+([abcd])\b/); if(mw) g.main=mw[1].toUpperCase();
      acts.push(g); und.push('cocina '+(K.LAYOUTS.find(l=>l.k===lay)||{n:lay}).n.toLowerCase());
    }
    // acabados de frentes
    const zoneRe=[['bajos',/\b(bajos|de abajo|inferiores)\b/],['altos',/\b(altos|de arriba|alacenas|superiores|colgados)\b/],['columnas',/\b(columnas|torres)\b/],['isla',/\bla isla\b/]];
    s.split(/\.|;|,|\by (?=(?:los|las|la|el)\b)/).forEach(fr=>{
      if(/encimera|suelo|tirador|pared|frontal|salpicadero/.test(fr)) return;
      if(!/(mueble|frente|puerta|bajos|altos|columna|isla|alacena|de abajo|de arriba|todo|cocina)/.test(fr)) return;
      const c=colorIn(fr); if(!c) return; const z=(zoneRe.find(([k,re])=>re.test(fr))||['todas'])[0];
      const a={a:'setFinish',zone:z,mat:c}; if(/\bmate\b/.test(fr)) a.gloss='mate'; if(/alto brillo/.test(fr)) a.gloss='altobrillo'; else if(/brillo/.test(fr)) a.gloss='brillo'; if(/lacad/.test(fr)) a.type='lacado';
      if(/enmarcad|clasic|vintage/.test(fr)) a.model='enmarcada'; if(/ranurad|listones/.test(fr)) a.model='ranurada'; if(/lisa|lisos/.test(fr)) a.model='lisa';
      acts.push(a); und.push(`frentes ${z==='todas'?'':z+' '}en ${(K.FRONT_MATS.find(f=>f.k===c)||{}).n.toLowerCase()}`);
    });
    // encimera
    const em=s.match(/encimera([^.;]*)/); if(em){ const fr=em[1]; let mat=findMat(K.TOP_MATS,fr);
      if(!mat){ const fam=/silestone|cuarzo/.test(fr)?'cuarzo': /dekton|neolith|porcelan|sinteriz/.test(fr)?'porcelanico': /granito/.test(fr)?'granito': /marmol/.test(fr)?'marmol': /madera|maciza/.test(fr)?'madera': /laminad|formica/.test(fr)?'laminado': /inox|acero/.test(fr)?'inox': /compact/.test(fr)?'compacto': null;
        const col= /blanc/.test(fr)? (/veta|calacatta|marmol/.test(fr)?'veta':'blanco') : /negr/.test(fr)?'negro': /gris|cemento/.test(fr)?'gris': /beige|crema/.test(fr)?'beige': /roble/.test(fr)?'roble': /nogal/.test(fr)?'nogal': null;
        const cands=K.TOP_MATS.filter(t=>!fam||t.fam===fam); mat = cands.find(t=>col && (t.k.includes(col)||strip(t.n).includes(col))) || (fam? cands[0] : (col? K.TOP_MATS.find(t=>t.k.includes(col)||strip(t.n).includes(col)) : null)); }
      const th=fr.match(/de\s+(\d+(?:,\d+)?)\s*(cm|mm)?/); const a={a:'setTop'}; if(mat) a.mat=mat.k; if(th){ let v=parseFloat(th[1].replace(',','.')); if(th[2]==='mm'||v>=10) v=v/10; if(v>=0.8&&v<=10) a.thick=v; }
      if(/isla/.test(fr)) a.isla=true; if(a.mat||a.thick){ acts.push(a); und.push('encimera '+(mat?mat.n.toLowerCase():'')+(a.thick?' de '+String(a.thick).replace('.',',')+' cm':'')); } }
    // tirador
    const tm=s.match(/(tirador|tiradores|asas|pomos|gola|uñero|unero|sin tirador|push)([^.;]*)/); if(tm){ const fr=tm[0]; const k= /gola/.test(fr)?'gola': /unero|uñero/.test(fr)?'unero': /sin tirador|push/.test(fr)?'push': /pomo/.test(fr)?'pomo': /concha/.test(fr)?'concha': /cuero/.test(fr)?'cuero': /perfil/.test(fr)?'perfil': /larg/.test(fr)?'barra_larga': /barra|tirador/.test(fr)?'barra160':null;
      const col= /dorad|oro|laton/.test(fr)?'laton': /negr/.test(fr)?'negro': /inox|acero|plata|cromad/.test(fr)?'inox': /bronce/.test(fr)?'bronce': /cobre/.test(fr)?'cobre': /blanc/.test(fr)?'blanco': null;
      if(k||col){ const a={a:'setHandle'}; if(k) a.k=k; if(col) a.color=col; acts.push(a); und.push('tiradores '+(k?(K.HANDLES.find(h=>h.k===k)||{}).n.toLowerCase():'')+(col?' '+(K.HANDLE_COLORS.find(h=>h.k===col)||{}).n.toLowerCase():'')); } }
    // suelo
    const sm=s.match(/suelo([^.;]*)/); if(sm){ const f=findMat(K.FLOORS,sm[1]) || (/espiga/.test(sm[1])? K.FLOORS.find(x=>x.k==='espiga') : /madera|tarima/.test(sm[1])? K.FLOORS[0] : /gris/.test(sm[1])? K.FLOORS.find(x=>x.k==='porc_gris') : null); if(f){ acts.push({a:'setFloor',k:f.k}); und.push('suelo '+f.n.toLowerCase()); } }
    return {acts, understood: und.join(', ')};
  }

  /* ---------- Escáner 360° ---------- */
  const SC = AS.scan = {frames:[], items:[], start:0, dir:1, fov:70, camH:150, n:12, offset:0, busy:false};
  AS.panelScan = function(){
    const st=A().state; const ai = !!(sample && sampleImgs);
    let h=`<ol class="steps"><li>Ponte en el centro de la cocina, con el móvil o la tablet a la altura del pecho y en horizontal.</li><li>Empieza mirando a la <b>pared A</b> y gira despacio una vuelta completa, a velocidad constante.</li><li>Sube el vídeo aquí. ${ai?'La aplicación localiza puertas, ventanas e instalaciones y las sitúa en el plano.':'Marca sobre los fotogramas dónde están las puertas, ventanas e instalaciones.'}</li></ol>
    <p class="hint">Antes, mete las medidas de la habitación en «Estancia»: el escáner las usa para calcular posiciones (${st.room.W} × ${st.room.D} cm ahora).</p>
    <label class="btn primary file">Subir vídeo 360°<input type="file" id="scanFile" accept="video/*"></label>
    <div class="row2">${sel('scStart','Primer fotograma mira a',[0,1,2,3].map(w=>[w,'Pared '+K.WALL_NAMES[w]]),SC.start)}${sel('scDir','Sentido de giro',[[1,'Hacia la derecha (horario)'],[-1,'Hacia la izquierda']],SC.dir)}</div>
    <div class="row3">${fld('scFov','Ángulo de visión (°)',SC.fov)}${fld('scCamH','Altura cámara',SC.camH)}${sel('scN','Fotogramas',[[8,'8'],[12,'12'],[16,'16'],[24,'24']],SC.n)}</div>
    ${fld('scOff','Corrección de giro (°)',SC.offset)}
    <p class="hint">Ángulo normal de móvil: 65–75°. Gran angular (0,5×): 100–110°.</p>`;
    if(SC.frames.length){
      h+=`<h4>Fotogramas</h4><p class="hint">Toca un fotograma para marcar a mano una puerta, ventana o instalación.</p><div class="frames">${SC.frames.map((f,i)=>`<button class="frame" data-sf="${i}"><img src="${f.url}" alt="Fotograma ${i+1}"><span>${Math.round(angleOf(i))}° · ${wallAt(angleOf(i))}</span>${SC.items.filter(it=>it.frame===i).map(it=>`<i class="bx" style="left:${it.x0*100}%;top:${it.y0*100}%;width:${(it.x1-it.x0)*100}%;height:${(it.y1-it.y0)*100}%"></i>`).join('')}</button>`).join('')}</div>`;
      h+= ai? `<button class="btn primary" data-sc="detect" ${SC.busy?'disabled':''}>${SC.busy?'Analizando…':'Detectar puertas, ventanas e instalaciones'}</button>` : (K.PWA? `<p class="hint">Para la detección automática añade la clave de IA en Ajustes. Mientras tanto, toca cada fotograma y marca las puertas y ventanas a mano.</p>` : `<p class="hint">La detección automática está disponible al abrir la aplicación dentro de Claude.</p>`);
      if(SC.msg) h+=`<p class="hint">${esc(SC.msg)}</p>`;
    }
    if(SC.items.length){
      h+=`<h4>Elementos encontrados</h4><div class="list">${SC.items.map((it,i)=>{ const p=project(it); return `<div class="item"><div class="item-h"><label class="chk"><input type="checkbox" data-si="${i}" ${it.on!==false?'checked':''}></label><b>${esc((K.OPENINGS.find(o=>o.k===it.type)||{n:it.type}).n)}</b><span class="tag">${p? 'Pared '+K.WALL_NAMES[p.wall]+' · '+Math.round(p.pos)+' cm · '+Math.round(p.width)+'×'+Math.round(p.height):'fuera'}</span><button class="icon-btn" data-sc="del" data-i="${i}" aria-label="Quitar">✕</button></div></div>`; }).join('')}</div>
      <div class="btns"><button class="btn primary" data-sc="apply">Añadir al plano</button><button class="btn ghost" data-sc="clear">Borrar marcas</button></div><p class="hint">Las medidas son aproximadas: revísalas con el metro en «Estancia».</p>`;
    }
    setTimeout(bindScan,0);
    return h;
  };
  function fld(id,l,v){ return `<label class="fld"><span>${l}</span><input id="${id}" inputmode="decimal" value="${esc(v)}"></label>`; }
  function sel(id,label,opts,val){ return `<label class="fld"><span>${label}</span><select id="${id}">${opts.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(val)?'selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`; }
  function angleOf(i){ return SC.start*90 + SC.offset + SC.dir*(i*360/SC.frames.length); }
  function wallAt(deg){ const d=((deg%360)+360)%360; return 'Pared '+K.WALL_NAMES[Math.round(d/90)%4]; }
  function bindScan(){
    const body=$('#panelBody'); if(!$('#scanFile',body)) return;
    $('#scanFile').onchange=(e)=>{ const f=e.target.files[0]; if(f) extract(f); };
    ['scStart','scDir','scFov','scCamH','scN','scOff'].forEach(id=>{ const el=$('#'+id); if(el) el.onchange=()=>{ const v=parseFloat(String(el.value).replace(',','.')); if(id==='scStart') SC.start=+el.value; if(id==='scDir') SC.dir=+el.value; if(id==='scFov') SC.fov=v||70; if(id==='scCamH') SC.camH=v||150; if(id==='scN'){ SC.n=+el.value; if(SC.file) extract(SC.file); } if(id==='scOff') SC.offset=v||0; A().renderPanel(); }; });
    $$('[data-sf]',body).forEach(b=>b.onclick=()=>markFrame(+b.dataset.sf));
    $$('[data-si]',body).forEach(c=>c.onchange=()=>{ SC.items[+c.dataset.si].on=c.checked; });
    $$('[data-sc]',body).forEach(b=>b.onclick=()=>{ const a=b.dataset.sc; if(a==='detect') detect(); if(a==='del'){ SC.items.splice(+b.dataset.i,1); A().renderPanel(); } if(a==='clear'){ SC.items=[]; A().renderPanel(); } if(a==='apply') applyScan(); });
  }
  async function extract(file){
    SC.file=file; SC.frames=[]; SC.items=[]; SC.msg='Extrayendo fotogramas…'; A().renderPanel();
    const v=document.createElement('video'); v.muted=true; v.playsInline=true; v.preload='auto'; v.src=URL.createObjectURL(file);
    try{
      await new Promise((res,rej)=>{ v.onloadedmetadata=res; v.onerror=()=>rej(new Error('formato')); setTimeout(()=>rej(new Error('tiempo')),15000); });
      const dur=v.duration; if(!isFinite(dur)||dur<=0) throw new Error('duración');
      const cw=960, ch=Math.round(cw*v.videoHeight/v.videoWidth)||540; const cv=document.createElement('canvas'); cv.width=cw; cv.height=ch; const cx=cv.getContext('2d');
      for(let i=0;i<SC.n;i++){
        const t=Math.min(dur-0.05, (i/SC.n)*dur+0.02);
        await new Promise((res)=>{ const done=()=>{ v.removeEventListener('seeked',done); res(); }; v.addEventListener('seeked',done); v.currentTime=t; setTimeout(done,3000); });
        cx.drawImage(v,0,0,cw,ch);
        const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',0.82)); SC.frames.push({url:cv.toDataURL('image/jpeg',0.6), blob, w:cw, h:ch});
      }
      SC.msg=''; SC.aspect=cw/ch;
    }catch(e){ SC.msg='No se ha podido leer el vídeo en este navegador. Prueba con un vídeo MP4 o graba de nuevo.'; }
    A().renderPanel();
  }
  /* Proyección de un rectángulo del fotograma a la pared */
  function project(it){
    const st=A().state, r=st.room; const W=r.W, D=r.D, cx=W/2, cz=D/2; const asp=SC.aspect||16/9;
    const fovH=SC.fov*Math.PI/180; const tH=Math.tan(fovH/2), tV=tH/asp;
    const yawC=angleOf(it.frame)*Math.PI/180;
    const ray=(u)=>{ const off=Math.atan((u-0.5)*2*tH); const yaw=yawC+off; const dx=Math.sin(yaw), dz=-Math.cos(yaw); let t=Infinity, wall=-1;
      if(dx>1e-6){ const tt=(W-cx)/dx; if(tt<t){t=tt; wall=1;} } if(dx<-1e-6){ const tt=(0-cx)/dx; if(tt<t){t=tt; wall=3;} }
      if(dz>1e-6){ const tt=(D-cz)/dz; if(tt<t){t=tt; wall=2;} } if(dz<-1e-6){ const tt=(0-cz)/dz; if(tt<t){t=tt; wall=0;} }
      const x=cx+dx*t, z=cz+dz*t; const pos= wall===0? x : wall===1? z : wall===2? W-x : D-z; return {wall,pos,t,off}; };
    const c=ray((it.x0+it.x1)/2), a=ray(it.x0), b=ray(it.x1);
    let p0, p1; const L=K.wallLen(r,c.wall);
    const onW=(q)=> q.wall===c.wall? q.pos : (q.off < c.off? 0 : L);
    p0=onW(a); p1=onW(b); if(p0>p1){ const t=p0; p0=p1; p1=t; }
    const depth=c.t*Math.cos(c.off);
    const hAt=(v)=> SC.camH + depth*(0.5-v)*2*tV;
    let top=hAt(it.y0), bot=hAt(it.y1);
    const t=K.OPENINGS.find(o=>o.k===it.type)||{};
    if(['puerta','puerta_doble','corredera','paso','balconera'].includes(it.type)) bot=0;
    bot=Math.max(0,Math.min(r.H,bot)); top=Math.max(bot+2,Math.min(r.H,top));
    if(t.kind==='punto'){ const pc=(p0+p1)/2; return {wall:c.wall, pos:Math.max(0,pc-t.w/2), width:t.w, height:t.h, sill:Math.max(0,(top+bot)/2-t.h/2)}; }
    return {wall:c.wall, pos:Math.max(0,p0), width:Math.max(5,Math.min(L,p1)-Math.max(0,p0)), height:top-bot, sill:bot};
  }
  async function detect(){
    if(!sample||!SC.frames.length) return; SC.busy=true; SC.msg='Analizando los fotogramas…'; A().renderPanel();
    const types=K.OPENINGS.map(o=>o.k).join(', ');
    const all=[]; const per=Math.max(1,Math.min(maxImgs||8, SC.frames.length));
    try{
      for(let s=0;s<SC.frames.length;s+=per){
        const idx=[...Array(Math.min(per,SC.frames.length-s)).keys()].map(k=>s+k);
        const txt=`Te paso ${idx.length} fotogramas de un vídeo grabado girando 360° desde el centro de una cocina o habitación en obra. Los fotogramas están en orden; el primero de este lote es el número ${idx[0]} y el último el ${idx[idx.length-1]}.
Localiza en ellos los elementos de obra que afectan al diseño de la cocina: puertas, ventanas, puertas balconeras, huecos de paso, radiadores, calderas o termos, salidas de humos, tomas de agua, desagües, tomas de gas, enchufes, interruptores, cuadro eléctrico.
Tipos permitidos: ${types}.
Para cada elemento devuelve el rectángulo que lo encierra en coordenadas normalizadas 0–1 del fotograma (x0,x1 de izquierda a derecha; y0,y1 de arriba abajo). Si un elemento aparece en varios fotogramas, devuélvelo una sola vez, en el fotograma donde se vea más centrado y completo. Incluye el marco en puertas y ventanas.
Responde SOLO con JSON: {"items":[{"frame":${idx[0]},"type":"ventana","x0":0.3,"x1":0.6,"y0":0.2,"y1":0.6,"conf":0.8}],"notes":"observaciones breves en español"}`;
        const res=await sample.json(txt,{images: idx.map(i=>SC.frames[i].blob)});
        (res.items||[]).forEach(it=>{ const f=+it.frame; if(!(f>=0&&f<SC.frames.length)) return; if(!K.OPENINGS.find(o=>o.k===it.type)) return; all.push({frame:f,type:it.type,x0:clamp(it.x0),x1:clamp(it.x1),y0:clamp(it.y0),y1:clamp(it.y1),conf:it.conf,on:(it.conf==null||it.conf>=0.4)}); });
        if(res.notes) SC.notes=res.notes;
      }
      // quitar duplicados (mismo tipo y pared, solape)
      const out=[]; all.forEach(it=>{ const p=project(it); if(!p) return; const dup=out.find(o=>{ const q=project(o); return q && o.type===it.type && q.wall===p.wall && Math.min(q.pos+q.width,p.pos+p.width)-Math.max(q.pos,p.pos) > Math.min(q.width,p.width)*0.4; }); if(!dup) out.push(it); });
      SC.items=SC.items.concat(out); SC.msg = out.length? `${out.length} elementos encontrados.${SC.notes? ' '+SC.notes:''}` : 'No se han encontrado elementos. Puedes marcarlos a mano tocando los fotogramas.';
    }catch(e){ SC.msg = K.AI? K.AI.errorText(e) : ({not_granted:'No se ha dado permiso para analizar imágenes.', rate_limited:'Demasiadas peticiones. Espera un momento.', image_rejected:'Alguna imagen no se ha podido enviar.', images_unavailable:'Este visor no permite enviar imágenes.'}[e&&e.code]) || 'No se ha podido completar el análisis.'; }
    SC.busy=false; A().renderPanel();
  }
  const clamp=(v)=>Math.max(0,Math.min(1,+v||0));
  function applyScan(){
    const st=A().state; let n=0;
    SC.items.filter(it=>it.on!==false).forEach(it=>{ const p=project(it); if(!p) return; st.openings.push({id:K.uid('o'), type:it.type, wall:p.wall, pos:K.round(p.pos,1), width:K.round(p.width,1), height:K.round(p.height,1), sill:K.round(p.sill,1)}); n++; });
    if(n){ A().commit('escáner',{panel:true}); A().toast(n+' elementos añadidos al plano'); SC.items=[]; A().openPanel('estancia'); }
  }
  /* Marcado manual */
  function markFrame(i){
    const f=SC.frames[i]; const types=K.OPENINGS;
    A().modal(`<h3>Fotograma ${i+1} · ${wallAt(angleOf(i))}</h3><p class="hint">Arrastra sobre la imagen para enmarcar el elemento y elige qué es.</p>
      <div class="markwrap"><img id="mkImg" src="${f.url}" alt="Fotograma"><div id="mkBox" class="bx" hidden></div></div>
      <div class="row2"><label class="fld"><span>Elemento</span><select id="mkType">${types.map(t=>`<option value="${t.k}">${esc(t.n)}</option>`).join('')}</select></label><div class="btns"><button class="btn primary" data-act="mkAdd">Añadir</button></div></div>`, (e)=>{ const b=e.target.closest('[data-act]'); if(b && b.dataset.act==='mkAdd' && box){ SC.items.push({frame:i,type:$('#mkType').value,...box,on:true}); $('#modal').hidden=true; A().renderPanel(); } });
    let box=null, start=null; const wrap=$('.markwrap'), img=$('#mkImg'), bx=$('#mkBox');
    const rel=(e)=>{ const r=img.getBoundingClientRect(); return {x:clamp((e.clientX-r.left)/r.width), y:clamp((e.clientY-r.top)/r.height)}; };
    wrap.onpointerdown=(e)=>{ wrap.setPointerCapture(e.pointerId); start=rel(e); };
    wrap.onpointermove=(e)=>{ if(!start) return; const p=rel(e); box={x0:Math.min(start.x,p.x),x1:Math.max(start.x,p.x),y0:Math.min(start.y,p.y),y1:Math.max(start.y,p.y)}; bx.hidden=false; Object.assign(bx.style,{left:box.x0*100+'%',top:box.y0*100+'%',width:(box.x1-box.x0)*100+'%',height:(box.y1-box.y0)*100+'%'}); };
    wrap.onpointerup=()=>{ start=null; if(box && (box.x1-box.x0<0.01)){ const c=box.x0; box={x0:c-0.01,x1:c+0.01,y0:box.y0-0.01,y1:box.y0+0.01}; } };
  }
})();
