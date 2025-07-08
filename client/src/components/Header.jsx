// En src/components/Header.jsx

import React from 'react';

function Header({ actualizado, isRefreshing }) { // <-- Recibe isRefreshing
  return (
    <header>
      <h1>Pronóstico de Atardeceres en Yacuviña</h1>
      <p>Análisis para los próximos días</p>
      {actualizado && (
        <p className="actualizado">
          Última actualización: {actualizado.toLocaleTimeString('es-EC')}
          {/* Renderizado condicional del indicador */}
          {isRefreshing && <span className="refreshing-indicator"> 🔄</span>}
        </p>
      )}
    </header>
  );
}

export default Header;