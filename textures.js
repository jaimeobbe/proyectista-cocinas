/* Texturas procedurales (sin imágenes externas). Cada textura representa "size" cm del mundo real. */
(function(){
  const cache = {};
  function rng(seed){ let s = seed>>>0 || 1; return ()=>{ s^=s<<13; s^=s>>>17; s^=s<<5; return ((s>>>0)%100000)/100000; }; }
  function hexToRgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
  function shade(hex, f){ const [r,g,b]=hexToRgb(hex); const t=f<0?0:255, p=Math.abs(f); return `rgb(${Math.round((t-r)*p+r)},${Math.round((t-g)*p+g)},${Math.round((t-b)*p+b)})`; }
  K.shade = shade; K.hexToRgb = hexToRgb;

  function canvas(n){ const c=document.createElement('canvas'); c.width=c.height=n; return c; }
  function noise(ctx,n,amt,r){ const id=ctx.getImageData(0,0,n,n); const d=id.data; for(let i=0;i<d.length;i+=4){ const v=(r()-0.5)*amt; d[i]+=v; d[i+1]+=v; d[i+2]+=v; } ctx.putImageData(id,0,0); }

  const painters = {
    madera(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n);
      for(let i=0;i<140;i++){ const x=r()*n; const w=0.6+r()*2.2; ctx.strokeStyle= r()<0.5? shade(c,-0.12-r()*0.12): shade(c,0.06+r()*0.08); ctx.globalAlpha=0.35+r()*0.4; ctx.lineWidth=w; ctx.beginPath(); let y=0; ctx.moveTo(x,0); while(y<n){ y+=n/16; ctx.lineTo(x+Math.sin(y/n*6+i)*3*r(), y);} ctx.stroke(); }
      for(let k=0;k<3;k++){ const cx=r()*n, cy=r()*n; ctx.globalAlpha=0.25; ctx.strokeStyle=shade(c,-0.25); for(let j=1;j<8;j++){ ctx.beginPath(); ctx.ellipse(cx,cy,j*3,j*14,0,0,Math.PI*2); ctx.stroke(); } }
      ctx.globalAlpha=1; noise(ctx,n,10,r); },
    marmol(ctx,n,c,r,vein){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); noise(ctx,n,6,r);
      const vc = vein || shade(c,-0.38);
      for(let i=0;i<9;i++){ ctx.strokeStyle=vc; ctx.globalAlpha=0.18+r()*0.45; ctx.lineWidth=0.5+r()*2.5; ctx.beginPath(); let x=r()*n, y=0; ctx.moveTo(x,y); while(y<n*1.05){ x+= (r()-0.5)*n*0.12; y+= n*0.05; ctx.lineTo(x,y);} ctx.stroke(); }
      ctx.globalAlpha=1; },
    granito(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); for(let i=0;i<n*n/18;i++){ const v=r(); ctx.fillStyle= v<0.33? shade(c,-0.35): v<0.66? shade(c,0.25): shade(c,-0.12); ctx.globalAlpha=0.7; const s=0.6+r()*2.4; ctx.fillRect(r()*n,r()*n,s,s);} ctx.globalAlpha=1; },
    granulado(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); for(let i=0;i<n*n/40;i++){ ctx.fillStyle= r()<0.5? shade(c,-0.14): shade(c,0.12); ctx.globalAlpha=0.6; ctx.fillRect(r()*n,r()*n,1.2,1.2);} ctx.globalAlpha=1; },
    cemento(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); for(let i=0;i<60;i++){ const g=ctx.createRadialGradient(r()*n,r()*n,0,r()*n,r()*n,20+r()*90); g.addColorStop(0, r()<0.5?shade(c,-0.1):shade(c,0.08)); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.globalAlpha=0.5; ctx.fillStyle=g; ctx.fillRect(0,0,n,n);} ctx.globalAlpha=1; noise(ctx,n,14,r); },
    travertino(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); for(let i=0;i<80;i++){ ctx.fillStyle= shade(c, (r()-0.5)*0.25); ctx.globalAlpha=0.5; ctx.fillRect(0,r()*n,n,1+r()*4);} for(let i=0;i<60;i++){ ctx.fillStyle=shade(c,-0.3); ctx.globalAlpha=0.35; ctx.fillRect(r()*n,r()*n,2+r()*8,1+r()*2);} ctx.globalAlpha=1; noise(ctx,n,8,r); },
    terrazo(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); const cols=['#8a8a86','#c4a27f','#5d5f61','#d9d4ca','#a35e47','#3c3d3f']; for(let i=0;i<n*n/90;i++){ ctx.fillStyle=cols[Math.floor(r()*cols.length)]; ctx.globalAlpha=0.9; ctx.beginPath(); const x=r()*n,y=r()*n,s=1+r()*5; ctx.moveTo(x,y); ctx.lineTo(x+s,y+r()*s); ctx.lineTo(x+r()*s,y+s); ctx.fill(); } ctx.globalAlpha=1; },
    metal(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); for(let i=0;i<n*2;i++){ ctx.strokeStyle= r()<0.5? shade(c,-0.08): shade(c,0.1); ctx.globalAlpha=0.35; ctx.beginPath(); const y=r()*n; ctx.moveTo(0,y); ctx.lineTo(n,y+ (r()-0.5)*2); ctx.stroke(); } ctx.globalAlpha=1; },
    tarima(ctx,n,c,r){ const rows=6; const h=n/rows; for(let j=0;j<rows;j++){ let x=-r()*n; while(x<n){ const L=n*(0.5+r()*0.6); ctx.fillStyle=shade(c,(r()-0.5)*0.18); ctx.fillRect(x,j*h,L,h); ctx.globalAlpha=0.25; for(let k=0;k<10;k++){ ctx.strokeStyle=shade(c,-0.2); ctx.beginPath(); const yy=j*h+r()*h; ctx.moveTo(x,yy); ctx.lineTo(x+L,yy+(r()-0.5)*3); ctx.stroke(); } ctx.globalAlpha=1; ctx.strokeStyle=shade(c,-0.35); ctx.lineWidth=1; ctx.strokeRect(x,j*h,L,h); x+=L; } } noise(ctx,n,8,r); },
    espiga(ctx,n,c,r){ ctx.fillStyle=c; ctx.fillRect(0,0,n,n); const L=n/4, W=n/16; ctx.save(); for(let i=-8;i<16;i++){ for(let j=-8;j<16;j++){ const x=i*W*2, y=j*W*2+i*W*2; ctx.save(); ctx.translate(x+ (j%2)*0 ,y); ctx.rotate(Math.PI/4*((i+j)%2?1:-1)); ctx.fillStyle=shade(c,(r()-0.5)*0.2); ctx.fillRect(0,0,L,W); ctx.strokeStyle=shade(c,-0.35); ctx.strokeRect(0,0,L,W); ctx.restore(); } } ctx.restore(); noise(ctx,n,8,r); },
    baldosa(ctx,n,c,r){ const k=2; const s=n/k; for(let i=0;i<k;i++)for(let j=0;j<k;j++){ ctx.fillStyle=shade(c,(r()-0.5)*0.06); ctx.fillRect(i*s,j*s,s,s);} noise(ctx,n,6,r); ctx.strokeStyle=shade(c,-0.25); ctx.lineWidth=2; for(let i=0;i<=k;i++){ ctx.beginPath(); ctx.moveTo(i*s,0); ctx.lineTo(i*s,n); ctx.moveTo(0,i*s); ctx.lineTo(n,i*s); ctx.stroke(); } },
    marmol_baldosa(ctx,n,c,r){ painters.marmol(ctx,n,c,r); ctx.strokeStyle=shade(c,-0.2); ctx.lineWidth=2; ctx.strokeRect(1,1,n-2,n-2); },
    hidraulico(ctx,n,c,r){ const k=4, s=n/k; const a='#2f4b5a', b='#c46b4a', base=c; for(let i=0;i<k;i++)for(let j=0;j<k;j++){ const x=i*s,y=j*s; ctx.fillStyle=base; ctx.fillRect(x,y,s,s); ctx.fillStyle=a; ctx.beginPath(); ctx.arc(x,y,s*0.45,0,Math.PI/2); ctx.lineTo(x,y); ctx.fill(); ctx.beginPath(); ctx.arc(x+s,y,s*0.45,Math.PI/2,Math.PI); ctx.lineTo(x+s,y); ctx.fill(); ctx.beginPath(); ctx.arc(x,y+s,s*0.45,-Math.PI/2,0); ctx.lineTo(x,y+s); ctx.fill(); ctx.beginPath(); ctx.arc(x+s,y+s,s*0.45,Math.PI,Math.PI*1.5); ctx.lineTo(x+s,y+s); ctx.fill(); ctx.fillStyle=b; ctx.beginPath(); ctx.arc(x+s/2,y+s/2,s*0.16,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(0,0,0,.2)'; ctx.strokeRect(x,y,s,s);} },
    ajedrez(ctx,n){ const k=4,s=n/k; for(let i=0;i<k;i++)for(let j=0;j<k;j++){ ctx.fillStyle=(i+j)%2?'#1f1f20':'#ecebe6'; ctx.fillRect(i*s,j*s,s,s);} },
    metro(ctx,n,c,r){ const rows=12, h=n/rows, w=n/4; ctx.fillStyle=shade(c,-0.15); ctx.fillRect(0,0,n,n); for(let j=0;j<rows;j++){ const off=(j%2)*w/2; for(let x=-w;x<n+w;x+=w){ ctx.fillStyle=shade(c,(r()-0.5)*0.08); ctx.fillRect(x+off+1,j*h+1,w-2,h-2); const g=ctx.createLinearGradient(0,j*h,0,j*h+h); g.addColorStop(0,'rgba(255,255,255,.25)'); g.addColorStop(1,'rgba(0,0,0,.08)'); ctx.fillStyle=g; ctx.fillRect(x+off+1,j*h+1,w-2,h-2);} } },
    zellige(ctx,n,c,r){ const k=8,s=n/k; ctx.fillStyle='#bdb3a2'; ctx.fillRect(0,0,n,n); for(let i=0;i<k;i++)for(let j=0;j<k;j++){ ctx.fillStyle=shade(c,(r()-0.5)*0.22); ctx.fillRect(i*s+1,j*s+1,s-2,s-2); const g=ctx.createRadialGradient(i*s+s*r(),j*s+s*r(),1,i*s+s/2,j*s+s/2,s); g.addColorStop(0,'rgba(255,255,255,.35)'); g.addColorStop(1,'rgba(0,0,0,.1)'); ctx.fillStyle=g; ctx.fillRect(i*s+1,j*s+1,s-2,s-2);} },
    espiga_az(ctx,n,c,r){ painters.espiga(ctx,n,c,r); }
  };

  /* size: cm representados por la textura */
  const SIZES = {madera:120, marmol:160, marmol_oro:160, marmol_negro:160, granito:60, granulado:60, cemento:200, travertino:120, terrazo:80, metal:60, tarima:240, espiga:120, baldosa:120, marmol_baldosa:80, hidraulico:80, ajedrez:120, metro:60, zellige:80, espiga_az:60, piedra:160};

  K.texture = function(g, color, seed){
    if(!g || g==='liso') return null;
    const key = g+'|'+color+'|'+(seed||0);
    if(cache[key]) return cache[key];
    const n = (g==='granito'||g==='granulado')? 256 : 512;
    const c = canvas(n); const ctx=c.getContext('2d'); const r=rng((seed||7)*9301+g.length*49297);
    let p = g;
    if(g==='marmol_oro'){ painters.marmol(ctx,n,color,r,'#b89a62'); }
    else if(g==='marmol_negro'||g==='piedra'){ painters.marmol(ctx,n,color,r,'#d9d6cf'); }
    else (painters[p]||painters.cemento)(ctx,n,color,r);
    const t = new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.encoding=THREE.sRGBEncoding; t.anisotropy=4;
    t.userData={size: SIZES[g]||100};
    cache[key]=t; return t;
  };
  /* Devuelve un clon con la repetición ajustada a las medidas (cm) de la superficie */
  K.texFor = function(g,color,w,h,seed,rot){
    const base=K.texture(g,color,seed); if(!base) return null;
    const t=base.clone(); t.needsUpdate=true; const s=base.userData.size||100;
    t.repeat.set(Math.max(0.05,w/s), Math.max(0.05,h/s)); if(rot){ t.rotation=rot; t.center.set(0.5,0.5);} return t;
  };

  /* Texturas de aparatos */
  K.hobTexture = function(type, zones, w){
    const key='hob|'+type+'|'+zones+'|'+w; if(cache[key]) return cache[key];
    const W=512, H=Math.round(512*52/w); const c=document.createElement('canvas'); c.width=W; c.height=H; const x=c.getContext('2d');
    x.fillStyle='#0c0d0e'; x.fillRect(0,0,W,H);
    x.strokeStyle='rgba(255,255,255,.35)'; x.lineWidth=3;
    const pos = {2:[[.5,.3],[.5,.72]],3:[[.27,.36],[.27,.72],[.68,.5]],4:[[.27,.32],[.27,.72],[.73,.32],[.73,.72]],5:[[.2,.32],[.2,.72],[.5,.5],[.8,.32],[.8,.72]]}[zones]||[];
    if(type==='flex'){ x.strokeRect(W*.08,H*.15,W*.38,H*.7); x.strokeRect(W*.54,H*.15,W*.38,H*.7); }
    else if(type==='ext'){ pos.forEach(()=>{}); [[.2,.32],[.2,.72],[.8,.32],[.8,.72]].forEach(([a,b])=>{ x.beginPath(); x.arc(W*a,H*b,H*0.17,0,7); x.stroke();}); x.fillStyle='#1d1f21'; x.fillRect(W*.4,H*.12,W*.2,H*.76); x.strokeStyle='rgba(255,255,255,.25)'; for(let i=0;i<10;i++){ x.beginPath(); x.moveTo(W*.42,H*(.16+i*.07)); x.lineTo(W*.58,H*(.16+i*.07)); x.stroke(); } }
    else pos.forEach(([a,b],i)=>{ const rr=H*(i%2? .14:.19); x.beginPath(); x.arc(W*a,H*b,rr,0,7); x.stroke(); x.beginPath(); x.arc(W*a,H*b,rr*0.6,0,7); x.globalAlpha=.5; x.stroke(); x.globalAlpha=1; });
    x.fillStyle='rgba(255,255,255,.45)'; for(let i=0;i<5;i++){ x.fillRect(W*(.4+i*.045),H*.9,W*.02,H*.03); }
    const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; cache[key]=t; return t;
  };
  K.panelTexture = function(kind){ // cristal horno, microondas, etc.
    const key='pt|'+kind; if(cache[key]) return cache[key];
    const c=document.createElement('canvas'); c.width=256; c.height=256; const x=c.getContext('2d');
    x.fillStyle='#101112'; x.fillRect(0,0,256,256);
    if(kind==='horno'){ x.fillStyle='#1b1c1e'; x.fillRect(0,0,256,46); x.fillStyle='#6ad0ff'; x.fillRect(110,16,36,12); x.fillStyle='#0a0a0b'; x.fillRect(22,64,212,170); const g=x.createLinearGradient(0,64,0,234); g.addColorStop(0,'rgba(255,255,255,.12)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle=g; x.fillRect(22,64,212,170); }
    if(kind==='micro'){ x.fillStyle='#070708'; x.fillRect(16,30,170,196); x.fillStyle='#1c1d1f'; x.fillRect(200,30,40,196); x.fillStyle='#6ad0ff'; x.fillRect(206,44,28,10); }
    if(kind==='cafetera'){ x.fillStyle='#1c1d1f'; x.fillRect(0,0,256,256); x.fillStyle='#070708'; x.fillRect(80,90,96,140); x.fillStyle='#6ad0ff'; x.fillRect(100,30,56,20); }
    if(kind==='vino'){ x.fillStyle='#0b0b0c'; x.fillRect(0,0,256,256); x.fillStyle='#2b1a14'; for(let j=0;j<6;j++) for(let i=0;i<5;i++){ x.beginPath(); x.arc(40+i*44,40+j*36,12,0,7); x.fill(); } x.fillStyle='rgba(120,180,255,.18)'; x.fillRect(0,0,256,256); }
    if(kind==='lavadora'){ x.fillStyle='#eee'; x.fillRect(0,0,256,256); x.fillStyle='#ccc'; x.fillRect(0,0,256,40); x.beginPath(); x.arc(128,150,72,0,7); x.fillStyle='#9aa0a4'; x.fill(); x.beginPath(); x.arc(128,150,54,0,7); x.fillStyle='#223'; x.fill(); }
    if(kind==='mandos'){ x.fillStyle='#202224'; x.fillRect(0,0,256,256); x.fillStyle='#9aa'; for(let i=0;i<5;i++){ x.beginPath(); x.arc(30+i*48,128,16,0,7); x.fill(); } }
    const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; cache[key]=t; return t;
  };
})();
