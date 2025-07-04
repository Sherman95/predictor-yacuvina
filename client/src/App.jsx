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
    const ideal = pronostico.find(d => d.prediccion === "Mar de Nubes Ideal");
    if (ideal) return ideal;
    const excelente = pronostico.find(d => d.prediccion === "Excelente");
    if (excelente) return excelente;
    const bueno = pronostico.find(d => d.prediccion === "Bueno");
    if (bueno) return bueno;
    return null;
  }, [pronostico]);

  const getCardColor = (prediccion) => {
    if (prediccion.startsWith("Mar de Nubes")) return 'card-ideal';
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
      
      {/* --- SECCIÓN DE INFORMACIÓN ACTUALIZADA --- */}
      <section className="info-detallada">
        <div className="info-grid">
          <div className="info-card">
            <h3>Ubicación y Altitud</h3>
            <p>A 6 km de Paccha, Yacuviña se alza entre 1,500 y 2,450 msnm, ofreciendo un microclima ideal para disfrutar del mar de nubes en las montañas.</p>
          </div>
          <div className="info-card">
            <h3>Patrimonio e Historia</h3>
            <p>Este inmenso complejo arqueológico (≈100 ha) reúne terrazas, graderíos y templos Inca-Cañari, conectados por el antiguo Qhapaq Ñan.</p>
          </div>
          <div className="info-card">
            <h3>Mejor Temporada</h3>
            <p>De julio a octubre ofrece atardeceres inolvidables, con el sol poniéndose sobre un mar de nubes visible desde el mirador.</p>
          </div>
          <div className="info-card">
            <h3>Recomendaciones</h3>
            <p>Usa ropa deportiva, trae abrigo, protector solar, agua y un poncho por la posibilidad de lluvias repentinas.</p>
          </div>
        </div>
      </section>

      {mejorDia && (
        <div className="mejor-dia-banner">
          <h3>Mejor Día para Ir</h3>
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
            {dia.razon && <p className="razon-texto">{dia.razon}</p>}
            <div className="detalles">
              <p><span>Temp:</span> {dia.temperatura}°C</p>
              <p><span>Atardecer:</span> {dia.horaAtardecer}</p>
            </div>
            <div className="confianza"><span>Confianza: <strong>{dia.confianza}%</strong></span></div>
          </div>
        ))}
      </div>

      <section className="actividades-container">
        <h2>Actividades Destacadas</h2>
        <ul>
            <li>Camina por senderos arqueológicos (1-2 h).</li>
            <li>Sube al columpio “Tocando el Cielo” por ∼USD 3.</li>
            <li>Captura vistas épicas del paisaje y el mar de nubes.</li>
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
            src="https://www.google.com/maps/embed?pb=!4v1751332934009!6m8!1m7!1sCAoSF0NJSE0wb2dLRUlDQWdJQzdrWUt4X1FF!2m2!1d-3.572848275839934!2d-79.689287!3f26.960414397162744!4f9.525061890646285!5f0.7820865974627469"
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
            <strong>Pronóstico del Clima:</strong> OpenWeatherMap, WeatherAPI, Open-Meteo.
          </p>
           <p>
            <strong>Información:</strong> GAD de Atahualpa, AME, Escafandra News, Viajar en Ecuador, Meet Ecuador, y otras fuentes públicas.
          </p>
           <p>
            <strong>Contenido Multimedia:</strong> Altaturis (Video).
          </p>
        </div>
        {/* --- FIRMA DEL DESARROLLADOR ACTUALIZADA --- */}
        <p className="desarrollador">
          Desarrollado por <strong>Ronald Azuero</strong> – Estudiante de 6to semestre de la carrera de Tecnologías de la Información en la <strong>Universidad Técnica de Machala</strong> 📚<br />
          Tecnologías: Angular · React · C# · Java · SQL Server · PostgreSQL · MySQL 💻<br />
          Motivación: Vi una necesidad propia y decidí compartir la solución con todos 🌄<br />
          <a href="mailto:sherman.2003.a@gmail.com">sherman.2003.a@gmail.com</a> |
          <a href="https://github.com/Sherman95" target="_blank" rel="noopener noreferrer">GitHub</a>
        </p>
      </footer>
    </div>
  );
}

export default App;
