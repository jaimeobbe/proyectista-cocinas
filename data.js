/* Catálogo genérico de fabricación propia. Todas las medidas en cm. Sin marcas ni modelos comerciales. */
window.K = window.K || {};

K.CONF_DEFAULT = {
  plinthH: 12,      // zócalo
  baseH: 75,        // casco bajo
  baseD: 58,        // fondo casco bajo + frente
  wallBottom: 144,  // cara inferior de altos desde el suelo
  wallH: 72,        // altura altos
  wallD: 35,        // fondo altos
  tallH: 204,       // casco columna (sobre zócalo)
  tallD: 58,
  board: 1.9,       // grosor tablero casco
  back: 0.8,        // grosor trasera
  frontT: 1.9,      // grosor frente
  gap: 0.3,         // holgura entre frentes
  topOver: 2,       // vuelo frontal encimera
  units: 'cm'
};

/* ---------- Materiales de frentes ---------- */
K.FRONT_MATS = [
  // lisos
  {k:'blanco_polar', n:'Blanco polar', c:'#F4F4F1', g:'liso'},
  {k:'blanco_roto', n:'Blanco roto', c:'#ECE8DE', g:'liso'},
  {k:'marfil', n:'Marfil', c:'#E7DFCB', g:'liso'},
  {k:'arena', n:'Arena', c:'#D9CDB6', g:'liso'},
  {k:'cashmere', n:'Cashmere', c:'#C7B9A6', g:'liso'},
  {k:'topo', n:'Topo', c:'#9C8F81', g:'liso'},
  {k:'gris_perla', n:'Gris perla', c:'#CFD0CD', g:'liso'},
  {k:'gris_piedra', n:'Gris piedra', c:'#A7A8A3', g:'liso'},
  {k:'grafito', n:'Gris grafito', c:'#5C5F61', g:'liso'},
  {k:'antracita', n:'Antracita', c:'#3B3E41', g:'liso'},
  {k:'negro', n:'Negro', c:'#1E1F21', g:'liso'},
  {k:'salvia', n:'Verde salvia', c:'#A9B5A0', g:'liso'},
  {k:'oliva', n:'Verde oliva', c:'#6F7558', g:'liso'},
  {k:'bosque', n:'Verde bosque', c:'#2F4A3D', g:'liso'},
  {k:'aguamarina', n:'Aguamarina', c:'#86A7A1', g:'liso'},
  {k:'azul_niebla', n:'Azul niebla', c:'#9DB0BE', g:'liso'},
  {k:'azul_petroleo', n:'Azul petróleo', c:'#2D5562', g:'liso'},
  {k:'azul_marino', n:'Azul marino', c:'#24324A', g:'liso'},
  {k:'terracota', n:'Terracota', c:'#B4654A', g:'liso'},
  {k:'mostaza', n:'Mostaza', c:'#C99B3B', g:'liso'},
  {k:'rosa_empolvado', n:'Rosa empolvado', c:'#D7B4AA', g:'liso'},
  {k:'burdeos', n:'Burdeos', c:'#5E2430', g:'liso'},
  // maderas
  {k:'roble_natural', n:'Roble natural', c:'#B98D5E', g:'madera'},
  {k:'roble_nordico', n:'Roble nórdico', c:'#D6BC96', g:'madera'},
  {k:'roble_miel', n:'Roble miel', c:'#A9733F', g:'madera'},
  {k:'roble_ahumado', n:'Roble ahumado', c:'#5E4634', g:'madera'},
  {k:'nogal', n:'Nogal', c:'#6B4A33', g:'madera'},
  {k:'fresno_blanco', n:'Fresno blanqueado', c:'#DCD3C4', g:'madera'},
  {k:'olmo', n:'Olmo', c:'#9A7656', g:'madera'},
  {k:'castano', n:'Castaño', c:'#7D5234', g:'madera'},
  {k:'pino', n:'Pino', c:'#D4AE79', g:'madera'},
  {k:'teca', n:'Teca', c:'#8E5B32', g:'madera'},
  // otros
  {k:'cemento', n:'Cemento', c:'#9A9893', g:'cemento'},
  {k:'piedra_negra', n:'Piedra negra', c:'#2B2B2C', g:'piedra'},
  {k:'marmol_blanco', n:'Mármol blanco', c:'#ECEBE8', g:'marmol'},
  {k:'acero', n:'Acero inoxidable', c:'#BFC2C4', g:'metal'},
  {k:'cristal_blanco', n:'Cristal lacado blanco', c:'#F2F3F2', g:'liso'},
  {k:'cristal_negro', n:'Cristal lacado negro', c:'#151617', g:'liso'}
];

K.FRONT_TYPES = [ // tipo de fabricación del frente (afecta precio)
  {k:'melamina', n:'Melamina', f:1.0},
  {k:'laminado', n:'Laminado alta presión', f:1.15},
  {k:'supermate', n:'Supermate antihuellas', f:1.35},
  {k:'lacado', n:'Lacado poliuretano', f:1.4},
  {k:'chapa', n:'Chapa de madera natural', f:1.55},
  {k:'maciza', n:'Madera maciza', f:1.9},
  {k:'cristal', n:'Cristal lacado', f:1.6},
  {k:'porcelanico', n:'Porcelánico', f:2.1},
  {k:'acero', n:'Acero inoxidable', f:2.3}
];

K.GLOSS = [
  {k:'mate', n:'Mate', r:0.75},
  {k:'supermate', n:'Supermate', r:0.92},
  {k:'satinado', n:'Satinado', r:0.45},
  {k:'brillo', n:'Brillo', r:0.18},
  {k:'altobrillo', n:'Alto brillo', r:0.06},
  {k:'poro', n:'Poro abierto', r:0.85}
];

