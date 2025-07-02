import { useState, useEffect, useMemo } from 'react';
import './App.css';

// --- Imágenes Locales ---
import imagen1 from './assets/yacuvina1.jpg';
import imagen2 from './assets/yacuvina2.jpg';
import imagen3 from './assets/yacuvina3.jpg';
import imagen4 from './assets/yacuvina4.png';

const imagenesYacuvina = [imagen1, imagen2, imagen3, imagen4];

function App() {
  const [pronostico, setPronostico] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizado, setActualizado] = useState(null);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    fetch(`${apiUrl}/api/prediccion`)
      .then(res => {
        if (!res.ok) throw new Error('No se pudo obtener la respuesta del servidor');
        return res.json();
      })
      .then(data => {
        setPronostico(data);
        setActualizado(new Date());
      })
      .catch(err => setError(err.message))
      .finally(() => setCargando(false));
  }, []);

  const mejorDia = useMemo(() => {
    if (!pronostico.length) return null;
    const excelente = pronostico.find(d => d.prediccion.startsWith("Excelente"));
    if (excelente) return excelente;
    const bueno = pronostico.find(d => d.prediccion.startsWith("Bueno"));
    if (bueno) return bueno;
    return null;
  }, [pronostico]);

  const getCardColor = (prediccion) => {
    if (prediccion.startsWith("Excelente")) return 'card-excelente';
    if (prediccion.startsWith("Bueno")) return 'card-bueno';
    if (prediccion.startsWith("Regular")) return 'card-regular';
    if (prediccion.startsWith("Malo")) return 'card-malo';
    return '';
  };

  if (cargando) return <div className="loading">Cargando pronóstico...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="app-container">
      {imagenSeleccionada && (
        <div className="visor-overlay" onClick={() => setImagenSeleccionada(null)}>
          <button className="visor-cerrar" onClick={() => setImagenSeleccionada(null)}>&times;</button>
          <img 
            src={imagenSeleccionada} 
            alt="Visor de imagen" 
            className="visor-imagen"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <header>
        <h1>Pronóstico de Atardeceres en Yacuviña</h1>
        <p>Análisis para los próximos días</p>
        {actualizado && <p className="actualizado">Última actualización: {actualizado.toLocaleTimeString('es-EC')}</p>}
      </header>
      
      <section className="info-detallada">
        <h2>Conoce la Historia y Secretos de Yacuviña</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>🌊 El Significado de su Nombre</h3>
            <p>Yacuviña proviene de las voces quichuas "yacu" (agua) y "viñay" (siempre), traduciéndose como <strong>"Agua Eterna"</strong>.</p>
          </div>
          <div className="info-card">
            <h3>📜 Un Pasado de Conflictos</h3>
            <p>Se cree que el sitio se remonta a 1533, en medio de la disputa por el Tahuantinsuyo entre <strong>Huáscar y Atahualpa</strong>.</p>
          </div>
          <div className="info-card">
            <h3>🗺️ ¿Cómo Llegar?</h3>
            <p>Desde Paccha, el complejo está a solo 20 minutos. Las rutas desde Machala son:</p>
            <ul>
              <li><strong>Ruta 1 (90 min):</strong> Machala → Pasaje → Paccha.</li>
              <li><strong>Ruta 2 (120 min):</strong> Machala → Santa Rosa → Piñas → Paccha.</li>
            </ul>
          </div>
        </div>
        <p className="info-fuente">Información adaptada de fuentes del GAD de Atahualpa y AME.</p>
      </section>

      {mejorDia && (
        <div className="mejor-dia-banner">
          <h3>🏆 Mejor Día para Ir</h3>
          <p>{mejorDia.diaSemana}, {mejorDia.fecha}</p>
          <span>Predicción: {mejorDia.prediccion}</span>
        </div>
      )}

      <div className="pronostico-grid">
        {pronostico.map((dia, index) => (
          <div key={index} className={`card ${getCardColor(dia.prediccion)}`}>
            <h2>{dia.diaSemana}</h2>
            <p className="fecha">{dia.fecha}</p>
            <img className="weather-icon" src={`http://openweathermap.org/img/wn/${dia.icono}@2x.png`} alt="Icono del clima" />
            <p className="prediccion-texto">{dia.prediccion}</p>
            {/* --- LÍNEA AÑADIDA PARA MOSTRAR LA RAZÓN --- */}
            {dia.razon && <p className="razon-texto">{dia.razon}</p>}
            <div className="detalles"><p>🌡️ {dia.temperatura}°C</p><p>🌅 {dia.horaAtardecer}</p></div>
            <div className="confianza"><span>Confianza: <strong>{dia.confianza}%</strong></span></div>
          </div>
        ))}
      </div>

      <section className="actividades-container">
        <h2>Actividades y Atracciones</h2>
        <ul>
          <li><strong>Recorrido Arqueológico:</strong> Explora el Ushno, las terrazas agrícolas y los senderos señalizados.</li>
          <li><strong>Columpio "Tocando el Cielo":</strong> Para los amantes de la adrenalina, una foto espectacular con el paisaje andino de fondo.</li>
          <li><strong>Senderismo y Acampada:</strong> Recorre los antiguos caminos y disfruta de un increíble cielo nocturno.</li>
        </ul>
      </section>

      <section className="video-container">
        <h2>Aventura en Yacuviña</h2>
        <div className="video-responsive">
          <iframe 
            title="Video de Yacuviña en Facebook"
            src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Faltaturis.ec%2Fvideos%2F425416452066437%2F&show_text=false&width=500" 
            width="500" 
            height="503" 
            style={{border:'none', overflow:'hidden'}} 
            scrolling="no" 
            frameBorder="0" 
            allowFullScreen={true} 
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
          </iframe>
        </div>
        <p className="info-fuente">Video cortesía de Altaturis.</p>
      </section>

      <section className="galeria-container">
        <h2>Galería de Yacuviña</h2>
        <div className="galeria-grid">
          {imagenesYacuvina.map((url, index) => (
            <img 
              key={index} 
              src={url} 
              alt={`Imagen de Yacuviña ${index + 1}`} 
              className="galeria-img"
              onClick={() => setImagenSeleccionada(url)}
            />
          ))}
        </div>
      </section>
      
      <section className="vista-360-container">
        <h2>Explora Yacuviña en 360°</h2>
        <div className="mapa-responsive">
          <iframe
            title="Vista 360 de Yacuviña"
            src="https://www.google.com/maps/embed?pb=!4v1751332934009!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJQzdrWUt4X1FF!2m2!1d-3.572848275839934!2d-79.6892796068284!3f26.960414397162744!4f9.525061890646285!5f0.7820865974627469"
            width="600"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </section>

      <footer className="footer">
        <div className="creditos">
          <h4>Fuentes y Créditos</h4>
          <p>
            <strong>Pronóstico del Clima:</strong> OpenWeatherMap, WeatherAPI, Open-Meteo | 
            <strong> Información Histórica:</strong> GAD de Atahualpa & AME |
            <strong> Video:</strong> Altaturis
          </p>
        </div>
        <p className="desarrollador">Desarrollado con ❤️ por un entusiasta de los atardeceres.</p>
      </footer>
    </div>
  );
}

export default App;
