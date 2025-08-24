import React, { useEffect, useRef, useState } from 'react';

// Street View 360 component using Google Maps JavaScript API.
// Requires: VITE_GOOGLE_MAPS_API_KEY in environment (.env) and enabled Maps JavaScript API + Street View rights.
// It tries to display a specific panoId first; if it fails, falls back to nearest panorama via lat/lng.

const PANO_ID = 'CIHM0ogKEICAgIC7kYKx_QE'; // extracted from user Street View link
const LAT = -3.5728483;
const LNG = -79.6892796;

function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google);
    const existing = document.getElementById('gmaps-js');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gmaps-js';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function StreetView360({ height = '100%', onFail }) {
  const ref = useRef(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error | nocoverage
  const [message, setMessage] = useState('Cargando Street View…');
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setStatus('error');
      setMessage('Falta API key (VITE_GOOGLE_MAPS_API_KEY).');
      onFail && onFail('apikey-missing');
      return;
    }
    let cancelled = false;
    loadGoogleMaps(apiKey)
      .then(g => {
        if (cancelled) return;
        const sv = new g.maps.StreetViewService();
        const container = ref.current;
        if (!container) return;
        const panorama = new g.maps.StreetViewPanorama(container, {
          pano: PANO_ID,
          pov: { heading: 337.15, pitch: 51.68 },
          visible: true,
          motionTracking: false,
          motionTrackingControl: false,
          addressControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });
        const tryLocationFallback = () => {
          sv.getPanorama({ location: { lat: LAT, lng: LNG }, radius: 50 }, (data, statusCode) => {
            if (statusCode === g.maps.StreetViewStatus.OK) {
              panorama.setPano(data.location.pano);
              panorama.setPov({ heading: data.tiles.centerHeading || 0, pitch: 0 });
              setStatus('ready');
              setMessage('');
            } else {
              setStatus('nocoverage');
              setMessage('No hay cobertura Street View embebible aquí. Usa el enlace externo.');
              onFail && onFail('nocoverage');
            }
          });
        };
        g.maps.event.addListenerOnce(panorama, 'idle', () => {
          if (cancelled) return;
          if (panorama.getPano()) {
            setStatus('ready');
            setMessage('');
          } else {
            tryLocationFallback();
          }
        });
        setTimeout(() => {
          if (status === 'loading') {
            if (!panorama.getPano()) tryLocationFallback();
          }
        }, 6000);
      })
      .catch(err => {
        if (cancelled) return;
        setStatus('error');
        setMessage('Error cargando API de Google Maps.');
        onFail && onFail('api-load-error', err);
      });
    return () => { cancelled = true; };
  }, [apiKey]);

  return (
    <div style={{ position:'relative', width:'100%', height }}>
      <div ref={ref} style={{ width:'100%', height:'100%', border:0 }} />
      {status !== 'ready' && (
        <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', background:'rgba(0,0,0,0.35)', color:'#fff', textAlign:'center', padding:'1rem'}}>
          {message}
        </div>
      )}
    </div>
  );
}