K.DOOR_MODELS = [
  {k:'lisa', n:'Lisa'},
  {k:'enmarcada', n:'Enmarcada'},
  {k:'enmarcada_fina', n:'Marco fino'},
  {k:'ranurada', n:'Ranurada vertical'},
  {k:'lineas', n:'Líneas horizontales'},
  {k:'vintage', n:'Clásica moldurada'},
  {k:'cristal_marco', n:'Marco con cristal'}
];

K.CASCO = [
  {k:'blanco', n:'Blanco', c:'#F1F1EE'},
  {k:'gris', n:'Gris', c:'#9D9E9B'},
  {k:'antracita', n:'Antracita', c:'#3E4042'},
  {k:'roble', n:'Roble', c:'#B98D5E'},
  {k:'igual', n:'Igual que el frente', c:null}
];

/* ---------- Tiradores ---------- */
// Catálogo genérico provisional; se sustituye por el catálogo del cliente.
K.HANDLES = [
  {k:'gola', n:'Gola (perfil oculto)', t:'gola', ml:true},
  {k:'gola_v', n:'Gola vertical (columnas)', t:'gola', ml:true},
  {k:'push', n:'Sin tirador (push)', t:'push'},
  {k:'unero', n:'Uñero mecanizado', t:'unero'},
  {k:'perfil', n:'Perfil superior en canto', t:'perfil'},
  {k:'barra96', n:'Barra 96 mm', t:'barra', L:9.6},
  {k:'barra128', n:'Barra 128 mm', t:'barra', L:12.8},
  {k:'barra160', n:'Barra 160 mm', t:'barra', L:16},
  {k:'barra192', n:'Barra 192 mm', t:'barra', L:19.2},
  {k:'barra320', n:'Barra 320 mm', t:'barra', L:32},
  {k:'barra_larga', n:'Barra larga (ancho del frente)', t:'barra', L:-1},
  {k:'pletina', n:'Pletina plana 160 mm', t:'pletina', L:16},
  {k:'pomo', n:'Pomo redondo', t:'pomo'},
  {k:'concha', n:'Concha', t:'concha'},
  {k:'cuero', n:'Tirador de cuero', t:'cuero'}
];
K.HANDLE_COLORS = [
  {k:'inox', n:'Inox cepillado', c:'#B8BBBD', m:0.9, r:0.35},
  {k:'negro', n:'Negro mate', c:'#1E1E1F', m:0.4, r:0.6},
  {k:'laton', n:'Latón', c:'#B9944A', m:1, r:0.3},
  {k:'bronce', n:'Bronce', c:'#7B5A3A', m:1, r:0.4},
  {k:'cobre', n:'Cobre', c:'#B87355', m:1, r:0.35},
  {k:'blanco', n:'Blanco', c:'#F2F2F0', m:0.1, r:0.5},
  {k:'titanio', n:'Titanio', c:'#7A7C7E', m:0.9, r:0.4},
  {k:'cuero', n:'Cuero coñac', c:'#8A5531', m:0, r:0.8}
];

/* ---------- Encimeras ---------- */
K.TOP_MATS = [
  {k:'lam_roble', n:'Laminado roble', c:'#B98D5E', g:'madera', fam:'laminado'},
  {k:'lam_nogal', n:'Laminado nogal', c:'#6B4A33', g:'madera', fam:'laminado'},
  {k:'lam_blanco', n:'Laminado blanco', c:'#EFEEEA', g:'liso', fam:'laminado'},
  {k:'lam_cemento', n:'Laminado cemento', c:'#9C9A95', g:'cemento', fam:'laminado'},
  {k:'lam_marmol', n:'Laminado mármol', c:'#ECEAE6', g:'marmol', fam:'laminado'},
  {k:'comp_negro', n:'Compacto negro', c:'#1F2021', g:'liso', fam:'compacto'},
  {k:'comp_blanco', n:'Compacto blanco', c:'#F1F1EE', g:'liso', fam:'compacto'},
  {k:'comp_gris', n:'Compacto gris', c:'#7F8180', g:'liso', fam:'compacto'},
  {k:'cuarzo_blanco', n:'Cuarzo blanco puro', c:'#F4F4F2', g:'liso', fam:'cuarzo'},
  {k:'cuarzo_nieve', n:'Cuarzo blanco nieve', c:'#ECECE8', g:'granulado', fam:'cuarzo'},
  {k:'cuarzo_gris', n:'Cuarzo gris niebla', c:'#BDBDB8', g:'granulado', fam:'cuarzo'},
  {k:'cuarzo_beige', n:'Cuarzo beige', c:'#D8CDBA', g:'granulado', fam:'cuarzo'},
  {k:'cuarzo_negro', n:'Cuarzo negro', c:'#232324', g:'granulado', fam:'cuarzo'},
  {k:'cuarzo_veta', n:'Cuarzo blanco veteado', c:'#EEEDEA', g:'marmol', fam:'cuarzo'},
  {k:'porc_calacatta', n:'Porcelánico calacatta', c:'#F0EEEA', g:'marmol_oro', fam:'porcelanico'},
  {k:'porc_cemento', n:'Porcelánico cemento', c:'#A3A19C', g:'cemento', fam:'porcelanico'},
  {k:'porc_negro', n:'Porcelánico piedra negra', c:'#2A2A2B', g:'marmol_negro', fam:'porcelanico'},
  {k:'porc_travertino', n:'Porcelánico travertino', c:'#D6C7AE', g:'travertino', fam:'porcelanico'},
  {k:'porc_oxido', n:'Porcelánico óxido', c:'#6E5444', g:'cemento', fam:'porcelanico'},
  {k:'gran_negro', n:'Granito negro', c:'#1F1F20', g:'granito', fam:'granito'},
  {k:'gran_gris', n:'Granito gris', c:'#8C8B88', g:'granito', fam:'granito'},
  {k:'gran_rosa', n:'Granito rosa', c:'#B79F96', g:'granito', fam:'granito'},
  {k:'marm_carrara', n:'Mármol blanco carrara', c:'#EDECE9', g:'marmol', fam:'marmol'},
  {k:'marm_negro', n:'Mármol negro veteado', c:'#1C1C1D', g:'marmol_negro', fam:'marmol'},
  {k:'mad_roble', n:'Madera maciza roble', c:'#B4895A', g:'madera', fam:'madera'},
  {k:'mad_nogal', n:'Madera maciza nogal', c:'#5F412D', g:'madera', fam:'madera'},
  {k:'inox', n:'Acero inoxidable', c:'#C3C6C8', g:'metal', fam:'inox'},
  {k:'microcemento', n:'Microcemento', c:'#B2AFA8', g:'cemento', fam:'microcemento'},
  {k:'terrazo', n:'Terrazo', c:'#E3DED6', g:'terrazo', fam:'terrazo'}
];
K.TOP_THICK = [1.2, 2, 3, 4, 6, 8];
K.TOP_EDGES = [{k:'recto',n:'Recto'},{k:'biselado',n:'Biselado'},{k:'redondeado',n:'Redondeado'},{k:'inglete',n:'Ingletado (aspecto grueso)'}];

