// En src/components/Header.jsx

import React from 'react';

function Header({ actualizado, isRefreshing }) { // <-- Recibe isRefreshing
  return (
    <header>
      <div className="header-container">
        <h1>Pronóstico de Atardeceres en Yacuviña</h1>
        <p className="subtitulo">Análisis especializado con <strong>Algoritmo Yacuviña 3.0</strong></p>
        <div className="tipos-atardecer-info">
          <span className="tipo-info">☁️ Mar de Nubes</span>
          <span className="separador">•</span>
          <span className="tipo-info">🌅 Atardecer Despejado</span>
        </div>
        {actualizado && (
          <p className="actualizado">
            Última actualización: {actualizado.toLocaleTimeString('es-EC')}
            {/* Renderizado condicional del indicador */}
            {isRefreshing && <span className="refreshing-indicator"> 🔄</span>}
          </p>
        )}
      </div>
    </header>
  );
}

export default Header;