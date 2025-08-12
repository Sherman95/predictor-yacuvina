import React, { useEffect, useRef, useState } from 'react';
import MejorDiaBanner from './MejorDiaBanner';
import PronosticoCard from './PronosticoCard';

// Versión desktop profesional sin lógica de scroll ni indicadores "stories"
function PronosticoSection({ cargando, error, pronostico, mejorDia }) {
  const gridRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(true);

  useEffect(() => {
    if (!gridRef.current) return;
    const container = gridRef.current;
    const cards = Array.from(container.querySelectorAll('.forecast-card'));
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          const idx = cards.indexOf(entry.target);
          if (idx !== -1) setActiveIndex(idx);
        } else {
          entry.target.classList.remove('is-visible');
        }
      });
    }, { root: container, threshold: 0.6 });
    cards.forEach(c => observer.observe(c));
    const onUserScroll = () => { if (hintVisible) setHintVisible(false); };
    container.addEventListener('scroll', onUserScroll, { passive: true });
    return () => { observer.disconnect(); container.removeEventListener('scroll', onUserScroll); };
  }, [pronostico, hintVisible]);

  const scrollToCard = (i) => {
    if (!gridRef.current) return;
  const card = gridRef.current.querySelectorAll('.forecast-card')[i];
    if (card) card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
  };
  
  if (cargando) {
    return (
      <>
        <MejorDiaBanner mejorDia={null} />
        <div className="forecast-skeleton-row" aria-label="Cargando pronóstico">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="forecast-skeleton-card" key={i} aria-hidden="true">
              <div className="skeleton-badge" />
              <div className="skeleton-line" style={{ width: '55%' }} />
              <div className="skeleton-line short" />
              <div className="skeleton-icon" />
              <div className="skeleton-line" />
              <div className="skeleton-line short" />
              <div className="skeleton-line" style={{ height: '36px', borderRadius: '12px' }} />
              <div className="skeleton-shine" />
            </div>
          ))}
        </div>
      </>
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
      
      <div className="pronostico-grid" role="region" aria-label="Pronóstico deslizable" ref={gridRef}>
        {/* Ghost padding for centered first/last */}
        <div aria-hidden="true" style={{ flex: '0 0 7%', scrollSnapAlign: 'none' }} />
        {pronostico.map((dia, index) => (
          <PronosticoCard key={dia.fecha || index} dia={dia} />
        ))}
        <div aria-hidden="true" style={{ flex: '0 0 7%', scrollSnapAlign: 'none' }} />
        {hintVisible && <span className="hint-scroll" aria-hidden="true">Desliza →</span>}
      </div>
      <div className="carousel-dots" aria-label="Navegación pronóstico">
        {pronostico.map((_, i) => (
          <button key={i} onClick={() => scrollToCard(i)} aria-current={i === activeIndex} aria-label={`Ver día ${i + 1}`}></button>
        ))}
      </div>
    </>
  );
}

export default PronosticoSection;