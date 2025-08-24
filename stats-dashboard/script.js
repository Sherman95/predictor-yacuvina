/* Dashboard externo Yacuvina Stats */
// Dominio primario actual de Render (ver logs de despliegue)
let BASE_URL = 'https://yacuvina-api-sherman95.onrender.com'; // primaria Render
// Fallback automático si usuario quedó con dominio viejo en caché
(async()=>{
  try {
    console.log('[DEBUG] Probing primary API', BASE_URL);
    const r = await fetch(BASE_URL+'/', { method:'GET' });
    if(!r.ok){
      console.warn('[DEBUG] Primary API root not OK (%s). Will also test legacy domain.', r.status);
      const legacy = 'https://predictor-yacuvina-api.onrender.com';
      try {
        const r2 = await fetch(legacy+'/', { method:'GET' });
        if(r2.ok){
          console.warn('[DEBUG] Switching BASE_URL to legacy reachable domain');
          BASE_URL = legacy;
        }
      } catch{}
    }
  } catch (e) {
    console.warn('[DEBUG] Primary probe failed', e.message);
  }
})();
const $ = sel => document.querySelector(sel);
let charts = {};
// Cache temporal del log completo (para evitar múltiples llamadas seguidas)
let fullLogCache = null;
let fullLogCacheTime = 0;
const FULL_LOG_TTL_MS = 15000;

// ====== THEME ======
function initTheme(){
  const saved = localStorage.getItem('dashTheme') || 'dark';
  if(saved === 'light') document.body.classList.add('light');
  updateThemeBtn();
}
function toggleTheme(){
  document.body.classList.toggle('light');
  localStorage.setItem('dashTheme', document.body.classList.contains('light')? 'light':'dark');
  updateThemeBtn();
}
function updateThemeBtn(){
  const btn = document.getElementById('themeBtn');
  if(!btn) return;
  const light = document.body.classList.contains('light');
  btn.textContent = light ? 'Tema Dark' : 'Tema Light';
}

function fmt(n){return Intl.NumberFormat('es-EC').format(n||0);}    
function getBase(){ return BASE_URL; }
function setBase(){ /* noop (fixed) */ }
function getJWT(){ return localStorage.getItem('yacuvinaJWT') || ''; }
function setJWT(t){ if(t) localStorage.setItem('yacuvinaJWT', t); else localStorage.removeItem('yacuvinaJWT'); updateAuthUI(); }
function updateAuthUI(){
  const has = !!getJWT();
  $('#logoutBtn')?.classList.toggle('hidden', !has);
  $('#integridadBtn')?.classList.toggle('hidden', !has);
  $('#resetBtn')?.classList.toggle('hidden', !has);
  document.body.classList.toggle('authenticated', has);
}

// ====== PREDICCIÓN ======
async function loadPrediccion(){
  const base = getBase();
  const url = base + '/api/prediccion';
  try{
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    if(!data.forecast){ console.warn('Prediccion sin forecast', data); return; }
    renderPrediccion(data);
  }catch(e){
    console.error('Prediccion error', e);
    const el = document.getElementById('prediccionResumen');
    if(el) el.innerHTML = `<div class="text-rose-400 text-sm">Error predicción: ${e.message}</div>`;
  }
}

function categoriaColor(score){
  if(score>=90) return '#10b981';
  if(score>=70) return '#0ea5e9';
  if(score>=50) return '#f59e0b';
  if(score>=30) return '#f97316';
  return '#ef4444';
}