/* ---------- Frente entre muebles (salpicadero) ---------- */
K.SPLASH = [
  {k:'ninguno', n:'Sin frente (pintura)'},
  {k:'copete', n:'Copete 5 cm (mismo material)'},
  {k:'copete10', n:'Copete 10 cm (mismo material)'},
  {k:'encimera', n:'Mismo material que encimera, hasta altos'},
  {k:'metro_blanco', n:'Azulejo metro blanco'},
  {k:'metro_verde', n:'Azulejo metro verde'},
  {k:'metro_negro', n:'Azulejo metro negro'},
  {k:'zellige', n:'Azulejo artesanal crema'},
  {k:'hidraulico', n:'Baldosa hidráulica'},
  {k:'espiga', n:'Azulejo espiga'},
  {k:'cristal', n:'Cristal lacado'},
  {k:'inox', n:'Chapa inoxidable'}
];

/* ---------- Suelos y paredes ---------- */
K.FLOORS = [
  {k:'roble_natural', n:'Tarima roble natural', c:'#B48A5C', g:'tarima'},
  {k:'roble_claro', n:'Tarima roble claro', c:'#D2B78F', g:'tarima'},
  {k:'espiga', n:'Parquet en espiga', c:'#B08458', g:'espiga'},
  {k:'porc_gris', n:'Porcelánico gris claro', c:'#C9C8C4', g:'baldosa'},
  {k:'porc_beige', n:'Porcelánico beige', c:'#D9D0C1', g:'baldosa'},
  {k:'porc_antracita', n:'Porcelánico antracita', c:'#55575A', g:'baldosa'},
  {k:'marmol', n:'Mármol blanco', c:'#E9E7E3', g:'marmol_baldosa'},
  {k:'hidraulico', n:'Hidráulico', c:'#CFC6B4', g:'hidraulico'},
  {k:'ajedrez', n:'Ajedrez blanco y negro', c:'#888', g:'ajedrez'},
  {k:'terrazo', n:'Terrazo', c:'#E1DCD3', g:'terrazo'},
  {k:'cemento', n:'Cemento pulido', c:'#A9A7A2', g:'cemento'},
  {k:'barro', n:'Barro cocido', c:'#B66F4E', g:'baldosa'}
];
K.WALL_COLORS = ['#EFEDE8','#F6F4EF','#E4E1DA','#D9D6CF','#C9CDC6','#B9C3B4','#C8D0D4','#E8DCCF','#D9C3AE','#6E7B70','#3D4A52','#2C2E30'];

/* ---------- Electrodomésticos (genéricos) ---------- */
K.APPL_COLORS = [
  {k:'inox', n:'Inox', c:'#BEC1C3', m:0.85, r:0.32},
  {k:'negro', n:'Negro mate', c:'#202122', m:0.2, r:0.55},
  {k:'cristal_negro', n:'Cristal negro', c:'#111213', m:0.1, r:0.08},
  {k:'blanco', n:'Blanco', c:'#F3F3F1', m:0.05, r:0.3},
  {k:'antracita', n:'Antracita', c:'#47494B', m:0.6, r:0.35},
  {k:'crema', n:'Crema (retro)', c:'#E9DFC7', m:0.05, r:0.3}
];
K.GAMAS = [{k:'basica',n:'Básica'},{k:'media',n:'Media'},{k:'alta',n:'Alta'}];

