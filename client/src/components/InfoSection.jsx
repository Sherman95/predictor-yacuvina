import React, { useState, useEffect } from 'react';

function InfoSection() {
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
  
  // Array de información para los indicadores
  const infoCards = [
    "Ubicación Estratégica",
    "Algoritmo Yacuviña 3.0", 
    "Patrimonio Arqueológico",
    "Precisión Meteorológica",
    "Mejor Temporada",
    "Recomendaciones"
  ];

  // Detectar scroll para actualizar indicadores
  useEffect(() => {
    const infoGrid = document.querySelector('.info-grid');
    if (!infoGrid) return;

    const handleScroll = () => {
      const scrollLeft = infoGrid.scrollLeft;
      const cardWidth = 320 + 16; // ancho card + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      setCurrentInfoIndex(Math.min(newIndex, infoCards.length - 1));
    };

    infoGrid.addEventListener('scroll', handleScroll);
    return () => infoGrid.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="info-detallada">
      <h2>🏔️ Yacuviña: Mirador Único en Ecuador</h2>
      
      {/* Indicadores solo para móvil */}
      <div className="info-indicators">
        {infoCards.map((_, index) => (
          <div 
            key={index}
            className={`info-indicator ${index === currentInfoIndex ? 'active' : ''}`}
          />
        ))}
      </div>
      
      <div className="info-grid">
        <div className="info-card">
          <h3>📍 Ubicación Estratégica</h3>
          <p>A 6 km de Paccha, Yacuviña se alza entre 2,300-2,600 msnm, ofreciendo vistas privilegiadas hacia el valle de Paccha (1,500m). Esta diferencia de altitud permite observar el <strong>mar de nubes</strong> desde arriba.</p>
        </div>
        <div className="info-card">
          <h3>🌤️ Algoritmo Yacuviña 3.0</h3>
          <p>Nuestro sistema analiza dos tipos únicos de atardeceres:</p>
          <ul>
            <li><strong>☁️ Mar de Nubes:</strong> Cuando las nubes bajas forman un "océano" espectacular</li>
            <li><strong>🌅 Atardecer Despejado:</strong> Vista panorámica cristalina del valle completo</li>
          </ul>
        </div>
        <div className="info-card">
          <h3>🏛️ Patrimonio Arqueológico</h3>
          <p>Este complejo de ≈100 hectáreas conserva terrazas, graderíos y templos Inca-Cañari, conectados por el ancestral Qhapaq Ñan (Camino del Inca).</p>
        </div>
        <div className="info-card">
          <h3>📊 Precisión Meteorológica</h3>
          <p>Analizamos datos en tiempo real de:</p>
          <ul>
            <li>Visibilidad (crítica para Yacuviña)</li>
            <li>Nubes por niveles de altitud</li>
            <li>Humedad y viento local</li>
            <li>Índice UV para colores intensos</li>
          </ul>
        </div>
        <div className="info-card">
          <h3>🎯 Mejor Temporada</h3>
          <p>Julio a octubre ofrece las mejores condiciones. El clima de montaña presenta humedad del 85-95% (normal para Ecuador), temperaturas de 14-17°C.</p>
        </div>
        <div className="info-card">
          <h3>🎒 Recomendaciones</h3>
          <p>Lleva ropa deportiva, abrigo para la altura, protector solar, agua abundante y poncho impermeable. El ascenso toma 1-2 horas desde Paccha.</p>
        </div>
      </div>
      <p className="info-fuente">
        <em>Predicciones basadas en datos de OpenMeteo, OpenWeather y AccuWeather • Algoritmo especializado para geografía andina ecuatoriana</em>
      </p>
    </section>
  );
}

export default InfoSection;