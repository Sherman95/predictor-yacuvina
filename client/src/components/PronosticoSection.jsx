import React, { useState, useEffect } from 'react';
import MejorDiaBanner from './MejorDiaBanner';
import PronosticoCard from './PronosticoCard';

// Este componente ahora es "tonto", solo recibe props y renderiza.
function PronosticoSection({ cargando, error, pronostico, mejorDia }) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  // Detectar scroll para actualizar indicadores tipo stories
  useEffect(() => {
    const grid = document.querySelector('.pronostico-grid');
    if (!grid) return;

    const handleScroll = () => {
      const scrollLeft = grid.scrollLeft;
      const cardWidth = 300 + 16; // ancho card + gap
      const newIndex = Math.round(scrollLeft / cardWidth);
      setCurrentStoryIndex(Math.min(newIndex, pronostico.length - 1));
    };

    grid.addEventListener('scroll', handleScroll);
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [pronostico]);
  
  if (cargando) {
    return (
      <div className="pronostico-placeholder">
        <div className="loading-spinner"></div>
        Buscando el mejor atardecer...
      </div>
    );
  }

  if (error) {
    return (
      <div className="pronostico-error">
        ⚠️ Estamos presentando problemas para cargar el pronóstico. Por favor, intenta de nuevo más tarde.
      </div>
    );
  }

  return (
    <>
      <MejorDiaBanner mejorDia={mejorDia} />
      
      {/* Indicadores tipo Stories de Instagram - solo en móvil */}
      <div className="stories-indicators">
        {pronostico.map((_, index) => (
          <div 
            key={index}
            className={`story-indicator ${index === currentStoryIndex ? 'active' : ''}`}
          />
        ))}
      </div>
      
      <div className="pronostico-grid">
        {pronostico.map((dia, index) => (
          <PronosticoCard key={dia.fecha || index} dia={dia} />
        ))}
      </div>
    </>
  );
}

export default PronosticoSection;