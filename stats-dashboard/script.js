/* Dashboard externo Yacuvina Stats */
const $ = sel => document.querySelector(sel);
let charts = {};

function fmt(n){return Intl.NumberFormat('es-EC').format(n||0);}    
function buildKPI(data){
  const kpis = [
    {k:'total', t:'Hits API (hoy)', v:data.total},
    {k:'unicos', t:'Visitantes API (hoy)', v:data.unicos},
    {k:'siteHitsHoy', t:'Hits Sitio (hoy)', v:data.siteHitsHoy},
    {k:'siteVisitorsHoy', t:'Visitantes Sitio (hoy)', v:data.siteVisitorsHoy},
    {k:'totales.total', t:'Hits API (hist)', v:data.totales.total},
    {k:'totales.unicos', t:'Visitantes API (hist)', v:data.totales.unicos},
  ];
  $('#kpiCards').innerHTML = kpis.map(k=>`<div class=card><h3>${k.t}</h3><div class=value>${fmt(k.v)}</div></div>`).join('');
}

function ensureChart(id, cfg){
  if(charts[id]){ charts[id].data = cfg.data; charts[id].options = cfg.options||charts[id].options; charts[id].update(); return charts[id]; }
  const ctx = document.getElementById(id).getContext('2d');
  charts[id] = new Chart(ctx, cfg); return charts[id];
}

function renderDayChart(data){
  const dias = Object.keys(data.historico).sort();
  const hits = dias.map(d=> data.historico[d].total||0);
  const unicos = dias.map(d=> data.historico[d].unicos||0);
  ensureChart('visitasDia', {
    type:'bar',
    data:{labels:dias, datasets:[
      {label:'Hits', data:hits, backgroundColor:'#3b82f6'},
      {label:'Únicos', data:unicos, backgroundColor:'#10b981'}
    ]},
    options:{responsive:true, scales:{x:{ticks:{color:'#94a3b8'}}, y:{ticks:{color:'#94a3b8'}}}, plugins:{legend:{labels:{color:'#e2e8f0'}}}}
  });
}

function renderMonthChart(data){
  const meses = Object.keys(data.porMes).sort();
  const hits = meses.map(m=> data.porMes[m].total||0);
  const unicos = meses.map(m=> data.porMes[m].unicos||0);
  ensureChart('visitasMes', {
    type:'line',
    data:{labels:meses, datasets:[
      {label:'Hits', data:hits, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,.3)'},
      {label:'Únicos', data:unicos, borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.3)'}
    ]},
    options:{responsive:true, plugins:{legend:{labels:{color:'#e2e8f0'}}}, scales:{x:{ticks:{color:'#94a3b8'}}, y:{ticks:{color:'#94a3b8'}}}}
  });
}

function renderRutas(data){
  const rutas = Object.entries(data.rutas).sort((a,b)=>b[1]-a[1]).slice(0,10);
  $('#topRutas').innerHTML = rutas.map(([r,c])=>`<li><span>${r}</span><strong>${c}</strong></li>`).join('') || '<li>Sin datos</li>';
}

function pie(id, title, obj){
  const entries = Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).slice(0,8);
  ensureChart(id, {
    type:'doughnut',
    data:{labels: entries.map(e=>e[0]), datasets:[{data:entries.map(e=>e[1]), backgroundColor:['#0ea5e9','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6','#f472b6']}]},
    options:{plugins:{legend:{labels:{color:'#e2e8f0'}}, title:{display:true,text:title,color:'#e2e8f0'}}, cutout:'55%'}
  });
}

function renderGeo(data){
  pie('geoPaisHoy','País Hoy', data.geoHoy?.porPais||{});
  pie('geoCiudadHoy','Ciudad Hoy', data.geoHoy?.porCiudad||{});
  pie('geoPaisHist','País Hist', data.geoHistorico?.porPais||{});
  pie('geoCiudadHist','Ciudad Hist', data.geoHistorico?.porCiudad||{});
}

