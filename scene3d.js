/* Vista 3D (Three.js r128). Unidades: cm. */
(function(){
  const S = K.S3 = {};
  let renderer, scene, camera, controls, root, wallMeshes=[], pivots=[], selBox=null, raycaster, clock;
  let st=null, openT=0, openTarget=0, autoRotate=false, mode='orbit', walk=null;
  const matCache={};
  const C=()=>K.CATALOG;

  S.init = function(el){
    renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio||1));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    scene = new THREE.Scene(); scene.background = new THREE.Color('#dfe3e4').convertSRGBToLinear();
    camera = new THREE.PerspectiveCamera(45, 1, 2, 8000);
    camera.position.set(170, 420, 720);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.12; controls.maxPolarAngle = Math.PI*0.495; controls.minDistance=40; controls.maxDistance=2500;
    controls.target.set(170, 90, 140);
    try{ if(THREE.RoomEnvironment){ const pm=new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new THREE.RoomEnvironment(), 0.04).texture; S.hasEnv=true; } }catch(e){}
    root = new THREE.Group(); scene.add(root);
    raycaster = new THREE.Raycaster(); clock = new THREE.Clock();
    const ro = new ResizeObserver(()=>S.resize()); ro.observe(el); S.el=el; S.resize();
    bindPointer(renderer.domElement);
    animate();
  };
  S.resize = function(){ if(!renderer) return; const w=S.el.clientWidth||1, h=S.el.clientHeight||1; renderer.setSize(w,h,false); renderer.domElement.style.width=w+'px'; renderer.domElement.style.height=h+'px'; camera.aspect=w/h; camera.updateProjectionMatrix(); };
  S.setBg = function(c){ if(scene) scene.background=new THREE.Color(c).convertSRGBToLinear(); };

  /* ---------- Materiales ---------- */
  function M(key, fn){ if(!matCache[key]) matCache[key]=fn(); return matCache[key]; }
  function lin(c){ return new THREE.Color(c).convertSRGBToLinear(); }
  function std(color, rough, metal, extra){ return new THREE.MeshStandardMaterial(Object.assign({color:lin(color), roughness:rough, metalness:metal||0, envMapIntensity:0.45}, extra||{})); }
  function texMat(g,color,rough,metal,w,h,rot){ // material con textura escalada (no se cachea por tamaño)
    const t=K.texFor(g,color,w,h,1,rot); const m=std(t?'#ffffff':color, rough, metal); if(t){ m.map=t; } return m;
  }
  function frontMat(st, m, w, h){
    const z=K.zoneOf(m,st), zf=st.finish.zones[z]||st.finish.zones.bajos;
    const fm=K.FRONT_MATS.find(x=>x.k===(m.o.mat||zf.mat))||K.FRONT_MATS[0];
    const gl=K.GLOSS.find(x=>x.k===(m.o.gloss||zf.gloss))||K.GLOSS[0];
    const metal = fm.g==='metal'? 0.85 : 0;
    if(fm.g==='liso'||fm.g==='metal') return M('f|'+fm.k+'|'+gl.k, ()=>std(fm.c, fm.g==='metal'?0.3:gl.r, metal));
    return texMat(fm.g==='piedra'?'marmol_negro':fm.g, fm.c, gl.r, metal, w, h, fm.g==='madera'? Math.PI/2*0 : 0);
  }
  function cascoMat(st,m){ const c=K.CASCO.find(x=>x.k===st.finish.casco)||K.CASCO[0]; if(!c.c) return null; return M('c|'+c.k, ()=>std(c.c,0.7,0)); }
  function applMat(st,m){ const k=m.o.color||st.finish.applColor; const a=K.APPL_COLORS.find(x=>x.k===k)||K.APPL_COLORS[0]; return M('a|'+a.k, ()=>std(a.c,a.r,a.m)); }
  function handleMat(st){ const h=K.HANDLE_COLORS.find(x=>x.k===st.finish.handle.color)||K.HANDLE_COLORS[0]; return M('h|'+h.k, ()=>std(h.c,h.r,h.m)); }
  const DARK = ()=>M('dark', ()=>std('#141516',0.6,0.2));
  const GLASS = ()=>M('glass', ()=>new THREE.MeshPhysicalMaterial({color:lin('#cfe3ea'), roughness:0.05, metalness:0, transmission:0, transparent:true, opacity:0.32, envMapIntensity:1}));
  const INOX = ()=>M('inox', ()=>std('#c4c7c9',0.3,0.9));
  const LED = ()=>M('led', ()=>new THREE.MeshBasicMaterial({color:lin('#fff3d6')}));

  function box(w,h,d,mat,x,y,z,parent,shadow){ const g=new THREE.BoxGeometry(Math.max(0.05,w),Math.max(0.05,h),Math.max(0.05,d)); const me=new THREE.Mesh(g,mat); me.position.set(x,y,z); if(shadow!==false){ me.castShadow=true; me.receiveShadow=true; } if(parent) parent.add(me); return me; }
  function cyl(r1,r2,h,mat,x,y,z,parent,seg){ const me=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||20),mat); me.position.set(x,y,z); me.castShadow=true; if(parent) parent.add(me); return me; }

  /* ---------- Construcción ---------- */
  function disposeTree(o){ o.traverse(n=>{ if(n.geometry) n.geometry.dispose(); if(n.material && !Object.values(matCache).includes(n.material)){ (Array.isArray(n.material)?n.material:[n.material]).forEach(mm=>{ if(mm.map) mm.map.dispose(); mm.dispose(); }); } }); }
  S.build = function(state, selId){
    st=state; if(!root) return;
    disposeTree(root); scene.remove(root); root=new THREE.Group(); scene.add(root);
    wallMeshes=[]; pivots=[];
    buildRoom(); buildLights();
    st.modules.forEach(m=>{ try{ const g=buildModule(m); if(g) root.add(g); }catch(e){ console.warn('modulo',m.kind,e); } });
    buildSplash();
    S.select(selId);
    applyOpen(openT);
  };

  function buildRoom(){
    const r=st.room, T=12;
    const fl = K.FLOORS.find(f=>f.k===r.floor)||K.FLOORS[0];
    const fm = texMat(fl.g, fl.c, fl.g==='marmol_baldosa'?0.25:0.65, 0, r.W, r.D);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(r.W+2*T, r.D+2*T), fm); floor.rotation.x=-Math.PI/2; floor.position.set(r.W/2,0,r.D/2); floor.receiveShadow=true; root.add(floor);
    const base = new THREE.Mesh(new THREE.BoxGeometry(r.W+2*T+40,4,r.D+2*T+40), std('#c9ccca',0.9,0)); base.position.set(r.W/2,-2.1,r.D/2); root.add(base);
    const wm = M('wall|'+r.wallColor, ()=>std(r.wallColor,0.92,0));
    for(let w=0;w<4;w++){
      const L=K.wallLen(r,w);
      const shape=new THREE.Shape(); shape.moveTo(-T,0); shape.lineTo(L+T,0); shape.lineTo(L+T,r.H); shape.lineTo(-T,r.H); shape.lineTo(-T,0);
      st.openings.filter(o=>o.wall===w).forEach(o=>{ const t=K.OPENINGS.find(x=>x.k===o.type)||{}; if(t.kind!=='hueco') return; const h=new THREE.Path(); const a=Math.max(0.5,o.pos), b=Math.min(L-0.5,o.pos+o.width), y0=Math.max(0.01,o.sill), y1=Math.min(r.H-1,o.sill+o.height); h.moveTo(a,y0); h.lineTo(a,y1); h.lineTo(b,y1); h.lineTo(b,y0); h.lineTo(a,y0); shape.holes.push(h); });
      const geo=new THREE.ExtrudeGeometry(shape,{depth:T, bevelEnabled:false});
      const mesh=new THREE.Mesh(geo,wm); mesh.position.z=-T; mesh.receiveShadow=true; mesh.castShadow=true;
      const g=new THREE.Group(); const p=K.wallPoint(r,w,0,0); g.position.set(p.x,0,p.z); g.rotation.y=K.WALL_ROT[w]*Math.PI/180; g.add(mesh);
      // huecos y elementos
      st.openings.filter(o=>o.wall===w).forEach(o=>buildOpening(o,g));
      g.userData={wall:w}; root.add(g); wallMeshes.push(g);
    }
    st.obstacles.forEach(o=>{ const b=box(o.w,o.h||r.H,o.d,wm,o.x,(o.h||r.H)/2,o.z,root); b.userData.obst=o.id; });
  }
  function buildOpening(o, g){
    const t=K.OPENINGS.find(x=>x.k===o.type)||{}; const fr=M('frame', ()=>std('#f2f1ee',0.5,0)); const wood=M('doorwood', ()=>std('#e9e6df',0.55,0));
    const cx=o.pos+o.width/2;
    if(t.kind==='hueco'){
      const isDoor=['puerta','puerta_doble','corredera','paso','balconera'].includes(o.type);
      // marco
      box(o.width+10,5,2.5,fr,cx,o.sill+o.height+2.5,1.2,g); box(5,o.height,2.5,fr,o.pos-2.5,o.sill+o.height/2,1.2,g); box(5,o.height,2.5,fr,o.pos+o.width+2.5,o.sill+o.height/2,1.2,g);
      if(!isDoor || o.type==='balconera'){
        if(o.type!=='balconera') box(o.width+8,3,8,fr,cx,o.sill-1.5,3,g);
        const gl=box(o.width-4,o.height-4,1,GLASS(),cx,o.sill+o.height/2,-6,g,false);
        const fw=M('winframe', ()=>std('#f4f4f2',0.4,0.1));
        box(o.width,4,6,fw,cx,o.sill+2,-6,g); box(o.width,4,6,fw,cx,o.sill+o.height-2,-6,g); box(4,o.height,6,fw,o.pos+2,o.sill+o.height/2,-6,g); box(4,o.height,6,fw,o.pos+o.width-2,o.sill+o.height/2,-6,g); box(4,o.height,6,fw,cx,o.sill+o.height/2,-6,g);
        const sky=new THREE.Mesh(new THREE.PlaneGeometry(o.width*3,o.height*3), new THREE.MeshBasicMaterial({color:lin('#dcebf2')})); sky.position.set(cx,o.sill+o.height/2,-60); g.add(sky);
      } else if(o.type!=='paso'){
        if(o.type==='puerta_doble'){ const l=box(o.width/2-1,o.height-1,4,wood,o.pos+o.width/4,o.sill+o.height/2,-4,g); const l2=box(o.width/2-1,o.height-1,4,wood,o.pos+o.width*3/4,o.sill+o.height/2,-4,g); }
        else if(o.type==='corredera'){ box(o.width,o.height-1,4,wood,cx+o.width*0.15,o.sill+o.height/2,-8,g); }
        else { const leaf=new THREE.Group(); leaf.position.set(o.pos+ (o.hingeR? o.width:0),0,-4); g.add(leaf); box(o.width-1,o.height-1,4,wood,(o.hingeR?-1:1)*(o.width/2),o.height/2,0,leaf); cyl(1,1,12,INOX(),(o.hingeR?-1:1)*(o.width-7),100,3,leaf).rotation.z=Math.PI/2; leaf.rotation.y=(o.hingeR?1:-1)*0.0; }
      }
    } else {
      const col={agua:'#2a7fd4',desague:'#5b6770',gas:'#e2a400',enchufe:'#f4f4f2',interruptor:'#f4f4f2',humos:'#7a7f83',radiador:'#f2f2f0',caldera:'#f2f2f0',cuadro:'#e9e9e6'}[o.type]||'#999';
      const dep=t.dep||1.5; const b=box(o.width,o.height,dep,M('pt|'+o.type,()=>std(col,0.5,o.type==='humos'?0.6:0)),cx,o.sill+o.height/2,dep/2+0.2,g);
      if(o.type==='radiador'){ for(let i=0;i<o.width/8;i++) box(5,o.height-4,dep+1,M('rad',()=>std('#fafaf8',0.4,0)),o.pos+4+i*8,o.sill+o.height/2,dep/2+0.5,g); }
      if(o.type==='humos'){ const c=cyl(o.width/2,o.width/2,4,M('humos2',()=>std('#2b2d2f',0.6,0.4)),cx,o.sill+o.height/2,2,g); c.rotation.x=Math.PI/2; b.visible=false; }
      if(t.kind==='punto' && S.showPoints===false) b.visible=false;
    }
  }
  function buildLights(){
    const r=st.room; const L=st.finish.light||'dia';
    const hemi=new THREE.HemisphereLight('#ffffff', '#b8b0a4', L==='noche'?0.15:0.4); root.add(hemi);
    const amb=new THREE.AmbientLight('#ffffff', L==='noche'?0.03:0.05); root.add(amb);
    const sun=new THREE.DirectionalLight(L==='tarde'?'#ffd8a8':'#fffaf0', L==='noche'?0.1:(L==='tarde'?0.75:0.9));
    sun.position.set(r.W*0.2-300, 620, r.D+420); sun.target.position.set(r.W/2,0,r.D/2); sun.castShadow=true;
    const s=Math.max(r.W,r.D); sun.shadow.camera.left=-s; sun.shadow.camera.right=s; sun.shadow.camera.top=s; sun.shadow.camera.bottom=-s; sun.shadow.camera.near=50; sun.shadow.camera.far=2500; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-0.0006; sun.shadow.normalBias=0.6;
    root.add(sun); root.add(sun.target);
    const temp = st.finish.lightTemp==='fria'?'#eef4ff': st.finish.lightTemp==='neutra'?'#fff8ee':'#ffe6c4';
    const ceil=new THREE.PointLight(temp, L==='noche'?0.55:0.18, 0, 2); ceil.decay=0; ceil.position.set(r.W/2, r.H-20, r.D/2); root.add(ceil);
  }

  /* ---------- Muebles ---------- */
  function buildModule(m){
    const c=C()[m.kind]; if(!c) return null;
    const g=new THREE.Group(); g.position.set(m.x, m.y, m.z); g.rotation.y=m.rot*Math.PI/180; g.userData={modId:m.id};
    const cf=st.conf, ft=cf.frontT;
    if(['bajo','alto','columna'].includes(c.cat)) buildCabinet(m,c,g);
    else if(c.cat==='electro') buildAppliance(m,c,g);
    else if(c.cat==='campana') buildHood(m,c,g);
    else if(c.cat==='panel') buildPanel(m,c,g);
    else if(c.cat==='deco') buildDeco(m,c,g);
    // zócalo
    if((c.cat==='bajo' && !c.hueco && m.kind!=='BBANCO') || c.cat==='columna'){
      const pm = st.finish.plinth.mat==='igual'? frontMat(st,m,m.w,cf.plinthH) : M('pl|'+st.finish.plinth.mat, ()=>({aluminio:std('#b9bcbe',0.35,0.9),inox:std('#c4c7c9',0.3,0.9),negro:std('#1d1e1f',0.6,0),blanco:std('#f3f3f1',0.5,0),madera:std('#a77a4c',0.6,0)}[st.finish.plinth.mat]||std('#888',0.6,0)));
      box(m.w, Math.max(1,m.y-0.5), 1.8, pm, 0, -m.y/2, m.d/2-ft-5, g);
      if(st.finish.ledPlinth){ box(m.w-2,0.6,0.6,LED(),0,-m.y+1,m.d/2-ft-3.8,g,false); }
    }
    // encimera
    if(c.cat==='bajo' && !['BBANCO'].includes(m.kind)) buildTop(m,c,g);
    return g;
  }
  function buildCabinet(m,c,g){
    const cf=st.conf, ft=cf.frontT, e=cf.board, dC=m.d-ft;
    const fm0=frontMat(st,m,m.w,m.h);
    const cm = cascoMat(st,m) || fm0;
    const zc = -m.d/2 + dC/2;
    if(c.hueco){ return; }
    if(c.shelf){ box(m.w,m.h,m.d,fm0,0,m.h/2,0,g); return; }
    // casco
    const isIsla = K.zoneOf(m,st)==='isla'; const sideMat = (c.open||c.cat==='columna'||m.o.costadoVisto||isIsla)? fm0 : cm;
    box(e,m.h,dC,sideMat,-m.w/2+e/2,m.h/2,zc,g); box(e,m.h,dC,sideMat,m.w/2-e/2,m.h/2,zc,g);
    box(m.w-2*e,e,dC,cm,0,e/2,zc,g); box(m.w-2*e,e,dC,cm,0,m.h-e/2,zc,g);
    box(m.w-2*e,m.h-2*e,0.8,cm,0,m.h/2,-m.d/2+0.4,g);
    if(isIsla) box(m.w,m.h,1.6,fm0,0,m.h/2,-m.d/2-0.8,g);
    if(c.open){ const n=Math.max(1,Math.round(m.h/36)); for(let i=1;i<n;i++) box(m.w-2*e,e,dC-1,fm0,0,i*m.h/n,zc,g); box(m.w-2*e,m.h-2*e,0.8,fm0,0,m.h/2,-m.d/2+0.9,g); return; }
    // interior oscuro para huecos de electrodoméstico
    const fronts=(c.f(m)||[]);
    const hMat=handleMat(st), hk=K.HANDLES.find(h=>h.k===(m.o.handle||st.finish.handle.k))||K.HANDLES[0];
    const model = m.o.model || (st.finish.zones[K.zoneOf(m,st)]||{}).model || 'lisa';
    fronts.forEach(f=>buildFront(m,c,g,f,fm0,hMat,hk,model));
    // LED bajo altos
    if(c.cat==='alto' && st.finish.led && !c.open && m.kind!=='APUENTE'){ box(m.w-6,0.5,1.2,LED(),0,-0.3,m.d/2-8,g,false); }
    // rincón en L (cuerpo adicional hacia el lado)
    // fregadero / placa sobre encimera se crean en buildTop
  }
  function frontModelDecor(parent,w,h,mat,model,isDrawer){
    if(model==='lisa') return;
    const zf=0.95+0.3;
    if(model==='enmarcada'||model==='enmarcada_fina'||model==='vintage'||model==='cristal_marco'){
      const fw = model==='enmarcada_fina'? 3 : (isDrawer? Math.min(5,h/4) : 7);
      if(h<12 && isDrawer){ return; }
      box(w,fw,0.8,mat,0,h/2-fw/2,zf,parent); box(w,fw,0.8,mat,0,-h/2+fw/2,zf,parent);
      box(fw,h-2*fw,0.8,mat,-w/2+fw/2,0,zf,parent); box(fw,h-2*fw,0.8,mat,w/2-fw/2,0,zf,parent);
      if(model==='vintage' && !isDrawer){ box(w-2*fw-4,h-2*fw-4,0.5,mat,0,0,1.0,parent); }
    }
    if(model==='ranurada'){ const n=Math.floor(w/4); const dm=M('groove',()=>std('#000',0.9,0,{transparent:true,opacity:0.28})); for(let i=1;i<n;i++) box(0.35,h-0.2,0.1,dm,-w/2+i*w/n,0,0.96,parent,false); }
    if(model==='lineas'){ const n=Math.max(2,Math.floor(h/9)); const dm=M('groove',()=>std('#000',0.9,0,{transparent:true,opacity:0.28})); for(let i=1;i<n;i++) box(w-0.2,0.35,0.1,dm,0,-h/2+i*h/n,0.96,parent,false); }
  }
  function buildFront(m,c,g,f,fm0,hMat,hk,model){
    const cf=st.conf, gap=cf.gap, ft=cf.frontT;
    let x0=f.x0-m.w/2, x1=f.x1-m.w/2, y0=f.y0, y1=f.y1;
    const isGola = hk.t==='gola' && c.cat!=='alto' && ['puerta','cajon','panel','panel_lv','falso','ciego'].includes(f.t);
    if(isGola && y1>=m.h-0.5){ y1-=3.5; box(x1-x0,3.5,1.6,M('gola',()=>std('#2a2b2c',0.5,0.6)),(x0+x1)/2,m.h-1.75,m.d/2-ft-0.6,g); }
    else if(isGola && f.t==='cajon'){ y1-=3; box(x1-x0,3,1.6,M('gola',()=>std('#2a2b2c',0.5,0.6)),(x0+x1)/2,y1+1.5,m.d/2-ft-0.6,g); }
    const w=x1-x0-gap, h=y1-y0-gap, cx=(x0+x1)/2, cy=(y0+y1)/2, zf=m.d/2-ft/2;
    if(w<=0.5||h<=0.5) return;
    const am=applMat(st,m);
    const mkPivot=(type,hinge)=>{ const p=new THREE.Group(); let px=cx,py=cy; if(type==='puerta'){ px = hinge==='der'? cx+w/2 : cx-w/2; } if(type==='abatible'){ py=cy+h/2; } p.position.set(px,py,zf); p.userData={type,hinge,w,h,cat:c.cat,z0:zf}; g.add(p); pivots.push(p); const inner=new THREE.Group(); inner.position.set(cx-px,cy-py,0); p.add(inner); return inner; };
    const plain=(mat, hasHandle, type, hinge)=>{ const holder = ['puerta','abatible','cajon','panel'].includes(type)? mkPivot(type==='panel'?'puerta':type, hinge||f.hinge) : (()=>{const q=new THREE.Group(); q.position.set(cx,cy,zf); g.add(q); return q;})();
      const fmat = mat || frontMat(st,m,w,h);
      box(w,h,ft,fmat,0,0,0,holder); if(mat==null) frontModelDecor(holder,w,h,fmat,f.glass?'cristal_marco':model,type==='cajon');
      if(f.glass){ box(w-10,h-10,0.4,GLASS(),0,0,0.8,holder,false); }
      if(hasHandle) addHandle(holder,m,c,f,w,h,hk,hMat,type,hinge||f.hinge);
      return holder; };
    switch(f.t){
      case 'puerta': plain(null,true,'puerta',f.hinge); break;
      case 'abatible': plain(null,true,'abatible'); break;
      case 'cajon': plain(null,true,'cajon'); break;
      case 'panel': case 'panel_lv': plain(null,true, 'panel', f.hinge); break;
      case 'ciego': case 'falso': plain(null,false,'fijo'); break;
      case 'horno': case 'horno_libre': { const q=new THREE.Group(); q.position.set(cx,cy,zf); g.add(q); box(w,h,ft,am,0,0,0,q); const pl=new THREE.Mesh(new THREE.PlaneGeometry(w-3,h-3), std('#ffffff',0.15,0.2,{map:K.panelTexture('horno')})); pl.position.z=ft/2+0.05; q.add(pl); const b=cyl(0.7,0.7,w-10,INOX(),0,h/2-8,ft/2+3,q); b.rotation.z=Math.PI/2; break; }
      case 'micro': { const q=new THREE.Group(); q.position.set(cx,cy,zf); g.add(q); box(w,h,ft,am,0,0,0,q); const pl=new THREE.Mesh(new THREE.PlaneGeometry(w-2,h-2), std('#fff',0.15,0.2,{map:K.panelTexture('micro')})); pl.position.z=ft/2+0.05; q.add(pl); break; }
      case 'cafetera': case 'cafe_libre': { const q=new THREE.Group(); q.position.set(cx,cy,zf); g.add(q); box(w,h,ft,am,0,0,0,q); const pl=new THREE.Mesh(new THREE.PlaneGeometry(w-2,h-2), std('#fff',0.2,0.2,{map:K.panelTexture('cafetera')})); pl.position.z=ft/2+0.05; q.add(pl); break; }
      case 'calienta': { box(w,h,ft,am,cx,cy,zf,g); box(w*0.5,1,1,INOX(),cx,cy+h/2-3,zf+1.5,g); break; }
      case 'vinoteca': { const q=new THREE.Group(); q.position.set(cx,cy,zf); g.add(q); box(w,h,ft,am,0,0,0,q); const pl=new THREE.Mesh(new THREE.PlaneGeometry(w-6,h-8), std('#fff',0.1,0.1,{map:K.panelTexture('vino')})); pl.position.z=ft/2+0.05; q.add(pl); const b=cyl(0.7,0.7,h*0.6,INOX(),w/2-4,0,ft/2+2.5,q); break; }
      case 'mandos': { const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h), std('#fff',0.4,0.3,{map:K.panelTexture('mandos')})); pl.position.set(cx,cy,m.d/2+0.05); g.add(pl); break; }
      case 'lavadora': { box(w,h,ft,am,cx,cy,zf,g); const pl=new THREE.Mesh(new THREE.PlaneGeometry(w-2,h-2), std('#fff',0.3,0.1,{map:K.panelTexture('lavadora')})); pl.position.set(cx,cy,zf+ft/2+0.05); g.add(pl); break; }
      case 'aparato_lv': { box(w,h,ft,am,cx,cy,zf,g); box(w-2,6,0.5,DARK(),cx,cy+h/2-4,zf+ft/2+0.2,g); const b=cyl(0.7,0.7,w-14,INOX(),cx,cy+h/2-12,zf+3,g); b.rotation.z=Math.PI/2; break; }
      case 'ap_puerta': { const q=mkPivot('puerta', f.disp?'der':'izq'); box(w,h,ft+2,am,0,0,1,q); const b=cyl(0.9,0.9,Math.min(h*0.6,60),INOX(),(f.disp?-1:1)*(w/2-5),0,ft+3,q); if(f.disp){ box(18,26,1,DARK(),-w/2+16,h*0.2,ft/2+2,q); } break; }
      case 'ap_cajon': { const q=mkPivot('cajon'); box(w,h,ft+2,am,0,0,1,q); const b=cyl(0.8,0.8,w*0.6,INOX(),0,h/2-5,ft+3,q); b.rotation.z=Math.PI/2; break; }
      case 'nicho': { box(w,h,1,M('nichoin',()=>std('#2a2b2c',0.7,0)),cx,cy,-m.d/2+2,g); box(w,0.8,m.d-ft,frontMat(st,m,w,10),cx,y0+0.4,0,g); box(w,0.8,m.d-ft,frontMat(st,m,w,10),cx,y1-0.4,0,g); break; }
      case 'persiana': { const n=Math.floor(h/3); const fmat=frontMat(st,m,w,h); for(let i=0;i<n;i++) box(w,2.6,ft,fmat,cx,y0+1.5+i*h/n,zf,g); box(w*0.3,1.2,1.5,handleMat(st),cx,y0+3,zf+1.5,g); break; }
      case 'campana_int': { box(w,h,ft,INOX(),cx,cy,zf-3,g); break; }
    }
  }
  function addHandle(parent,m,c,f,w,h,hk,hMat,type,hinge){
    const t=hk.t; if(t==='push'||t==='gola') return;
    const z=st.conf.frontT/2;
    const orientSet=st.finish.handle.orient;
    let vertical = type==='puerta' || (type==='panel');
    if(type==='cajon'||type==='abatible') vertical=false;
    if(orientSet==='horizontal') vertical=false; if(orientSet==='vertical' && type!=='cajon') vertical=true;
    const isAlto=c.cat==='alto';
    let hx=0, hy=0;
    if(t==='unero'){ const len=Math.min(w*0.6,40); const strip=M('unero',()=>std('#000',0.8,0,{transparent:true,opacity:0.35})); if(isAlto) box(len,1.6,0.3,strip,0,-h/2+1,z+0.05,parent,false); else box(len,1.6,0.3,strip,0,h/2-1,z+0.05,parent,false); return; }
    if(t==='perfil'){ const y = isAlto? -h/2-0.4 : h/2+0.4; box(w,1.4,st.conf.frontT+1.2,hMat,0,y,0.3,parent); return; }
    // posición
    const L = hk.L===-1? (vertical? Math.min(h-8, 80) : w-8) : (hk.L||12.8);
    if(type==='puerta'||type==='panel'){
      hx = (hinge==='der'? -1:1)*(w/2-4);
      if(vertical){ if(isAlto) hy=-h/2+4+L/2; else if(c.cat==='columna'){ const gy = 100-m.y; hy=Math.max(-h/2+L/2+4, Math.min(h/2-L/2-4, gy-((f.y0+f.y1)/2))); } else hy=h/2-4-L/2; }
      else { hx=(hinge==='der'?-1:1)*(w/2-4-L/2); hy= isAlto? -h/2+4 : h/2-4; }
    } else if(type==='cajon'){ hx=0; hy = h>30? h/2-5 : 0; }
    else if(type==='abatible'){ hx=0; hy=-h/2+4; }
    if(t==='barra'||t==='pletina'){
      const len=Math.max(4,Math.min(L, (vertical?h:w)-6));
      const bar = t==='barra'? cyl(0.65,0.65,len,hMat,hx,hy,z+2.6,parent,12) : box(1.8,len,0.5,hMat,hx,hy,z+2.4,parent);
      if(!vertical){ bar.rotation.z=Math.PI/2; }
      const off=len/2-1.5; [ -off, off ].forEach(o=>{ const leg=cyl(0.45,0.45,2.4,hMat,vertical?hx:hx+o, vertical?hy+o:hy, z+1.2, parent,8); leg.rotation.x=Math.PI/2; });
    } else if(t==='pomo'){ const s=new THREE.Mesh(new THREE.SphereGeometry(1.4,16,12),hMat); s.position.set(hx, vertical? (isAlto? -h/2+5 : h/2-5) : hy, z+2.2); parent.add(s); cyl(0.5,0.5,2,hMat,s.position.x,s.position.y,z+1,parent).rotation.x=Math.PI/2; }
    else if(t==='concha'){ const s=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,8,16,1,false,0,Math.PI),hMat); s.rotation.z=Math.PI/2; s.rotation.y=Math.PI/2; s.position.set(hx, vertical? hy : hy, z+0.6); parent.add(s); }
    else if(t==='cuero'){ box(2.4,10,0.5,hMat,hx,hy,z+0.6,parent); }
  }

  /* ---------- Encimera, placa y fregadero ---------- */
  function topMaterial(isIsla, w, d){ const tp=(isIsla && st.finish.topIsla)? st.finish.topIsla : st.finish.top; const tm=K.TOP_MATS.find(t=>t.k===tp.mat)||K.TOP_MATS[0]; const rough= tm.fam==='inox'?0.3:(tm.fam==='laminado'||tm.fam==='madera'||tm.fam==='microcemento'?0.6:0.22); const metal=tm.fam==='inox'?0.9:0; const t=K.texture(tm.g==='liso'?null:tm.g, tm.c, 3); const m=std(t?'#fff':tm.c, rough, metal); if(t){ const tt=t.clone(); tt.needsUpdate=true; const s=t.userData.size; tt.repeat.set(1/s,1/s); m.map=tt; } return {m, tp}; }
  function buildTop(m,c,g){
    const isIsla = K.zoneOf(m,st)==='isla';
    const {m:tm, tp} = topMaterial(isIsla); const th=tp.thick||2; const over=st.conf.topOver; const vol=m.o.voladizo||0;
    const back=-m.d/2 - vol, front=m.d/2+over;
    const shape=new THREE.Shape(); shape.moveTo(-m.w/2, -back); shape.lineTo(m.w/2,-back); shape.lineTo(m.w/2,-front); shape.lineTo(-m.w/2,-front); shape.lineTo(-m.w/2,-back);
    // agujeros
    const sink = c.sink && m.o.sink && m.o.sink!=='ninguno' ? K.SINKS.find(s=>s.k===m.o.sink) : null;
    const bowls=[];
    if(sink){ const sw=Math.min(sink.w, m.w-6); const bw = sink.esc? sw*(sink.b===2?0.62:0.5) : sw; const n = sink.b===2? 2 : 1; const half = sink.b===1.5; const bd=40; const zc=(front+back)/2+2; const x0=-sw/2 + (sink.esc? 0:0);
      if(half){ bowls.push([x0, x0+bw*0.62]); bowls.push([x0+bw*0.62+3, x0+bw]); }
      else for(let i=0;i<n;i++){ const ww=(bw-3*(n-1))/n; const a=x0+i*(ww+3); bowls.push([a,a+ww]); }
      bowls.forEach(([a,b])=>{ const h=new THREE.Path(); h.moveTo(a+1,-(zc-bd/2)); h.lineTo(b-1,-(zc-bd/2)); h.lineTo(b-1,-(zc+bd/2)); h.lineTo(a+1,-(zc+bd/2)); h.lineTo(a+1,-(zc-bd/2)); shape.holes.push(h); });
      m._sinkInfo={sink,sw,bw,zc,bd,bowls};
    }
    const geo=new THREE.ExtrudeGeometry(shape,{depth:th, bevelEnabled: tp.edge==='redondeado'||tp.edge==='biselado', bevelThickness:0.3, bevelSize:0.3, bevelSegments: tp.edge==='redondeado'?3:1});
    const mesh=new THREE.Mesh(geo,tm); mesh.rotation.x=-Math.PI/2; mesh.position.y=m.h; mesh.castShadow=true; mesh.receiveShadow=true; g.add(mesh);
    if(tp.edge==='inglete'){ box(m.w,6,th,tm,0,m.h-3+0.01,front-th/2,g); }
    if(vol>0 && isIsla && m.o.patas!==false){}
    const topY=m.h+th;
    // fregadero
    if(sink){ const si=m._sinkInfo; const sc=K.SINK_COLORS.find(x=>x.k===(m.o.sinkColor||'inox'))||K.SINK_COLORS[0]; const smat = sink.same? tm : M('sink|'+sc.k, ()=>std(sc.c,sc.r,sc.m,{side:THREE.BackSide}));
      si.bowls.forEach(([a,b])=>{ const bb=new THREE.Mesh(new THREE.BoxGeometry(b-a-2,20,si.bd-2), sink.same? std(tm.color,0.3,0,{side:THREE.BackSide}) : smat); bb.position.set((a+b)/2, topY-10.2, si.zc); g.add(bb); });
      if(!sink.under){ const rim=M('rim|'+sc.k,()=>std(sc.c,sc.r,sc.m)); const L=si.sw; box(L,0.4,2.5,rim,0,topY+0.2,si.zc-si.bd/2-1.25,g,false); box(L,0.4,2.5,rim,0,topY+0.2,si.zc+si.bd/2+1.25,g,false); box(2,0.4,si.bd,rim,-L/2+1,topY+0.2,si.zc,g,false); box(2,0.4,si.bd,rim,L/2-1,topY+0.2,si.zc,g,false);
        if(sink.esc){ const ex = si.bowls[si.bowls.length-1][1]; box(L/2-ex-2,0.4,si.bd,rim,(ex+L/2)/2,topY+0.2,si.zc,g,false); for(let i=0;i<6;i++) box(L/2-ex-6,0.3,0.6,DARK(),(ex+L/2)/2,topY+0.45,si.zc-12+i*5,g,false); } }
      if(sink.apron){ box(si.sw,22,2,M('apron',()=>std('#f4f4f2',0.2,0)),0,m.h-9,m.d/2+over-1,g); }
      // grifo
      const tapMat = M('tap|'+(m.o.tapColor||'inox'), ()=>{ const cc=K.HANDLE_COLORS.find(x=>x.k===(m.o.tapColor||'inox'))||K.HANDLE_COLORS[0]; return std(cc.c,cc.r,cc.m); });
      const tz = si.zc - si.bd/2 - 4; const tx = (si.bowls[0][0]+si.bowls[0][1])/2; const tap=m.o.tap||'alto';
      cyl(2,2.2,4,tapMat,tx,topY+2,tz,g);
      if(tap==='bajo'){ cyl(1.2,1.2,14,tapMat,tx,topY+9,tz,g); const s=cyl(1,1,16,tapMat,tx,topY+15,tz+8,g); s.rotation.x=Math.PI/2; }
      else if(tap==='clasico'){ cyl(1.2,1.2,22,tapMat,tx,topY+13,tz,g); const arc=new THREE.Mesh(new THREE.TorusGeometry(9,1,8,20,Math.PI),tapMat); arc.position.set(tx,topY+24,tz+9); arc.rotation.y=Math.PI/2; g.add(arc); cyl(1.5,1.5,5,tapMat,tx-8,topY+4,tz,g); cyl(1.5,1.5,5,tapMat,tx+8,topY+4,tz,g); }
      else { const H= tap==='muelle'?44:32; cyl(1.3,1.3,H,tapMat,tx,topY+H/2,tz,g); const arc=new THREE.Mesh(new THREE.TorusGeometry(10,1.3,10,24,Math.PI),tapMat); arc.position.set(tx,topY+H,tz+10); arc.rotation.y=Math.PI/2; g.add(arc); cyl(1.6,1.4,6,tapMat,tx,topY+H-3,tz+20,g);
        if(tap==='muelle'){ const sp=new THREE.Mesh(new THREE.TorusKnotGeometry(2.5,0.5,40,6,1,12),DARK()); sp.position.set(tx,topY+20,tz); g.add(sp); }
        cyl(0.6,0.6,8,tapMat,tx+3,topY+H*0.6,tz,g).rotation.z=0.8; }
    }
    // placa
    const hob = (c.hob && m.o.hob && m.o.hob!=='ninguna') ? K.HOBS.find(h=>h.k===m.o.hob) : null;
    if(hob){ const hw=Math.min(hob.w,m.w-2), hd=hob.d; const zc=(front+back)/2+2;
      if(hob.t==='gas'){ box(hw,0.8,hd,INOX(),0,topY+0.4,zc,g); const pos={4:[[-.25,-.22],[-.25,.22],[.25,-.22],[.25,.22]],5:[[-.33,-.22],[-.33,.22],[0,0],[.33,-.22],[.33,.22]]}[hob.z]||[]; pos.forEach(([a,b],i)=>{ cyl(3+ (i===2&&hob.z===5?1.5:0),3.5,1.6,DARK(),a*hw,topY+1.6,zc+b*hd,g); }); const gr=M('grate',()=>std('#1a1a1a',0.7,0.3)); box(hw-4,1,1.2,gr,0,topY+2.6,zc,g); box(1.2,1,hd-4,gr,0,topY+2.6,zc,g); box(1.2,1,hd-4,gr,-hw/4,topY+2.6,zc,g); box(1.2,1,hd-4,gr,hw/4,topY+2.6,zc,g); }
      else { const pm=std('#ffffff',0.08,0.1,{map:K.hobTexture(hob.t,hob.z,hw)}); const p=new THREE.Mesh(new THREE.BoxGeometry(hw,0.6,hd),[DARK(),DARK(),pm,DARK(),DARK(),DARK()]); p.position.set(0,topY+0.3,zc); g.add(p); }
    }
  }
  function buildSplash(){
    const sp=st.finish.splash.k; if(sp==='ninguno') return;
    const tH=K.topH(st), cf=st.conf;
    const tiles={metro_blanco:['metro','#f2f2ef'],metro_verde:['metro','#5f7d6c'],metro_negro:['metro','#2b2c2e'],zellige:['zellige','#e6dcc6'],hidraulico:['hidraulico','#e8e1d1'],espiga:['espiga','#eeece6'],cristal:[null,'#f4f4f1'],inox:['metal','#c4c7c9']};
    st.modules.forEach(m=>{
      const c=C()[m.kind]; if(!c || c.cat!=='bajo' || c.open || m.kind==='BBANCO') return; const wo=K.wallOf(m,st.room); if(!wo) return;
      let h = (sp==='copete')? 5 : (sp==='copete10')? 10 : cf.wallBottom - tH;
      // limitar por ventanas
      st.openings.filter(o=>o.wall===wo.wall && (o.type==='ventana'||o.type==='balconera') && o.pos<wo.pos+m.w && o.pos+o.width>wo.pos).forEach(o=>{ h=Math.min(h, Math.max(0,o.sill - tH)); });
      if(h<1) return;
      let mat;
      if(sp==='copete'||sp==='copete10'||sp==='encimera'){ const tp=st.finish.top; const tm=K.TOP_MATS.find(t=>t.k===tp.mat)||K.TOP_MATS[0]; mat=texMat(tm.g,tm.c,0.25,tm.fam==='inox'?0.9:0,m.w,h); }
      else { const [g,col]=tiles[sp]||[null,'#eee']; mat = g? texMat(g,col,sp==='inox'?0.3:0.25,sp==='inox'?0.9:0,m.w,h) : std(col,0.08,0); }
      const p=K.wallPoint(st.room, wo.wall, wo.pos+m.w/2, 0.6);
      const pl=box(m.w, h, 1, mat, p.x, tH+h/2, p.z, root); pl.rotation.y=K.WALL_ROT[wo.wall]*Math.PI/180;
    });
  }

  /* ---------- Electrodomésticos libres ---------- */
  function buildAppliance(m,c,g){
    const am=applMat(st,m); const ft=2;
    box(m.w-0.4,m.h,m.d-ft,am,0,m.h/2,-ft/2,g);
    (c.f(m)||[]).forEach(f=>{ buildFront(m,c,g,f,am,handleMat(st),K.HANDLES[0],'lisa'); });
    if(c.range){ const ho=K.HOBS.find(h=>h.k===(m.o.hob||'gas60'))||K.HOBS[7]; const zc=0; if(ho.t==='gas'){ box(m.w-2,0.8,m.d-6,INOX(),0,m.h+0.4,zc,g); const n=ho.z; for(let i=0;i<n;i++){ const a=(i%2?-1:1)*0.22, b=(Math.floor(i/2)-0.5)*0.5; cyl(3.2,3.6,1.6,DARK(),b*m.w,m.h+1.4,a*m.d,g);} } else { const p=new THREE.Mesh(new THREE.BoxGeometry(m.w-2,0.6,m.d-6),[DARK(),DARK(),std('#fff',0.08,0.1,{map:K.hobTexture(ho.t,ho.z,m.w)}),DARK(),DARK(),DARK()]); p.position.set(0,m.h+0.3,zc); g.add(p);} }
  }
  /* ---------- Campanas ---------- */
  function buildHood(m,c,g){
    const am = M('hood|'+(m.o.color||'inox'), ()=>{ const a=K.APPL_COLORS.find(x=>x.k===(m.o.color||'inox'))||K.APPL_COLORS[0]; return std(a.c,a.r,a.m); });
    const toCeil = st.room.H - m.y;
    const chim=(w,d,x,z)=>{ const hh=toCeil-m.h; if(hh>2) box(w,hh,d,am,x||0,m.h+hh/2,z||0,g); };
    switch(c.hood){
      case 'pir': { box(m.w,6,m.d,am,0,3,0,g); const p=new THREE.Mesh(new THREE.CylinderGeometry(0.28,1,1,4,1),am); p.rotation.y=Math.PI/4; p.scale.set(m.w/Math.SQRT2,m.h-6,m.d/Math.SQRT2); p.position.y=6+(m.h-6)/2; p.castShadow=true; g.add(p); chim(26,24,0,-m.d/2+12); box(m.w-6,0.4,m.d-6,DARK(),0,0,0,g); break; }
      case 'rec': { box(m.w,10,m.d,am,0,5,0,g); chim(28,26,0,-m.d/2+13); box(m.w-6,0.4,m.d-6,DARK(),0,0,0,g); break; }
      case 'inc': { box(m.w,14,22,am,0,m.h-7,-m.d/2+11,g); const gl=box(m.w,m.d*0.9,1,M('hoodglass',()=>std('#0c0d0e',0.05,0.2)),0,m.h*0.45,0,g); gl.rotation.x=-0.75; chim(26,22,0,-m.d/2+11); break; }
      case 'isla': { box(m.w,6,m.d,am,0,3,0,g); const p=new THREE.Mesh(new THREE.CylinderGeometry(0.28,1,1,4,1),am); p.rotation.y=Math.PI/4; p.scale.set(m.w/Math.SQRT2,m.h-6,m.d/Math.SQRT2); p.position.y=6+(m.h-6)/2; g.add(p); chim(26,26,0,0); break; }
      case 'techo': { box(m.w,m.h,m.d,am,0,m.h/2,0,g); box(m.w-6,0.4,m.d-6,DARK(),0,0,0,g); break; }
      case 'cil': { cyl(m.w/2,m.w/2,m.h,am,0,m.h/2,0,g,28); const cable=toCeil-m.h; if(cable>1){ cyl(0.15,0.15,cable,DARK(),-m.w/3,m.h+cable/2,0,g,6); cyl(0.15,0.15,cable,DARK(),m.w/3,m.h+cable/2,0,g,6); } break; }
    }
  }
  /* ---------- Paneles ---------- */
  function buildPanel(m,c,g){
    const fm=frontMat(st,m,m.w,m.h||10);
    switch(c.panel){
      case 'costado': case 'regleta': case 'trasero': box(m.w,m.h,m.d,fm,0,m.h/2,0,g); break;
      case 'barra': { const {m:tm}=topMaterial(false); const shape=new THREE.Shape(); shape.moveTo(-m.w/2,m.d/2); shape.lineTo(m.w/2,m.d/2); shape.lineTo(m.w/2,-m.d/2); shape.lineTo(-m.w/2,-m.d/2); const geo=new THREE.ExtrudeGeometry(shape,{depth:m.h,bevelEnabled:false}); const me=new THREE.Mesh(geo,tm); me.rotation.x=-Math.PI/2; me.castShadow=true; g.add(me); if(m.o.patas!==false){ const pm=handleMat(st); cyl(2,2,m.y,pm,-m.w/2+8,-m.y/2,0,g); cyl(2,2,m.y,pm,m.w/2-8,-m.y/2,0,g); } break; }
      case 'estanteria': { const pm=M('shelfmetal',()=>std('#1e1f20',0.5,0.6)); [[-m.w/2+1,-m.d/2+1],[m.w/2-1,-m.d/2+1],[-m.w/2+1,m.d/2-1],[m.w/2-1,m.d/2-1]].forEach(([x,z])=>box(1.2,m.h,1.2,pm,x,m.h/2,z,g)); for(let i=0;i<3;i++) box(m.w,2,m.d,frontMat(st,m,m.w,m.d),0,2+i*(m.h-4)/2,0,g); break; }
    }
  }
  /* ---------- Decoración ---------- */
  function buildDeco(m,c,g){
    const wood=M('decowood',()=>std('#a77a4c',0.6,0)), metal=M('decometal',()=>std('#222',0.5,0.5)), fabric=M('fabric',()=>std('#c9c2b6',0.9,0));
    switch(c.deco){
      case 'taburete': cyl(18,18,4,wood,0,m.h-2,0,g,24); [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>{ const l=cyl(1,1,m.h-4,metal,a*12,(m.h-4)/2,b*12,g,8); }); box(26,1,1,metal,0,28,12,g); break;
      case 'silla': box(m.w,4,m.d-6,fabric,0,46,3,g); box(m.w,40,3,fabric,0,68,-m.d/2+3,g); [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>cyl(1.2,1,44,wood,a*(m.w/2-3),22,b*(m.d/2-5),g,8)); break;
      case 'mesa': box(m.w,4,m.d,wood,0,m.h-2,0,g); [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a,b])=>box(5,m.h-4,5,wood,a*(m.w/2-6),(m.h-4)/2,b*(m.d/2-6),g)); break;
      case 'mesar': cyl(m.w/2,m.w/2,4,wood,0,m.h-2,0,g,40); cyl(4,6,m.h-4,metal,0,(m.h-4)/2,0,g); cyl(22,22,2,metal,0,1,0,g,30); break;
      case 'lampara': { const cable=st.room.H-m.y-m.h; if(cable>0) cyl(0.3,0.3,cable,metal,0,m.h+cable/2,0,g,6); const sh=new THREE.Mesh(new THREE.ConeGeometry(m.w/2,m.h*0.7,28,1,true),M('lampsh',()=>std('#1d1e1f',0.5,0.4,{side:THREE.DoubleSide}))); sh.position.y=m.h*0.65; g.add(sh); const b=new THREE.Mesh(new THREE.SphereGeometry(4,12,10),new THREE.MeshBasicMaterial({color:'#fff2d0'})); b.position.y=m.h*0.35; g.add(b); const pl=new THREE.PointLight('#ffdcae',0.5,350,2); pl.position.y=m.h*0.3; g.add(pl); break; }
      case 'planta': cyl(14,11,30,M('pot',()=>std('#c47a55',0.8,0)),0,15,0,g); for(let i=0;i<7;i++){ const s=new THREE.Mesh(new THREE.SphereGeometry(10+i%3*3,10,8),M('leaf',()=>std('#4d6b3f',0.8,0))); s.position.set(Math.sin(i)*10,45+i*8,Math.cos(i*1.7)*9); g.add(s); } break;
    }
  }

  /* ---------- Selección ---------- */
  S.select = function(id){
    if(selBox){ root.remove(selBox); selBox.geometry.dispose(); selBox=null; }
    if(!id || !st) return; const m=st.modules.find(x=>x.id===id); if(!m) return;
    const yb = K.cat(m)==='campana'? Math.max(m.h, st.room.H-m.y) : m.h;
    const geo=new THREE.EdgesGeometry(new THREE.BoxGeometry(m.w+1,yb+1,m.d+1));
    selBox=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#1f6fd1', depthTest:false})); selBox.renderOrder=999;
    selBox.position.set(m.x, m.y+yb/2, m.z); selBox.rotation.y=m.rot*Math.PI/180; root.add(selBox);
  };

  /* ---------- Abrir puertas ---------- */
  S.setOpen = function(v){ openTarget = v?1:0; };
  function applyOpen(t){
    pivots.forEach(p=>{ const d=p.userData; const e=t*t*(3-2*t);
      if(d.type==='puerta'){ p.rotation.y = (d.hinge==='der'? 1 : -1) * e * 1.75; }
      else if(d.type==='abatible'){ p.rotation.x = -e*1.3; }
      else if(d.type==='cajon'){ p.position.z = p.userData.z0 + e*Math.min(45, d.cat==='columna'?50:45); }
    });
  }

  /* ---------- Cámara ---------- */
  S.view = function(name){
    if(!st) return; const r=st.room; mode='orbit'; controls.enabled=true; walk=null; controls.minDistance=40;
    const c=new THREE.Vector3(r.W/2, 95, r.D/2); controls.target.copy(c);
    const big=Math.max(r.W,r.D)*Math.max(1, 1.25/Math.max(0.3,camera.aspect));
    if(name==='persp') camera.position.set(r.W*0.5+big*0.35, big*1.15, r.D+big*1.25);
    if(name==='frontal') camera.position.set(r.W/2, 150, r.D+big*1.55);
    if(name==='cenital') { camera.position.set(r.W/2, big*2.3, r.D/2+1); }
    if(name==='izq') camera.position.set(-big*0.9, big*0.9, r.D*0.9);
    if(name==='der') camera.position.set(r.W+big*0.9, big*0.9, r.D*0.9);
    if(name==='ojo'){ // desde la puerta o desde el centro del lado C
      const door=st.openings.find(o=>/puerta|paso|corredera/.test(o.type));
      let p, tgt=c.clone(); if(door){ const q=K.wallPoint(r,door.wall,door.pos+door.width/2,25); p=new THREE.Vector3(q.x,162,q.z); } else p=new THREE.Vector3(r.W/2,162,r.D-25);
      camera.position.copy(p); tgt.y=120; controls.target.copy(tgt); controls.minDistance=1;
    }
    controls.update();
  };
  S.walk = function(on){
    if(!on){ S.view('persp'); return; }
    const r=st.room; mode='walk'; walk={yaw:Math.PI, pitch:-0.1, pos:new THREE.Vector3(r.W/2,162,r.D-40)};
    const door=st.openings.find(o=>/puerta|paso|corredera/.test(o.type)); if(door){ const q=K.wallPoint(r,door.wall,door.pos+door.width/2,30); walk.pos.set(q.x,162,q.z); const dx=r.W/2-q.x, dz=r.D/2-q.z; walk.yaw=Math.atan2(dx,dz); }
    controls.enabled=false;
  };
  S.walkMove = function(fw, side, turn){ if(!walk) return; walk.yaw += (turn||0)*0.06; const dx=Math.sin(walk.yaw), dz=Math.cos(walk.yaw); walk.pos.x += (dx*fw + dz*side)*8; walk.pos.z += (dz*fw - dx*side)*8; const r=st.room; walk.pos.x=Math.max(20,Math.min(r.W-20,walk.pos.x)); walk.pos.z=Math.max(20,Math.min(r.D-20,walk.pos.z)); };
  S.setAutoRotate = function(v){ autoRotate=v; controls.autoRotate=v; controls.autoRotateSpeed=0.8; };
  S.snapshot = function(w,h){ const ow=renderer.domElement.width, oh=renderer.domElement.height; if(w&&h){ renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); } renderer.render(scene,camera); const url=renderer.domElement.toDataURL('image/png'); if(w&&h){ S.resize(); } return url; };
  S.snapshotBlob = function(){ return new Promise(res=>{ renderer.render(scene,camera); renderer.domElement.toBlob(b=>res(b),'image/png'); }); };

  /* ---------- Interacción ---------- */
  let drag=null, downPt=null, moved=false;
  function ndc(e){ const r=renderer.domElement.getBoundingClientRect(); return new THREE.Vector2(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1); }
  function pickModule(e){ raycaster.setFromCamera(ndc(e),camera); const hits=raycaster.intersectObjects(root.children,true); for(const h of hits){ let o=h.object; if(!o.visible) continue; let skip=false; let p=o; while(p){ if(p.userData && p.userData.wall!==undefined && !p.visible){skip=true;break;} p=p.parent; } if(skip) continue; while(o && !(o.userData && o.userData.modId)) o=o.parent; if(o) return {id:o.userData.modId, obj:o, point:h.point}; if(h.object.userData && h.object.userData.wall===undefined){} } return null; }
  function floorPoint(e,y){ raycaster.setFromCamera(ndc(e),camera); const pl=new THREE.Plane(new THREE.Vector3(0,1,0), -(y||0)); const p=new THREE.Vector3(); return raycaster.ray.intersectPlane(pl,p)? p : null; }
  function bindPointer(el){
    el.addEventListener('pointerdown', e=>{
      downPt={x:e.clientX,y:e.clientY}; moved=false;
      if(mode==='walk'){ drag={walk:true,x:e.clientX,y:e.clientY,yaw:walk.yaw,pitch:walk.pitch}; el.setPointerCapture(e.pointerId); return; }
      const hit=pickModule(e);
      if(hit && hit.id===K.app.selId && K.app.canEdit()){
        const m=st.modules.find(x=>x.id===hit.id); const fp=floorPoint(e, m.y); if(!fp) return;
        drag={id:hit.id, obj:hit.obj, dx:m.x-fp.x, dz:m.z-fp.z, y:m.y}; controls.enabled=false; el.setPointerCapture(e.pointerId);
      }
    });
    el.addEventListener('pointermove', e=>{
      if(downPt && Math.hypot(e.clientX-downPt.x,e.clientY-downPt.y)>5) moved=true;
      if(!drag) return;
      if(drag.walk){ walk.yaw = drag.yaw - (e.clientX-drag.x)*0.005; walk.pitch = Math.max(-1,Math.min(0.8, drag.pitch - (e.clientY-drag.y)*0.004)); return; }
      const fp=floorPoint(e, drag.y); if(!fp) return; const m=st.modules.find(x=>x.id===drag.id);
      const cand = Object.assign({}, m, {x:fp.x+drag.dx, z:fp.z+drag.dz});
      K.snapModule(cand, st);
      drag.cand=cand; drag.obj.position.set(cand.x, cand.y, cand.z); drag.obj.rotation.y=cand.rot*Math.PI/180;
      if(selBox){ selBox.position.x=cand.x; selBox.position.z=cand.z; selBox.rotation.y=drag.obj.rotation.y; }
      K.app.liveInfo(cand);
    });
    const up=e=>{
      if(drag && !drag.walk){ if(drag.cand){ K.app.commitMove(drag.id, drag.cand); } controls.enabled=true; drag=null; downPt=null; return; }
      if(drag && drag.walk){ drag=null; }
      if(!moved && downPt){ const hit=pickModule(e); K.app.select(hit? hit.id : null, '3d'); }
      downPt=null;
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', ()=>{ if(drag && !drag.walk){ controls.enabled=true; K.app.render(); } drag=null; downPt=null; });
  }

  function animate(){
    requestAnimationFrame(animate);
    const dt=Math.min(0.05, clock.getDelta());
    if(Math.abs(openT-openTarget)>0.001){ openT += Math.sign(openTarget-openT)*Math.min(Math.abs(openTarget-openT), dt*1.6); applyOpen(openT); }
    if(mode==='walk' && walk){ camera.position.copy(walk.pos); const t=new THREE.Vector3(walk.pos.x+Math.sin(walk.yaw)*Math.cos(walk.pitch), walk.pos.y+Math.sin(walk.pitch), walk.pos.z+Math.cos(walk.yaw)*Math.cos(walk.pitch)); camera.lookAt(t); }
    else controls.update();
    // paredes recortadas
    if(st){ const r=st.room; wallMeshes.forEach(g=>{ const w=g.userData.wall; let vis=true; if(mode!=='walk'){ const cp=camera.position; if(w===0) vis = cp.z > 0 - 5; if(w===1) vis = cp.x < r.W + 5; if(w===2) vis = cp.z < r.D + 5; if(w===3) vis = cp.x > -5; if(!vis) {} } g.visible = vis || S.allWalls===true; }); }
    renderer.render(scene,camera);
  }
})();
