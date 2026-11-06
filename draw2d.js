/* Planta y alzados técnicos en canvas 2D, con cotas. */
(function(){
  const D = K.D2 = {};
  const C=()=>K.CATALOG;
  function css(n){ return getComputedStyle(document.documentElement).getPropertyValue(n).trim()||'#888'; }
  function pal(){ return {bg:css('--canvas'), ink:css('--ink'), mute:css('--mute'), line:css('--line'), wall:css('--wall'), accent:css('--accent'), dim:css('--dim'), err:css('--bad'), warn:css('--warn'), base:css('--fill-base'), tall:css('--fill-tall'), upper:css('--fill-upper'), appl:css('--fill-appl')}; }
  const fmt=(v)=> (K.app && K.app.state.conf.units==='mm')? String(Math.round(v*10)) : (Math.round(v*10)/10).toString().replace('.',',');

  /* ---------- Vista en planta ---------- */
  const V = {s:1, ox:0, oy:0, fit:true};
  D.planView = V;
  function fitPlan(cv, st, pad){ const r=st.room; const W=cv.width, H=cv.height; const s=Math.min((W-2*pad)/(r.W+40),(H-2*pad)/(r.D+40)); return {s, ox:(W-r.W*s)/2, oy:(H-r.D*s)/2}; }
  D.resetPlan = ()=>{ V.fit=true; };
  function arrow(ctx,x1,y1,x2,y2,label,col,font){
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    const tick=(x,y)=>{ ctx.beginPath(); ctx.moveTo(x-3,y+3); ctx.lineTo(x+3,y-3); ctx.stroke(); };
    tick(x1,y1); tick(x2,y2);
    const len=Math.hypot(x2-x1,y2-y1); if(len<14) return;
    ctx.save(); ctx.translate((x1+x2)/2,(y1+y2)/2); let a=Math.atan2(y2-y1,x2-x1); if(a>Math.PI/2||a<-Math.PI/2) a+=Math.PI; ctx.rotate(a);
    ctx.font=font; const tw=ctx.measureText(label).width; if(tw>len-4 && len<40){ ctx.restore(); return; }
    ctx.fillStyle=pal().bg; ctx.fillRect(-tw/2-2,-7,tw+4,12); ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label,0,0); ctx.restore();
  }
  D.drawPlan = function(cv, st, opts){
    opts=opts||{}; const ctx=cv.getContext('2d'); const P=pal(); const dpr=opts.dpr||1;
    const W=cv.width, H=cv.height; ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle=opts.bg||P.bg; ctx.fillRect(0,0,W,H);
    const r=st.room; let s,ox,oy;
    if(opts.thumb || V.fit){ const f=fitPlan(cv,st, opts.thumb? 8*dpr : 105*dpr); s=f.s; ox=f.ox; oy=f.oy; if(!opts.thumb){ V.s=s; V.ox=ox; V.oy=oy; V.fit=false; } }
    else { s=V.s; ox=V.ox; oy=V.oy; }
    const X=(x)=>ox+x*s, Y=(z)=>oy+z*s; D._tr={s,ox,oy};
    const font=`${11*dpr}px "JetBrains Mono", ui-monospace, monospace`, fontS=`${10*dpr}px "Barlow", sans-serif`;
    // suelo
    ctx.fillStyle=opts.thumb? P.bg : P.bg; ctx.fillRect(X(0),Y(0),r.W*s,r.D*s);
    // rejilla 50 cm
    if(!opts.thumb){ ctx.strokeStyle=P.line; ctx.globalAlpha=0.5; ctx.lineWidth=1; for(let x=50;x<r.W;x+=50){ ctx.beginPath(); ctx.moveTo(X(x),Y(0)); ctx.lineTo(X(x),Y(r.D)); ctx.stroke(); } for(let z=50;z<r.D;z+=50){ ctx.beginPath(); ctx.moveTo(X(0),Y(z)); ctx.lineTo(X(r.W),Y(z)); ctx.stroke(); } ctx.globalAlpha=1; }
    // muros
    const T=12; ctx.fillStyle=P.wall;
    ctx.fillRect(X(-T),Y(-T),(r.W+2*T)*s,T*s); ctx.fillRect(X(-T),Y(r.D),(r.W+2*T)*s,T*s); ctx.fillRect(X(-T),Y(0),T*s,r.D*s); ctx.fillRect(X(r.W),Y(0),T*s,r.D*s);
    // huecos
    const drawOpen=(onlyPts)=>st.openings.forEach(o=>{
      const t=K.OPENINGS.find(x=>x.k===o.type)||{};
      if(onlyPts !== (t.kind!=='hueco')) return;
      const a=K.wallPoint(r,o.wall,o.pos,0), b=K.wallPoint(r,o.wall,o.pos+o.width,0), ao=K.wallPoint(r,o.wall,o.pos,-T), bo=K.wallPoint(r,o.wall,o.pos+o.width,-T);
      const sel = opts.selOpen===o.id;
      if(t.kind==='hueco'){
        ctx.fillStyle=P.bg; ctx.beginPath(); ctx.moveTo(X(a.x),Y(a.z)); ctx.lineTo(X(b.x),Y(b.z)); ctx.lineTo(X(bo.x),Y(bo.z)); ctx.lineTo(X(ao.x),Y(ao.z)); ctx.closePath(); ctx.fill();
        ctx.strokeStyle= sel? P.accent : P.ink; ctx.lineWidth= sel? 2.5 : 1.2;
        const isDoor=['puerta','puerta_doble','balconera'].includes(o.type);
        if(o.type==='ventana'||o.type==='ventana_alta'||o.type==='balconera'){ const m1=K.wallPoint(r,o.wall,o.pos,-T*0.35), m2=K.wallPoint(r,o.wall,o.pos+o.width,-T*0.35), n1=K.wallPoint(r,o.wall,o.pos,-T*0.65), n2=K.wallPoint(r,o.wall,o.pos+o.width,-T*0.65); ctx.beginPath(); ctx.moveTo(X(m1.x),Y(m1.z)); ctx.lineTo(X(m2.x),Y(m2.z)); ctx.moveTo(X(n1.x),Y(n1.z)); ctx.lineTo(X(n2.x),Y(n2.z)); ctx.stroke(); }
        if(o.type==='puerta' || o.type==='puerta_doble'){
          const leaves = o.type==='puerta_doble'? [[o.pos, o.width/2, false],[o.pos+o.width, o.width/2, true]] : [[o.hingeR? o.pos+o.width : o.pos, o.width, !!o.hingeR]];
          leaves.forEach(([hp,lw,rev])=>{ const h0=K.wallPoint(r,o.wall,hp,0); const tip=K.wallPoint(r,o.wall,hp,lw); const end=K.wallPoint(r,o.wall,rev? hp-lw : hp+lw,0);
            ctx.beginPath(); ctx.moveTo(X(h0.x),Y(h0.z)); ctx.lineTo(X(tip.x),Y(tip.z)); ctx.stroke();
            ctx.setLineDash([3*dpr,3*dpr]); ctx.beginPath(); const steps=16; for(let i=0;i<=steps;i++){ const ang=i/steps*Math.PI/2; const pp=K.wallPoint(r,o.wall, hp + (rev?-1:1)*lw*Math.cos(ang), lw*Math.sin(ang)); i? ctx.lineTo(X(pp.x),Y(pp.z)) : ctx.moveTo(X(pp.x),Y(pp.z)); } ctx.stroke(); ctx.setLineDash([]); });
        }
        if(o.type==='corredera'){ const p1=K.wallPoint(r,o.wall,o.pos+o.width*0.3,-T-3), p2=K.wallPoint(r,o.wall,o.pos+o.width*1.3,-T-3); ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(X(p1.x),Y(p1.z)); ctx.lineTo(X(p2.x),Y(p2.z)); ctx.stroke(); }
      } else {
        const c=K.wallPoint(r,o.wall,o.pos+o.width/2, (t.dep||2)/2+3);
        const col={agua:'#2a7fd4',desague:'#6b7780',gas:'#d49a00',enchufe:P.ink,interruptor:P.ink,humos:'#7a7f83',radiador:P.mute,caldera:P.mute,cuadro:P.mute}[o.type]||P.mute;
        if(t.kind==='obra'){ const a1=K.wallPoint(r,o.wall,o.pos,0), b1=K.wallPoint(r,o.wall,o.pos+o.width,t.dep||8); ctx.strokeStyle=col; ctx.lineWidth=1.5; ctx.strokeRect(X(Math.min(a1.x,b1.x)),Y(Math.min(a1.z,b1.z)),Math.abs(b1.x-a1.x)*s,Math.abs(b1.z-a1.z)*s); }
        else { ctx.fillStyle=col; ctx.beginPath(); ctx.arc(X(c.x),Y(c.z),Math.max(4*dpr,4*s),0,7); ctx.fill(); if(!opts.thumb){ ctx.fillStyle='#fff'; ctx.font=`bold ${8*dpr}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText({agua:'A',desague:'D',gas:'G',enchufe:'E',interruptor:'I',humos:'H'}[o.type]||'',X(c.x),Y(c.z)+0.5); } }
        if(sel){ ctx.strokeStyle=P.accent; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(X(c.x),Y(c.z),9*dpr,0,7); ctx.stroke(); }
      }
    });
    drawOpen(false);
    // obstáculos
    st.obstacles.forEach(o=>{ ctx.fillStyle=P.wall; ctx.fillRect(X(o.x-o.w/2),Y(o.z-o.d/2),o.w*s,o.d*s); });
    // módulos (orden: bajos, columnas, electro, deco, altos encima, campanas)
    const order={deco:0,bajo:1,panel:1,electro:2,columna:2,alto:3,campana:4};
    const mods=[...(opts.modules||st.modules)].sort((a,b)=>(order[K.cat(a)]||0)-(order[K.cat(b)]||0));
    const tH=K.topH(st); const errIds=new Set(opts.errIds||[]);
    mods.forEach(m=>{
      const c=C()[m.kind]; if(!c) return; const pts=K.corners(m);
      const poly=()=>{ ctx.beginPath(); pts.forEach((p,i)=> i? ctx.lineTo(X(p.x),Y(p.z)) : ctx.moveTo(X(p.x),Y(p.z))); ctx.closePath(); };
      const cat=c.cat; const sel=opts.selId===m.id;
      // encimera (vuelo)
      if(cat==='bajo' && !c.open && m.kind!=='BBANCO' && !opts.thumb){ const tm={...m, d:m.d+st.conf.topOver+(m.o.voladizo||0)}; const a=K.axes(m.rot); const sh=(st.conf.topOver-(m.o.voladizo||0))/2; tm.x=m.x+a.fx*sh; tm.z=m.z+a.fz*sh; const tp=K.corners(tm); ctx.beginPath(); tp.forEach((p,i)=> i? ctx.lineTo(X(p.x),Y(p.z)) : ctx.moveTo(X(p.x),Y(p.z))); ctx.closePath(); ctx.fillStyle=P.line; ctx.globalAlpha=0.6; ctx.fill(); ctx.globalAlpha=1; }
      poly();
      if(cat==='alto'||cat==='campana'){ ctx.setLineDash([5*dpr,4*dpr]); ctx.strokeStyle= sel? P.accent: P.mute; ctx.lineWidth= sel? 2.5:1.2; if(opts.showUpper!==false){ ctx.fillStyle=P.upper; ctx.globalAlpha=0.35; ctx.fill(); ctx.globalAlpha=1; } ctx.stroke(); ctx.setLineDash([]); if(cat==='campana'){ ctx.beginPath(); ctx.moveTo(X(pts[0].x),Y(pts[0].z)); ctx.lineTo(X(pts[2].x),Y(pts[2].z)); ctx.moveTo(X(pts[1].x),Y(pts[1].z)); ctx.lineTo(X(pts[3].x),Y(pts[3].z)); ctx.stroke(); } }
      else if(cat==='deco'){ ctx.strokeStyle=P.mute; ctx.lineWidth=1; if(c.deco==='mesar'||c.deco==='taburete'||c.deco==='lampara'||c.deco==='planta'){ ctx.beginPath(); ctx.arc(X(m.x),Y(m.z),m.w/2*s,0,7); ctx.stroke(); } else ctx.stroke(); }
      else { ctx.fillStyle= cat==='columna'? P.tall : (cat==='electro'? P.appl : P.base); ctx.fill(); ctx.strokeStyle= sel? P.accent : P.ink; ctx.lineWidth= sel? 2.5 : 1.2; ctx.stroke();
        // línea de frente
        ctx.strokeStyle=P.ink; ctx.lineWidth=2*dpr; ctx.beginPath(); ctx.moveTo(X(pts[3].x),Y(pts[3].z)); ctx.lineTo(X(pts[2].x),Y(pts[2].z)); ctx.stroke();
        if(cat==='electro'){ ctx.lineWidth=0.8; ctx.strokeStyle=P.mute; ctx.beginPath(); ctx.moveTo(X(pts[0].x),Y(pts[0].z)); ctx.lineTo(X(pts[2].x),Y(pts[2].z)); ctx.moveTo(X(pts[1].x),Y(pts[1].z)); ctx.lineTo(X(pts[3].x),Y(pts[3].z)); ctx.stroke(); }
      }
      if(errIds.has(m.id)){ poly(); ctx.strokeStyle=P.err; ctx.lineWidth=2.5; ctx.setLineDash([2,3]); ctx.stroke(); ctx.setLineDash([]); }
      // fregadero / placa
      const a=K.axes(m.rot); const L=(lx,lz)=>({x:m.x+a.ux*lx+a.fx*lz, z:m.z+a.uz*lx+a.fz*lz});
      if(c.sink && m.o.sink && m.o.sink!=='ninguno'){ const sk=K.SINKS.find(x=>x.k===m.o.sink)||{w:50}; const sw=Math.min(sk.w,m.w-6); const q=[L(-sw/2,-20),L(sw/2,-20),L(sw/2,20),L(-sw/2,20)]; ctx.beginPath(); q.forEach((p,i)=> i? ctx.lineTo(X(p.x),Y(p.z)) : ctx.moveTo(X(p.x),Y(p.z))); ctx.closePath(); ctx.strokeStyle=P.ink; ctx.lineWidth=1; ctx.stroke(); const cc=L(sk.esc? -sw/4 : 0, 2); ctx.beginPath(); ctx.arc(X(cc.x),Y(cc.z),2.5*s,0,7); ctx.stroke(); }
      if((c.hob||c.range) && (m.o.hob||c.range) && m.o.hob!=='ninguna'){ const hb=K.HOBS.find(x=>x.k===(m.o.hob||'gas60'))||{w:60,z:4}; const hw=Math.min(hb.w||60,m.w-2); const pos={2:[[0,-.22],[0,.22]],3:[[-.25,-.2],[-.25,.2],[.25,0]],4:[[-.25,-.2],[-.25,.2],[.25,-.2],[.25,.2]],5:[[-.33,-.2],[-.33,.2],[0,0],[.33,-.2],[.33,.2]]}[hb.z]||[[-.25,-.2],[.25,.2]]; ctx.strokeStyle=P.ink; ctx.lineWidth=1; pos.forEach(([u,v])=>{ const cc=L(u*hw, v*45); ctx.beginPath(); ctx.arc(X(cc.x),Y(cc.z),Math.max(2,7*s),0,7); ctx.stroke(); }); }
      // etiqueta
      if(!opts.thumb && cat!=='deco'){ const p=L(0, cat==='alto'? -m.d/2+8: 0); ctx.fillStyle= cat==='columna'? '#fff' : P.ink; ctx.font=`600 ${10*dpr}px "Barlow", sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; const lab=K.modLabel(m); if(m.w*s>26) ctx.fillText(lab, X(p.x), Y(p.z)); }
    });
    drawOpen(true);
    if(opts.thumb) return;
    // cotas generales
    const off=40*dpr/s; const df=font;
    arrow(ctx,X(0),Y(-T-off*0.9),X(r.W),Y(-T-off*0.9), fmt(r.W), P.dim, df);
    arrow(ctx,X(-T-off*0.9),Y(0),X(-T-off*0.9),Y(r.D), fmt(r.D), P.dim, df);
    // cadena de cotas por pared: muebles bajos/columnas y huecos
    if(opts.dims!==false) for(let w=0;w<4;w++){
      const L=K.wallLen(r,w); const items=[];
      st.modules.forEach(m=>{ const c=C()[m.kind]; if(!c||!['bajo','columna','electro','panel'].includes(c.cat)) return; if(c.onTop) return; const wo=K.wallOf(m,r); if(wo&&wo.wall===w) items.push([wo.pos,wo.pos+m.w]); });
      const pts=new Set([0,L]); items.forEach(([a,b])=>{ pts.add(K.round(a,0.1)); pts.add(K.round(b,0.1)); });
      const arr=[...pts].filter(v=>v>=-0.1&&v<=L+0.1).sort((a,b)=>a-b);
      if(items.length){ for(let i=0;i<arr.length-1;i++){ const a=arr[i], b=arr[i+1]; if(b-a<0.5) continue; const p1=K.wallPoint(r,w,a,-T-off*0.45), p2=K.wallPoint(r,w,b,-T-off*0.45); arrow(ctx,X(p1.x),Y(p1.z),X(p2.x),Y(p2.z),fmt(b-a),P.ink,df); } }
      // huecos
      const hs=st.openings.filter(o=>o.wall===w && (K.OPENINGS.find(x=>x.k===o.type)||{}).kind==='hueco');
      if(hs.length){ const pp=new Set([0,L]); hs.forEach(o=>{pp.add(o.pos); pp.add(o.pos+o.width);}); const ar=[...pp].sort((a,b)=>a-b); for(let i=0;i<ar.length-1;i++){ const a=ar[i],b=ar[i+1]; if(b-a<0.5) continue; const p1=K.wallPoint(r,w,a,-T-off*1.35), p2=K.wallPoint(r,w,b,-T-off*1.35); const isH=hs.some(o=>Math.abs(o.pos-a)<0.1&&Math.abs(o.pos+o.width-b)<0.1); arrow(ctx,X(p1.x),Y(p1.z),X(p2.x),Y(p2.z),fmt(b-a),isH? P.accent : P.mute,df); } }
      // nombre de pared
      const c=K.wallPoint(r,w,L/2,-T-off*1.9); ctx.fillStyle=P.mute; ctx.font=`700 ${11*dpr}px "Barlow Condensed", sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('PARED '+K.WALL_NAMES[w], X(c.x), Y(c.z));
    }
    // cota de selección a paredes
    if(opts.selId){ const m=st.modules.find(x=>x.id===opts.selId); if(m){ const A=K.aabb(m); const col=P.accent;
      if(A.x0>2) arrow(ctx,X(0),Y((A.z0+A.z1)/2),X(A.x0),Y((A.z0+A.z1)/2),fmt(A.x0),col,df);
      if(r.W-A.x1>2) arrow(ctx,X(A.x1),Y((A.z0+A.z1)/2),X(r.W),Y((A.z0+A.z1)/2),fmt(r.W-A.x1),col,df);
      if(A.z0>2) arrow(ctx,X((A.x0+A.x1)/2),Y(0),X((A.x0+A.x1)/2),Y(A.z0),fmt(A.z0),col,df);
      if(r.D-A.z1>2) arrow(ctx,X((A.x0+A.x1)/2),Y(A.z1),X((A.x0+A.x1)/2),Y(r.D),fmt(r.D-A.z1),col,df);
    } }
  };
  D.toWorld = function(px,py){ const t=D._tr||{s:1,ox:0,oy:0}; return {x:(px-t.ox)/t.s, z:(py-t.oy)/t.s}; };

  /* ---------- Alzado ---------- */
  D.drawElev = function(cv, st, wall, opts){
    opts=opts||{}; const ctx=cv.getContext('2d'); const P=pal(); const dpr=opts.dpr||1; const r=st.room; const L=K.wallLen(r,wall);
    const W=cv.width, H=cv.height; ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle=P.bg; ctx.fillRect(0,0,W,H);
    const pad=70*dpr; const s=Math.min((W-2*pad)/L,(H-2*pad)/r.H); const ox=(W-L*s)/2, oy=H-pad*0.8-(H-2*pad-r.H*s)/2;
    const X=(x)=>ox+x*s, Y=(y)=>oy-y*s; const font=`${11*dpr}px "JetBrains Mono", ui-monospace, monospace`;
    // pared
    ctx.fillStyle=P.bg; ctx.strokeStyle=P.ink; ctx.lineWidth=1.5; ctx.strokeRect(X(0),Y(r.H),L*s,r.H*s);
    ctx.fillStyle=P.wall; ctx.fillRect(X(-12),Y(0),(L+24)*s,6*dpr);
    // huecos
    st.openings.filter(o=>o.wall===wall).forEach(o=>{ const t=K.OPENINGS.find(x=>x.k===o.type)||{}; ctx.strokeStyle= opts.selOpen===o.id? P.accent : P.mute; ctx.lineWidth= opts.selOpen===o.id?2:1;
      if(t.kind==='punto'){ ctx.fillStyle={agua:'#2a7fd4',desague:'#6b7780',gas:'#d49a00',humos:'#7a7f83'}[o.type]||P.ink; ctx.beginPath(); ctx.arc(X(o.pos+o.width/2),Y(o.sill+o.height/2),4*dpr,0,7); ctx.fill(); return; }
      ctx.strokeRect(X(o.pos),Y(o.sill+o.height),o.width*s,o.height*s);
      if(/ventana|balconera/.test(o.type)){ ctx.beginPath(); ctx.moveTo(X(o.pos+o.width/2),Y(o.sill)); ctx.lineTo(X(o.pos+o.width/2),Y(o.sill+o.height)); ctx.stroke(); }
      if(o.type==='puerta'){ ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(X(o.hingeR?o.pos+o.width:o.pos),Y(o.sill)); ctx.lineTo(X(o.hingeR?o.pos:o.pos+o.width),Y(o.sill+o.height/2)); ctx.lineTo(X(o.hingeR?o.pos+o.width:o.pos),Y(o.sill+o.height)); ctx.stroke(); ctx.setLineDash([]); }
    });
    // frente entre muebles
    const tH=K.topH(st);
    const mods=st.modules.map(m=>({m, wo:K.wallOf(m,r)})).filter(o=>o.wo && o.wo.wall===wall);
    mods.sort((a,b)=>({deco:0,campana:1,alto:2,bajo:3,columna:3,electro:3,panel:4}[K.cat(a.m)]||0)-({deco:0,campana:1,alto:2,bajo:3,columna:3,electro:3,panel:4}[K.cat(b.m)]||0));
    mods.forEach(({m,wo})=>{
      const c=C()[m.kind]; const x0=wo.pos, x1=wo.pos+m.w, y0=m.y, y1=m.y+m.h; const sel=opts.selId===m.id;
      ctx.lineWidth=sel?2.5:1.2; ctx.strokeStyle= sel? P.accent : P.ink;
      if(c.cat==='campana'){ ctx.fillStyle=P.appl; ctx.fillRect(X(x0),Y(y1),m.w*s,m.h*s); ctx.strokeRect(X(x0),Y(y1),m.w*s,m.h*s); const ch=r.H-y1; if(ch>0){ ctx.strokeRect(X(x0+m.w/2-13),Y(r.H),26*s,ch*s); } return; }
      if(c.cat==='deco') return;
      // zócalo
      if((c.cat==='bajo'&&!c.hueco)||c.cat==='columna'){ ctx.fillStyle=P.line; ctx.fillRect(X(x0),Y(m.y),m.w*s,m.y*s); }
      ctx.fillStyle= c.cat==='electro'? P.appl : P.bg; ctx.fillRect(X(x0),Y(y1),m.w*s,m.h*s); ctx.strokeRect(X(x0),Y(y1),m.w*s,m.h*s);
      // frentes
      (c.f(m)||[]).forEach(f=>{
        const fx0=x0+f.x0+0.2, fx1=x0+f.x1-0.2, fy0=y0+f.y0+0.2, fy1=y0+f.y1-0.2; const app=['horno','micro','cafetera','calienta','vinoteca','lavadora','aparato_lv','horno_libre','mandos','ap_puerta','ap_cajon','campana_int'].includes(f.t);
        if(app){ ctx.fillStyle=P.appl; ctx.fillRect(X(fx0),Y(fy1),(fx1-fx0)*s,(fy1-fy0)*s); }
        if(f.t==='nicho'){ ctx.fillStyle=P.line; ctx.fillRect(X(fx0),Y(fy1),(fx1-fx0)*s,(fy1-fy0)*s); }
        ctx.strokeStyle=P.ink; ctx.lineWidth=1; ctx.strokeRect(X(fx0),Y(fy1),(fx1-fx0)*s,(fy1-fy0)*s);
        if(f.t==='puerta'||f.t==='panel'){ ctx.setLineDash([3*dpr,3*dpr]); ctx.strokeStyle=P.mute; ctx.beginPath(); const hx = f.hinge==='der'? fx1 : fx0, ox2 = f.hinge==='der'? fx0 : fx1; ctx.moveTo(X(ox2),Y(fy0)); ctx.lineTo(X(hx),Y((fy0+fy1)/2)); ctx.lineTo(X(ox2),Y(fy1)); ctx.stroke(); ctx.setLineDash([]); }
        if(f.t==='abatible'){ ctx.setLineDash([3*dpr,3*dpr]); ctx.strokeStyle=P.mute; ctx.beginPath(); ctx.moveTo(X(fx0),Y(fy0)); ctx.lineTo(X((fx0+fx1)/2),Y(fy1)); ctx.lineTo(X(fx1),Y(fy0)); ctx.stroke(); ctx.setLineDash([]); }
        if(f.glass){ ctx.strokeStyle=P.mute; ctx.strokeRect(X(fx0+5),Y(fy1-5),(fx1-fx0-10)*s,(fy1-fy0-10)*s); }
        if(f.t==='cajon'){ ctx.fillStyle=P.ink; ctx.fillRect(X((fx0+fx1)/2-6),Y(fy1-4),12*s,1.2*dpr); }
        if(f.t==='horno'||f.t==='micro'){ ctx.strokeStyle=P.mute; ctx.strokeRect(X(fx0+4),Y(fy1-10),(fx1-fx0-8)*s,(fy1-fy0-14)*s); }
      });
      if(c.open){ const n=Math.max(1,Math.round(m.h/36)); ctx.strokeStyle=P.mute; for(let i=1;i<n;i++){ ctx.beginPath(); ctx.moveTo(X(x0),Y(y0+i*m.h/n)); ctx.lineTo(X(x1),Y(y0+i*m.h/n)); ctx.stroke(); } }
      // encimera
      if(c.cat==='bajo' && !c.open && m.kind!=='BBANCO'){ const th=st.finish.top.thick; ctx.fillStyle=P.ink; ctx.globalAlpha=0.75; ctx.fillRect(X(x0),Y(y1+th),m.w*s,th*s); ctx.globalAlpha=1; }
      ctx.fillStyle=P.mute; ctx.font=`600 ${10*dpr}px "Barlow", sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; if(m.w*s>28) ctx.fillText(K.modLabel(m), X((x0+x1)/2), Y(y1)+(c.cat==='alto'? -8*dpr : -8*dpr)+ (c.cat==='alto'? (m.h*s+16*dpr):0));
    });
    // cotas horizontales
    const chain=(items,yy,col)=>{ const pts=new Set([0,L]); items.forEach(([a,b])=>{pts.add(K.round(a,0.1)); pts.add(K.round(b,0.1));}); const arr=[...pts].sort((a,b)=>a-b); for(let i=0;i<arr.length-1;i++){ if(arr[i+1]-arr[i]<0.5) continue; arrow(ctx,X(arr[i]),yy,X(arr[i+1]),yy,fmt(arr[i+1]-arr[i]),col,font); } };
    const low=mods.filter(o=>['bajo','columna','electro','panel'].includes(K.cat(o.m))).map(o=>[o.wo.pos,o.wo.pos+o.m.w]);
    const up=mods.filter(o=>['alto','campana'].includes(K.cat(o.m))).map(o=>[o.wo.pos,o.wo.pos+o.m.w]);
    if(low.length) chain(low, Y(0)+22*dpr, P.ink);
    arrow(ctx,X(0),Y(0)+44*dpr,X(L),Y(0)+44*dpr,fmt(L),P.dim,font);
    if(up.length) chain(up, Y(r.H)-18*dpr, P.ink);
    // cotas verticales
    const vs=[0, st.conf.plinthH, tH, st.conf.wallBottom, st.conf.wallBottom+st.conf.wallH, r.H].filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
    for(let i=0;i<vs.length-1;i++) arrow(ctx,X(L)+26*dpr,Y(vs[i]),X(L)+26*dpr,Y(vs[i+1]),fmt(vs[i+1]-vs[i]),P.ink,font);
    const vt=[0,tH,st.conf.wallBottom,r.H]; for(let i=1;i<vt.length;i++) arrow(ctx,X(0)-26*dpr,Y(0),X(0)-26*dpr,Y(vt[i]),fmt(vt[i]),i===vt.length-1? P.dim : P.mute,font);
    ctx.fillStyle=P.mute; ctx.font=`700 ${12*dpr}px "Barlow Condensed", sans-serif`; ctx.textAlign='left'; ctx.fillText('ALZADO PARED '+K.WALL_NAMES[wall], X(0), Y(r.H)-38*dpr);
  };
  D.elevToWall = function(cv, st, wall, px, py, dpr){ const r=st.room; const L=K.wallLen(r,wall); const pad=70*dpr; const W=cv.width,H=cv.height; const s=Math.min((W-2*pad)/L,(H-2*pad)/r.H); const ox=(W-L*s)/2, oy=H-pad*0.8-(H-2*pad-r.H*s)/2; return {pos:(px-ox)/s, y:(oy-py)/s}; };
})();