K.HOBS = [
  {k:'ninguna', n:'Sin placa'},
  {k:'ind60', n:'Inducción 60 cm · 3 zonas', w:59, d:52, t:'ind', z:3},
  {k:'ind80', n:'Inducción 80 cm · 4 zonas', w:80, d:52, t:'ind', z:4},
  {k:'ind90', n:'Inducción 90 cm · 5 zonas', w:90, d:52, t:'ind', z:5},
  {k:'indflex', n:'Inducción zona libre 80 cm', w:80, d:52, t:'flex'},
  {k:'indext', n:'Inducción con extractor integrado 80 cm', w:80, d:52, t:'ext'},
  {k:'vitro60', n:'Vitrocerámica 60 cm', w:59, d:52, t:'ind', z:3},
  {k:'gas60', n:'Gas 60 cm · 4 fuegos', w:59, d:51, t:'gas', z:4},
  {k:'gas75', n:'Gas 75 cm · 5 fuegos', w:75, d:51, t:'gas', z:5},
  {k:'gas90', n:'Gas 90 cm · 5 fuegos', w:90, d:51, t:'gas', z:5},
  {k:'domino', n:'Dominó 30 cm · 2 zonas', w:30, d:52, t:'ind', z:2}
];
K.SINKS = [
  {k:'ninguno', n:'Sin fregadero'},
  {k:'s1', n:'1 seno 50 cm', w:50, b:1},
  {k:'s1e', n:'1 seno con escurridor 86 cm', w:86, b:1, esc:true},
  {k:'s15', n:'Seno y medio 80 cm', w:80, b:1.5},
  {k:'s2', n:'2 senos 80 cm', w:80, b:2},
  {k:'s2e', n:'2 senos con escurridor 116 cm', w:116, b:2, esc:true},
  {k:'bajo', n:'Bajo encimera 50 cm', w:50, b:1, under:true},
  {k:'integrado', n:'Integrado en encimera (mismo material)', w:55, b:1, under:true, same:true},
  {k:'cer', n:'Cerámico de frente visto 60 cm', w:60, b:1, apron:true}
];
K.SINK_COLORS = [
  {k:'inox', n:'Inox', c:'#C5C8CA', m:0.9, r:0.25},
  {k:'negro', n:'Sintético negro', c:'#222', m:0, r:0.6},
  {k:'gris', n:'Sintético gris', c:'#7d7d7b', m:0, r:0.6},
  {k:'blanco', n:'Cerámica blanca', c:'#F4F4F2', m:0, r:0.2},
  {k:'arena', n:'Sintético arena', c:'#CDBFA8', m:0, r:0.6}
];
K.TAPS = [
  {k:'alto', n:'Monomando caño alto'},
  {k:'extraible', n:'Monomando con caño extraíble'},
  {k:'muelle', n:'Industrial con muelle'},
  {k:'bajo', n:'Caño bajo'},
  {k:'clasico', n:'Clásico de dos manetas'},
  {k:'filtro', n:'Con salida de agua filtrada'}
];
K.HOODS_STYLE = { // estilo de campana para los objetos campana
};

/* ---------- Tipos de huecos / elementos de obra ---------- */
K.OPENINGS = [
  {k:'puerta', n:'Puerta', w:82, h:203, s:0, kind:'hueco'},
  {k:'puerta_doble', n:'Puerta doble', w:145, h:203, s:0, kind:'hueco'},
  {k:'corredera', n:'Puerta corredera', w:82, h:203, s:0, kind:'hueco'},
  {k:'paso', n:'Hueco de paso (sin puerta)', w:90, h:210, s:0, kind:'hueco'},
  {k:'balconera', n:'Puerta balconera', w:140, h:215, s:0, kind:'hueco'},
  {k:'ventana', n:'Ventana', w:120, h:120, s:100, kind:'hueco'},
  {k:'ventana_alta', n:'Ventana alta', w:100, h:60, s:150, kind:'hueco'},
  {k:'radiador', n:'Radiador', w:80, h:60, s:15, kind:'obra', dep:10},
  {k:'caldera', n:'Caldera / termo', w:45, h:75, s:140, kind:'obra', dep:35},
  {k:'humos', n:'Salida de humos', w:15, h:15, s:225, kind:'punto'},
  {k:'agua', n:'Toma de agua', w:8, h:8, s:50, kind:'punto'},
  {k:'desague', n:'Desagüe', w:6, h:6, s:40, kind:'punto'},
  {k:'gas', n:'Toma de gas', w:6, h:6, s:60, kind:'punto'},
  {k:'enchufe', n:'Enchufe', w:8, h:8, s:110, kind:'punto'},
  {k:'interruptor', n:'Interruptor', w:8, h:8, s:110, kind:'punto'},
  {k:'cuadro', n:'Cuadro eléctrico', w:30, h:40, s:160, kind:'obra', dep:8}
];