function renderPrediccion(data){
  // Mejor día = mayor puntajeNumerico
  const lista = data.forecast.slice();
  lista.sort((a,b)=> (b.puntajeNumerico||0) - (a.puntajeNumerico||0));
  const mejor = lista[0];
  if(mejor){
    $('#mejorDiaTitulo').textContent = `${mejor.diaSemana} (${mejor.fecha})`;
    $('#mejorDiaRazon').textContent = mejor.razon?.split(',').slice(0,3).join(', ');
    $('#mejorDiaScore').textContent = mejor.puntajeNumerico;
    $('#mejorDiaTipo').textContent = mejor.tipoAtardecer || '-';
    $('#mejorDiaConf').textContent = (mejor.confianza||0)+'%';
  }
  $('#predLastUpdated').textContent = (data.lastUpdated? new Date(data.lastUpdated).toLocaleString() : '—');
  const badgeWrap = document.getElementById('predBadgeContainer');
  if(badgeWrap){
    badgeWrap.innerHTML = '';
    const cats = {};
    data.forecast.forEach(f=>{ cats[f.prediccion]= (cats[f.prediccion]||0)+1; });
    badgeWrap.innerHTML = Object.entries(cats).map(([c,n])=>`<span class="px-2 py-1 rounded-md text-[10px] bg-white/10">${c}: ${n}</span>`).join('');
  }
  // Tabla
  const tbody = document.getElementById('tablaPronostico');
  if(tbody){
    tbody.innerHTML = data.forecast.map(f=>{
      return `<tr class="border-b border-white/5 hover:bg-white/5 transition" title="${(f.razon||'').replace(/\"/g,'')}">
        <td class="px-2 py-1">${f.diaSemana||''}</td>
        <td class="px-2 py-1">${f.fecha||''}</td>
        <td class="px-2 py-1 font-semibold" style="color:${categoriaColor(f.puntajeNumerico||0)}">${f.puntajeNumerico??'–'}</td>
        <td class="px-2 py-1">${f.prediccion||''}</td>
        <td class="px-2 py-1">${f.tipoAtardecer||''}</td>
        <td class="px-2 py-1">${f.nubesBajas??'-'}%</td>
        <td class="px-2 py-1">${f.nubesMedias??'-'}%</td>
        <td class="px-2 py-1">${f.nubesAltas??'-'}%</td>
        <td class="px-2 py-1">${f.humedad??'-'}%</td>
        <td class="px-2 py-1">${f.visibilidad??'-'}</td>
      </tr>`;
    }).join('');
  }
  // Charts
  const labels = data.forecast.map(f=>f.diaSemana||'');
  const scores = data.forecast.map(f=>f.puntajeNumerico||0);
  ensureChart('predScoreChart', {
    type:'bar',
    data:{ labels, datasets:[{ label:'Score', data:scores, backgroundColor:scores.map(categoriaColor) }] },
    options:{responsive:true, plugins:{legend:{labels:{color:'#e2e8f0'}}}, scales:{x:{ticks:{color:'#94a3b8'}}, y:{ticks:{color:'#94a3b8'}, suggestedMin:0, suggestedMax:100}}}
  });
  ensureChart('predCloudsChart', {
    type:'line',
    data:{ labels, datasets:[
      { label:'Bajas', data:data.forecast.map(f=>f.nubesBajas||0), borderColor:'#0ea5e9', backgroundColor:'rgba(14,165,233,.25)', tension:.3 },
      { label:'Medias', data:data.forecast.map(f=>f.nubesMedias||0), borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,.25)', tension:.3 },
      { label:'Altas', data:data.forecast.map(f=>f.nubesAltas||0), borderColor:'#f59e0b', backgroundColor:'rgba(245,158,11,.25)', tension:.3 }
    ]},
    options:{responsive:true, plugins:{legend:{labels:{color:'#e2e8f0'}}}, scales:{x:{ticks:{color:'#94a3b8'}}, y:{ticks:{color:'#94a3b8'}, suggestedMin:0, suggestedMax:100}}}
  });
  // Spark line
  const sparkCtx = document.getElementById('predScoreSpark')?.getContext('2d');
  if(sparkCtx){
    if(charts['predScoreSpark']) charts['predScoreSpark'].destroy();
    charts['predScoreSpark'] = new Chart(sparkCtx, {
      type:'line', data:{ labels: data.forecast.map((_,i)=>i+1), datasets:[{ data:scores, borderColor:'#10b981', fill:false, tension:.35 }]},
      options:{responsive:true, plugins:{legend:{display:false}}, scales:{x:{display:false}, y:{display:false}}, elements:{point:{radius:2}}}
    });
  }
}

