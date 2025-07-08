import React from 'react';

function InfoSection() {
  return (
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
  );
}

export default InfoSection;