/* ---------- Catálogo de módulos ----------
  cat: bajo | alto | columna | electro | campana | panel | deco
  w: ancho por defecto, ws: anchos típicos (sólo sugerencias: todo es a medida)
  f: generador de frentes (en coordenadas locales del frente: x izq→dcha, y abajo→arriba)
*/
(function(){
  const D = (x0,y0,x1,y1,t,ex)=>Object.assign({x0,y0,x1,y1,t},ex||{});
  const hinge = (m)=> (m.o && m.o.apertura) || 'izq';
  const doors = (w,h,y0,y1,n,m)=>{ // n puertas en vertical
    if(n===1) return [D(0,y0,w,y1,'puerta',{hinge:hinge(m)})];
    const a=[]; for(let i=0;i<n;i++) a.push(D(w*i/n,y0,w*(i+1)/n,y1,'puerta',{hinge: i<n/2?'izq':'der'}));
    return a;
  };
  const drawers = (w,y0,y1,ratios)=>{ // de arriba a abajo
    const tot=ratios.reduce((s,r)=>s+r,0); const a=[]; let y=y1;
    ratios.forEach(r=>{ const hh=(y1-y0)*r/tot; a.push(D(0,y-hh,w,y,'cajon')); y-=hh; });
    return a;
  };
  const C = K.CATALOG = {};
  const add=(k,o)=>{o.k=k; C[k]=o;};

  // ===== BAJOS =====
  add('B1P',{n:'Bajo 1 puerta', cat:'bajo', w:45, ws:[30,40,45,50,60], f:(m)=>doors(m.w,m.h,0,m.h,1,m)});
  add('B2P',{n:'Bajo 2 puertas', cat:'bajo', w:80, ws:[60,80,90,100,120], f:(m)=>doors(m.w,m.h,0,m.h,2,m)});
  add('BC1P',{n:'Bajo cajón + puerta', cat:'bajo', w:60, ws:[40,45,50,60], f:(m)=>[D(0,m.h-16,m.w,m.h,'cajon'), ...(m.w>=70?doors(m.w,m.h,0,m.h-16,2,m):doors(m.w,m.h,0,m.h-16,1,m))]});
  add('BCAJ2',{n:'Cajonera 2 caceroleros', cat:'bajo', w:60, ws:[40,45,50,60,80,90,100,120], f:(m)=>drawers(m.w,0,m.h,[1,1])});
  add('BCAJ3',{n:'Cajonera 3 cajones', cat:'bajo', w:60, ws:[40,45,50,60,80,90,100,120], f:(m)=>drawers(m.w,0,m.h,[1,2,2])});
  add('BCAJ4',{n:'Cajonera 4 cajones', cat:'bajo', w:60, ws:[40,45,50,60,80,90], f:(m)=>drawers(m.w,0,m.h,[1,1,1.4,1.6])});
  add('BCAJ5',{n:'Cajonera 1 cajón + 2 caceroleros + interior', cat:'bajo', w:90, ws:[60,80,90,100,120], f:(m)=>drawers(m.w,0,m.h,[1,2,2])});
  add('BFREG',{n:'Bajo fregadero', cat:'bajo', w:80, ws:[60,80,90,100,120], sink:true, f:(m)=> m.w>=70?doors(m.w,m.h,0,m.h,2,m):doors(m.w,m.h,0,m.h,1,m)});
  add('BFREGC',{n:'Bajo fregadero con cacerolero', cat:'bajo', w:80, ws:[60,80,90,100,120], sink:true, f:(m)=>[D(0,m.h-16,m.w,m.h,'falso'), D(0,0,m.w,m.h-16,'cajon')]});
  add('BPLACA',{n:'Bajo placa con cajones', cat:'bajo', w:80, ws:[60,80,90,100,120], hob:true, f:(m)=>drawers(m.w,0,m.h,[1,2,2])});
  add('BHORNO',{n:'Bajo horno (+ placa)', cat:'bajo', w:60, ws:[60], hob:true, f:(m)=>[D(0,m.h-60,m.w,m.h,'horno'), D(0,0,m.w,m.h-60,'cajon')]});
  add('BHORNO90',{n:'Bajo horno 90 (+ placa)', cat:'bajo', w:90, ws:[90], hob:true, f:(m)=>[D(0,m.h-60,m.w,m.h,'horno'), D(0,0,m.w,m.h-60,'cajon')]});
  add('BLV',{n:'Lavavajillas integrable', cat:'bajo', w:60, ws:[45,60], appl:'lavavajillas', f:(m)=>[D(0,0,m.w,m.h,'panel_lv')]});
  add('BLVV',{n:'Lavavajillas visto (frontal de aparato)', cat:'bajo', w:60, ws:[45,60], appl:'lavavajillas', f:(m)=>[D(0,0,m.w,m.h,'aparato_lv')]});
  add('BLAV',{n:'Lavadora integrable', cat:'bajo', w:60, ws:[60], appl:'lavadora', f:(m)=>[D(0,0,m.w,m.h,'panel')]});
  add('BFRIGO',{n:'Frigorífico bajo encimera', cat:'bajo', w:60, ws:[60], appl:'frigo_bajo', f:(m)=>[D(0,0,m.w,m.h,'panel')]});
  add('BVINO',{n:'Vinoteca bajo encimera', cat:'bajo', w:60, ws:[30,45,60], appl:'vinoteca', f:(m)=>[D(0,0,m.w,m.h,'vinoteca')]});
  add('BRINC',{n:'Rincón ciego (con extraíble)', cat:'bajo', w:100, ws:[90,100,110,120], corner:true, f:(m)=>{ const dw=Math.min(50,m.w-m.d+2); return m.o&&m.o.ciegoDer? [D(0,0,dw,m.h,'puerta',{hinge:'izq'}), D(dw,0,m.w,m.h,'ciego')] : [D(0,0,m.w-dw,m.h,'ciego'), D(m.w-dw,0,m.w,m.h,'puerta',{hinge:'der'})]; }});
  add('BRINCL',{n:'Rincón en L (puerta plegable)', cat:'bajo', w:90, ws:[80,90,100], lcorner:true, f:(m)=>[D(m.w-40,0,m.w,m.h,'puerta',{hinge:'der'})]});
  add('BBOT',{n:'Botellero / especiero extraíble', cat:'bajo', w:20, ws:[15,20,25,30], f:(m)=>[D(0,0,m.w,m.h,'cajon')]});
  add('BBAS',{n:'Cubos de basura extraíble', cat:'bajo', w:45, ws:[40,45,50,60], f:(m)=>[D(0,m.h-16,m.w,m.h,'cajon'), D(0,0,m.w,m.h-16,'cajon')]});
  add('BABI',{n:'Bajo abierto (estantes)', cat:'bajo', w:40, ws:[20,30,40,60], open:true, f:()=>[]});
  add('BTERM',{n:'Terminal abierto curvo', cat:'bajo', w:30, ws:[25,30], open:true, f:()=>[]});
  add('BFR',{n:'Bajo fondo reducido', cat:'bajo', w:60, d:37, ws:[30,40,60,80], f:(m)=> m.w>=70?doors(m.w,m.h,0,m.h,2,m):doors(m.w,m.h,0,m.h,1,m)});
  add('BHUECO',{n:'Hueco libre bajo encimera', cat:'bajo', w:60, ws:[60], hueco:true, f:()=>[]});
  add('BBANCO',{n:'Banco / asiento con cajones', cat:'bajo', w:120, h:45, d:45, ws:[100,120,150], f:(m)=>drawers(m.w,0,m.h,[1]).map((d,i)=>d)});

  // ===== ALTOS =====
  add('A1P',{n:'Alto 1 puerta', cat:'alto', w:45, ws:[30,40,45,50,60], f:(m)=>doors(m.w,m.h,0,m.h,1,m)});
  add('A2P',{n:'Alto 2 puertas', cat:'alto', w:80, ws:[60,80,90,100,120], f:(m)=>doors(m.w,m.h,0,m.h,2,m)});
  add('AABAT',{n:'Alto abatible', cat:'alto', w:80, h:36, ws:[60,80,90,100,120], f:(m)=>[D(0,0,m.w,m.h,'abatible')]});
  add('AELEV',{n:'Alto elevable doble', cat:'alto', w:90, ws:[60,80,90,100,120], f:(m)=>[D(0,m.h/2,m.w,m.h,'abatible'), D(0,0,m.w,m.h/2,'abatible')]});
  add('AVIT',{n:'Alto vitrina', cat:'alto', w:60, ws:[40,45,50,60,80], f:(m)=>(m.w>=70?doors(m.w,m.h,0,m.h,2,m):doors(m.w,m.h,0,m.h,1,m)).map(d=>Object.assign(d,{glass:true}))});
  add('AESC',{n:'Alto escurreplatos', cat:'alto', w:80, ws:[60,80,90], f:(m)=> m.w>=70?doors(m.w,m.h,0,m.h,2,m):doors(m.w,m.h,0,m.h,1,m)});
  add('ACAMP',{n:'Alto con campana integrada', cat:'alto', w:60, h:36, ws:[60,90], appl:'campana_int', f:(m)=>[D(0,4,m.w,m.h,'abatible'), D(0,0,m.w,4,'campana_int')]});
  add('AMIC',{n:'Alto microondas', cat:'alto', w:60, ws:[60], appl:'microondas', f:(m)=>[D(0,m.h-38>0?m.h-38:0,m.w,m.h,'abatible'), D(0,0,m.w,Math.min(38,m.h),'micro')].filter(d=>d.y1>d.y0+1)});
  add('APUENTE',{n:'Alto puente (sobre frigorífico/campana)', cat:'alto', w:60, h:36, d:58, ws:[60,80,90], f:(m)=>[D(0,0,m.w,m.h,'abatible')]});
  add('ARINC',{n:'Alto rincón', cat:'alto', w:65, ws:[60,65,70], corner:true, f:(m)=>[D(0,0,m.w-m.d,m.h,'ciego'), D(m.w-m.d,0,m.w,m.h,'puerta',{hinge:'der'})]});
  add('APERS',{n:'Alto con persiana', cat:'alto', w:90, ws:[60,80,90,120], f:(m)=>[D(0,0,m.w,m.h,'persiana')]});
  add('AABI',{n:'Alto abierto (estantes)', cat:'alto', w:60, ws:[30,40,60,80], open:true, f:()=>[]});
  add('ABALDA',{n:'Balda de pared', cat:'alto', w:90, h:4, d:25, ws:[60,90,120,180], shelf:true, f:()=>[]});

  // ===== COLUMNAS =====
  const TH = (m)=>m.h;
  add('CDESP',{n:'Despensa 2 puertas', cat:'columna', w:60, ws:[40,45,50,60], f:(m)=>[...doors(m.w,TH(m),TH(m)-75,TH(m),1,m), ...doors(m.w,TH(m),0,TH(m)-75,1,m)]});
  add('CDESP2',{n:'Despensa 4 puertas', cat:'columna', w:90, ws:[80,90,100,120], f:(m)=>[...doors(m.w,TH(m),TH(m)-75,TH(m),2,m), ...doors(m.w,TH(m),0,TH(m)-75,2,m)]});
  add('CDESPX',{n:'Despensa extraíble', cat:'columna', w:30, ws:[20,30,40,45], f:(m)=>[D(0,0,m.w,TH(m),'cajon')]});
  add('CHM',{n:'Columna horno + microondas', cat:'columna', w:60, ws:[60], appl:'horno', f:(m)=>{const h=TH(m); return [D(0,h-36,m.w,h,'abatible'), D(0,h-74,m.w,h-36,'micro'), D(0,h-134,m.w,h-74,'horno'), ...drawers(m.w,0,h-134,[1,1])];}});
  add('CHC',{n:'Columna horno + cajones', cat:'columna', w:60, ws:[60], appl:'horno', f:(m)=>{const h=TH(m); return [D(0,h-60,m.w,h,'puerta',{hinge:hinge(m)}), D(0,h-120,m.w,h-60,'horno'), ...drawers(m.w,0,h-120,[1,1])];}});
  add('CHH',{n:'Columna doble horno', cat:'columna', w:60, ws:[60], appl:'horno', f:(m)=>{const h=TH(m); return [D(0,h-36,m.w,h,'abatible'), D(0,h-96,m.w,h-36,'horno'), D(0,h-156,m.w,h-96,'horno'), D(0,0,m.w,h-156,'cajon')];}});
  add('CHCAFE',{n:'Columna horno + compacto + calientaplatos', cat:'columna', w:60, ws:[60], appl:'horno', f:(m)=>{const h=TH(m); return [D(0,h-30,m.w,h,'abatible'), D(0,h-75,m.w,h-30,'cafetera'), D(0,h-89,m.w,h-75,'calienta'), D(0,h-149,m.w,h-89,'horno'), D(0,0,m.w,h-149,'cajon')];}});
  add('CSEMI',{n:'Semicolumna horno + microondas', cat:'columna', w:60, h:140, ws:[60], appl:'horno', f:(m)=>{const h=TH(m); return [D(0,h-38,m.w,h,'micro'), D(0,h-98,m.w,h-38,'horno'), D(0,0,m.w,h-98,'cajon')];}});
  add('CFRIGO',{n:'Columna frigorífico combi integrable', cat:'columna', w:60, ws:[60], appl:'frigo', f:(m)=>{const h=TH(m); const top=h-178; return [...(top>8?[D(0,178,m.w,h,'abatible')]:[]), D(0,72,m.w,Math.min(178,h),'panel',{hinge:hinge(m)}), D(0,0,m.w,72,'panel',{hinge:hinge(m)})];}});
  add('CFRIGO1',{n:'Columna frigorífico 1 puerta integrable', cat:'columna', w:60, ws:[60], appl:'frigo', f:(m)=>{const h=TH(m); return [...(h-178>8?[D(0,178,m.w,h,'abatible')]:[]), D(0,0,m.w,Math.min(178,h),'panel',{hinge:hinge(m)})];}});
  add('CCONG',{n:'Columna congelador integrable', cat:'columna', w:60, ws:[60], appl:'congelador', f:(m)=>{const h=TH(m); return [...(h-178>8?[D(0,178,m.w,h,'abatible')]:[]), D(0,0,m.w,Math.min(178,h),'panel',{hinge:hinge(m)})];}});
  add('CESCOB',{n:'Escobero', cat:'columna', w:40, ws:[30,40,45,50], f:(m)=>doors(m.w,TH(m),0,TH(m),1,m)});
  add('CLAV',{n:'Columna lavadora + secadora', cat:'columna', w:60, ws:[60,65], appl:'lavadora', f:(m)=>{const h=TH(m); return [D(0,h-30,m.w,h,'abatible'), D(0,90,m.w,h-30,'puerta',{hinge:hinge(m)}), D(0,0,m.w,90,'puerta',{hinge:hinge(m)})];}});
  add('CNICHO',{n:'Columna con nicho abierto', cat:'columna', w:60, ws:[40,60,80], f:(m)=>{const h=TH(m); return [D(0,h-60,m.w,h,'puerta',{hinge:hinge(m)}), D(0,m.h-110,m.w,h-60,'nicho'), D(0,0,m.w,m.h-110,'puerta',{hinge:hinge(m)})];}});
  add('CABI',{n:'Estantería alta abierta', cat:'columna', w:40, ws:[30,40,60], open:true, f:()=>[]});

  // ===== ELECTRODOMÉSTICOS LIBRES =====
  add('EFRIGO',{n:'Frigorífico combi libre', cat:'electro', w:60, d:66, h:203, ws:[60,70], appl:'frigo_libre', f:(m)=>[D(0,m.h*0.36,m.w,m.h,'ap_puerta'), D(0,0,m.w,m.h*0.36,'ap_puerta')]});
  add('EAMER',{n:'Frigorífico americano', cat:'electro', w:91, d:72, h:178, ws:[91], appl:'frigo_libre', f:(m)=>[D(0,0,m.w*0.6,m.h,'ap_puerta'), D(m.w*0.6,0,m.w,m.h,'ap_puerta',{disp:true})]});
  add('EFRENCH',{n:'Frigorífico puerta francesa', cat:'electro', w:90, d:72, h:190, ws:[80,90], appl:'frigo_libre', f:(m)=>[D(0,m.h*0.4,m.w/2,m.h,'ap_puerta'), D(m.w/2,m.h*0.4,m.w,m.h,'ap_puerta'), D(0,m.h*0.2,m.w,m.h*0.4,'ap_cajon'), D(0,0,m.w,m.h*0.2,'ap_cajon')]});
  add('ECOCINA',{n:'Cocina libre con horno', cat:'electro', w:60, d:60, h:85, ws:[50,60,90,100], appl:'cocina', range:true, f:(m)=>[D(0,m.h-12,m.w,m.h,'mandos'), D(0,10,m.w,m.h-12,'horno_libre'), D(0,0,m.w,10,'ap_cajon')]});
  add('ELAV',{n:'Lavadora libre', cat:'electro', w:60, d:60, h:85, ws:[60], appl:'lavadora', f:(m)=>[D(0,0,m.w,m.h,'lavadora')]});
  add('ESEC',{n:'Secadora libre', cat:'electro', w:60, d:60, h:85, ws:[60], appl:'secadora', f:(m)=>[D(0,0,m.w,m.h,'lavadora')]});
  add('ELVL',{n:'Lavavajillas libre', cat:'electro', w:60, d:60, h:85, ws:[45,60], appl:'lavavajillas', f:(m)=>[D(0,0,m.w,m.h,'aparato_lv')]});
  add('EMIC',{n:'Microondas sobre encimera', cat:'electro', w:50, d:40, h:30, ws:[45,50], appl:'microondas', onTop:true, f:(m)=>[D(0,0,m.w,m.h,'micro')]});
  add('EVINO',{n:'Vinoteca libre', cat:'electro', w:60, d:60, h:85, ws:[30,45,60], appl:'vinoteca', f:(m)=>[D(0,0,m.w,m.h,'vinoteca')]});
  add('ECAFE',{n:'Cafetera sobre encimera', cat:'electro', w:25, d:40, h:38, appl:'cafetera', onTop:true, f:(m)=>[D(0,0,m.w,m.h,'cafe_libre')]});

  // ===== CAMPANAS =====
  add('HPIR',{n:'Campana decorativa pirámide', cat:'campana', w:90, d:50, h:70, ws:[60,70,90,100,120], hood:'pir', f:()=>[]});
  add('HREC',{n:'Campana decorativa recta (caja)', cat:'campana', w:90, d:50, h:70, ws:[60,90,120], hood:'rec', f:()=>[]});
  add('HINC',{n:'Campana vidrio inclinada', cat:'campana', w:80, d:40, h:60, ws:[60,80,90], hood:'inc', f:()=>[]});
  add('HISLA',{n:'Campana de isla', cat:'campana', w:90, d:60, h:70, ws:[90,100,120], hood:'isla', f:()=>[]});
  add('HTECHO',{n:'Campana de techo (plafón)', cat:'campana', w:90, d:50, h:30, ws:[90,100,120], hood:'techo', f:()=>[]});
  add('HCIL',{n:'Campana cilíndrica suspendida', cat:'campana', w:40, d:40, h:60, ws:[35,40,45], hood:'cil', f:()=>[]});

  // ===== PANELES / REMATES =====
  add('PCOST',{n:'Costado / panel terminal', cat:'panel', w:2, d:60, ws:[2,3,4], panel:'costado', f:()=>[]});
  add('PREG',{n:'Regleta / relleno', cat:'panel', w:5, d:58, ws:[3,5,8,10], panel:'regleta', f:()=>[]});
  add('PBARRA',{n:'Barra / encimera volada', cat:'panel', w:150, d:40, h:3, ws:[100,120,150,180], panel:'barra', f:()=>[]});
  add('PEST',{n:'Estantería de pared metálica', cat:'panel', w:90, d:30, h:70, ws:[60,90,120], panel:'estanteria', f:()=>[]});
  add('PTRAS',{n:'Panel trasero de isla', cat:'panel', w:120, d:2, ws:[90,120,180,240], panel:'trasero', f:()=>[]});

  // ===== MOBILIARIO / DECORACIÓN =====
  add('DTAB',{n:'Taburete alto', cat:'deco', w:40, d:40, h:75, deco:'taburete', f:()=>[]});
  add('DSIL',{n:'Silla', cat:'deco', w:45, d:50, h:85, deco:'silla', f:()=>[]});
  add('DMESA',{n:'Mesa rectangular', cat:'deco', w:140, d:80, h:75, deco:'mesa', f:()=>[]});
  add('DMESAR',{n:'Mesa redonda', cat:'deco', w:100, d:100, h:75, deco:'mesar', f:()=>[]});
  add('DLAMP',{n:'Lámpara colgante', cat:'deco', w:30, d:30, h:40, deco:'lampara', f:()=>[]});
  add('DPLANTA',{n:'Planta', cat:'deco', w:40, d:40, h:110, deco:'planta', f:()=>[]});
})();