function exportPronosticoCSV(){
  const rows = document.querySelectorAll('#tablaPronostico tr');
  if(!rows.length) return;
  const header = ['Dia','Fecha','Score','Prediccion','Tipo','NubesBajas','NubesMedias','NubesAltas','Humedad','Visibilidad'];
  const data = [header.join(',')];
  rows.forEach(r=>{
    const cols=[...r.children].map(td=> '"'+td.textContent.replace(/"/g,'""')+'"');
    data.push(cols.join(','));
  });
  const blob = new Blob([data.join('\n')], { type:'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pronostico.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function buildKPI(data){
  const kpis = [
    {k:'total', t:'Hits API (hoy)', v:data.total},
    {k:'unicos', t:'Visitantes API (hoy)', v:data.unicos},
    {k:'siteHitsHoy', t:'Hits Sitio (hoy)', v:data.siteHitsHoy},
    {k:'siteVisitorsHoy', t:'Visitantes Sitio (hoy)', v:data.siteVisitorsHoy},
    {k:'totales.total', t:'Hits API (hist)', v:data.totales.total},
    {k:'totales.unicos', t:'Visitantes API (hist)', v:data.totales.unicos},
    {k:'acumulado.total', t:'Hits API (acum)', v:data.acumulado?.total||0},
    {k:'acumulado.unicos', t:'Visitantes API (acum)', v:data.acumulado?.unicos||0},
  ];
  $('#kpiCards').innerHTML = kpis.map(k=>`<div class=card><h3>${k.t}</h3><div class=value>${fmt(k.v)}</div></div>`).join('');
}

function renderAcumuladoMini(acum){
  const wrap = document.getElementById('kpiAcumulado');
  if(!wrap) return;
  wrap.innerHTML = `
    <div class="mini"><h4>Acum Hits</h4><div class="val">${fmt(acum.total||0)}</div></div>
    <div class="mini"><h4>Acum Únicos</h4><div class="val">${fmt(acum.unicos||0)}</div></div>`;
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
  // Tabla detalle: ciudad, hits, únicos, país (aprox si coincide nombre en keysPais)
  const tbody = document.getElementById('geoDetalleHoy');
  if(tbody){
    const porCiudad = data.geoHoy?.porCiudad || {};
    const uniqueCiudad = data.geoHoy?.uniqueCiudad || {};
    // Para país, como geoHoy no devuelve mapping ciudad->pais directamente, intentamos deducir: si sólo hay un país, usarlo; si varios, dejamos '-'
    const paises = Object.keys(data.geoHoy?.porPais||{});
    const unicoPais = paises.length === 1 ? paises[0] : '';
    const filas = Object.entries(porCiudad).sort((a,b)=>b[1]-a[1]).map(([city,hits])=>{
      const unicos = uniqueCiudad[city] || 0;
      return `<tr><td class="py-1 pr-4">${city}</td><td class="py-1 pr-4">${hits}</td><td class="py-1 pr-4">${unicos}</td><td class="py-1 pr-4">${unicoPais||'-'}</td></tr>`;
    });
    tbody.innerHTML = filas.join('') || '<tr><td class="py-2" colspan="4">Sin datos</td></tr>';
  }
}

function renderVisitLog(data){
  const list = document.getElementById('visitLogList');
  const metaEl = document.getElementById('visitLogMeta');
  if(!list || !metaEl) return;
  const arr = data.visitLogLast || [];
  const meta = data.visitLogMeta || {};
  metaEl.textContent = `Mostrando últimas ${arr.length} / total ${meta.total||0} (placeholders=${meta.placeholders||0})`;
  // Mostrar más reciente arriba: invertimos
    const render = arr.slice().reverse().map(v => {
      const hora = v.hora || '--:--:--';
      const iso = v.time || '';
      const ruta = v.ruta || '-';
      const tipo = v.tipo || 'api';
      const title = iso ? `title="${iso}"` : '';
      return `<li ${title}><span class="text-sky-300">${hora}</span> <span class="text-indigo-300">${tipo}</span> <span class="text-slate-100">${ruta}</span></li>`;
    });
  list.innerHTML = render.join('') || '<li>Sin datos</li>';
}

async function fetchFullLog(){
  const now = Date.now();
  if(fullLogCache && (now - fullLogCacheTime) < FULL_LOG_TTL_MS) return fullLogCache;
  const base = getBase();
  const jwt = getJWT();
  const resp = await fetch(base + '/api/_stats/visitas/log', { headers:{ Authorization:'Bearer '+jwt }, cache:'no-store' });
  if(!resp.ok) throw new Error('HTTP '+resp.status);
  const data = await resp.json();
  fullLogCache = data;
  fullLogCacheTime = now;
  return data;
}

async function showFullLog(){
  const wrap = document.getElementById('visitLogFullWrapper');
  const list = document.getElementById('visitLogFull');
  if(!wrap || !list) return;
  wrap.classList.remove('hidden');
  list.innerHTML = '<li class="animate-pulse text-slate-400">Cargando log completo…</li>';
  try {
    const data = await fetchFullLog();
    const arr = data.data || [];
      list.innerHTML = arr.slice().reverse().map(v => {
        const hora = v.hora || '--:--:--';
        const iso = v.time || '';
        const ruta = v.ruta || '-';
        const tipo = v.tipo || 'api';
        const title = iso ? `title="${iso}"` : '';
        return `<li ${title}><span class="text-sky-300">${hora}</span> <span class="text-indigo-300">${tipo}</span> <span class="text-slate-100">${ruta}</span></li>`;
      }).join('') || '<li>Sin datos</li>';
  } catch(e){
    list.innerHTML = `<li class="text-rose-400">Error: ${e.message}</li>`;
  }
}

function toggleCollapseLog(){
  const body = document.getElementById('visitLogList');
  const btn = document.getElementById('collapseLogBtn');
  if(!body || !btn) return;
  body.classList.toggle('hidden');
  btn.textContent = body.classList.contains('hidden')? 'Mostrar':'Ocultar';
}

async function load(){
  if(!getJWT()){ $('#status').textContent='Necesitas iniciar sesión'; return; }
  const base = getBase();
  const jwt = getJWT();
  const url = base + '/api/_stats/visitas';
  $('#status').textContent = 'Cargando… ('+url+')';
  try{
    const headers = {};
    if(jwt) headers['Authorization'] = 'Bearer '+jwt;
    const resp = await fetch(url, { headers, cache:'no-store' });
    if(!resp.ok){
      let hint='';
  if(resp.status===401) hint='(No autorizado: inicia sesión)';
  else if(resp.status===404) hint='(404: Endpoint no encontrado. Base usada='+base+')';
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
  renderAcumuladoMini(data.acumulado||{});
    renderDayChart(data);
    renderMonthChart(data);
    renderRutas(data);
    renderGeo(data);
  renderVisitLog(data);
    $('#rawJson').textContent = JSON.stringify(data,null,2);
    const ahora = new Date().toLocaleTimeString();
    $('#status').textContent = 'Última actualización ' + ahora + ' (version '+data.version+')';
    // Actualizar badge de versión dashboard + api
    const badge = document.getElementById('dashVersion');
  if(badge) badge.textContent = 'dash 0.4.0 / api '+data.version;
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

async function doLogin(evt){
  evt?.preventDefault();
  // base API puede venir del campo del modal
  const base = getBase();
  const u = $('#loginUser').value.trim();
  const p = $('#loginPass').value;
  if(!u || !p){ showFieldError(!u?'userErr':'passErr','Requerido'); return; }
  const btn = $('#loginSubmit');
  btn.classList.add('loading'); btn.disabled = true;
  try {
    const resp = await fetch(base + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username:u, password:p }) });
    const data = await resp.json();
    if(!resp.ok || !data.ok) throw new Error(data.error||('HTTP '+resp.status));
    setJWT(data.token);
    closeLogin();
    $('#status').textContent='Login OK';
    load();
  } catch(e){ showFieldError('passErr', e.message); }
  finally { btn.classList.remove('loading'); btn.disabled=false; }
}

async function doLogout(){ setJWT(''); $('#status').textContent='Sesión cerrada'; }

async function verIntegridad(){
  const base = getBase();
  try {
    const resp = await fetch(base + '/api/_stats/integridad', { headers:{ Authorization:'Bearer '+getJWT() } });
    const data = await resp.json();
    $('#rawJson').textContent = JSON.stringify(data,null,2);
    $('#status').textContent='Integridad cargada';
  } catch(e){ $('#status').textContent='Integridad error: '+e.message; }
}

async function doReset(){
  if(!confirm('¿Resetear estadísticas?')) return;
  const base = getBase();
  try {
    const resp = await fetch(base + '/api/_stats/reset', { method:'POST', headers:{ Authorization:'Bearer '+getJWT() } });
    const data = await resp.json();
    if(!resp.ok) throw new Error(data.error||('HTTP '+resp.status));
    $('#status').textContent='Reset OK';
    load();
  } catch(e){ $('#status').textContent='Reset error: '+e.message; }
}

function openLogin(){ $('#loginModal').classList.remove('hidden'); }
function closeLogin(){ if(!getJWT()) return; $('#loginModal').classList.add('hidden'); clearLoginErrors(); }
function togglePwd(){ const btn=$('#pwdToggle'); if(!btn) return; btn.classList.toggle('reveal-active'); const inp=$('#loginPass'); inp.type = btn.classList.contains('reveal-active')? 'text':'password'; }
function showFieldError(id,msg){ const el = document.getElementById(id); if(!el) return; el.textContent=msg; el.classList.add('show'); }
function clearLoginErrors(){ ['userErr','passErr'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.textContent=''; el.classList.remove('show'); }}); }

window.addEventListener('DOMContentLoaded',()=>{
  initTheme();
  updateAuthUI();
  $('#loadBtn').addEventListener('click', load);
  $('#autoBtn').addEventListener('click', toggleAuto);
  $('#openLogin').addEventListener('click', openLogin);
  $('#logoutBtn').addEventListener('click', doLogout);
  $('#integridadBtn').addEventListener('click', verIntegridad);
  $('#resetBtn').addEventListener('click', doReset);
  $('#loginForm').addEventListener('submit', doLogin);
  $('#pwdToggle').addEventListener('click', togglePwd);
  document.getElementById('fullLogBtn')?.addEventListener('click', showFullLog);
  document.getElementById('collapseLogBtn')?.addEventListener('click', toggleCollapseLog);
  document.getElementById('btnExportPronostico')?.addEventListener('click', exportPronosticoCSV);
  // Cargar predicción al inicio (si auth ya está, igualmente es pública)
  loadPrediccion();
  document.querySelectorAll('[data-close-login]').forEach(el=>el.addEventListener('click', closeLogin));
  // Si ya hay token en storage (recarga), autenticar visualmente
  if(getJWT()) { updateAuthUI(); closeLogin(); }
  const themeBtn = document.getElementById('themeBtn');
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);
  // Restaurar última base
  // No base dinámica; usuario solo inicia sesión.
});
// trigger workflow deploy
