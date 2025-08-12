// En src/components/Header.jsx

import React from 'react';

function Header({ actualizado, isRefreshing }) {
  return (
    <header>
      <div className="header-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1>Pronóstico de Atardeceres en Yacuviña</h1>
            <p className="subtitulo">Análisis especializado con <strong>Algoritmo Yacuviña 3.0</strong></p>
          </div>
        
        </div>
        <div className="tipos-atardecer-info">
          <span className="tipo-info">☁️ Mar de Nubes</span>
          <span className="separador">•</span>
          <span className="tipo-info">🌅 Atardecer Despejado</span>
        </div>
        {actualizado && (
          <p className="actualizado" aria-live="polite">
            Última actualización: {actualizado.toLocaleTimeString('es-EC')}
            {isRefreshing && <span className="refreshing-indicator" aria-label="Actualizando datos"> 🔄</span>}
          </p>
        )}
      </div>
    </header>
  );
}

export default Header;