async function load(){
  let rawInput = $('#baseUrl').value;
  let base = rawInput.trim();
  if(!base){ $('#status').textContent='Ingresa la URL base (ej: https://servidor.onrender.com)'; return; }
  // Normalizaciones encadenadas
  base = base.replace(/\s+/g,''); // quitar espacios internos
  base = base.replace(/^(https?:\/[^/]+)(.+)$/,(m,host,rest)=>{ // evitar paths previos
    return host + rest.replace(/(\/api\/_stats\/visitas.*)$/,'');
  });
  // quitar repeticiones de /api/_stats/visitas al final
  base = base.replace(/(\/api\/_stats\/visitas)+\/?$/,'');
  // quitar trailing slash
  base = base.replace(/\/$/, '');
  if(base !== rawInput){ console.info('[NORMALIZADO]', rawInput,'=>', base); }
  $('#baseUrl').value = base;
  localStorage.setItem('yacuvinaStatsBase', base);
  const token = $('#adminToken').value.trim();
  if(token) localStorage.setItem('yacuvinaStatsToken', token); else localStorage.removeItem('yacuvinaStatsToken');
  const url = base + '/api/_stats/visitas';
  $('#status').textContent = 'Cargando… ('+url+')';
  try{
    const resp = await fetch(url, { headers: token? {'X-Admin-Token':token} : {}, cache:'no-store' });
    if(!resp.ok){
      let hint='';
      if(resp.status===401) hint='(Token inválido o faltante)';
      else if(resp.status===404) hint='(404: Endpoint no encontrado. ¿Base correcta? ¿Backend desplegado?)';
      else if(resp.status===403) hint='(403: CORS bloqueado. Verifica origin en backend)';
      throw new Error('HTTP '+resp.status+' '+hint);
    }
    const ct = resp.headers.get('content-type')||'';
    if(!ct.includes('application/json')) throw new Error('Contenido no JSON: '+ct);
    const data = await resp.json();
    if(!data || !data.version){
      $('#status').textContent='Respuesta sin version. Ver consola.';
      console.warn('Payload recibido', data);
      return;
    }
    buildKPI(data);
    renderDayChart(data);
    renderMonthChart(data);
    renderRutas(data);
    renderGeo(data);
    $('#rawJson').textContent = JSON.stringify(data,null,2);
    const ahora = new Date().toLocaleTimeString();
    $('#status').textContent = 'Última actualización ' + ahora + ' (version '+data.version+')';
    // Actualizar badge de versión dashboard + api
    const badge = document.getElementById('dashVersion');
    if(badge) badge.textContent = 'dash 0.3.0 / api '+data.version;
  }catch(e){
    console.error('Fallo load()', e);
    $('#status').textContent = 'Error: '+e.message;
  }
}

function toggleAuto(){
  const btn = $('#autoBtn');
  const active = btn.getAttribute('data-active')==='1';
  if(active){
    clearInterval(window.__autoTimer); btn.setAttribute('data-active','0'); btn.textContent='Auto 30s';
  } else {
    load();
    window.__autoTimer = setInterval(load, 30000);
    btn.setAttribute('data-active','1'); btn.textContent='Auto ON';
  }
}

window.addEventListener('DOMContentLoaded',()=>{
  $('#loadBtn').addEventListener('click', load);
  $('#autoBtn').addEventListener('click', toggleAuto);
  // Restaurar últimos valores
  const savedBase = localStorage.getItem('yacuvinaStatsBase');
  const savedToken = localStorage.getItem('yacuvinaStatsToken');
  if(savedBase) $('#baseUrl').value = savedBase; else if(location.origin.includes('localhost')) $('#baseUrl').value = 'http://localhost:3001';
  if(savedToken) $('#adminToken').value = savedToken;
  if(savedBase) load();
});
// trigger workflow deploy