K.CAT_NAMES = {bajo:'Muebles bajos', alto:'Muebles altos', columna:'Columnas', electro:'Electrodomésticos libres', campana:'Campanas', panel:'Paneles y remates', deco:'Mobiliario y decoración'};

/* ---------- Tarifas editables (precio de venta orientativo, sin IVA) ---------- */
K.PRICES_DEFAULT = {
  bajo_cm: 2.4,        // €/cm de ancho, casco + frente estándar a 75 cm de alto
  alto_cm: 1.7,        // €/cm a 72 cm de alto
  columna_cm: 5.2,     // €/cm a 204 cm
  panel_m2: 85,
  cajon: 38,           // suplemento por cajón con guía oculta
  extraible: 140,      // rincón, basura, botellero, despensa extraíble
  cristal: 45,         // por puerta con cristal
  persiana: 180,
  abatible: 60,        // mecanismo elevable
  tirador: 9,          // €/unidad
  gola_ml: 28,
  zocalo_ml: 18,
  top_ml: {laminado:95, compacto:260, cuarzo:340, porcelanico:390, granito:290, marmol:460, madera:310, inox:520, microcemento:280, terrazo:360},
  top_thick_f: 0.12,   // +12% por cada cm sobre 2 cm
  hueco_placa: 60, hueco_fregadero: 45, bajo_encimera: 95,
  splash_m2: {ninguno:0, copete:0, copete10:0, encimera:240, metro_blanco:55, metro_verde:60, metro_negro:60, zellige:95, hidraulico:80, espiga:70, cristal:160, inox:190},
  copete_ml: 30,
  appl: { // por gama: básica / media / alta
    horno:[290,520,980], microondas:[180,320,620], placa:[260,480,950], gas:[180,320,620], ext:[0,1150,1900],
    lavavajillas:[380,560,980], lavadora:[360,520,890], secadora:[380,560,900], frigo:[640,980,1800], congelador:[560,860,1500],
    frigo_libre:[520,820,1600], americano:[1100,1600,2600], cocina:[420,780,1500], vinoteca:[350,620,1200], frigo_bajo:[360,520,850],
    campana:[180,420,980], campana_int:[150,290,520], cafetera:[650,1100,1900], calienta:[280,420,650],
    fregadero:[110,220,480], grifo:[70,160,380]
  },
  montaje_mod: 35,     // € por módulo instalado
  montaje_top_ml: 25,
  transporte: 120,
  margen: 0,           // % adicional
  descuento: 0,        // %
  iva: 21
};
