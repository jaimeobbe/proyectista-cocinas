/* Aplicación: estado, historial, paneles, inspector, proyectos y exportaciones. */
(function(){
  const $=(s,el)=>(el||document).querySelector(s), $$=(s,el)=>[...(el||document).querySelectorAll(s)];
  const C=()=>K.CATALOG;
  const esc=(s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const eur=(v)=> (Math.round(v*100)/100).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
  const num=(v,d)=>{ const n=parseFloat(String(v).replace(',','.')); return isNaN(n)? d : n; };
  const A = K.app = { state:null, selId:null, selOpen:null, view:'3d', elevWall:0, panel:'estancia', hist:[], fut:[], targetWall:0, asIsla:false, dirty3d:true, capabilities:{} };

  /* ---------- Almacenamiento local ---------- */
  const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v? JSON.parse(v):d; }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); return true; }catch(e){ return false; } } };

  /* ---------- Historial ---------- */
  A.commit = function(label, opts){
    A.hist.push(JSON.stringify(A._last||A.state)); if(A.hist.length>80) A.hist.shift(); A.fut=[];
    A._last = K.clone(A.state); A.dirty3d=true; autosave();
    A.render(opts);
  };
  A.undo=function(){ if(!A.hist.length) return toast('Nada que deshacer'); A.fut.push(JSON.stringify(A.state)); A.state=JSON.parse(A.hist.pop()); A._last=K.clone(A.state); A.dirty3d=true; A.render({panel:true}); };
  A.redo=function(){ if(!A.fut.length) return toast('Nada que rehacer'); A.hist.push(JSON.stringify(A.state)); A.state=JSON.parse(A.fut.pop()); A._last=K.clone(A.state); A.dirty3d=true; A.render({panel:true}); };
  let saveT=null; function autosave(){ clearTimeout(saveT); saveT=setTimeout(()=>{ LS.set('pc_current', A.state); },400); }
  A.canEdit = ()=>true;

  /* ---------- Toast ---------- */
  let tT=null; function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(tT); tT=setTimeout(()=>t.hidden=true, 2600); }
  A.toast=toast;

  /* ---------- Render global ---------- */
  A.render = function(opts){
    opts=opts||{};
    const st=A.state;
    if(A.view==='3d'){ if(A.dirty3d){ K.S3.build(st, A.selId); A.dirty3d=false; } else K.S3.select(A.selId); }
    else draw2d();
    const v=K.validate(st); A._val=v; const bad=v.filter(x=>x.lvl==='error').length, warn=v.filter(x=>x.lvl==='aviso').length;
    const badge=$('#valBadge'); badge.textContent = bad+warn ? (bad+warn) : ''; badge.hidden = !(bad+warn); badge.className='badge'+(bad?' bad':' warn');
    const b=K.budget(st); $('#priceChip').textContent = eur(b.total);
    $('#projName').value = st.meta.name;
    if(opts.panel || ['comprobar','presupuesto','fabricacion'].includes(A.panel)) renderPanel();
    renderInspector();
  };
  function draw2d(){
    const cv=$('#v2d'); const dpr=Math.min(2,window.devicePixelRatio||1); const r=cv.parentElement.getBoundingClientRect();
    const w=Math.round(r.width*dpr), h=Math.round(r.height*dpr); if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; K.D2.resetPlan(); }
    const errIds=(A._val||[]).filter(x=>x.lvl==='error').flatMap(x=>x.ids);
    if(A.view==='plan') K.D2.drawPlan(cv, A.state, {dpr, selId:A.selId, selOpen:A.selOpen, errIds});
    else K.D2.drawElev(cv, A.state, A.elevWall, {dpr, selId:A.selId, selOpen:A.selOpen});
  }
  A.redraw2d = draw2d;

  A.setView = function(v){
    A.view=v; $$('#viewSeg button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.v===v)));
    $('#v3d').hidden = v!=='3d'; $('#v2d').hidden = v==='3d'; $('#cam3d').hidden = v!=='3d'; $('#wallSeg').hidden = v!=='elev'; $('#zoom2d').hidden = v==='3d';
    $('#walkPad').hidden = true; K.S3.walkOn=false;
    if(v==='3d'){ setTimeout(()=>{ K.S3.resize(); A.dirty3d=true; A.render(); },0); } else { K.D2.resetPlan(); setTimeout(draw2d,0); }
  };
  A.select = function(id, from){ A.selId=id; A.selOpen=null; if(A.view==='3d') K.S3.select(id); else draw2d(); renderInspector(); };
  A.selectOpening = function(id){ A.selOpen=id; A.selId=null; if(A.view==='3d') K.S3.select(null); else draw2d(); renderInspector(); };
  A.liveInfo = function(m){ const wo=K.wallOf(m,A.state.room); $('#live').hidden=false; $('#live').textContent = wo? `Pared ${K.WALL_NAMES[wo.wall]} · a ${Math.round(wo.pos*10)/10} cm de la esquina` : `x ${Math.round(m.x)} · z ${Math.round(m.z)} cm`; clearTimeout(A._lt); A._lt=setTimeout(()=>$('#live').hidden=true,1500); };
  A.commitMove = function(id, cand){ const m=A.state.modules.find(x=>x.id===id); if(!m) return; m.x=K.round(cand.x,0.1); m.z=K.round(cand.z,0.1); m.rot=cand.rot; A.commit('mover'); };

  /* ---------- Imán (snap) ---------- */
  K.snapModule = function(m, st){
    const r=st.room, c=C()[m.kind]; if(!c) return m;
    const lvl = (k)=>{ const cc=C()[k.kind]; if(!cc) return 'x'; if(cc.cat==='alto'||cc.cat==='campana') return 'up'; if(cc.onTop||cc.cat==='deco') return 'x'; return 'base'; };
    if(c.cat==='deco'){ m.x=Math.max(0,Math.min(r.W,m.x)); m.z=Math.max(0,Math.min(r.D,m.z)); return m; }
    // pared más cercana
    let best=null; for(let w=0;w<4;w++){ const d = w===0? m.z : w===1? r.W-m.x : w===2? r.D-m.z : m.x; if(best===null||d<best.d) best={w,d}; }
    const isWallish = !(K.zoneOf(m,st)==='isla' && (m.o.voladizo||0)>0) ;
    if(best && best.d < m.d/2+35 && isWallish){
      const w=best.w; const L=K.wallLen(r,w); m.rot=K.WALL_ROT[w];
      let pos = (w===0? m.x : w===1? m.z : w===2? r.W-m.x : r.D-m.z) - m.w/2;
      const edges=[0, L-m.w];
      st.modules.forEach(o=>{ if(o.id===m.id || lvl(o)!==lvl(m)) return; const wo=K.wallOf(o,r); if(wo && wo.wall===w){ edges.push(wo.pos+o.w, wo.pos-m.w); }
        // esquina: muebles de la pared contigua
        const wo2=K.wallOf(o,r); if(wo2 && (wo2.wall===(w+1)%4 && wo2.pos<5)) edges.push(L-o.d-m.w); if(wo2 && (wo2.wall===(w+3)%4 && wo2.pos+o.w>K.wallLen(r,wo2.wall)-5)) edges.push(o.d); });
      st.openings.filter(o=>o.wall===w && (K.OPENINGS.find(x=>x.k===o.type)||{}).kind==='hueco').forEach(o=>{ edges.push(o.pos-m.w, o.pos+o.width); edges.push(o.pos+o.width/2-m.w/2); });
      let bd=8, bp=null; edges.forEach(e=>{ const d=Math.abs(pos-e); if(d<bd){ bd=d; bp=e; } }); if(bp!==null) pos=bp;
      pos=Math.max(0,Math.min(L-m.w,pos));
      K.placeOnWall(m, r, w, pos);
    } else {
      m.rot = K.normRot(Math.round(m.rot/90)*90);
      const A2=K.aabb(m); if(A2.x0<0) m.x-=A2.x0; if(A2.z0<0) m.z-=A2.z0; if(A2.x1>r.W) m.x-=A2.x1-r.W; if(A2.z1>r.D) m.z-=A2.z1-r.D;
      // alinear con otros muebles de isla
      st.modules.forEach(o=>{ if(o.id===m.id||lvl(o)!==lvl(m)) return; if(K.wallOf(o,r)) return; if(K.normRot(o.rot)!==K.normRot(m.rot)) return; const a=K.axes(m.rot); const dx=o.x-m.x, dz=o.z-m.z; const along=dx*a.ux+dz*a.uz, across=dx*a.fx+dz*a.fz; const need=(o.w+m.w)/2; if(Math.abs(across)<10 && Math.abs(Math.abs(along)-need)<8){ const sgn=Math.sign(along)||1; m.x=o.x - a.ux*need*sgn; m.z=o.z - a.uz*need*sgn; } });
    }
    m.x=K.round(m.x,0.1); m.z=K.round(m.z,0.1); return m;
  };

  /* ---------- Añadir módulos ---------- */
  function levelOf(m){ const c=C()[m.kind]; if(!c) return 'x'; if(c.cat==='alto'||c.cat==='campana') return 'up'; if(c.onTop||c.cat==='deco') return 'x'; return 'base'; }
  A.addModule = function(kind, opts){
    opts=opts||{}; const st=A.state, r=st.room; const m=K.newModule(kind, st); const c=C()[kind];
    const sel=st.modules.find(x=>x.id===A.selId);
    if(c.cat==='deco'){ m.x=r.W/2; m.z=r.D/2; }
    else if(c.onTop){ const base = sel && K.cat(sel)==='bajo'? sel : st.modules.find(x=>K.cat(x)==='bajo'); if(base){ const a=K.axes(base.rot); m.rot=base.rot; m.x=base.x - a.fx*(base.d/2-m.d/2-4); m.z=base.z - a.fz*(base.d/2-m.d/2-4); m.y=K.topH(st); } else { m.x=r.W/2; m.z=r.D/2; m.y=0; } }
    else if(A.asIsla || opts.isla){ m.rot=180; if(sel && !K.wallOf(sel,r) && levelOf(sel)==='base'){ const a=K.axes(sel.rot); m.rot=sel.rot; const need=(sel.w+m.w)/2; m.x=sel.x+a.ux*need; m.z=sel.z+a.uz*need; } else { m.x=r.W/2; m.z=r.D/2+20; } m.o.voladizo = c.cat==='bajo'? 30 : 0; }
    else if(c.cat==='campana' && (c.hood==='isla'||c.hood==='techo'||c.hood==='cil')){
      const hob=st.modules.find(x=>C()[x.kind].hob && !K.wallOf(x,r)) || st.modules.find(x=>C()[x.kind].hob);
      if(hob){ m.x=hob.x; m.z=hob.z; m.rot=hob.rot; } else { m.x=r.W/2; m.z=r.D/2; }
    }
    else {
      let w = (sel && K.wallOf(sel,r))? K.wallOf(sel,r).wall : A.targetWall;
      const L=K.wallLen(r,w); const lvl=levelOf(m);
      // campana sobre placa
      if(c.cat==='campana'){ const hob=st.modules.find(x=>C()[x.kind].hob && K.wallOf(x,r) && K.wallOf(x,r).wall===w) || st.modules.find(x=>C()[x.kind].hob && K.wallOf(x,r)); if(hob){ const wo=K.wallOf(hob,r); w=wo.wall; m.w=Math.max(m.w, Math.min(90,hob.w)); K.placeOnWall(m,r,w,wo.pos+(hob.w-m.w)/2); finish(); return m; } }
      const segs=K.freeSegments(st,w, lvl==='up'?'alto':'base');
      const occ=st.modules.filter(o=>levelOf(o)===lvl).map(o=>({o,wo:K.wallOf(o,r)})).filter(x=>x.wo&&x.wo.wall===w).map(x=>[x.wo.pos,x.wo.pos+x.o.w]);
      // esquinas ocupadas por paredes contiguas
      st.modules.filter(o=>levelOf(o)===lvl).forEach(o=>{ const wo=K.wallOf(o,r); if(!wo) return; if(wo.wall===(w+3)%4 && wo.pos+o.w>K.wallLen(r,wo.wall)-2) occ.push([0,o.d]); if(wo.wall===(w+1)%4 && wo.pos<2) occ.push([L-o.d,L]); });
      let free=[]; segs.forEach(([a,b])=>{ let parts=[[a,b]]; occ.forEach(([s,e])=>{ const n=[]; parts.forEach(([p,q])=>{ if(e<=p||s>=q){ n.push([p,q]); return; } if(s>p) n.push([p,s]); if(e<q) n.push([e,q]); }); parts=n; }); free.push(...parts); });
      free=free.filter(([a,b])=>b-a>=m.w-0.5);
      let pos=null;
      if(sel){ const wo=K.wallOf(sel,r); if(wo && wo.wall===w){ const after=wo.pos+sel.w; const f=free.find(([a,b])=>a<=after+0.5 && b>=after+m.w-0.5); if(f) pos=after; else { const before=wo.pos-m.w; const f2=free.find(([a,b])=>a<=before+0.5&&b>=wo.pos-0.5); if(f2) pos=before; } } }
      if(pos===null && free.length) pos=free[0][0];
      if(pos===null){ m.x=r.W/2; m.z=r.D/2; m.rot=0; toast('No hay hueco libre en la pared '+K.WALL_NAMES[w]+': colocado en el centro'); }
      else K.placeOnWall(m,r,w,pos);
    }
    finish(); return m;
    function finish(){ st.modules.push(m); A.selId=m.id; A.commit('añadir'); toast(c.n+' añadido'); }
  };

  /* ---------- Iconos de catálogo (alzado simplificado) ---------- */
  function iconSvg(kind){
    const c=C()[kind]; const st=A.state; const m=K.newModule(kind, st);
    const W=m.w, H=c.cat==='campana'? m.h : (m.h||10); const sc=Math.min(46/W, 46/Math.max(H,1)); const w=W*sc, h=Math.max(2,H*sc);
    let s=`<svg viewBox="-2 -2 ${w+4} ${h+4}" width="${Math.max(18,w+4)}" height="${h+4}" aria-hidden="true">`;
    const R=(x,y,ww,hh,cls)=>`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(0.5,ww).toFixed(1)}" height="${Math.max(0.5,hh).toFixed(1)}" class="${cls}"/>`;
    if(c.cat==='campana'){ s+=`<path d="M${w*0.38} 0 h${w*0.24} v${h*0.45} L${w} ${h} H0 L${w*0.38} ${h*0.45} Z" class="ic-a"/>`; return s+'</svg>'; }
    if(c.cat==='deco'||c.cat==='panel'){ s+=R(0,0,w,h,'ic-c'); return s+'</svg>'; }
    s+=R(0,0,w,h, c.cat==='electro'?'ic-a':'ic-c');
    (c.f(m)||[]).forEach(f=>{ const x=f.x0*sc, y=(H-f.y1)*sc, ww=(f.x1-f.x0)*sc, hh=(f.y1-f.y0)*sc; const ap=['horno','micro','cafetera','calienta','vinoteca','lavadora','aparato_lv','horno_libre','mandos','ap_puerta','ap_cajon','campana_int'].includes(f.t); s+=R(x+0.6,y+0.6,ww-1.2,hh-1.2, ap?'ic-a':(f.t==='nicho'?'ic-n':'ic-f')); if(f.t==='cajon') s+=`<line x1="${x+ww/2-3}" y1="${y+2.4}" x2="${x+ww/2+3}" y2="${y+2.4}" class="ic-h"/>`; if(f.t==='puerta'||f.t==='panel'){ const hx=f.hinge==='der'? x+2.2 : x+ww-2.2; s+=`<line x1="${hx}" y1="${y+hh*0.25}" x2="${hx}" y2="${y+hh*0.45}" class="ic-h"/>`; } });
    if(c.open){ for(let i=1;i<3;i++) s+=`<line x1="0" y1="${h*i/3}" x2="${w}" y2="${h*i/3}" class="ic-h"/>`; }
    return s+'</svg>';
  }

  /* ---------- Paneles ---------- */
  const PANELS = {
    estancia:{t:'Estancia', f:panelEstancia}, escaner:{t:'Escáner 360°', f:()=>K.AS.panelScan()}, distribucion:{t:'Distribución automática', f:panelDistrib},
    muebles:{t:'Muebles', f:()=>panelCatalog(['bajo','alto','columna','panel','deco'])}, electro:{t:'Electrodomésticos', f:panelElectro},
    acabados:{t:'Acabados', f:panelAcabados}, comprobar:{t:'Comprobaciones', f:panelCheck}, presupuesto:{t:'Presupuesto', f:panelBudget},
    fabricacion:{t:'Medidas y fabricación', f:panelFab}, proyectos:{t:'Proyectos', f:panelProjects}
  };
  const EXTRA={};
  A.addPanel=(k,t,f,act,chg)=>{ PANELS[k]={t,f}; EXTRA[k]={act,chg}; };
  A.openPanel = function(p){ A.panel=p; $$('#rail button').forEach(b=>b.setAttribute('aria-current', b.dataset.p===p? 'page':'false')); $('#panel').hidden=false; document.body.classList.add('panel-open'); renderPanel(); };
  function renderPanel(){ const p=PANELS[A.panel]; if(!p) return; const el=$('#panelBody'); const sc=el.scrollTop; $('#panelTitle').textContent=p.t; const html=p.f(); if(typeof html==='string') el.innerHTML=html; bindPanel(el); el.scrollTop=sc; }
  A.renderPanel = renderPanel;
  function field(id,label,val,extra){ return `<label class="fld"><span>${label}</span><input id="${id}" inputmode="decimal" value="${esc(val)}" ${extra||''}></label>`; }
  function sel(id,label,opts,val){ return `<label class="fld"><span>${label}</span><select id="${id}">${opts.map(o=>`<option value="${esc(o[0])}" ${String(o[0])===String(val)?'selected':''}>${esc(o[1])}</option>`).join('')}</select></label>`; }
  function swatches(group, items, val, key){ return `<div class="sw-grid" data-sw="${group}">${items.map(it=>`<button type="button" class="sw ${it.k===val?'on':''}" data-k="${esc(it.k)}" title="${esc(it.n)}" aria-label="${esc(it.n)}"><i style="background:${swBg(it)}"></i><b>${esc(it.n)}</b></button>`).join('')}</div>`; }
  function swBg(it){ const c=it.c||'#ccc'; const g=it.g; if(g==='madera'||g==='tarima'||g==='espiga') return `repeating-linear-gradient(90deg, ${c} 0 5px, ${K.shade(c,-0.12)} 5px 6px, ${c} 6px 11px)`; if(g&&g.startsWith('marmol')) return `linear-gradient(125deg, ${c} 40%, ${g==='marmol_oro'?'#b89a62':K.shade(c,-0.35)} 41%, ${c} 44%, ${c} 70%, ${K.shade(c,-0.25)} 71%, ${c} 73%)`; if(g==='granito'||g==='granulado'||g==='terrazo') return `radial-gradient(${K.shade(c,-0.3)} 1px, transparent 1.5px) 0 0/5px 5px, radial-gradient(${K.shade(c,0.2)} 1px, transparent 1.5px) 2px 3px/6px 6px, ${c}`; if(g==='ajedrez') return 'conic-gradient(#1f1f20 25%, #ecebe6 0 50%, #1f1f20 0 75%, #ecebe6 0) 0 0/14px 14px'; if(g==='hidraulico') return `radial-gradient(circle at 0 0, #2f4b5a 35%, transparent 36%) 0 0/12px 12px, ${c}`; return c; }
  function chips(id, items, val){ return `<div class="chips" data-chips="${id}">${items.map(it=>`<button type="button" class="chip ${String(it[0])===String(val)?'on':''}" data-v="${esc(it[0])}">${esc(it[1])}</button>`).join('')}</div>`; }
  const wallOpts=()=>[0,1,2,3].map(w=>[w,'Pared '+K.WALL_NAMES[w]+' · '+K.wallLen(A.state.room,w)+' cm']);

  function panelEstancia(){
    const st=A.state, r=st.room;
    const types=K.OPENINGS;
    let h=`<p class="hint">Medidas interiores en centímetros. La pared A es la del fondo; B, C y D siguen en el sentido de las agujas del reloj.</p>
    <div class="row3">${field('rW','Ancho (A y C)',r.W)}${field('rD','Fondo (B y D)',r.D)}${field('rH','Alto',r.H)}</div>
    <h4>Puertas, ventanas e instalaciones</h4>
    <div class="row2">${sel('opType','Elemento',types.map(t=>[t.k,t.n]),'puerta')}${sel('opWall','Pared',wallOpts(),A.targetWall)}</div>
    <button class="btn" data-act="addOpening">Añadir a la pared</button>
    <div class="list">`;
    st.openings.forEach(o=>{ const t=types.find(x=>x.k===o.type)||{n:o.type}; const isD=o.type==='puerta';
      h+=`<div class="item ${A.selOpen===o.id?'on':''}" data-open="${o.id}"><div class="item-h"><b>${esc(t.n)}</b><span class="tag">Pared ${K.WALL_NAMES[o.wall]}</span><button class="icon-btn" data-act="delOpening" data-id="${o.id}" aria-label="Eliminar">✕</button></div>
      <div class="row4">${sel('ow_'+o.id,'Pared',[0,1,2,3].map(w=>[w,K.WALL_NAMES[w]]),o.wall)}${field('op_'+o.id,'Desde esquina',o.pos)}${field('owi_'+o.id,'Ancho',o.width)}${field('oh_'+o.id,'Alto',o.height)}${field('os_'+o.id,'Altura suelo',o.sill)}${isD?sel('oj_'+o.id,'Bisagra',[['0','Izquierda'],['1','Derecha']],o.hingeR?'1':'0'):''}</div></div>`; });
    h+=`</div>
    <h4>Pilares y obstáculos</h4>
    <button class="btn" data-act="addObst">Añadir pilar</button><div class="list">`;
    st.obstacles.forEach(o=>{ h+=`<div class="item"><div class="item-h"><b>Pilar</b><button class="icon-btn" data-act="delObst" data-id="${o.id}" aria-label="Eliminar">✕</button></div><div class="row4">${field('obx_'+o.id,'X centro',o.x)}${field('obz_'+o.id,'Z centro',o.z)}${field('obw_'+o.id,'Ancho',o.w)}${field('obd_'+o.id,'Fondo',o.d)}</div></div>`; });
    h+=`</div><h4>Suelo</h4>${swatches('floor',K.FLOORS,r.floor)}
    <h4>Color de paredes</h4><div class="sw-grid tight" data-sw="wallColor">${K.WALL_COLORS.map(c=>`<button type="button" class="sw ${c===r.wallColor?'on':''}" data-k="${c}" aria-label="Color ${c}"><i style="background:${c}"></i></button>`).join('')}<label class="sw custom"><input type="color" id="wallColorPick" value="${r.wallColor}" aria-label="Otro color"></label></div>`;
    return h;
  }
  function panelDistrib(){
    const o=A.distOpt=A.distOpt||{type:'L', main:'auto', frigo:'integrado', horno:'columna', micro:'columna', lv:60, lav:false, altos:true, despensa:false, hood:'pir', colSide:'end', flip:false, islaHob:false};
    let h=`<p class="hint">Genera propuestas completas a partir de las medidas, puertas, ventanas y tomas de agua. Después se puede retocar todo.</p>
    ${sel('dMain','Pared principal (fregadero)',[['auto','Automática (toma de agua o la más larga)'],...wallOpts()],o.main)}
    <div class="row2">${sel('dFrigo','Frigorífico',[['integrado','Integrado en columna'],['libre','Libre (combi)'],['americano','Americano'],['ninguno','Sin frigorífico']],o.frigo)}${sel('dHorno','Horno',[['columna','En columna'],['bajo','Bajo encimera']],o.horno)}</div>
    <div class="row2">${sel('dMicro','Microondas',[['columna','En columna con horno'],['ninguno','Sin microondas']],o.micro)}${sel('dLv','Lavavajillas',[['60','60 cm'],['45','45 cm'],['0','Sin lavavajillas']],o.lv)}</div>
    <div class="row2">${sel('dHood','Campana',[['pir','Decorativa pirámide'],['rec','Decorativa recta'],['inc','Vidrio inclinada'],['int','Integrada en mueble alto'],['ext','Extractor en placa'],['none','Sin campana']],o.hood)}${sel('dCol','Columnas',[['end','Al final del tramo'],['start','Al principio del tramo']],o.colSide)}</div>
    <div class="checks"><label><input type="checkbox" id="dAltos" ${o.altos?'checked':''}> Muebles altos</label><label><input type="checkbox" id="dLav" ${o.lav?'checked':''}> Lavadora</label><label><input type="checkbox" id="dDesp" ${o.despensa?'checked':''}> Columna despensa</label><label><input type="checkbox" id="dFlip" ${o.flip?'checked':''}> Girar hacia la otra pared</label><label><input type="checkbox" id="dIslaHob" ${o.islaHob?'checked':''}> Placa en la isla</label></div>
    <button class="btn primary" data-act="genAll">Generar propuestas</button>
    <div class="props" id="props">${(A._props||[]).map((p,i)=>`<button class="prop" data-act="applyProp" data-i="${i}"><canvas width="240" height="170" data-thumb="${i}"></canvas><b>${esc(p.name)}</b><span>${p.n} muebles · ${eur(p.price)}</span></button>`).join('')}</div>
    <h4>Empezar de cero</h4><button class="btn ghost" data-act="clearMods">Vaciar todos los muebles</button>`;
    setTimeout(()=>{ $$('canvas[data-thumb]').forEach(cv=>{ const p=A._props[+cv.dataset.thumb]; if(p) K.D2.drawPlan(cv, Object.assign({},A.state,{modules:p.modules}), {thumb:true, modules:p.modules}); }); },0);
    return h;
  }
  function panelCatalog(cats, extra){
    const st=A.state; const t=A.catTab && cats.includes(A.catTab)? A.catTab : cats[0]; A.catTab=t;
    let h=`<div class="tabs" role="tablist">${cats.map(c=>`<button role="tab" class="tab" aria-selected="${c===t}" data-act="catTab" data-c="${c}">${esc(K.CAT_NAMES[c]||c)}</button>`).join('')}</div>`;
    if(['bajo','alto','columna','panel','electro'].includes(t)) h+=`<div class="row2">${sel('targetWall','Colocar en',wallOpts(),A.targetWall)}<label class="fld chk"><input type="checkbox" id="asIsla" ${A.asIsla?'checked':''}><span>Como isla (exento)</span></label></div>`;
    h+= extra||'';
    h+=`<div class="cat">${Object.values(C()).filter(c=>c.cat===t).map(c=>`<button class="cat-it" data-act="addMod" data-k="${c.k}"><span class="ic">${iconSvg(c.k)}</span><span class="nm">${esc(c.n)}</span><span class="ws">${c.ws? c.ws.join(' · ')+' cm' : Math.round(c.w)+' cm'}</span></button>`).join('')}</div>
    <p class="hint">Todas las medidas son libres: después de añadir un mueble se ajusta al centímetro en el panel de la derecha.</p>`;
    return h;
  }
  function panelElectro(){
    const F=A.state.finish;
    const extra=`<div class="row2">${sel('applColor','Color de electrodomésticos',K.APPL_COLORS.map(a=>[a.k,a.n]),F.applColor)}${sel('applGama','Gama (precio)',K.GAMAS.map(g=>[g.k,g.n]),F.applGama)}</div>
    <h4>Integrados en mueble</h4><div class="cat">${['BLV','BLVV','BLAV','BFRIGO','BVINO','BHORNO','BHORNO90','CHM','CHC','CHH','CHCAFE','CSEMI','CFRIGO','CFRIGO1','CCONG','CLAV','AMIC','ACAMP'].map(k=>{const c=C()[k]; return `<button class="cat-it" data-act="addMod" data-k="${k}"><span class="ic">${iconSvg(k)}</span><span class="nm">${esc(c.n)}</span><span class="ws">${(c.ws||[c.w]).join(' · ')} cm</span></button>`;}).join('')}</div><h4>Libres y campanas</h4>`;
    A.catTab = A.catTab==='campana'?'campana':'electro';
    return panelCatalog(['electro','campana'], extra);
  }
  function zoneEditor(z){
    const F=A.state.finish; const zf=F.zones[z];
    const groups=[['liso','Lisos'],['madera','Maderas'],['otros','Piedra, metal y cristal']];
    let h='';
    groups.forEach(([g,n])=>{ const items=K.FRONT_MATS.filter(m=> g==='otros'? !['liso','madera'].includes(m.g) || m.k.startsWith('cristal') : m.g===g && !m.k.startsWith('cristal')); h+=`<h5>${n}</h5>${swatches('zmat',items,zf.mat)}`; });
    h+=`<div class="row2">${sel('zModel','Modelo de frente',K.DOOR_MODELS.map(d=>[d.k,d.n]),zf.model)}${sel('zGloss','Acabado',K.GLOSS.map(g=>[g.k,g.n]),zf.gloss)}</div>${sel('zType','Fabricación del frente',K.FRONT_TYPES.map(t=>[t.k,t.n]),zf.type)}
    <button class="btn ghost" data-act="zoneAll">Aplicar este acabado a toda la cocina</button>`;
    return h;
  }
  function panelAcabados(){
    const F=A.state.finish; const z=A.zoneTab||'bajos'; A.zoneTab=z; const tab=A.finTab||'frentes';
    const tabs=[['frentes','Frentes'],['tiradores','Tiradores'],['encimera','Encimera'],['frente','Frente pared'],['zocalo','Zócalo y casco'],['luz','Luz']];
    let h=`<div class="tabs" role="tablist">${tabs.map(([k,n])=>`<button role="tab" class="tab" aria-selected="${k===tab}" data-act="finTab" data-c="${k}">${n}</button>`).join('')}</div>`;
    if(tab==='frentes') h+= chips('zoneTab',[['bajos','Bajos'],['altos','Altos'],['columnas','Columnas'],['isla','Isla']],z) + zoneEditor(z);
    if(tab==='tiradores') h+=`<p class="hint">Catálogo provisional. Se sustituye por el catálogo de tiradores del taller.</p><div class="hl">${K.HANDLES.map(hd=>`<button class="hl-it ${hd.k===F.handle.k?'on':''}" data-act="handle" data-k="${hd.k}"><span class="hl-ic">${handleIcon(hd)}</span>${esc(hd.n)}</button>`).join('')}</div>
      <h4>Acabado</h4>${swatches('handleColor',K.HANDLE_COLORS,F.handle.color)}
      ${sel('hOrient','Orientación',[['auto','Automática (puertas vertical, cajones horizontal)'],['horizontal','Siempre horizontal'],['vertical','Vertical en puertas']],F.handle.orient)}`;
    if(tab==='encimera'){ h+=`<h4>Material</h4>${swatches('top',K.TOP_MATS,F.top.mat)}<div class="row2">${sel('topThick','Grosor (cm)',K.TOP_THICK.map(t=>[t,String(t).replace('.',',')+' cm']),F.top.thick)}${sel('topEdge','Canto',K.TOP_EDGES.map(e=>[e.k,e.n]),F.top.edge)}</div>${field('topOver','Vuelo frontal (cm)',A.state.conf.topOver)}
      <label class="fld chk"><input type="checkbox" id="topIslaOn" ${F.topIsla?'checked':''}><span>Encimera distinta en la isla</span></label>`;
      if(F.topIsla) h+=`<h5>Encimera de la isla</h5>${swatches('topIsla',K.TOP_MATS,F.topIsla.mat)}${sel('topIslaThick','Grosor isla',K.TOP_THICK.map(t=>[t,String(t).replace('.',',')+' cm']),F.topIsla.thick)}`; }
    if(tab==='frente') h+=`<p class="hint">Revestimiento de la pared entre la encimera y los muebles altos.</p><div class="list-ch">${K.SPLASH.map(s=>`<button class="chip ${s.k===F.splash.k?'on':''}" data-act="splash" data-k="${s.k}">${esc(s.n)}</button>`).join('')}</div>`;
    if(tab==='zocalo') h+=`${sel('plMat','Zócalo',[['igual','Igual que los frentes'],['aluminio','Aluminio'],['inox','Inox'],['negro','Negro'],['blanco','Blanco'],['madera','Madera']],F.plinth.mat)}${field('plH','Altura de zócalo (cm)',A.state.conf.plinthH)}
      <label class="fld chk"><input type="checkbox" id="ledPl" ${F.ledPlinth?'checked':''}><span>Luz LED en el zócalo</span></label>
      <h4>Color del casco (interior)</h4>${swatches('casco',K.CASCO.map(c=>({k:c.k,n:c.n,c:c.c||'#bbb'})),F.casco)}`;
    if(tab==='luz') h+=`<div class="checks"><label><input type="checkbox" id="led" ${F.led?'checked':''}> LED bajo muebles altos</label><label><input type="checkbox" id="ledVit" ${F.ledVitrina?'checked':''}> Luz en vitrinas</label></div>
      ${chips('light',[['dia','Día'],['tarde','Atardecer'],['noche','Noche']],F.light)}
      ${chips('lightTemp',[['calida','Luz cálida'],['neutra','Neutra'],['fria','Fría']],F.lightTemp)}`;
    return h;
  }
  function handleIcon(hd){ const t=hd.t; if(t==='barra') return '<svg viewBox="0 0 40 12" width="40" height="12"><rect x="4" y="4" width="32" height="3" rx="1.5"/><rect x="8" y="6" width="2" height="5"/><rect x="30" y="6" width="2" height="5"/></svg>'; if(t==='pomo') return '<svg viewBox="0 0 40 12" width="40" height="12"><circle cx="20" cy="6" r="4.5"/></svg>'; if(t==='gola') return '<svg viewBox="0 0 40 12" width="40" height="12"><path d="M0 3h40v6H0z" opacity=".35"/><path d="M0 5h40v2H0z"/></svg>'; if(t==='unero') return '<svg viewBox="0 0 40 12" width="40" height="12"><path d="M10 2h20v3H10z"/></svg>'; if(t==='perfil') return '<svg viewBox="0 0 40 12" width="40" height="12"><path d="M0 2h40v3H0z"/></svg>'; if(t==='concha') return '<svg viewBox="0 0 40 12" width="40" height="12"><path d="M12 3h16a8 7 0 0 1-16 0z"/></svg>'; if(t==='cuero') return '<svg viewBox="0 0 40 12" width="40" height="12"><rect x="16" y="1" width="8" height="10" rx="1"/></svg>'; if(t==='pletina') return '<svg viewBox="0 0 40 12" width="40" height="12"><rect x="6" y="4" width="28" height="4"/></svg>'; return '<svg viewBox="0 0 40 12" width="40" height="12"><rect x="1" y="1" width="38" height="10" fill="none" stroke="currentColor"/></svg>'; }
  function panelCheck(){
    const v=A._val||K.validate(A.state);
    return `<p class="hint">Comprobaciones de obra y ergonomía. Toca un aviso para seleccionar el mueble.</p><div class="vlist">${v.map((x,i)=>`<button class="v ${x.lvl}" data-act="valSel" data-i="${i}"><span class="dot"></span><span>${esc(x.msg)}</span></button>`).join('')}</div>`;
  }
  function panelBudget(){
    const st=A.state, b=K.budget(st), cl=st.meta.client, P=st.prices;
    const secs={}; b.lines.forEach(l=>{ (secs[l.sec]=secs[l.sec]||[]).push(l); });
    let h=`<div class="row2">${field('cNom','Cliente',cl.nombre,'inputmode="text"')}${field('cTel','Teléfono',cl.tel,'inputmode="tel"')}</div>${field('cDir','Dirección de la obra',cl.direccion,'inputmode="text"')}${field('cNotas','Notas',cl.notas,'inputmode="text"')}
    <div class="totals"><div><span>Base imponible</span><b>${eur(b.base)}</b></div><div><span>IVA ${P.iva}%</span><b>${eur(b.iva)}</b></div><div class="big"><span>Total</span><b>${eur(b.total)}</b></div></div>
    <div class="btns"><button class="btn primary" data-act="clientSheet">Hoja para el cliente</button>${K.PWA?'<button class="btn" data-act="printBudget">Imprimir o PDF</button><button class="btn" data-act="shareBudget">Compartir</button>':''}<button class="btn" data-act="dlBudget">Descargar presupuesto</button><button class="btn ghost" data-act="dlCsv">Descargar CSV</button></div>`;
    Object.entries(secs).forEach(([s,ls])=>{ h+=`<h4>${esc(s)} <small>${eur(ls.reduce((a,l)=>a+l.total,0))}</small></h4><table class="tbl"><tbody>${ls.map(l=>`<tr><td>${esc(l.desc)}</td><td class="n">${String(l.qty).replace('.',',')} ${l.unit}</td><td class="n">${eur(l.total)}</td></tr>`).join('')}</tbody></table>`; });
    h+=`<details class="tarifas"><summary>Tarifas del taller (editables)</summary>
      <div class="row3">${field('p_bajo_cm','Bajo €/cm',P.bajo_cm)}${field('p_alto_cm','Alto €/cm',P.alto_cm)}${field('p_columna_cm','Columna €/cm',P.columna_cm)}</div>
      <div class="row3">${field('p_cajon','Cajón €',P.cajon)}${field('p_extraible','Extraíble €',P.extraible)}${field('p_tirador','Tirador €/ud',P.tirador)}</div>
      <div class="row3">${field('p_gola_ml','Gola €/ml',P.gola_ml)}${field('p_zocalo_ml','Zócalo €/ml',P.zocalo_ml)}${field('p_panel_m2','Panel €/m²',P.panel_m2)}</div>
      <h5>Encimera €/ml</h5><div class="row3">${Object.keys(P.top_ml).map(k=>field('pt_'+k,k,P.top_ml[k])).join('')}</div>
      <div class="row3">${field('p_montaje_mod','Montaje €/mueble',P.montaje_mod)}${field('p_transporte','Transporte €',P.transporte)}${field('p_margen','Margen %',P.margen)}</div>
      <div class="row3">${field('p_descuento','Descuento %',P.descuento)}${field('p_iva','IVA %',P.iva)}</div>
      <h5>Electrodomésticos (básica · media · alta)</h5>${Object.keys(P.appl).map(k=>`<div class="row4"><span class="lbl">${k}</span>${[0,1,2].map(i=>field('pa_'+k+'_'+i,'',P.appl[k][i])).join('')}</div>`).join('')}
      <button class="btn ghost" data-act="resetPrices">Restaurar tarifas por defecto</button></details>`;
    return h;
  }
  function panelFab(){
    const cf=A.state.conf; const rows=K.cutList(A.state);
    let h=`<p class="hint">Medidas generales de fabricación. Al cambiarlas se recalculan todos los muebles que no tengan medidas propias.</p>
    <div class="row3">${field('cfPlinth','Zócalo',cf.plinthH)}${field('cfBaseH','Alto casco bajo',cf.baseH)}${field('cfBaseD','Fondo bajo',cf.baseD)}</div>
    <div class="row3">${field('cfWallBottom','Altos desde suelo',cf.wallBottom)}${field('cfWallH','Alto de altos',cf.wallH)}${field('cfWallD','Fondo altos',cf.wallD)}</div>
    <div class="row3">${field('cfTallH','Alto columna',cf.tallH)}${field('cfTallD','Fondo columna',cf.tallD)}${field('cfBoard','Tablero (cm)',cf.board)}</div>
    <div class="row3">${field('cfGap','Holgura frentes',cf.gap)}${field('cfFrontT','Grosor frente',cf.frontT)}${sel('cfUnits','Cotas en',[['cm','cm'],['mm','mm']],cf.units)}</div>
    <p class="hint">Altura de encimera resultante: <b>${K.topH(A.state)} cm</b>. Separación encimera–altos: <b>${cf.wallBottom-K.topH(A.state)} cm</b>.</p>
    <div class="btns"><button class="btn" data-act="dlCut">Descargar despiece (CSV)</button></div>
    <h4>Despiece · ${rows.length} piezas (mm)</h4><div class="tblwrap"><table class="tbl small"><thead><tr><th>Mueble</th><th>Pieza</th><th class="n">Largo</th><th class="n">Ancho</th><th class="n">Ud</th><th>Material</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.ref)}</td><td>${esc(r.pieza)}</td><td class="n">${r.largo}</td><td class="n">${r.ancho}</td><td class="n">${r.n}</td><td>${esc(r.mat)}</td></tr>`).join('')}</tbody></table></div>`;
    return h;
  }
  function panelProjects(){
    const list=LS.get('pc_projects',[]);
    let h=`<div class="btns"><button class="btn primary" data-act="saveProj">Guardar proyecto</button><button class="btn" data-act="saveVariant">Guardar como variante</button><button class="btn ghost" data-act="newProj">Nuevo</button></div>
    <div class="btns"><button class="btn ghost" data-act="exportJson">Exportar archivo</button><label class="btn ghost file">Importar archivo<input type="file" id="importJson" accept="application/json,.json"></label></div>
    <p class="hint">Los proyectos se guardan en este dispositivo. Exporta el archivo para pasarlo a otro.</p><div class="list">`;
    if(!list.length) h+=`<p class="empty">Aún no hay proyectos guardados. Pulsa «Guardar proyecto» para conservar esta cocina y poder enseñar variantes al cliente.</p>`;
    list.forEach((p,i)=>{ h+=`<div class="item proj"><div class="item-h"><b>${esc(p.name)}</b><span class="tag">${esc(p.date)}</span></div><div class="sub">${esc(p.client||'')} · ${p.n} muebles · ${eur(p.total)}</div><div class="btns"><button class="btn small" data-act="openProj" data-i="${i}">Abrir</button><button class="btn small ghost" data-act="delProj" data-i="${i}">Eliminar</button></div></div>`; });
    return h+'</div>';
  }

  /* ---------- Eventos de paneles ---------- */
  function bindPanel(el){
    const st=A.state;
    el.onclick = (e)=>{
      const b=e.target.closest('[data-act],[data-sw] .sw,[data-chips] .chip,[data-open]'); if(!b) return;
      const sw=e.target.closest('[data-sw] .sw'); if(sw && sw.dataset.k){ onSwatch(sw.parentElement.dataset.sw, sw.dataset.k); return; }
      const ch=e.target.closest('[data-chips] .chip'); if(ch){ onChip(ch.parentElement.dataset.chips, ch.dataset.v); return; }
      const act=b.dataset.act;
      const ex=EXTRA[A.panel]; if(ex && ex.act && act){ ex.act(act,b); }
      if(!act && b.dataset.open){ if(e.target.closest('input,select,button')) return; A.selectOpening(b.dataset.open); renderPanel(); return; }
      switch(act){
        case 'addOpening': { const t=K.OPENINGS.find(x=>x.k===$('#opType').value); const w=+$('#opWall').value; const L=K.wallLen(st.room,w); const o={id:K.uid('o'), type:t.k, wall:w, pos:K.round(Math.max(0,(L-t.w)/2),1), width:t.w, height:t.h, sill:t.s}; st.openings.push(o); A.selOpen=o.id; A.commit('hueco',{panel:true}); renderPanel(); break; }
        case 'delOpening': st.openings=st.openings.filter(o=>o.id!==b.dataset.id); A.commit('quitar hueco'); renderPanel(); break;
        case 'addObst': st.obstacles.push({id:K.uid('p'), x:30, z:30, w:30, d:30}); A.commit('pilar'); renderPanel(); break;
        case 'delObst': st.obstacles=st.obstacles.filter(o=>o.id!==b.dataset.id); A.commit('quitar pilar'); renderPanel(); break;
        case 'addMod': A.addModule(b.dataset.k); break;
        case 'catTab': A.catTab=b.dataset.c; renderPanel(); break;
        case 'finTab': A.finTab=b.dataset.c; renderPanel(); break;
        case 'genAll': genProposals(); break;
        case 'applyProp': { const p=A._props[+b.dataset.i]; st.modules=K.clone(p.modules); A.selId=null; A.commit('distribución'); toast('Distribución aplicada: '+p.name); break; }
        case 'clearMods': st.modules=[]; A.selId=null; A.commit('vaciar'); break;
        case 'zoneAll': { const z=st.finish.zones[A.zoneTab]; ['bajos','altos','columnas','isla'].forEach(k=>st.finish.zones[k]=Object.assign({},z)); A.commit('acabado'); toast('Acabado aplicado a toda la cocina'); renderPanel(); break; }
        case 'handle': st.finish.handle.k=b.dataset.k; A.commit('tirador'); renderPanel(); break;
        case 'splash': st.finish.splash.k=b.dataset.k; A.commit('frente'); renderPanel(); break;
        case 'valSel': { const v=A._val[+b.dataset.i]; if(v && v.ids[0]){ A.select(v.ids[0]); } break; }
        case 'clientSheet': clientSheet(); break;
        case 'dlBudget': downloadBudget(); break;
        case 'printBudget': printBudget(); break;
        case 'shareBudget': shareBudget(); break;
        case 'dlCsv': downloadCsv(); break;
        case 'dlCut': downloadCut(); break;
        case 'resetPrices': st.prices=K.clone(K.PRICES_DEFAULT); A.commit('tarifas'); renderPanel(); break;
        case 'saveProj': saveProject(false); break;
        case 'saveVariant': saveProject(true); break;
        case 'newProj': confirmBox('¿Empezar un proyecto nuevo? Los cambios sin guardar de este se pierden.', ()=>{ A.state=K.newState(); A.selId=null; A.hist=[]; A.commit('nuevo',{panel:true}); A.openPanel('estancia'); }); break;
        case 'openProj': { const list=LS.get('pc_projects',[]); const p=list[+b.dataset.i]; if(p){ A.state=migrate(K.clone(p.state)); A.selId=null; A.hist=[]; A.commit('abrir',{panel:true}); toast('Proyecto abierto'); } break; }
        case 'delProj': { const i=+b.dataset.i; confirmBox('¿Eliminar este proyecto guardado?', ()=>{ const list=LS.get('pc_projects',[]); list.splice(i,1); LS.set('pc_projects',list); renderPanel(); }); break; }
        case 'exportJson': saveFile((st.meta.name||'cocina').replace(/[^\w\- áéíóúñ]/gi,'')+'.json', JSON.stringify(st,null,1)); break;
      }
    };
    el.onchange = (e)=>{
      const t=e.target, id=t.id; if(!id) return; const v=t.value; const cf=st.conf, F=st.finish, P=st.prices;
      const ex=EXTRA[A.panel]; if(ex && ex.chg && ex.chg(id,t)) return;
      const m=id.match(/^(op|owi|oh|os|ow|oj)_(.+)$/); if(m){ const o=st.openings.find(x=>x.id===m[2]); if(!o) return; const key={op:'pos',owi:'width',oh:'height',os:'sill',ow:'wall',oj:'hingeR'}[m[1]]; o[key]= key==='hingeR'? v==='1' : key==='wall'? +v : num(v,o[key]); A.commit('hueco'); return; }
      const ob=id.match(/^ob([xzwd])_(.+)$/); if(ob){ const o=st.obstacles.find(x=>x.id===ob[2]); o[ob[1]]=num(v,o[ob[1]]); A.commit('pilar'); return; }
      const pt=id.match(/^pt_(.+)$/); if(pt){ P.top_ml[pt[1]]=num(v,0); A.commit('tarifa'); return; }
      const pa=id.match(/^pa_(.+)_(\d)$/); if(pa){ P.appl[pa[1]][+pa[2]]=num(v,0); A.commit('tarifa'); return; }
      const pp=id.match(/^p_(.+)$/); if(pp){ P[pp[1]]=num(v,0); A.commit('tarifa'); return; }
      switch(id){
        case 'rW': case 'rD': case 'rH': { const k={rW:'W',rD:'D',rH:'H'}[id]; st.room[k]=Math.max(100,num(v,st.room[k])); A.commit('estancia'); K.D2.resetPlan(); break; }
        case 'wallColorPick': st.room.wallColor=v; A.commit('pared'); break;
        case 'opWall': case 'targetWall': A.targetWall=+v; break;
        case 'asIsla': A.asIsla=t.checked; break;
        case 'dMain': A.distOpt.main=v; break; case 'dFrigo': A.distOpt.frigo=v; break; case 'dHorno': A.distOpt.horno=v; break; case 'dMicro': A.distOpt.micro=v; break;
        case 'dLv': A.distOpt.lv=+v; break; case 'dHood': A.distOpt.hood=v; break; case 'dCol': A.distOpt.colSide=v; break;
        case 'dAltos': A.distOpt.altos=t.checked; break; case 'dLav': A.distOpt.lav=t.checked; break; case 'dDesp': A.distOpt.despensa=t.checked; break; case 'dFlip': A.distOpt.flip=t.checked; break; case 'dIslaHob': A.distOpt.islaHob=t.checked; break;
        case 'zModel': F.zones[A.zoneTab].model=v; A.commit('modelo'); break;
        case 'zGloss': F.zones[A.zoneTab].gloss=v; A.commit('brillo'); break;
        case 'zType': F.zones[A.zoneTab].type=v; A.commit('fabricación'); break;
        case 'hOrient': F.handle.orient=v; A.commit('tirador'); break;
        case 'topThick': F.top.thick=num(v,2); A.commit('encimera'); break;
        case 'topEdge': F.top.edge=v; A.commit('encimera'); break;
        case 'topOver': cf.topOver=num(v,2); A.commit('encimera'); break;
        case 'topIslaOn': F.topIsla = t.checked? Object.assign({},F.top) : null; A.commit('encimera'); renderPanel(); break;
        case 'topIslaThick': F.topIsla.thick=num(v,2); A.commit('encimera'); break;
        case 'plMat': F.plinth.mat=v; A.commit('zócalo'); break;
        case 'plH': setConf('plinthH', num(v,cf.plinthH)); break;
        case 'ledPl': F.ledPlinth=t.checked; A.commit('luz'); break;
        case 'led': F.led=t.checked; A.commit('luz'); break;
        case 'ledVit': F.ledVitrina=t.checked; A.commit('luz'); break;
        case 'applColor': F.applColor=v; A.commit('electro'); break;
        case 'applGama': F.applGama=v; A.commit('gama'); break;
        case 'cNom': st.meta.client.nombre=v; A.commit('cliente'); break; case 'cTel': st.meta.client.tel=v; A.commit('cliente'); break; case 'cDir': st.meta.client.direccion=v; A.commit('cliente'); break; case 'cNotas': st.meta.client.notas=v; A.commit('cliente'); break;
        case 'cfPlinth': setConf('plinthH',num(v,cf.plinthH)); break; case 'cfBaseH': setConf('baseH',num(v,cf.baseH)); break; case 'cfBaseD': setConf('baseD',num(v,cf.baseD)); break;
        case 'cfWallBottom': setConf('wallBottom',num(v,cf.wallBottom)); break; case 'cfWallH': setConf('wallH',num(v,cf.wallH)); break; case 'cfWallD': setConf('wallD',num(v,cf.wallD)); break;
        case 'cfTallH': setConf('tallH',num(v,cf.tallH)); break; case 'cfTallD': setConf('tallD',num(v,cf.tallD)); break; case 'cfBoard': cf.board=num(v,1.9); A.commit('conf'); break;
        case 'cfGap': cf.gap=num(v,0.3); A.commit('conf'); break; case 'cfFrontT': cf.frontT=num(v,1.9); A.commit('conf'); break; case 'cfUnits': cf.units=v; A.commit('conf'); break;
        case 'importJson': { const f=t.files[0]; if(!f) return; const rd=new FileReader(); rd.onload=()=>{ try{ const s=JSON.parse(rd.result); if(!s.room||!s.modules) throw 0; A.state=migrate(s); A.selId=null; A.hist=[]; A.commit('importar',{panel:true}); toast('Proyecto importado'); }catch(err){ toast('El archivo no es un proyecto válido de esta aplicación'); } }; rd.readAsText(f); break; }
      }
    };
  }
  function onSwatch(group,k){
    const st=A.state, F=st.finish;
    if(group==='floor') st.room.floor=k; if(group==='wallColor') st.room.wallColor=k;
    if(group==='zmat') F.zones[A.zoneTab].mat=k; if(group==='handleColor') F.handle.color=k; if(group==='top') F.top.mat=k; if(group==='topIsla') F.topIsla.mat=k; if(group==='casco') F.casco=k;
    if(group.startsWith('ins_')){ insSwatch(group,k); return; }
    A.commit('acabado'); renderPanel();
  }
  function onChip(group,v){ const F=A.state.finish; if(group==='zoneTab'){ A.zoneTab=v; renderPanel(); return; } if(group==='light') F.light=v; if(group==='lightTemp') F.lightTemp=v; A.commit('luz'); renderPanel(); }
  function setConf(key,val){
    const st=A.state, cf=st.conf, old=cf[key]; cf[key]=val;
    st.modules.forEach(m=>{ const c=C()[m.kind]; if(!c) return;
      if(key==='plinthH' && ['bajo','columna'].includes(c.cat)) m.y=val;
      if(key==='plinthH' && c.cat==='panel' && c.panel==='regleta') m.y=val;
      if(key==='baseH' && c.cat==='bajo' && Math.abs(m.h-old)<0.01) m.h=val;
      if(key==='baseD' && c.cat==='bajo' && Math.abs(m.d-old)<0.01){ const wo=K.wallOf(m,st.room); m.d=val; if(wo) K.placeOnWall(m,st.room,wo.wall,wo.pos); }
      if(key==='wallBottom' && c.cat==='alto' && Math.abs(m.y-old)<0.01) m.y=val;
      if(key==='wallH' && c.cat==='alto' && Math.abs(m.h-old)<0.01) m.h=val;
      if(key==='wallD' && c.cat==='alto' && Math.abs(m.d-old)<0.01){ const wo=K.wallOf(m,st.room); m.d=val; if(wo) K.placeOnWall(m,st.room,wo.wall,wo.pos); }
      if(key==='tallH' && c.cat==='columna' && Math.abs(m.h-old)<0.01) m.h=val;
      if(key==='tallD' && c.cat==='columna' && Math.abs(m.d-old)<0.01){ const wo=K.wallOf(m,st.room); m.d=val; if(wo) K.placeOnWall(m,st.room,wo.wall,wo.pos); }
      if((key==='plinthH'||key==='baseH') && (c.onTop || c.cat==='campana' && c.hood!=='techo')) m.y += (key==='plinthH'? val-old : val-old);
    });
    A.commit('medidas generales'); renderPanel();
  }
  function genProposals(){
    const o=A.distOpt; const st=A.state; const base=Object.assign({},o,{main:o.main==='auto'?null:+o.main});
    const types=['lineal','L','U','paralela','peninsula','isla']; const out=[]; const seen=new Set();
    types.forEach(t=>{ try{ const r=K.generate(st, Object.assign({},base,{type:t})); if(!r.modules.length) return; const key=r.type+':'+r.modules.length; if(seen.has(key) && r.type!==t) return; seen.add(key); const tmp=Object.assign({},st,{modules:r.modules}); out.push({name:(K.LAYOUTS.find(l=>l.k===t)||{n:t}).n + (r.type!==t?' (como '+r.type+')':''), modules:r.modules, n:r.modules.filter(m=>['bajo','alto','columna'].includes(K.cat(m))).length, price:K.budget(tmp).total}); }catch(e){ console.warn(t,e); } });
    // variante girada
    try{ const r=K.generate(st, Object.assign({},base,{type:'L', flip:!base.flip})); if(r.modules.length && r.type==='L'){ const tmp=Object.assign({},st,{modules:r.modules}); out.push({name:'En L (hacia la otra pared)', modules:r.modules, n:r.modules.filter(m=>['bajo','alto','columna'].includes(K.cat(m))).length, price:K.budget(tmp).total}); } }catch(e){}
    A._props=out; renderPanel(); if(!out.length) toast('No caben muebles con estas medidas: revisa la estancia');
  }

  /* ---------- Inspector ---------- */
  function renderInspector(){
    const box=$('#insp'); const st=A.state;
    const active=document.activeElement && box.contains(document.activeElement)? document.activeElement.id : null;
    if(A.selOpen){ const o=st.openings.find(x=>x.id===A.selOpen); if(!o){ box.hidden=true; document.body.classList.remove('insp-open'); return; } document.body.classList.add('insp-open'); const t=K.OPENINGS.find(x=>x.k===o.type)||{n:o.type};
      box.hidden=false; box.innerHTML=`<div class="insp-h"><div><small>Pared ${K.WALL_NAMES[o.wall]}</small><h3>${esc(t.n)}</h3></div><button class="icon-btn" data-ia="close" aria-label="Cerrar">✕</button></div>
      <div class="row2">${field('io_pos','Desde esquina',o.pos)}${field('io_width','Ancho',o.width)}</div><div class="row2">${field('io_height','Alto',o.height)}${field('io_sill','Altura suelo',o.sill)}</div>${sel('io_wall','Pared',[0,1,2,3].map(w=>[w,'Pared '+K.WALL_NAMES[w]]),o.wall)}
      <div class="btns"><button class="btn small ghost danger" data-ia="delOpen">Eliminar</button></div>`;
      bindInspector(box); return; }
    const m=st.modules.find(x=>x.id===A.selId); if(!m){ box.hidden=true; box.innerHTML=''; document.body.classList.remove('insp-open'); return; }
    const c=C()[m.kind]; const wo=K.wallOf(m,st.room); const z=K.zoneOf(m,st);
    const same=Object.values(C()).filter(x=>x.cat===c.cat).map(x=>[x.k,x.n]);
    const hasDoors=(c.f(m)||[]).some(f=>f.t==='puerta'||f.t==='panel');
    let h=`<div class="insp-h"><div><small>${esc(K.CAT_NAMES[c.cat]||'')} · ${esc(K.modLabel(m))}${wo? ' · Pared '+K.WALL_NAMES[wo.wall] : (z==='isla'?' · Isla':'')}</small><h3>${esc(c.n)}</h3></div><button class="icon-btn" data-ia="close" aria-label="Cerrar">✕</button></div>
    <div class="row3">${field('im_w','Ancho',K.round(m.w,0.1))}${field('im_h', c.cat==='panel'&&c.panel==='barra'?'Grosor':'Alto',K.round(m.h,0.1))}${field('im_d','Fondo',K.round(m.d,0.1))}</div>
    <div class="row3">${field('im_y','Elevación',K.round(m.y,0.1))}${wo? field('im_pos','Desde esquina',K.round(wo.pos,0.1)) : field('im_x','X',K.round(m.x,0.1))}${wo? sel('im_wall','Pared',[0,1,2,3].map(w=>[w,K.WALL_NAMES[w]]),wo.wall) : field('im_z','Z',K.round(m.z,0.1))}</div>
    <div class="nudge" role="group" aria-label="Mover"><button class="btn small" data-ia="nudge" data-dx="-5">◀ 5</button><button class="btn small" data-ia="nudge" data-dx="-1">◀ 1</button><button class="btn small" data-ia="nudge" data-dx="1">1 ▶</button><button class="btn small" data-ia="nudge" data-dx="5">5 ▶</button><button class="btn small" data-ia="rot" aria-label="Girar 90 grados">⟳ 90°</button></div>
    ${sel('im_kind','Tipo',same,m.kind)}`;
    if(hasDoors) h+=sel('im_apertura','Apertura de puerta',[['izq','Bisagras a la izquierda'],['der','Bisagras a la derecha']],m.o.apertura||'izq');
    if(m.kind==='BRINC') h+=sel('im_ciego','Lado ciego',[['0','Izquierda'],['1','Derecha']],m.o.ciegoDer?'1':'0');
    if(c.sink){ h+=`<h5>Fregadero</h5>${sel('im_sink','Fregadero',K.SINKS.map(s=>[s.k,s.n]),m.o.sink||'s1')}<div class="row2">${sel('im_sinkColor','Material',K.SINK_COLORS.map(s=>[s.k,s.n]),m.o.sinkColor||'inox')}${sel('im_tap','Grifo',K.TAPS.map(s=>[s.k,s.n]),m.o.tap||'alto')}</div>${sel('im_tapColor','Acabado del grifo',K.HANDLE_COLORS.filter(x=>x.k!=='cuero').map(x=>[x.k,x.n]),m.o.tapColor||'inox')}`; }
    if(c.hob||c.range) h+=`<h5>Placa</h5>${sel('im_hob','Placa',K.HOBS.filter(x=>!c.range||x.k!=='ninguna').map(x=>[x.k,x.n]),m.o.hob||(c.range?'gas60':'ninguna'))}`;
    if(c.appl||['electro','campana'].includes(c.cat)) h+=`<div class="row2">${sel('im_color','Color aparato',[['','El general'],...K.APPL_COLORS.map(a=>[a.k,a.n])],m.o.color||'')}${sel('im_gama','Gama',[['','La general'],...K.GAMAS.map(g=>[g.k,g.n])],m.o.gama||'')}</div>`;
    if(['bajo','alto','columna','panel'].includes(c.cat)){
      h+=`<details ${m.o.mat||m.o.model||m.o.handle?'open':''}><summary>Acabado propio de este mueble</summary>${sel('im_mat','Frente',[['','El de la zona ('+esc(z)+')'],...K.FRONT_MATS.map(f=>[f.k,f.n])],m.o.mat||'')}<div class="row2">${sel('im_model','Modelo',[['','El de la zona'],...K.DOOR_MODELS.map(d=>[d.k,d.n])],m.o.model||'')}${sel('im_gloss','Acabado',[['','El de la zona'],...K.GLOSS.map(g=>[g.k,g.n])],m.o.gloss||'')}</div>${sel('im_handle','Tirador',[['','El general'],...K.HANDLES.map(x=>[x.k,x.n])],m.o.handle||'')}</details>`;
    }
    if(c.cat==='bajo') h+=`<div class="row2">${field('im_vol','Voladizo trasero encimera',m.o.voladizo||0)}<label class="fld chk"><input type="checkbox" id="im_cv" ${m.o.costadoVisto?'checked':''}><span>Costados vistos</span></label></div>`;
    if(c.cat==='panel' && c.panel==='barra') h+=`<label class="fld chk"><input type="checkbox" id="im_patas" ${m.o.patas!==false?'checked':''}><span>Con patas</span></label>`;
    if(c.cat==='panel' && (c.panel==='costado'||c.panel==='regleta')) h+=sel('im_alto','Altura del panel',[['bajo','De mueble bajo'],['columna','De columna'],['alto','De mueble alto']],m.o.alto||'bajo');
    h+=`<div class="btns"><button class="btn small" data-ia="dup">Duplicar</button>${wo?`<button class="btn small" data-ia="elev">Ver alzado</button>`:''}<button class="btn small ghost danger" data-ia="del">Eliminar</button></div>`;
    box.hidden=false; box.innerHTML=h; bindInspector(box); document.body.classList.add('insp-open');
    if(active){ const el=document.getElementById(active); if(el){ el.focus(); } }
  }
  function bindInspector(box){
    const st=A.state;
    box.onclick=(e)=>{ const b=e.target.closest('[data-ia]'); if(!b) return; const m=st.modules.find(x=>x.id===A.selId);
      switch(b.dataset.ia){
        case 'close': A.selId=null; A.selOpen=null; A.render(); break;
        case 'del': st.modules=st.modules.filter(x=>x.id!==A.selId); A.selId=null; A.commit('eliminar'); break;
        case 'delOpen': st.openings=st.openings.filter(x=>x.id!==A.selOpen); A.selOpen=null; A.commit('quitar hueco',{panel:A.panel==='estancia'}); break;
        case 'dup': { const n=K.clone(m); n.id=K.uid(); const wo=K.wallOf(m,st.room); if(wo){ K.placeOnWall(n,st.room,wo.wall,Math.min(K.wallLen(st.room,wo.wall)-n.w, wo.pos+m.w)); } else { const a=K.axes(m.rot); n.x+=a.ux*m.w; n.z+=a.uz*m.w; } st.modules.push(n); A.selId=n.id; A.commit('duplicar'); break; }
        case 'elev': { const wo=K.wallOf(m,st.room); A.elevWall=wo.wall; $$('#wallSeg button').forEach(x=>x.setAttribute('aria-pressed',String(+x.dataset.w===wo.wall))); A.setView('elev'); break; }
        case 'nudge': { const d=+b.dataset.dx; const wo=K.wallOf(m,st.room); if(wo){ K.placeOnWall(m,st.room,wo.wall,Math.max(0,Math.min(K.wallLen(st.room,wo.wall)-m.w,wo.pos+d))); } else { const a=K.axes(m.rot); m.x+=a.ux*d; m.z+=a.uz*d; } A.commit('mover'); break; }
        case 'rot': { m.rot=K.normRot(m.rot+90); A.commit('girar'); break; }
      }
    };
    box.onchange=(e)=>{ const t=e.target, id=t.id, v=t.value; const m=st.modules.find(x=>x.id===A.selId);
      if(A.selOpen){ const o=st.openings.find(x=>x.id===A.selOpen); const k=id.replace('io_',''); o[k]= k==='wall'? +v : num(v,o[k]); A.commit('hueco',{panel:A.panel==='estancia'}); return; }
      if(!m) return; const wo=K.wallOf(m,st.room);
      const reWall=()=>{ if(wo) K.placeOnWall(m,st.room,wo.wall,wo.pos); };
      switch(id){
        case 'im_w': m.w=Math.max(1,num(v,m.w)); reWall(); break;
        case 'im_h': m.h=Math.max(0.5,num(v,m.h)); break;
        case 'im_d': m.d=Math.max(1,num(v,m.d)); reWall(); break;
        case 'im_y': m.y=num(v,m.y); break;
        case 'im_pos': K.placeOnWall(m,st.room,wo.wall,num(v,wo.pos)); break;
        case 'im_wall': K.placeOnWall(m,st.room,+v,Math.min(wo.pos,K.wallLen(st.room,+v)-m.w)); break;
        case 'im_x': m.x=num(v,m.x); break; case 'im_z': m.z=num(v,m.z); break;
        case 'im_kind': { const n=K.newModule(v,st); m.kind=v; const nc=C()[v]; if(nc.sink&&!m.o.sink) m.o.sink='s1'; if(nc.hob&&!m.o.hob) m.o.hob='ind60'; if(nc.h && nc.cat!=='bajo') { m.h=n.h; m.y=n.y; } break; }
        case 'im_apertura': m.o.apertura=v; break; case 'im_ciego': m.o.ciegoDer=v==='1'; break;
        case 'im_sink': m.o.sink=v; break; case 'im_sinkColor': m.o.sinkColor=v; break; case 'im_tap': m.o.tap=v; break; case 'im_tapColor': m.o.tapColor=v; break;
        case 'im_hob': m.o.hob=v; break; case 'im_color': m.o.color=v||undefined; break; case 'im_gama': m.o.gama=v||undefined; break;
        case 'im_mat': m.o.mat=v||undefined; break; case 'im_model': m.o.model=v||undefined; break; case 'im_gloss': m.o.gloss=v||undefined; break; case 'im_handle': m.o.handle=v||undefined; break;
        case 'im_vol': m.o.voladizo=Math.max(0,num(v,0)); break; case 'im_cv': m.o.costadoVisto=t.checked; break; case 'im_patas': m.o.patas=t.checked; break;
        case 'im_alto': { m.o.alto=v; const cf=st.conf; if(v==='bajo'){ m.h= C()[m.kind].panel==='costado'? cf.plinthH+cf.baseH+st.finish.top.thick : cf.baseH; m.y= C()[m.kind].panel==='costado'?0:cf.plinthH; m.d=C()[m.kind].panel==='costado'?cf.baseD+2:cf.baseD; } if(v==='columna'){ m.h= cf.plinthH+cf.tallH; m.y=0; m.d=cf.tallD+2; } if(v==='alto'){ m.h=cf.wallH; m.y=cf.wallBottom; m.d=cf.wallD; } reWall(); break; }
      }
      A.commit('editar');
    };
  }
  function insSwatch(){}

  /* ---------- Hoja de cliente y descargas ---------- */
  async function saveFile(name, data){
    try{ const dl = A.capabilities.downloads || (window.claude && await window.claude.use('downloads')); A.capabilities.downloads=dl; if(dl){ await dl.save({filename:name, data}); toast('Archivo preparado: '+name); return; } }catch(e){ if(e && e.code==='declined') return; }
    // alternativa: mostrar contenido para copiar
    modal(`<h3>No se puede descargar aquí</h3><p class="hint">Este visor no permite descargas. Copia el contenido y guárdalo como <b>${esc(name)}</b>.</p><textarea class="dump" readonly>${esc(typeof data==='string'?data:'(archivo binario)')}</textarea>`);
  }
  A.saveFile=saveFile;
  function budgetHtml(img){
    const st=A.state, b=K.budget(st), cl=st.meta.client, F=st.finish;
    const zn=(z)=>{ const zf=F.zones[z]; return `${(K.FRONT_MATS.find(x=>x.k===zf.mat)||{}).n} · ${(K.DOOR_MODELS.find(x=>x.k===zf.model)||{}).n} · ${(K.GLOSS.find(x=>x.k===zf.gloss)||{}).n}`; };
    const rows=b.lines.map(l=>`<tr><td>${esc(l.sec)}</td><td>${esc(l.desc)}</td><td style="text-align:right">${String(l.qty).replace('.',',')} ${l.unit}</td><td style="text-align:right">${eur(l.total)}</td></tr>`).join('');
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Presupuesto ${esc(st.meta.name)}</title><style>body{font-family:Helvetica,Arial,sans-serif;color:#1b2023;margin:32px;max-width:900px}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}img{max-width:100%;border:1px solid #ddd;margin:12px 0}.tot td{font-weight:bold;font-size:14px}.meta{color:#555;font-size:13px}dl{display:grid;grid-template-columns:160px 1fr;gap:4px 12px;font-size:13px}</style></head><body>
    <h1>${esc(st.meta.name)}</h1><p class="meta">${esc(cl.nombre)} · ${esc(cl.tel)} · ${esc(cl.direccion)} · ${esc(st.meta.fecha)}</p>${img?`<img src="${img}" alt="Vista 3D">`:''}
    <h2 style="font-size:16px">Acabados</h2><dl><dt>Muebles bajos</dt><dd>${zn('bajos')}</dd><dt>Muebles altos</dt><dd>${zn('altos')}</dd><dt>Columnas</dt><dd>${zn('columnas')}</dd><dt>Encimera</dt><dd>${(K.TOP_MATS.find(t=>t.k===F.top.mat)||{}).n} ${F.top.thick} cm, canto ${(K.TOP_EDGES.find(e=>e.k===F.top.edge)||{}).n}</dd><dt>Tirador</dt><dd>${(K.HANDLES.find(h=>h.k===F.handle.k)||{}).n} · ${(K.HANDLE_COLORS.find(h=>h.k===F.handle.color)||{}).n}</dd><dt>Frente pared</dt><dd>${(K.SPLASH.find(s=>s.k===F.splash.k)||{}).n}</dd><dt>Electrodomésticos</dt><dd>${(K.APPL_COLORS.find(a=>a.k===F.applColor)||{}).n}, gama ${(K.GAMAS.find(g=>g.k===F.applGama)||{}).n.toLowerCase()}</dd></dl>
    <h2 style="font-size:16px">Detalle</h2><table><thead><tr><th>Partida</th><th>Concepto</th><th style="text-align:right">Cantidad</th><th style="text-align:right">Importe</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td colspan="3" style="text-align:right">Base imponible</td><td style="text-align:right">${eur(b.base)}</td></tr><tr><td colspan="3" style="text-align:right">IVA ${st.prices.iva}%</td><td style="text-align:right">${eur(b.iva)}</td></tr><tr class="tot"><td colspan="3" style="text-align:right">Total</td><td style="text-align:right">${eur(b.total)}</td></tr></tfoot></table>
    ${cl.notas?`<p class="meta">Notas: ${esc(cl.notas)}</p>`:''}<p class="meta">Fabricación a medida. Medidas a confirmar en obra antes de fabricar.</p></body></html>`;
  }
  function printHtml(html){ const w=window.open('','_blank'); if(!w){ toast('Permite las ventanas emergentes para imprimir'); return; } w.document.open(); w.document.write(html); w.document.close(); setTimeout(()=>{ try{ w.focus(); w.print(); }catch(e){} },600); }
  async function budgetImg(){ if(A.view==='3d'){ try{ return K.S3.snapshot(); }catch(e){} } return null; }
  async function printBudget(){ printHtml(budgetHtml(await budgetImg())); }
  async function shareBudget(){ const name='Presupuesto '+(A.state.meta.name||'cocina')+'.html'; try{ const ok=K.share && await K.share({filename:name, data:budgetHtml(await budgetImg()), title:name}); if(!ok) saveFile(name, budgetHtml(await budgetImg())); }catch(e){ if(e && e.name!=='AbortError') toast('No se ha podido compartir'); } }
  A.printBudget=printBudget; A.shareBudget=shareBudget;
  async function downloadBudget(){ let img=null; if(A.view==='3d'){ try{ img=K.S3.snapshot(); }catch(e){} } saveFile('Presupuesto '+(A.state.meta.name||'cocina')+'.html', budgetHtml(img)); }
  function csv(rows){ return rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(';')).join('\n'); }
  function downloadCsv(){ const b=K.budget(A.state); saveFile('Presupuesto '+(A.state.meta.name||'cocina')+'.csv', '﻿'+csv([['Partida','Concepto','Cantidad','Unidad','Precio','Importe'],...b.lines.map(l=>[l.sec,l.desc,String(l.qty).replace('.',','),l.unit,String(l.price).replace('.',','),String(l.total).replace('.',',')]),['','Base imponible','','','',String(K.round(b.base,0.01)).replace('.',',')],['','IVA','','','',String(K.round(b.iva,0.01)).replace('.',',')],['','Total','','','',String(K.round(b.total,0.01)).replace('.',',')]])); }
  function downloadCut(){ const rows=K.cutList(A.state); saveFile('Despiece '+(A.state.meta.name||'cocina')+'.csv', '﻿'+csv([['Mueble','Tipo','Pieza','Largo mm','Ancho mm','Unidades','Material','Canto'],...rows.map(r=>[r.ref,r.mod,r.pieza,r.largo,r.ancho,r.n,r.mat,r.canto])])); }
  function clientSheet(){
    const st=A.state; const prev=A.view; if(prev!=='3d') A.setView('3d');
    setTimeout(()=>{ let img=''; try{ img=K.S3.snapshot(); }catch(e){} const b=K.budget(st); const F=st.finish;
      modal(`<div class="sheet-cl"><div class="cl-h"><div><small>Propuesta de cocina a medida</small><h2>${esc(st.meta.name)}</h2><p>${esc(st.meta.client.nombre||'Cliente')} · ${esc(st.meta.fecha)}</p></div><div class="cl-tot"><small>Total con IVA</small><b>${eur(b.total)}</b></div></div>
      ${img?`<img src="${img}" alt="Vista 3D de la cocina">`:''}
      <div class="cl-grid"><div><h4>Muebles</h4><p>${(K.FRONT_MATS.find(x=>x.k===F.zones.bajos.mat)||{}).n} · ${(K.DOOR_MODELS.find(x=>x.k===F.zones.bajos.model)||{}).n}${F.zones.altos.mat!==F.zones.bajos.mat?` · altos en ${(K.FRONT_MATS.find(x=>x.k===F.zones.altos.mat)||{}).n}`:''}</p></div><div><h4>Encimera</h4><p>${(K.TOP_MATS.find(t=>t.k===F.top.mat)||{}).n} · ${F.top.thick} cm</p></div><div><h4>Tirador</h4><p>${(K.HANDLES.find(h=>h.k===F.handle.k)||{}).n}</p></div><div><h4>Electrodomésticos</h4><p>${(K.APPL_COLORS.find(a=>a.k===F.applColor)||{}).n}</p></div></div>
      <div class="btns">${K.PWA?'<button class="btn primary" data-act="prM">Imprimir o PDF</button><button class="btn" data-act="shM">Compartir</button>':''}<button class="btn ${K.PWA?'':'primary'}" data-act="dlBudgetM">Descargar presupuesto</button><button class="btn ghost" data-act="dlImg">Descargar imagen</button></div></div>`, (e)=>{ const a=e.target.closest('[data-act]'); if(!a) return; if(a.dataset.act==='prM') printHtml(budgetHtml(img)); if(a.dataset.act==='shM') shareBudget(); if(a.dataset.act==='dlBudgetM') saveFile('Presupuesto '+(st.meta.name||'cocina')+'.html', budgetHtml(img)); if(a.dataset.act==='dlImg') K.S3.snapshotBlob().then(bl=>saveFile((st.meta.name||'cocina')+'.png', bl)); });
    },300);
  }
  A.clientSheet=clientSheet;

  /* ---------- Modal ---------- */
  function modal(html, onClick){ const m=$('#modal'); $('#modalBody').innerHTML=html; m.hidden=false; $('#modalBody').onclick=onClick||null; }
  function confirmBox(msg, ok){ modal(`<h3>${esc(msg)}</h3><div class="btns"><button class="btn primary" data-act="ok">Sí, continuar</button><button class="btn ghost" data-act="no">Cancelar</button></div>`, (e)=>{ const a=e.target.closest('[data-act]'); if(!a) return; $('#modal').hidden=true; if(a.dataset.act==='ok') ok(); }); }
  A.modal=modal; A.confirm=confirmBox;

  /* ---------- Proyectos ---------- */
  function saveProject(variant){
    const st=A.state; const list=LS.get('pc_projects',[]); const b=K.budget(st);
    let name=st.meta.name||'Cocina'; if(variant){ const n=list.filter(p=>p.name.startsWith(name)).length+1; name = name+' · variante '+n; }
    const entry={name, client:st.meta.client.nombre, date:new Date().toLocaleDateString('es-ES'), n:st.modules.length, total:b.total, state:K.clone(Object.assign({},st,{meta:Object.assign({},st.meta,{name})}))};
    const idx = variant? -1 : list.findIndex(p=>p.name===name);
    if(idx>=0) list[idx]=entry; else list.unshift(entry);
    if(LS.set('pc_projects',list)) toast(variant?'Variante guardada':'Proyecto guardado'); else toast('No se ha podido guardar en este dispositivo: exporta el archivo');
    renderPanel();
  }
  function migrate(s){ const d=K.newState(); s.conf=Object.assign(d.conf,s.conf||{}); s.finish=Object.assign(d.finish,s.finish||{}); s.finish.zones=Object.assign(d.finish.zones,s.finish.zones||{}); s.prices=Object.assign(d.prices,s.prices||{}); s.meta=Object.assign(d.meta,s.meta||{}); s.openings=s.openings||[]; s.obstacles=s.obstacles||[]; s.modules=(s.modules||[]).filter(m=>C()[m.kind]); s.modules.forEach(m=>m.o=m.o||{}); return s; }
  A.migrate=migrate;

  /* ---------- Ejemplo inicial ---------- */
  function sample(){
    const st=K.newState(); st.meta.name='Cocina de ejemplo'; st.room={W:360,D:300,H:255,floor:'porc_gris',wallColor:'#EFEDE8',ceilColor:'#F7F6F3'};
    st.openings.push({id:K.uid('o'),type:'ventana',wall:0,pos:120,width:110,height:115,sill:105});
    st.openings.push({id:K.uid('o'),type:'puerta',wall:2,pos:230,width:82,height:203,sill:0});
    st.openings.push({id:K.uid('o'),type:'agua',wall:0,pos:170,width:8,height:8,sill:50});
    st.openings.push({id:K.uid('o'),type:'humos',wall:1,pos:150,width:15,height:15,sill:225});
    st.finish.zones.bajos={mat:'salvia',model:'enmarcada_fina',gloss:'mate',type:'lacado'}; st.finish.zones.altos={mat:'blanco_roto',model:'enmarcada_fina',gloss:'mate',type:'lacado'}; st.finish.zones.columnas={mat:'salvia',model:'enmarcada_fina',gloss:'mate',type:'lacado'};
    st.finish.top={mat:'cuarzo_veta',thick:2,edge:'recto'}; st.finish.handle={k:'barra160',color:'laton',orient:'auto'}; st.finish.splash={k:'zellige'};
    const g=K.generate(st,{type:'L', hood:'pir', frigo:'integrado', horno:'columna', micro:'columna', lv:60, altos:true});
    st.modules=g.modules; return st;
  }

  /* ---------- Inicio ---------- */
  A.start = function(){
    const saved=LS.get('pc_current',null);
    A.state = saved && saved.room ? migrate(saved) : sample(); A._last=K.clone(A.state);
    K.S3.init($('#v3d'));
    // barra superior
    $('#viewSeg').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.v==='walk'){ A.setView('3d'); setTimeout(()=>{ K.S3.walk(true); $('#walkPad').hidden=false; },60); return; } A.setView(b.dataset.v); };
    $('#wallSeg').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; A.elevWall=+b.dataset.w; $$('#wallSeg button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); draw2d(); };
    $('#cam3d').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.cam) K.S3.view(b.dataset.cam); if(b.dataset.t==='open'){ const on=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',String(on)); K.S3.setOpen(on); } if(b.dataset.t==='walls'){ const on=b.getAttribute('aria-pressed')!=='true'; b.setAttribute('aria-pressed',String(on)); K.S3.allWalls=on; } };
    $('#walkPad').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; const a=b.dataset.w; if(a==='exit'){ $('#walkPad').hidden=true; K.S3.walk(false); return; } const mv={f:[1,0,0],b:[-1,0,0],l:[0,-1,0],r:[0,1,0],tl:[0,0,1],tr:[0,0,-1]}[a]; for(let i=0;i<4;i++) setTimeout(()=>K.S3.walkMove(...mv), i*30); };
    $('#undo').onclick=A.undo; $('#redo').onclick=A.redo;
    $('#projName').onchange=(e)=>{ A.state.meta.name=e.target.value||'Cocina'; A.commit('nombre'); };
    $('#present').onclick=()=>{ document.body.classList.toggle('present'); const on=document.body.classList.contains('present'); if(A.view!=='3d') A.setView('3d'); K.S3.setAutoRotate(on); setTimeout(()=>K.S3.resize(),50); };
    $('#exitPresent').onclick=()=>{ document.body.classList.remove('present'); K.S3.setAutoRotate(false); setTimeout(()=>K.S3.resize(),50); };
    $('#photo').onclick=()=>clientSheet();
    $('#priceChip').onclick=()=>A.openPanel('presupuesto');
    $('#rail').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; if(A.panel===b.dataset.p && !$('#panel').hidden && window.innerWidth<900){ $('#panel').hidden=true; document.body.classList.remove('panel-open'); return; } A.openPanel(b.dataset.p); };
    $('#panelClose').onclick=()=>{ $('#panel').hidden=true; document.body.classList.remove('panel-open'); setTimeout(()=>{K.S3.resize(); if(A.view!=='3d') { K.D2.resetPlan(); draw2d(); }},50); };
    $('#modalClose').onclick=()=>$('#modal').hidden=true; $('#modal').onclick=(e)=>{ if(e.target.id==='modal') $('#modal').hidden=true; };
    $('#zoom2d').onclick=(e)=>{ const b=e.target.closest('button'); if(!b) return; const V=K.D2.planView; if(b.dataset.z==='fit'){ K.D2.resetPlan(); } else { const f=b.dataset.z==='in'?1.25:0.8; const cv=$('#v2d'); const cx=cv.width/2, cy=cv.height/2; V.ox=cx-(cx-V.ox)*f; V.oy=cy-(cy-V.oy)*f; V.s*=f; V.fit=false; } draw2d(); };
    bind2d();
    document.addEventListener('keydown',(e)=>{ if(e.target.matches('input,textarea,select')) return; if((e.ctrlKey||e.metaKey)&&e.key==='z'){ e.preventDefault(); e.shiftKey?A.redo():A.undo(); } if((e.key==='Delete'||e.key==='Backspace') && A.selId){ A.state.modules=A.state.modules.filter(x=>x.id!==A.selId); A.selId=null; A.commit('eliminar'); } if(e.key==='Escape'){ A.selId=null; A.selOpen=null; A.render(); $('#modal').hidden=true; } if(e.key==='r' && A.selId){ const m=A.state.modules.find(x=>x.id===A.selId); m.rot=K.normRot(m.rot+90); A.commit('girar'); } });
    window.addEventListener('resize',()=>{ if(A.view!=='3d'){ K.D2.resetPlan(); draw2d(); } });
    A.setView('3d'); A.openPanel(window.innerWidth<900? 'estancia':'estancia'); if(window.innerWidth<900){ $('#panel').hidden=true; document.body.classList.remove('panel-open'); }
    A.render({panel:true}); setTimeout(()=>K.S3.view('persp'),50);
    if(K.platformInit) K.platformInit();
    if(K.AS) K.AS.init();
  };

  /* ---------- Interacción 2D (planta y alzado) ---------- */
  function bind2d(){
    const cv=$('#v2d'); let drag=null; const pts=new Map(); let pinch=null;
    const loc=(e)=>{ const r=cv.getBoundingClientRect(); const dpr=cv.width/r.width; return {x:(e.clientX-r.left)*dpr, y:(e.clientY-r.top)*dpr, dpr}; };
    const hitPlan=(p)=>{ const w=K.D2.toWorld(p.x,p.y); const st=A.state; const order={alto:0,campana:0,deco:2}; const cand=st.modules.filter(m=>{ const a=K.axes(m.rot); const dx=w.x-m.x, dz=w.z-m.z; const lx=dx*a.ux+dz*a.uz, lz=dx*a.fx+dz*a.fz; return Math.abs(lx)<=m.w/2 && Math.abs(lz)<=m.d/2; }); cand.sort((a,b)=>(order[K.cat(a)]??1)-(order[K.cat(b)]??1)); if(cand.length){ const cur=cand.findIndex(c=>c.id===A.selId); return {m: cur>=0 && drag && drag.cycle? cand[(cur+1)%cand.length] : (cur>=0? cand[cur] : cand[0])}; }
      // huecos
      const o=st.openings.find(o=>{ const t=K.OPENINGS.find(x=>x.k===o.type)||{}; const a=K.wallPoint(st.room,o.wall,o.pos,-14), b=K.wallPoint(st.room,o.wall,o.pos+o.width,t.kind==='hueco'?14:20); return w.x>=Math.min(a.x,b.x)-4 && w.x<=Math.max(a.x,b.x)+4 && w.z>=Math.min(a.z,b.z)-4 && w.z<=Math.max(a.z,b.z)+4; }); return o? {o} : null; };
    cv.addEventListener('pointerdown',(e)=>{ cv.setPointerCapture(e.pointerId); const p=loc(e); pts.set(e.pointerId,p);
      if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y), s:K.D2.planView.s, ox:K.D2.planView.ox, oy:K.D2.planView.oy, cx:(a.x+b.x)/2, cy:(a.y+b.y)/2}; drag=null; return; }
      if(A.view==='elev'){ const st=A.state; const w=K.D2.elevToWall(cv,st,A.elevWall,p.x,p.y,p.dpr); const hit=st.modules.filter(m=>{ const wo=K.wallOf(m,st.room); return wo&&wo.wall===A.elevWall&&w.pos>=wo.pos&&w.pos<=wo.pos+m.w&&w.y>=m.y&&w.y<=m.y+m.h; }).pop(); if(hit){ drag={id:hit.id, elev:true, start:w, pos0:K.wallOf(hit,st.room).pos, y0:hit.y, moved:false}; A.select(hit.id); } else { A.select(null); } return; }
      const hit=hitPlan(p);
      if(hit && hit.m){ const m=hit.m; const w=K.D2.toWorld(p.x,p.y); if(m.id!==A.selId) A.select(m.id); drag={id:m.id, dx:m.x-w.x, dz:m.z-w.z, moved:false, p0:p}; }
      else if(hit && hit.o){ A.selectOpening(hit.o.id); drag={open:hit.o.id, p0:p, pos0:hit.o.pos, moved:false}; if(A.panel==='estancia') renderPanel(); }
      else { drag={pan:true, p0:p, ox:K.D2.planView.ox, oy:K.D2.planView.oy, moved:false}; }
    });
    cv.addEventListener('pointermove',(e)=>{ if(!pts.has(e.pointerId)) return; const p=loc(e); pts.set(e.pointerId,p); const V=K.D2.planView;
      if(pinch && pts.size===2){ const [a,b]=[...pts.values()]; const f=Math.hypot(a.x-b.x,a.y-b.y)/pinch.d; V.s=pinch.s*f; V.ox=pinch.cx-(pinch.cx-pinch.ox)*f; V.oy=pinch.cy-(pinch.cy-pinch.oy)*f; V.fit=false; draw2d(); return; }
      if(!drag) return; const st=A.state;
      if(drag.elev){ const w=K.D2.elevToWall(cv,st,A.elevWall,p.x,p.y,p.dpr); const m=st.modules.find(x=>x.id===drag.id); const L=K.wallLen(st.room,A.elevWall); let pos=drag.pos0+(w.pos-drag.start.pos); pos=Math.max(0,Math.min(L-m.w,pos)); K.placeOnWall(m,st.room,A.elevWall,K.round(pos,0.5)); if(K.cat(m)==='alto'||K.cat(m)==='campana'){ m.y=K.round(Math.max(0,drag.y0+(w.y-drag.start.y)),0.5); } drag.moved=true; draw2d(); return; }
      if(drag.pan){ V.ox=drag.ox+(p.x-drag.p0.x); V.oy=drag.oy+(p.y-drag.p0.y); V.fit=false; draw2d(); return; }
      if(Math.hypot(p.x-drag.p0.x,p.y-drag.p0.y)<6*(p.dpr||1) && !drag.moved) return; drag.moved=true;
      if(drag.open){ const o=st.openings.find(x=>x.id===drag.open); const w=K.D2.toWorld(p.x,p.y); const L=K.wallLen(st.room,o.wall); let pos = o.wall===0? w.x : o.wall===1? w.z : o.wall===2? st.room.W-w.x : st.room.D-w.z; o.pos=K.round(Math.max(0,Math.min(L-o.width,pos-o.width/2)),1); draw2d(); return; }
      const m=st.modules.find(x=>x.id===drag.id); const w=K.D2.toWorld(p.x,p.y); m.x=w.x+drag.dx; m.z=w.z+drag.dz; K.snapModule(m,st); A.liveInfo(m); draw2d();
    });
    const up=(e)=>{ pts.delete(e.pointerId); if(pts.size<2) pinch=null; if(!drag) return; if(drag.moved && !drag.pan) A.commit('mover'); else if(drag.pan && !drag.moved){} drag=null; };
    cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
    cv.addEventListener('wheel',(e)=>{ if(A.view!=='plan') return; e.preventDefault(); const p=loc(e); const V=K.D2.planView; const f=e.deltaY<0?1.1:0.9; V.ox=p.x-(p.x-V.ox)*f; V.oy=p.y-(p.y-V.oy)*f; V.s*=f; V.fit=false; draw2d(); },{passive:false});
    cv.addEventListener('dblclick',(e)=>{ if(A.view!=='plan') return; const p=loc(e); const h=hitPlan(p); if(h&&h.m){ const m=h.m; m.rot=K.normRot(m.rot+90); A.commit('girar'); } });
  }
})();
