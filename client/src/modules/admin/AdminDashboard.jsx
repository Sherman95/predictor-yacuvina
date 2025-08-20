import React, { useEffect, useState, useMemo } from 'react';
import './admin.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { format } from 'date-fns';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function AdminDashboard(){
  const [token, setToken] = useState(()=>localStorage.getItem('yacuvina-admin-token')||'');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loginForm, setLoginForm] = useState({ user:'', pass:'' });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showHeat, setShowHeat] = useState(true);
  const [theme, setTheme] = useState(()=> localStorage.getItem('yacuvina-admin-theme') || 'dark');

  useEffect(()=>{
    document.documentElement.classList.remove('admin-theme-dark','admin-theme-light');
    document.documentElement.classList.add(theme === 'dark' ? 'admin-theme-dark' : 'admin-theme-light');
    try { localStorage.setItem('yacuvina-admin-theme', theme); } catch {}
  },[theme]);

  useEffect(()=>{
    let id;
    if (token && autoRefresh){
      id = setInterval(()=>{ fetchStats(); }, 60_000);
    }
    return ()=> id && clearInterval(id);
  },[token, autoRefresh]);

  function login(e){
    e.preventDefault();
    setError(null);
    fetch(`${API_URL}/api/auth/login`,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user:loginForm.user, pass:loginForm.pass})})
      .then(r=>{ if(!r.ok) throw new Error('Login falló'); return r.json(); })
      .then(d=>{ setToken(d.token); localStorage.setItem('yacuvina-admin-token', d.token); fetchStats(d.token); })
      .catch(err=> setError(err.message));
  }

  function logout(){ setToken(''); localStorage.removeItem('yacuvina-admin-token'); setStats(null);}  

  function fetchStats(tok){
    const t = tok || token; if(!t) return;
    setLoading(true);
    fetch(`${API_URL}/api/_stats/visitas`,{ headers:{ Authorization: `Bearer ${t}` }})
      .then(r=>{ if(r.status===401){ logout(); throw new Error('Sessión expirada'); } if(!r.ok) throw new Error('Error cargando stats'); return r.json(); })
      .then(data=> setStats(data))
      .catch(err=> setError(err.message))
      .finally(()=> setLoading(false));
  }

  const serieLinea = useMemo(()=>{
    if(!stats) return null;
    const dias = Object.entries(stats.historico).sort((a,b)=> a[0].localeCompare(b[0]));
    return {
      labels: dias.map(d=> d[0].slice(5)),
      datasets:[{
        label:'Visitas', data: dias.map(d=> d[1].total), borderColor:'#ff9800', backgroundColor:'rgba(255,152,0,.15)', tension:.3, fill:true
      },{
        label:'Únicos', data: dias.map(d=> d[1].unicos), borderColor:'#4caf50', backgroundColor:'rgba(76,175,80,.15)', tension:.3, fill:true
      }]
    };
  },[stats]);

  const markers = useMemo(()=>{
    if(!stats?.geoCoordsHistorico?.length) return [];
    return stats.geoCoordsHistorico.map(pt=>({
      key: pt.city,
      position: [pt.lat, pt.lon],
      popup: `${pt.city}: ${pt.total} visitas (${pt.unique} únicos)`
    }));
  },[stats]);

  const heatPoints = useMemo(()=>{
    if(!stats?.geoCoordsHistorico?.length) return [];
    // weight: log para amortiguar ciudades con muchas visitas
    return stats.geoCoordsHistorico.map(pt=> [pt.lat, pt.lon, Math.log(pt.total+1)+1]);
  },[stats]);

  function HeatLayer(){
    const map = useMap();
    useEffect(()=>{
      if(!showHeat) return; // no heat
      if(!heatPoints.length) return;
      const layer = window.L.heatLayer(heatPoints, { radius: 28, blur: 18, maxZoom: 8, minOpacity: 0.25, gradient: {0.2:'#1e3a8a',0.4:'#2563eb',0.6:'#0ea5e9',0.8:'#f59e0b',1:'#ef4444'} });
      layer.addTo(map);
      return ()=> { map.removeLayer(layer); };
    },[map, heatPoints, showHeat]);
    return null;
  }

  if(!token){
    return (
      <div className="admin-login-wrapper">
        <form className="admin-login" onSubmit={login} noValidate>
          <h1 className="logo-text">Panel Yacuviña</h1>
          {error && <p className="err" role="alert">{error}</p>}
          <label className="field">
            <span>Usuario</span>
            <input autoComplete="username" value={loginForm.user} onChange={e=> setLoginForm(f=>({...f,user:e.target.value}))} required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" autoComplete="current-password" value={loginForm.pass} onChange={e=> setLoginForm(f=>({...f,pass:e.target.value}))} required />
          </label>
          <button type="submit" className="btn-primary">Entrar</button>
          <p className="foot-note">Acceso restringido · {new Date().getFullYear()}</p>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div className="head-left">
          <h1 className="app-title">Dashboard</h1>
          <div className="sub">Tráfico y geolocalización</div>
        </div>
        <nav className="head-actions" aria-label="acciones">
          <button className="btn secondary" onClick={()=> setTheme(t=> t==='dark'?'light':'dark')} title="Cambiar tema">{theme==='dark'?'🌞':'🌙'}</button>
          <button className="btn secondary" onClick={()=> fetchStats()} disabled={loading}>↻</button>
          <label className="switch small" title="Auto refresh">
            <input type="checkbox" checked={autoRefresh} onChange={e=> setAutoRefresh(e.target.checked)} />
            <span>Auto</span>
          </label>
          <label className="switch small" title="Heatmap">
            <input type="checkbox" checked={showHeat} onChange={e=> setShowHeat(e.target.checked)} />
            <span>Heat</span>
          </label>
          <button className="btn danger" onClick={logout}>Salir</button>
        </nav>
      </header>
      {loading && <div className="loading">Cargando...</div>}
      {error && <div className="err">{error}</div>}
      {!stats && !loading && <div className="placeholder">Pulsa Refrescar para cargar datos.</div>}
      {stats && (
        <main className="content-area">
          <div className="grid kpi-row">
            <div className="card kpi">
              <div className="label">Hoy</div>
              <div className="value">{stats.total}</div>
              <div className="aux">visitas</div>
            </div>
            <div className="card kpi">
              <div className="label">Hoy únicos</div>
              <div className="value">{stats.unicos}</div>
            </div>
            <div className="card kpi">
              <div className="label">Acumulado</div>
              <div className="value">{stats.acumulado.total}</div>
            </div>
            <div className="card kpi">
              <div className="label">Ratio únicos</div>
              <div className="value">{(stats.unicos && (stats.unicos/stats.total*100).toFixed(1))||'0'}%</div>
            </div>
          </div>
          <div className="grid auto-fit">
            <section className="card panel chart" aria-labelledby="evol-title">
              <h2 id="evol-title" className="panel-title">Evolución diaria</h2>
              {serieLinea && <Line data={serieLinea} options={{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ x:{ grid:{display:false}}, y:{ grid:{color:'var(--border-subtle)'}} } }} height={260} />}
            </section>
            <section className="card panel map" aria-labelledby="map-title">
              <h2 id="map-title" className="panel-title">Mapa histórico</h2>
              <div className="map-wrapper minimal">
                <MapContainer center={[ -1.83, -78.18 ]} zoom={5} scrollWheelZoom={false} className="map-root">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap"/>
                  {showHeat && <HeatLayer />}
                  {markers.map(m=> <Marker key={m.key} position={m.position}><Popup>{m.popup}</Popup></Marker>)}
                </MapContainer>
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
