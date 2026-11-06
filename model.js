/* Modelo: estado, geometría en planta, distribución automática, validaciones, presupuesto y despiece. */
(function(){
  const C = ()=>K.CATALOG;
  let _id = Date.now()%100000;
  K.uid = (p)=> (p||'m') + (++_id).toString(36);
  K.clone = (o)=>JSON.parse(JSON.stringify(o));
  K.round = (v,s)=>Math.round(v/(s||0.1))*(s||0.1);

  K.newState = function(){
    return {
      v: 2,
      meta: { name: 'Cocina nueva', client: {nombre:'', tel:'', email:'', direccion:'', notas:''}, fecha: new Date().toISOString().slice(0,10), comercial:'' },
      room: { W: 340, D: 280, H: 250, floor: 'roble_natural', wallColor: '#EFEDE8', ceilColor:'#F7F6F3' },
      openings: [],
      obstacles: [],
      modules: [],
      conf: K.clone(K.CONF_DEFAULT),
      finish: {
        zones: {
          bajos:   {mat:'blanco_polar', model:'lisa', gloss:'mate', type:'laminado'},
          altos:   {mat:'blanco_polar', model:'lisa', gloss:'mate', type:'laminado'},
          columnas:{mat:'blanco_polar', model:'lisa', gloss:'mate', type:'laminado'},
          isla:    {mat:'roble_natural', model:'lisa', gloss:'poro', type:'chapa'}
        },
        casco: 'blanco',
        handle: {k:'barra160', color:'negro', orient:'auto'},
        top: {mat:'cuarzo_blanco', thick:2, edge:'recto'},
        topIsla: null,
        splash: {k:'encimera'},
        plinth: {mat:'igual'},
        applColor: 'inox',
        applGama: 'media',
        led: true, ledPlinth: false, ledVitrina: true,
        light: 'dia', lightTemp: 'calida'
      },
      prices: K.clone(K.PRICES_DEFAULT)
    };
  };

  /* ---------- Paredes ---------- */
  K.WALL_NAMES = ['A','B','C','D'];
  K.wallLen = (room,w)=> (w%2===0? room.W : room.D);
  K.WALL_ROT = [0,270,180,90];
  // posición a lo largo de la pared (desde la esquina izquierda mirando la pared desde dentro) → punto en planta, a una distancia "off" de la pared
  K.wallPoint = function(room, w, pos, off){
    off = off||0;
    switch(w){
      case 0: return {x: pos, z: off};
      case 1: return {x: room.W-off, z: pos};
      case 2: return {x: room.W-pos, z: room.D-off};
      case 3: return {x: off, z: room.D-pos};
    }
  };
  K.normRot = (r)=> ((Math.round(r)%360)+360)%360;
  K.axes = function(rot){ const t=rot*Math.PI/180; return {ux:Math.cos(t), uz:-Math.sin(t), fx:Math.sin(t), fz:Math.cos(t)}; };
  /* Esquinas en planta (back-left, back-right, front-right, front-left) */
  K.corners = function(m){
    const a=K.axes(m.rot), hw=m.w/2, hd=m.d/2;
    const P=(sx,sz)=>({x:m.x + a.ux*sx + a.fx*sz, z:m.z + a.uz*sx + a.fz*sz});
    return [P(-hw,-hd),P(hw,-hd),P(hw,hd),P(-hw,hd)];
  };
  K.aabb = function(m){ const c=K.corners(m); const xs=c.map(p=>p.x), zs=c.map(p=>p.z); return {x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)}; };
  K.placeOnWall = function(m, room, w, pos, gapBack){
    const p = K.wallPoint(room, w, pos + m.w/2, (gapBack||0) + m.d/2);
    m.x=p.x; m.z=p.z; m.rot=K.WALL_ROT[w]; return m;
  };
  K.wallOf = function(m, room){
    const r=K.normRot(m.rot);
    for(let w=0;w<4;w++){
      if(r!==K.WALL_ROT[w]) continue;
      const a=K.axes(r);
      const bx=m.x - a.fx*m.d/2, bz=m.z - a.fz*m.d/2; // centro de la cara trasera
      let dist, pos;
      if(w===0){ dist=bz; pos=bx; } else if(w===1){ dist=room.W-bx; pos=bz; } else if(w===2){ dist=room.D-bz; pos=room.W-bx; } else { dist=bx; pos=room.D-bz; }
      if(dist < 6) return {wall:w, pos: pos - m.w/2, dist};
    }
    return null;
  };

  /* ---------- Módulos ---------- */
  K.topH = (st)=> st.conf.plinthH + st.conf.baseH + (st.finish.top.thick||2);
  K.newModule = function(kind, st, extra){
    const c = C()[kind]; if(!c) throw new Error('Tipo de módulo desconocido: '+kind);
    const cf = st.conf; const m = {id:K.uid(), kind, w:c.w, d:0, h:0, y:0, x:0, z:0, rot:0, o:{}};
    switch(c.cat){
      case 'bajo': m.h=c.h||cf.baseH; m.d=c.d||cf.baseD; m.y=cf.plinthH; break;
      case 'alto': m.h=c.h||cf.wallH; m.d=c.d||cf.wallD; m.y= c.shelf? cf.wallBottom+20 : (c.h && c.h<cf.wallH ? cf.wallBottom+cf.wallH-c.h : cf.wallBottom); break;
      case 'columna': m.h=c.h||cf.tallH; m.d=c.d||cf.tallD; m.y=cf.plinthH; break;
      case 'electro': m.h=c.h; m.d=c.d; m.y= c.onTop? K.topH(st) : 0; break;
      case 'campana': m.h=c.h; m.d=c.d; m.y= c.hood==='techo'? st.room.H-c.h : K.topH(st)+65; break;
      case 'panel':
        m.d=c.d; m.h=c.h||0;
        if(c.panel==='costado'){ m.h=cf.plinthH+cf.baseH+(st.finish.top.thick||2); m.y=0; m.o.alto='bajo'; }
        if(c.panel==='regleta'){ m.h=cf.baseH; m.y=cf.plinthH; m.o.alto='bajo'; }
        if(c.panel==='barra'){ m.h=c.h; m.y=K.topH(st)-c.h; m.o.patas=true; }
        if(c.panel==='estanteria'){ m.y=cf.wallBottom; }
        if(c.panel==='trasero'){ m.h=cf.plinthH+cf.baseH; m.y=0; }
        break;
      case 'deco': m.h=c.h; m.d=c.d; m.y = c.deco==='lampara'? st.room.H-c.h-70 : 0; break;
    }
    if(c.sink) m.o.sink='s1'; if(c.sink) m.o.tap='alto';
    if(c.hob) m.o.hob = (c.w>=80? 'ind80':'ind60');
    if(kind==='BHORNO90') m.o.hob='ind90';
    if(extra) Object.assign(m, extra);
    return m;
  };
  K.cat = (m)=> (C()[m.kind]||{}).cat;
  K.zoneOf = function(m, st){
    const c=C()[m.kind]; if(!c) return 'bajos';
    if(c.cat==='alto') return 'altos';
    if(c.cat==='columna') return 'columnas';
    if(c.cat==='bajo' && !K.wallOf(m, st.room)) return 'isla';
    if(c.cat==='panel' && m.o.zona) return m.o.zona;
    return 'bajos';
  };
  K.modLabel = function(m){
    const c=C()[m.kind]; if(!c) return m.kind;
    const pre={bajo:'B',alto:'A',columna:'C',electro:'E',campana:'H',panel:'P',deco:'D'}[c.cat]||'';
    return pre+Math.round(m.w);
  };

  /* ---------- Segmentos libres por pared ---------- */
  function blocks(st, w, level){ // level: 'base' | 'alto'
    const tH = K.topH(st), cf=st.conf; const out=[];
    st.openings.forEach(o=>{
      if(o.wall!==w) return; const t=K.OPENINGS.find(x=>x.k===o.type)||{};
      if(t.kind==='punto') return;
      const isDoor = ['puerta','puerta_doble','corredera','paso','balconera'].includes(o.type);
      const m = isDoor? 5 : 2;
      if(level==='base'){
        if(isDoor || o.sill < tH-2 && t.kind==='hueco') out.push([o.pos-m, o.pos+o.width+m]);
        if(o.type==='radiador') out.push([o.pos-2,o.pos+o.width+2]);
      } else {
        const top=o.sill+o.height, bot=o.sill;
        if(isDoor) out.push([o.pos-m,o.pos+o.width+m]);
        else if(t.kind==='hueco' && top>cf.wallBottom && bot<cf.wallBottom+cf.wallH) out.push([o.pos-m,o.pos+o.width+m]);
        if(o.type==='caldera') out.push([o.pos-2,o.pos+o.width+2]);
      }
    });
    // puertas en la pared contigua junto a la esquina
    const L=K.wallLen(st.room,w), dep=(level==='base'? st.conf.baseD : st.conf.wallD)+4;
    st.openings.forEach(o=>{ if(!['puerta','puerta_doble','corredera','paso','balconera'].includes(o.type)) return;
      if(o.wall===(w+1)%4 && o.pos < dep) out.push([L-dep,L]);
      const Lp=K.wallLen(st.room,(w+3)%4); if(o.wall===(w+3)%4 && o.pos+o.width > Lp-dep) out.push([0,dep]); });
    return out;
  }
  K.freeSegments = function(st, w, level){
    const L=K.wallLen(st.room,w); let segs=[[0,L]];
    blocks(st,w,level).forEach(([a,b])=>{ const n=[]; segs.forEach(([s,e])=>{ if(b<=s||a>=e){ n.push([s,e]); return; } if(a>s) n.push([s,a]); if(b<e) n.push([b,e]); }); segs=n; });
    return segs.filter(([a,b])=>b-a>=20);
  };

  /* ---------- Distribución automática ---------- */
  function splitFill(len){ // reparte un hueco en módulos a medida
    if(len<1) return [];
    if(len<15) return [{kind:'PREG', w:len}];
    if(len<32) return [{kind:'BBOT', w:len}];
    const n=Math.max(1, Math.ceil(len/95)); const w=K.round(len/n,0.5); const out=[];
    for(let i=0;i<n;i++) out.push({kind:'?', w: i===n-1? K.round(len-w*(n-1),0.1) : w});
    return out;
  }
  // Construye un tramo de muebles bajos sobre una pared.
  function buildRun(st, run, wants){
    const cf=st.conf, fixed=[]; const {a,b}=run; let lo=a, hi=b;
    const put=(kind,pos,w,o)=>{ fixed.push({kind,pos,w,o:o||{}}); };
    // rincón
    if(run.cornerEnd){ put('BRINC', hi-100, 100, {ciegoDer:true}); hi-=100; }
    if(run.cornerStart && run.ownStart){ put('BRINC', lo, 100, {ciegoDer:false}); lo+=100; }
    // columnas
    const cols=(wants.cols||[]);
    if(cols.length){
      if(wants.colSide==='start'){ cols.forEach(k=>{ put(k,lo,60); lo+=60; }); }
      else { cols.forEach(k=>{ hi-=60; put(k,hi,60); }); }
    }
    if(hi-lo<40) return fixed;
    let sinkSpan=null;
    if(wants.sink){
      const sw = (hi-lo)>=200? 80 : 60;
      let c = wants.sinkAt!=null? wants.sinkAt : lo+(hi-lo)*0.38;
      let p = Math.max(lo, Math.min(hi-sw, c-sw/2));
      put('BFREG', p, sw, {sink: sw>=80?'s1e':'s1'}); sinkSpan=[p,p+sw];
      if(wants.lv){ const lw=wants.lv; const right = (hi-(p+sw)) >= (p-lo); if(right && hi-(p+sw)>=lw){ put('BLV',p+sw,lw); sinkSpan[1]+=lw; } else if(p-lo>=lw){ put('BLV',p-lw,lw); sinkSpan[0]-=lw; } }
      if(wants.lav){ const right = (hi-sinkSpan[1]) >= (sinkSpan[0]-lo); if(right && hi-sinkSpan[1]>=60){ put('BLAV',sinkSpan[1],60); sinkSpan[1]+=60;} else if(sinkSpan[0]-lo>=60){ put('BLAV',sinkSpan[0]-60,60); sinkSpan[0]-=60; } }
    }
    if(wants.hob){
      const occ = fixed.map(f=>[f.pos,f.pos+f.w]).sort((x,y)=>x[0]-y[0]);
      let free=[]; let cur=lo; occ.forEach(([s,e])=>{ if(e<=lo||s>=hi) return; if(s>cur) free.push([cur,s]); cur=Math.max(cur,e); }); if(hi>cur) free.push([cur,hi]);
      let best=null, bestScore=-1e9, bestW=80;
      (wants.hornoBajo? [60] : [80,60]).forEach(hw=>{
        free.forEach(([s,e])=>{
          const room=e-s; if(room<hw) return;
          let p = s+(room-hw)/2;
          if(sinkSpan){ if(s>=sinkSpan[1]) p=Math.max(p, sinkSpan[1]+60); if(e<=sinkSpan[0]) p=Math.min(p, sinkSpan[0]-60-hw); }
          p=Math.max(s,Math.min(e-hw,p));
          let score = room + (hw===80? 40:0);
          if(sinkSpan){ const dist = p>=sinkSpan[1]? p-sinkSpan[1] : sinkSpan[0]-(p+hw); if(dist<40) score-=500; }
          if(score>bestScore){ bestScore=score; best=p; bestW=hw; }
        });
      });
      if(best!=null){ const hk = wants.hornoBajo? 'BHORNO' : 'BPLACA'; put(hk, K.round(best,0.5), bestW, {hob: bestW>=80?'ind80':'ind60'}); run.hobSpan=[best,best+bestW]; }
    }
    // relleno
    const occ = fixed.map(f=>[f.pos,f.pos+f.w]).sort((x,y)=>x[0]-y[0]);
    let cur=a; const gaps=[]; occ.forEach(([s,e])=>{ if(s>cur+0.5) gaps.push([cur,s]); cur=Math.max(cur,e); }); if(b>cur+0.5) gaps.push([cur,b]);
    gaps.forEach(([s,e])=>{ let p=s; splitFill(e-s).forEach(f=>{ let k=f.kind; if(k==='?'){ const nearHob = run.hobSpan && Math.abs((p+f.w/2)-(run.hobSpan[0]+40))<140; k = nearHob? 'BCAJ3' : (f.w>=70? 'B2P':'BCAJ2'); } put(k,p,f.w); p+=f.w; }); });
    return fixed;
  }
  function altosFor(st, wall, baseFixed, hood){
    const out=[]; const segs=K.freeSegments(st,wall,'alto');
    const inSeg=(s,e)=>segs.some(([a,b])=>s>=a-0.5&&e<=b+0.5);
    baseFixed.forEach(f=>{
      const c=C()[f.kind]; if(!c || c.cat!=='bajo') { if(c && c.cat==='panel' && f.kind==='PREG'){} return; }
      if(f.kind==='BHUECO') return;
      const s=f.pos, e=f.pos+f.w;
      if(c.hob){ // campana
        if(hood==='int') out.push({kind:'ACAMP', pos:s, w:f.w, y: st.conf.wallBottom+st.conf.wallH-36});
        else if(hood && hood!=='none' && hood!=='ext'){ out.push({kind:{pir:'HPIR',rec:'HREC',inc:'HINC'}[hood]||'HPIR', pos:s+(f.w-Math.max(60,Math.min(90,f.w)))/2, w:Math.max(60,Math.min(90,f.w)), hood:true}); }
        return;
      }
      if(!inSeg(s,e)) return;
      let k='A1P'; if(f.w>=70) k='A2P'; if(f.kind==='BFREG') k= f.w>=70?'AESC':'A1P'; if(f.kind==='BRINC') k='A1P';
      if(f.w<25) k='AABI';
      out.push({kind:k,pos:s,w:f.w});
    });
    return out;
  }
  function hasWindowOn(st,w){ return st.openings.find(o=>o.wall===w && (o.type==='ventana'||o.type==='ventana_alta')); }
  function waterOn(st,w){ return st.openings.find(o=>o.wall===w && (o.type==='agua'||o.type==='desague')); }
  function mainWall(st){
    const water=st.openings.find(o=>o.type==='agua'||o.type==='desague'); if(water) return water.wall;
    let best=0, bl=-1; for(let w=0;w<4;w++){ const segs=K.freeSegments(st,w,'base'); const l=Math.max(0,...segs.map(s=>s[1]-s[0])); if(l>bl){bl=l;best=w;} } return best;
  }
  function longestSeg(st,w){ const segs=K.freeSegments(st,w,'base'); let b=null; segs.forEach(s=>{ if(!b||s[1]-s[0]>b[1]-b[0]) b=s; }); return b; }
  function segTouching(st,w,end){ // segmento libre que toca el extremo 'start' (0) o 'end' (L)
    const L=K.wallLen(st.room,w); const segs=K.freeSegments(st,w,'base');
    return segs.find(s=> end==='start'? s[0]<1 : s[1]>L-1);
  }

  K.LAYOUTS = [
    {k:'lineal', n:'Lineal'},
    {k:'L', n:'En L'},
    {k:'U', n:'En U'},
    {k:'paralela', n:'Paralela'},
    {k:'peninsula', n:'Con península'},
    {k:'isla', n:'Con isla'}
  ];

  K.generate = function(st, opt){
    opt = Object.assign({type:'L', main:null, frigo:'integrado', horno:'columna', micro:'columna', lv:60, lav:false, altos:true, despensa:false, hood:'pir', colSide:'end', flip:false}, opt||{});
    const room=st.room, cf=st.conf; const W = opt.main!=null? opt.main : mainWall(st);
    const res=[]; const runs=[];
    const cols=[]; if(opt.frigo==='integrado') cols.push('CFRIGO');
    if(opt.horno==='columna') cols.push(opt.micro==='columna'?'CHM':'CHC');
    if(opt.despensa) cols.push('CDESP');
    const wants={sink:true, lv:opt.lv, lav:opt.lav, cols, colSide:opt.colSide, hob:true, hornoBajo: opt.horno==='bajo'};
    const win=hasWindowOn(st,W), wat=waterOn(st,W);
    if(win) wants.sinkAt = win.pos+win.width/2; else if(wat) wants.sinkAt = wat.pos;
    const corner=cf.baseD+2;
    const Lw=K.wallLen(room,W);
    const sideR=(W+1)%4, sideL=(W+3)%4, opp=(W+2)%4;
    const mainSeg=longestSeg(st,W); if(!mainSeg) return {modules:[], note:'No hay pared libre suficiente'};
    const addRun=(wall,a,b,w,flags)=>{ const run=Object.assign({wall,a,b},flags||{}); const f=buildRun(st,run,w); runs.push({run,fixed:f}); return run; };
    let t=opt.type;
    const sideFree=(sw,startAtCorner)=>{ const seg = startAtCorner? segTouching(st,sw,'start') : segTouching(st,sw,'end'); return seg; };
    if(t==='lineal' || t==='isla' || t==='peninsula'){
      const hobElsewhere = t==='isla' && opt.islaHob;
      addRun(W, mainSeg[0], mainSeg[1], Object.assign({}, wants, {hob: !hobElsewhere}));
    }
    if(t==='L' || t==='U'){
      const useRight = !opt.flip;
      const sw = useRight? sideR : sideL;
      const mainEndsAtCorner = useRight? mainSeg[1]>Lw-1 : mainSeg[0]<1;
      const sseg = useRight? segTouching(st,sw,'start') : segTouching(st,sw,'end');
      if(mainEndsAtCorner && sseg){
        const mw=Object.assign({}, wants, {hob:false, cols: t==='U'? [] : []});
        // principal: fregadero; lateral: placa + columnas
        const r1 = addRun(W, mainSeg[0], mainSeg[1], mw, useRight? {cornerEnd:true}:{cornerStart:true, ownStart:true});
        const Ls=K.wallLen(room,sw);
        const sw2=Object.assign({}, wants, {sink:false, lv:0, lav:false, cols: t==='U'? [] : cols, colSide: useRight? 'end':'start'});
        if(useRight) addRun(sw, Math.max(sseg[0],corner), sseg[1], sw2);
        else addRun(sw, sseg[0], Math.min(sseg[1], Ls-corner), sw2);
        if(t==='U'){
          const ow = useRight? sideL : sideR; const oseg = useRight? segTouching(st,ow,'end') : segTouching(st,ow,'start');
          // la principal también ocupa la otra esquina
          if(oseg){ const Lo=K.wallLen(room,ow); const w3=Object.assign({}, wants, {sink:false, lv:0, lav:false, hob:false, cols, colSide: useRight? 'start':'end'});
            // ajustar r1: rincón en el otro extremo
            if(useRight){ if(mainSeg[0]<1){ runs[0]=null; runs.shift(); const rr={wall:W,a:mainSeg[0],b:mainSeg[1],cornerEnd:true,cornerStart:true,ownStart:true}; runs.unshift({run:rr, fixed:buildRun(st,rr,mw)}); } addRun(ow, oseg[0], Math.min(oseg[1],Lo-corner), w3); }
            else { if(mainSeg[1]>Lw-1){ runs.shift(); const rr={wall:W,a:mainSeg[0],b:mainSeg[1],cornerEnd:true,cornerStart:true,ownStart:true}; runs.unshift({run:rr, fixed:buildRun(st,rr,mw)}); } addRun(ow, Math.max(oseg[0],corner), oseg[1], w3); }
          }
        }
      } else { t='lineal'; addRun(W, mainSeg[0], mainSeg[1], wants); }
    }
    if(t==='paralela'){
      const oseg=longestSeg(st,opp); const depthFree = K.wallLen(room,(W+1)%4) - 2*cf.baseD;
      addRun(W, mainSeg[0], mainSeg[1], Object.assign({}, wants, {hob:false, cols:[]}));
      if(oseg && depthFree>=85) addRun(opp, oseg[0], oseg[1], Object.assign({}, wants, {sink:false, lv:0, lav:false}));
      else return K.generate(st, Object.assign({}, opt, {type:'L'}));
    }
    // si ningún tramo ha podido llevar la placa, se pone en el principal
    if(runs.length && !runs.some(r=>r.run.hobSpan) && !(t==='isla' && opt.islaHob)){ const r0=runs[0]; const w0=Object.assign({}, wants, {hob:true, cols: r0.run.wall===W && t==='lineal'? wants.cols : []}); const rr=Object.assign({}, r0.run); delete rr.hobSpan; r0.run=rr; r0.fixed=buildRun(st, rr, Object.assign(w0,{cols: (r0.fixed||[]).filter(f=>C()[f.kind].cat==='columna').map(f=>f.kind)})); }
    // a módulos
    const mods=[];
    runs.forEach(({run,fixed})=>{
      fixed.forEach(f=>{ const m=K.newModule(f.kind, st); m.w=K.round(f.w,0.1); Object.assign(m.o, f.o||{}); K.placeOnWall(m, room, run.wall, f.pos); mods.push(m); });
      if(opt.altos){ altosFor(st, run.wall, fixed, opt.hood).forEach(f=>{ const m=K.newModule(f.kind, st); m.w=K.round(f.w,0.1); if(f.y!=null) m.y=f.y; K.placeOnWall(m, room, run.wall, f.pos); mods.push(m); }); }
      else { fixed.filter(f=>C()[f.kind].hob).forEach(f=>{ if(opt.hood && opt.hood!=='none' && opt.hood!=='ext'){ const k={pir:'HPIR',rec:'HREC',inc:'HINC',int:'HREC'}[opt.hood]||'HPIR'; const m=K.newModule(k,st); m.w=Math.min(90,f.w); K.placeOnWall(m,room,run.wall,f.pos+(f.w-m.w)/2); mods.push(m);} }); }
    });
    // frigorífico libre / americano
    if(opt.frigo==='libre' || opt.frigo==='americano'){
      const k = opt.frigo==='libre'? 'EFRIGO':'EAMER'; const fr=K.newModule(k,st);
      // buscar hueco al final del tramo principal: se coloca sustituyendo el último relleno si cabe
      const r0=runs[0].run; const lastPos = (opt.colSide==='start')? r0.a : r0.b - fr.w - 1;
      // retirar módulos que solapen
      const span=[lastPos, lastPos+fr.w+1];
      for(let i=mods.length-1;i>=0;i--){ const wo=K.wallOf(mods[i],room); if(wo && wo.wall===r0.wall && wo.pos < span[1] && wo.pos+mods[i].w > span[0]) mods.splice(i,1); }
      K.placeOnWall(fr, room, r0.wall, lastPos);
      mods.push(fr);
      // rellenar el hueco que pueda quedar entre muebles retirados y el frigorífico
    }
    // isla / península
    if(t==='isla'){
      const L = Math.min(240, K.wallLen(room,W) - 200); const depth = cf.baseD;
      if(L>=100){
        const a=K.axes(K.WALL_ROT[W]);
        const off = cf.baseD + 105 + depth/2; // distancia desde la pared
        const center = K.wallPoint(room, W, K.wallLen(room,W)/2, off);
        const rot = K.WALL_ROT[W]+180; // frentes mirando a la pared principal
        const n = Math.max(1, Math.round(L/80)); const w=K.round(L/n,0.5);
        const ax=K.axes(K.normRot(rot));
        for(let i=0;i<n;i++){
          const kind = (opt.islaHob && i===Math.floor(n/2))? 'BPLACA' : (i%2? 'BCAJ3':'BCAJ2');
          const m=K.newModule(kind, st); m.w=w; m.rot=K.normRot(rot); m.o.voladizo=30;
          const sx = -L/2 + w*i + w/2;
          m.x = center.x + ax.ux*sx; m.z = center.z + ax.uz*sx; mods.push(m);
          if(kind==='BPLACA' && opt.hood && opt.hood!=='none' && opt.hood!=='ext'){ const h=K.newModule('HISLA', st); h.w=90; h.x=m.x; h.z=m.z; h.rot=m.rot; mods.push(h); }
        }
        // taburetes en el lado del voladizo
        const back = K.wallPoint(room, W, K.wallLen(room,W)/2, off + depth/2 + 30);
        const ns=Math.max(2,Math.floor(L/60));
        for(let i=0;i<ns;i++){ const s=K.newModule('DTAB',st); const sx=-L/2+L*(i+0.5)/ns; s.x=back.x+ax.ux*sx; s.z=back.z+ax.uz*sx; s.rot=K.normRot(rot+180); mods.push(s); }
      }
    }
    if(t==='peninsula'){
      const r0=runs[0].run; const atEnd = r0.b > K.wallLen(room,r0.wall)-120 ? false : true; // si el tramo llega a la esquina, la península va al otro lado
      const basePos = atEnd? r0.b : r0.a; // punto de arranque sobre la pared
      const Lp = Math.min(180, K.wallLen(room,(r0.wall+1)%4) - cf.baseD - 100);
      if(Lp>=80){
        const n=Math.max(1,Math.round(Lp/80)), w=K.round(Lp/n,0.5);
        const rotP = K.normRot(K.WALL_ROT[r0.wall] + (atEnd? 90: -90)); // frentes hacia el interior
        for(let i=0;i<n;i++){
          const m=K.newModule(i===0?'BCAJ2':'B2P', st); m.w=w; m.rot=rotP; m.o.voladizo=30;
          const p = K.wallPoint(room, r0.wall, basePos + (atEnd? -cf.baseD/2 : cf.baseD/2) , cf.baseD + w*i + w/2);
          m.x=p.x; m.z=p.z; mods.push(m);
        }
        // eliminar altos que choquen? se dejan
      }
    }
    return {modules:mods, wall:W, type:t};
  };

  /* ---------- Validaciones ---------- */
  K.validate = function(st){
    const out=[]; const room=st.room, mods=st.modules; const tH=K.topH(st);
    const W=(lvl,msg,ids)=>out.push({lvl,msg,ids:ids||[]});
    const vbox=(m)=>({y0:m.y, y1:m.y+m.h});
    const solid = mods.filter(m=>!['deco'].includes(K.cat(m)) && C()[m.kind]);
    // solapes
    for(let i=0;i<solid.length;i++) for(let j=i+1;j<solid.length;j++){
      const a=solid[i], b=solid[j]; const ca=K.cat(a), cb=K.cat(b);
      if(ca==='campana'||cb==='campana') continue;
      if((C()[a.kind].onTop && cb==='bajo')||(C()[b.kind].onTop && ca==='bajo')) continue;
      const A=K.aabb(a), B=K.aabb(b); const ox=Math.min(A.x1,B.x1)-Math.max(A.x0,B.x0), oz=Math.min(A.z1,B.z1)-Math.max(A.z0,B.z0);
      const va=vbox(a), vb=vbox(b); const oy=Math.min(va.y1,vb.y1)-Math.max(va.y0,vb.y0);
      if(ox>1 && oz>1 && oy>1) W('error', `${K.modLabel(a)} y ${K.modLabel(b)} se solapan ${Math.round(Math.min(ox,oz))} cm`, [a.id,b.id]);
    }
    // fuera de la habitación
    solid.forEach(m=>{ const A=K.aabb(m); if(A.x0<-1||A.z0<-1||A.x1>room.W+1||A.z1>room.D+1) W('error', `${K.modLabel(m)} queda fuera de la habitación`, [m.id]); if(m.y+m.h>room.H+0.5) W('error', `${K.modLabel(m)} supera la altura del techo`, [m.id]); });
    // huecos
    st.openings.forEach(o=>{
      const t=K.OPENINGS.find(x=>x.k===o.type)||{}; if(t.kind!=='hueco') return;
      const isDoor=['puerta','puerta_doble','corredera','paso','balconera'].includes(o.type);
      mods.forEach(m=>{ const wo=K.wallOf(m,room); if(!wo||wo.wall!==o.wall) return; if(wo.pos+m.w<=o.pos+0.5||wo.pos>=o.pos+o.width-0.5) return;
        const y0=m.y,y1=m.y+m.h; const oy0=o.sill, oy1=o.sill+o.height;
        if(y1>oy0+0.5 && y0<oy1-0.5) W(isDoor?'error':'aviso', `${K.modLabel(m)} tapa ${isDoor?'la puerta':'la ventana'} de la pared ${K.WALL_NAMES[o.wall]}`, [m.id]); });
    });
    st.openings.filter(o=>['puerta','puerta_doble','corredera','paso','balconera'].includes(o.type)).forEach(o=>{
      const a=K.wallPoint(room,o.wall,o.pos,0), b=K.wallPoint(room,o.wall,o.pos+o.width,60);
      const R={x0:Math.min(a.x,b.x)+1,x1:Math.max(a.x,b.x)-1,z0:Math.min(a.z,b.z)+1,z1:Math.max(a.z,b.z)-1};
      mods.forEach(m=>{ const c=K.cat(m); if(!['bajo','columna','electro','panel'].includes(c)) return; if(C()[m.kind].onTop) return; const B=K.aabb(m); if(B.x0<R.x1 && B.x1>R.x0 && B.z0<R.z1 && B.z1>R.z0) W('error', `${K.modLabel(m)} impide abrir o pasar por la puerta de la pared ${K.WALL_NAMES[o.wall]}`, [m.id]); });
    });
    const sinks=mods.filter(m=>C()[m.kind] && C()[m.kind].sink);
    const hobs=mods.filter(m=>C()[m.kind] && (C()[m.kind].hob||C()[m.kind].range) && (m.o.hob!=='ninguna'));
    const hoods=mods.filter(m=>K.cat(m)==='campana'||m.kind==='ACAMP');
    const cen=(m)=>({x:m.x,z:m.z});
    const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
    // placa - fregadero
    hobs.forEach(h=>sinks.forEach(s=>{ const A=K.aabb(h),B=K.aabb(s); const gap=Math.max(B.x0-A.x1, A.x0-B.x1, B.z0-A.z1, A.z0-B.z1); if(gap<40 && gap>-1) W('aviso', `Sólo hay ${Math.max(0,Math.round(gap))} cm de encimera entre placa y fregadero (recomendado 60 cm)`, [h.id,s.id]); }));
    // placa bajo ventana
    hobs.forEach(h=>{ const wo=K.wallOf(h,room); if(!wo) return; const win=st.openings.find(o=>o.wall===wo.wall && /ventana|balconera/.test(o.type) && wo.pos<o.pos+o.width && wo.pos+h.w>o.pos); if(win) W('aviso','La placa está bajo una ventana: corrientes de aire y salpicaduras en el cristal',[h.id]); });
    // campana sobre placa
    hobs.forEach(h=>{ if(h.o.hob==='indext') return; const has=hoods.some(c=>{ const A=K.aabb(c),B=K.aabb(h); return Math.min(A.x1,B.x1)-Math.max(A.x0,B.x0)>20 && Math.min(A.z1,B.z1)-Math.max(A.z0,B.z0)>10; }); if(!has) W('aviso','La placa no tiene campana encima',[h.id]);
      hoods.forEach(c=>{ const A=K.aabb(c),B=K.aabb(h); if(Math.min(A.x1,B.x1)-Math.max(A.x0,B.x0)>20 && Math.min(A.z1,B.z1)-Math.max(A.z0,B.z0)>10){ const hgt=c.y-tH; const gas=/gas/.test(h.o.hob||''); const min=gas?65:55; if(hgt<min) W('aviso',`Campana a ${Math.round(hgt)} cm de la placa (mínimo ${min} cm)`,[c.id]); if(c.w < (K.HOBS.find(x=>x.k===h.o.hob)||{w:60}).w-1) W('aviso','La campana es más estrecha que la placa',[c.id]); } }); });
    // placa junto a columna / pared
    hobs.forEach(h=>{ const wo=K.wallOf(h,room); if(!wo) return; mods.forEach(m=>{ if(K.cat(m)!=='columna' && !['EFRIGO','EAMER','EFRENCH'].includes(m.kind)) return; const w2=K.wallOf(m,room); if(!w2||w2.wall!==wo.wall) return; const gap=Math.max(w2.pos-(wo.pos+h.w), wo.pos-(w2.pos+m.w)); if(gap<20 && gap>-1) W('aviso',`La placa queda a ${Math.round(Math.max(0,gap))} cm de una columna o frigorífico (recomendado 30 cm)`,[h.id,m.id]); }); });
    // lavavajillas lejos del fregadero
    mods.filter(m=>C()[m.kind] && C()[m.kind].appl==='lavavajillas').forEach(l=>{ const s=sinks.map(s=>dist(cen(s),cen(l))-(s.w+l.w)/2).sort((a,b)=>a-b)[0]; if(s===undefined) W('info','Hay lavavajillas pero no fregadero',[l.id]); else if(s>60) W('aviso',`Lavavajillas a ${Math.round(s)} cm del fregadero (mejor junto a él)`,[l.id]); });
    // frigorífico junto a horno
    const fr=mods.filter(m=>['CFRIGO','CFRIGO1','EFRIGO','EAMER','EFRENCH'].includes(m.kind)); const ov=mods.filter(m=>['CHM','CHC','CHH','CHCAFE','CSEMI','BHORNO','BHORNO90','ECOCINA'].includes(m.kind));
    fr.forEach(f=>ov.forEach(o=>{ const A=K.aabb(f),B=K.aabb(o); const gap=Math.max(B.x0-A.x1, A.x0-B.x1, B.z0-A.z1, A.z0-B.z1); if(gap<1) W('info','Frigorífico pegado al horno: conviene un panel aislante o separarlos',[f.id,o.id]); }));
    // triángulo de trabajo
    if(sinks.length&&hobs.length&&fr.length){ const s=cen(sinks[0]),h=cen(hobs[0]),f=cen(fr[0]); const legs=[dist(s,h),dist(h,f),dist(f,s)]; const per=legs.reduce((a,b)=>a+b,0); const bad=legs.filter(l=>l<120||l>270).length; W(bad?'aviso':'ok', `Triángulo de trabajo: ${legs.map(l=>(l/100).toFixed(2)).join(' · ')} m (suma ${(per/100).toFixed(2)} m)${bad?' · algún lado fuera de 1,20–2,70 m':''}`); }
    // pasillos
    const bases=mods.filter(m=>['bajo','columna','electro'].includes(K.cat(m)) && !C()[m.kind].onTop);
    for(let i=0;i<bases.length;i++) for(let j=0;j<bases.length;j++){ if(i===j) continue; const a=bases[i],b=bases[j];
      const wa=K.wallOf(a,room), wb=K.wallOf(b,room); if(wa&&wb&&(wa.wall===wb.wall||Math.abs(wa.wall-wb.wall)%2===1)) continue;
      const ax=K.axes(a.rot); const cs=K.corners(b).map(p=>({al:(p.x-a.x)*ax.ux+(p.z-a.z)*ax.uz, ac:(p.x-a.x)*ax.fx+(p.z-a.z)*ax.fz}));
      const minAc=Math.min(...cs.map(c=>c.ac)), al0=Math.min(...cs.map(c=>c.al)), al1=Math.max(...cs.map(c=>c.al));
      if(minAc<=a.d/2) continue; const ov=Math.min(al1,a.w/2)-Math.max(al0,-a.w/2); if(ov<20) continue;
      const gap=minAc-a.d/2 - st.conf.topOver; if(gap>5 && gap<90 && i<j || gap>5 && gap<90 && !(bases.indexOf(b)<bases.indexOf(a))) { if(!out.some(o=>o.ids.includes(a.id)&&o.ids.includes(b.id))) W('aviso', `Paso de ${Math.round(gap)} cm frente a ${K.modLabel(a)} (mínimo 90 cm, ideal 110)`, [a.id,b.id]); } }
    // fregadero sin toma de agua en esa pared
    const water=st.openings.filter(o=>o.type==='agua');
    sinks.forEach(s=>{ const wo=K.wallOf(s,room); if(water.length && (!wo || !water.some(w=>w.wall===wo.wall))) W('info','El fregadero no está en la pared con toma de agua: habrá que llevar fontanería',[s.id]); });
    // salida de humos
    const humos=st.openings.filter(o=>o.type==='humos');
    hoods.forEach(c=>{ if(!humos.length) return; const wo=K.wallOf(c,room)||{wall:-1}; if(!humos.some(h=>h.wall===wo.wall)) W('info','La campana no está en la pared con salida de humos: prever conducto',[c.id]); });
    // altos sobre placa sin campana integrada
    hobs.forEach(h=>{ mods.filter(m=>K.cat(m)==='alto' && m.kind!=='ACAMP').forEach(a=>{ const A=K.aabb(a),B=K.aabb(h); if(Math.min(A.x1,B.x1)-Math.max(A.x0,B.x0)>10 && Math.min(A.z1,B.z1)-Math.max(A.z0,B.z0)>5 && a.y - tH < 70) W('aviso',`${K.modLabel(a)} está sobre la placa a menos de 70 cm`,[a.id]); }); });
    if(!out.some(o=>o.lvl==='error'||o.lvl==='aviso')) out.unshift({lvl:'ok',msg:'Sin problemas detectados',ids:[]});
    return out;
  };

  /* ---------- Presupuesto ---------- */
  const fam = (k)=> (K.TOP_MATS.find(t=>t.k===k)||{fam:'laminado'}).fam;
  K.applPrice = function(st, key, gama){ const p=st.prices.appl[key]; if(!p) return 0; const i={basica:0,media:1,alta:2}[gama||st.finish.applGama]??1; return p[i]||0; };
  K.budget = function(st){
    const P=st.prices, F=st.finish, lines=[]; const add=(sec,desc,qty,unit,price)=>lines.push({sec,desc,qty,unit,price,total:Math.round(qty*price*100)/100});
    let handles=0, golaMl=0, plinthMl=0, topMl=0, topMlIsla=0, cutsP=0, cutsF=0, under=0, nMods=0;
    const hInfo=K.HANDLES.find(h=>h.k===F.handle.k)||{};
    st.modules.forEach(m=>{
      const c=C()[m.kind]; if(!c) return; const z=K.zoneOf(m,st); const zf=F.zones[z]||F.zones.bajos; const tf=(K.FRONT_TYPES.find(t=>t.k===(m.o.type||zf.type))||{f:1}).f;
      const fronts=c.f(m)||[]; const doorsN=fronts.filter(f=>['puerta','abatible','panel','panel_lv','ciego'].includes(f.t)).length; const drawersN=fronts.filter(f=>f.t==='cajon').length;
      if(['bajo','alto','columna'].includes(c.cat)){
        nMods++;
        const base = c.cat==='bajo'? P.bajo_cm*(m.h/75)*(m.d/58) : c.cat==='alto'? P.alto_cm*(m.h/72)*(m.d/35) : P.columna_cm*(m.h/204)*(m.d/58);
        let price = base*m.w; price = price*(0.55+0.45*tf);
        price += drawersN*P.cajon;
        if(['BRINC','BBOT','BBAS','CDESPX'].includes(m.kind)) price+=P.extraible;
        if(fronts.some(f=>f.glass)) price+=P.cristal*fronts.filter(f=>f.glass).length;
        if(m.kind==='APERS') price+=P.persiana; price += fronts.filter(f=>f.t==='abatible').length*P.abatible;
        if(c.open||c.hueco||c.shelf) price = (c.cat==='alto'?P.alto_cm:P.bajo_cm)*m.w*0.6;
        add('Muebles', `${c.n} ${Math.round(m.w)}×${Math.round(m.h)}×${Math.round(m.d)} cm · ${(K.FRONT_MATS.find(x=>x.k===(m.o.mat||zf.mat))||{}).n||''}`, 1, 'ud', Math.round(price));
        const hn = fronts.filter(f=>['puerta','abatible','cajon','panel'].includes(f.t)).length;
        if(hInfo.t==='gola') golaMl += m.w/100 * Math.max(1, fronts.filter(f=>f.t==='cajon').length || 1); else if(hInfo.t!=='push' && hInfo.t!=='unero') handles += hn;
        if(c.cat!=='alto'){ plinthMl += m.w/100; if(c.cat==='bajo' && !c.open && m.kind!=='BBANCO'){ if(z==='isla') topMlIsla += m.w/100; else topMl += m.w/100; } }
        if(c.cat==='bajo' && c.open && m.kind!=='BBANCO'){ if(z==='isla') topMlIsla+=m.w/100; else topMl+=m.w/100; }
        if(c.hob && m.o.hob && m.o.hob!=='ninguna'){ cutsP++; const hob=K.HOBS.find(h=>h.k===m.o.hob)||{}; const key = hob.t==='gas'?'gas': hob.t==='ext'?'ext':'placa'; add('Electrodomésticos', hob.n, 1,'ud', K.applPrice(st,key,m.o.gama)); }
        if(c.sink && m.o.sink && m.o.sink!=='ninguno'){ cutsF++; const s=K.SINKS.find(x=>x.k===m.o.sink)||{}; if(s.under) under++; add('Fregadero y grifo', s.n, 1,'ud', K.applPrice(st,'fregadero',m.o.gama)); add('Fregadero y grifo', (K.TAPS.find(t=>t.k===m.o.tap)||{n:'Grifo'}).n, 1,'ud', K.applPrice(st,'grifo',m.o.gama)); }
        if(c.appl){ const map={lavavajillas:'lavavajillas',lavadora:'lavadora',frigo_bajo:'frigo_bajo',vinoteca:'vinoteca',campana_int:'campana_int',microondas:'microondas',horno:'horno',frigo:'frigo',congelador:'congelador'}; const key=map[c.appl];
          if(key){ let n=1; let label={lavavajillas:'Lavavajillas',lavadora:'Lavadora',frigo_bajo:'Frigorífico bajo encimera',vinoteca:'Vinoteca',campana_int:'Campana integrada',microondas:'Microondas',horno:'Horno',frigo:'Frigorífico integrable',congelador:'Congelador integrable'}[key];
            if(m.kind==='CHH') n=2; add('Electrodomésticos', label, n, 'ud', K.applPrice(st,key,m.o.gama));
            if(m.kind==='CHM') add('Electrodomésticos','Microondas integrable',1,'ud',K.applPrice(st,'microondas',m.o.gama));
            if(m.kind==='CHCAFE'){ add('Electrodomésticos','Cafetera / horno compacto',1,'ud',K.applPrice(st,'cafetera',m.o.gama)); add('Electrodomésticos','Cajón calientaplatos',1,'ud',K.applPrice(st,'calienta',m.o.gama)); }
            if(m.kind==='CLAV') add('Electrodomésticos','Secadora',1,'ud',K.applPrice(st,'secadora',m.o.gama)); } }
      } else if(c.cat==='electro'){
        const key = {EFRIGO:'frigo_libre',EAMER:'americano',EFRENCH:'americano',ECOCINA:'cocina',ELAV:'lavadora',ESEC:'secadora',ELVL:'lavavajillas',EMIC:'microondas',EVINO:'vinoteca',ECAFE:'cafetera'}[m.kind];
        add('Electrodomésticos', c.n, 1,'ud', K.applPrice(st,key,m.o.gama));
      } else if(c.cat==='campana'){
        add('Electrodomésticos', `${c.n} ${Math.round(m.w)} cm`, 1,'ud', K.applPrice(st,'campana',m.o.gama));
      } else if(c.cat==='panel'){
        const area = c.panel==='regleta'? m.w*m.h/1e4 : c.panel==='costado'? m.d*m.h/1e4 : c.panel==='trasero'? m.w*m.h/1e4 : c.panel==='barra'? 0 : m.w*m.h/1e4;
        if(c.panel==='barra'){ const fm=fam(F.top.mat); add('Encimera', `Barra volada ${Math.round(m.w)}×${Math.round(m.d)} cm`, m.w/100,'ml', (P.top_ml[fm]||300)); }
        else if(c.panel==='estanteria') add('Muebles', c.n, 1,'ud', 160);
        else add('Muebles', `${c.n} ${Math.round(m.w)}×${Math.round(m.h)} cm`, Math.max(0.1,K.round(area,0.01)),'m²', P.panel_m2);
      }
    });
    const tf = 1 + Math.max(0,(F.top.thick-2))*P.top_thick_f;
    const fm=fam(F.top.mat); const tm=K.TOP_MATS.find(t=>t.k===F.top.mat)||{};
    if(topMl>0) add('Encimera', `${tm.n||'Encimera'} ${F.top.thick} cm`, K.round(topMl,0.01),'ml', Math.round((P.top_ml[fm]||300)*tf));
    if(topMlIsla>0){ const ti=F.topIsla||F.top; const fi=fam(ti.mat); add('Encimera', `Isla: ${(K.TOP_MATS.find(t=>t.k===ti.mat)||{}).n} ${ti.thick} cm`, K.round(topMlIsla,0.01),'ml', Math.round((P.top_ml[fi]||300)*(1+Math.max(0,(ti.thick-2))*P.top_thick_f))); }
    if(cutsP) add('Encimera','Hueco de placa',cutsP,'ud',P.hueco_placa);
    if(cutsF) add('Encimera','Hueco de fregadero',cutsF,'ud',P.hueco_fregadero);
    if(under) add('Encimera','Pulido bajo encimera',under,'ud',P.bajo_encimera);
    const sp=F.splash.k;
    if(sp==='copete'||sp==='copete10') add('Encimera', `Copete ${sp==='copete'?5:10} cm`, K.round(topMl,0.01),'ml',P.copete_ml);
    else if(sp!=='ninguno'){ const area = topMl*((st.conf.wallBottom - K.topH(st))/100); add('Frente entre muebles', (K.SPLASH.find(s=>s.k===sp)||{}).n, K.round(area,0.01),'m²', P.splash_m2[sp]||0); }
    if(handles) add('Tiradores y zócalo', `${hInfo.n||'Tirador'} · ${(K.HANDLE_COLORS.find(c=>c.k===F.handle.color)||{}).n||''}`, handles,'ud',P.tirador);
    if(golaMl) add('Tiradores y zócalo', 'Perfil gola', K.round(golaMl,0.01),'ml',P.gola_ml);
    if(plinthMl) add('Tiradores y zócalo', 'Zócalo', K.round(plinthMl,0.01),'ml',P.zocalo_ml);
    if(nMods){ add('Montaje','Montaje de muebles',nMods,'ud',P.montaje_mod); if(topMl+topMlIsla) add('Montaje','Colocación de encimera',K.round(topMl+topMlIsla,0.01),'ml',P.montaje_top_ml); add('Montaje','Transporte',1,'ud',P.transporte); }
    const sub=lines.reduce((s,l)=>s+l.total,0);
    const marg = sub*(P.margen||0)/100; const disc=(sub+marg)*(P.descuento||0)/100; const base=sub+marg-disc; const iva=base*(P.iva||0)/100;
    return {lines, sub, marg, disc, base, iva, total: base+iva};
  };

  /* ---------- Despiece de fabricación ---------- */
  K.cutList = function(st){
    const cf=st.conf, F=st.finish, e=cf.board, g=cf.gap; const rows=[];
    const casco=(K.CASCO.find(c=>c.k===F.casco)||{}).n||'';
    st.modules.forEach((m,idx)=>{
      const c=C()[m.kind]; if(!c||!['bajo','alto','columna'].includes(c.cat)) return; if(c.hueco||c.shelf) return;
      const ref = `${idx+1}·${K.modLabel(m)}`; const dC = m.d - cf.frontT; const z=K.zoneOf(m,st); const zf=F.zones[z];
      const R=(pieza,l,a,n,mat,canto)=>rows.push({ref, mod:c.n, pieza, largo:K.round(l*10,1), ancho:K.round(a*10,1), n, mat, canto:canto||''});
      R('Costado', m.h, dC, 2, 'Casco '+casco+' '+(e*10)+' mm', '1L');
      R('Base', m.w-2*e, dC, 1, 'Casco '+casco+' '+(e*10)+' mm', '1L');
      if(c.cat==='bajo') R('Travesaño superior', m.w-2*e, 10, 2, 'Casco '+casco+' '+(e*10)+' mm','1L'); else R('Techo', m.w-2*e, dC, 1, 'Casco '+casco+' '+(e*10)+' mm','1L');
      R('Trasera', m.h-0.5, m.w-0.5, 1, 'Trasera '+(cf.back*10)+' mm');
      const shelves = c.open? Math.max(1,Math.round(m.h/35)) : (c.cat==='alto'? Math.max(1,Math.round(m.h/36)-1) : c.cat==='columna'? 3 : 1);
      if(!(c.f(m)||[]).every(f=>f.t==='cajon')) R('Balda', m.w-2*e-0.2, dC-2, shelves, 'Casco '+casco+' '+(e*10)+' mm','1L');
      (c.f(m)||[]).forEach(f=>{
        if(!['puerta','abatible','cajon','panel','panel_lv','ciego','falso'].includes(f.t)) return;
        const mat=(K.FRONT_MATS.find(x=>x.k===(m.o.mat||zf.mat))||{}).n;
        R(({puerta:'Puerta',abatible:'Puerta abatible',cajon:'Frente de cajón',panel:'Panel electrodoméstico',panel_lv:'Panel lavavajillas',ciego:'Frente ciego',falso:'Frente fijo'})[f.t], (f.y1-f.y0)-g, (f.x1-f.x0)-g, 1, 'Frente '+mat+' · '+(K.DOOR_MODELS.find(d=>d.k===(m.o.model||zf.model))||{}).n, '4L');
        if(f.t==='cajon'){ const hh=Math.max(8,(f.y1-f.y0)-6); R('Lateral cajón', dC-5, hh, 2,'Cajón'); R('Fondo cajón', m.w-2*e-3, dC-5, 1,'Cajón'); }
      });
    });
    st.modules.filter(m=>K.cat(m)==='panel').forEach(m=>{ const c=C()[m.kind]; if(c.panel==='barra') return; rows.push({ref:K.modLabel(m),mod:c.n,pieza:c.n,largo:K.round(m.h*10,1),ancho:K.round((c.panel==='costado'?m.d:m.w)*10,1),n:1,mat:'Frente',canto:'4L'}); });
    return rows;
  };
})();
