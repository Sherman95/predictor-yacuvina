import React, { useEffect, useRef, useState } from 'react';

// Versión desktop profesional sin lógica móvil ni indicadores de scroll
function InfoSection() {
  const gridRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll('.info-card'));
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = cards.indexOf(entry.target);
          if (idx !== -1) setActive(idx);
        }
      });
    }, { root: el, threshold: 0.6 });
    cards.forEach(c => io.observe(c));
    return () => io.disconnect();
  }, []);

  const scrollTo = (i) => {
    const el = gridRef.current;
    if (!el) return;
    const card = el.querySelectorAll('.info-card')[i];
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };

  return (
    <section className="info-detallada" aria-labelledby="titulo-info-yacuvina">
      <h2 id="titulo-info-yacuvina">🏔️ Yacuviña: Mirador Único en Ecuador</h2>

      <div className="info-grid" role="list" ref={gridRef} aria-label="Información deslizable sobre Yacuviña">
        <article className="info-card" role="listitem">
          <h3>📍 Ubicación Estratégica</h3>
          <p>
            A 6 km de Paccha, Yacuviña se alza entre 2,300-2,600 msnm, ofreciendo vistas privilegiadas hacia el valle de Paccha (1,500m). Esta diferencia de altitud permite observar el <strong>mar de nubes</strong> desde arriba.
          </p>
        </article>
        <article className="info-card" role="listitem">
          <h3>🌤️ Algoritmo Yacuviña 3.0</h3>
          <p>Nuestro sistema analiza dos tipos únicos de atardeceres:</p>
          <ul>
            <li><strong>☁️ Mar de Nubes:</strong> Cuando las nubes bajas forman un "océano" espectacular</li>
            <li><strong>🌅 Atardecer Despejado:</strong> Vista panorámica cristalina del valle completo</li>
          </ul>
        </article>
        <article className="info-card" role="listitem">
          <h3>🏛️ Patrimonio Arqueológico</h3>
          <p>Este complejo de ≈100 hectáreas conserva terrazas, graderíos y templos Inca-Cañari, conectados por el ancestral Qhapaq Ñan (Camino del Inca).</p>
        </article>
        <article className="info-card" role="listitem">
          <h3>📊 Precisión Meteorológica</h3>
          <p>Analizamos datos en tiempo real de:</p>
          <ul>
            <li>Visibilidad (crítica para Yacuviña)</li>
            <li>Nubes por niveles de altitud</li>
            <li>Humedad y viento local</li>
            <li>Índice UV para colores intensos</li>
          </ul>
        </article>
        <article className="info-card" role="listitem">
          <h3>🎯 Mejor Temporada</h3>
          <p>Julio a octubre ofrece las mejores condiciones. El clima de montaña presenta humedad del 85-95% (normal para Ecuador), temperaturas de 14-17°C.</p>
        </article>
        <article className="info-card" role="listitem">
          <h3>🎒 Recomendaciones</h3>
          <p>Lleva ropa deportiva, abrigo para la altura, protector solar, agua abundante y poncho impermeable. El ascenso toma 1-2 horas desde Paccha.</p>
        </article>
      </div>
      <p className="info-fuente">
        <em>Predicciones basadas en datos de OpenMeteo, OpenWeather y AccuWeather • Algoritmo especializado para geografía andina ecuatoriana</em>
      </p>
      <div className="carousel-dots" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <button key={i} aria-current={i === active} onClick={() => scrollTo(i)} aria-label={`Ver tarjeta ${i + 1}`}></button>
        ))}
      </div>
    </section>
  );
}

export default InfoSection;