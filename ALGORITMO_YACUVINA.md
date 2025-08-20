# 🧠 Algoritmo Yacuviña 3.0 – Documento Técnico

## 1. Propósito
Predecir la “calidad de experiencia” del atardecer en el mirador arqueológico de Yacuviña, distinguiendo entre:
- Escenario MAR DE NUBES (nubes bajas densas bajo el observador)
- Escenario ATARDECER DESPEJADO (cielo amplio para colores y horizonte limpio)
- Escenarios mixtos (se evalúan ambos modelos y se selecciona el más prometedor)

Salida principal por día (momento cercano al atardecer): puntaje 0–100, categoría (Excelente–Muy Malo), tipo de atardecer, factores positivos y penalizaciones.

## 2. Fuentes de Datos
| Fuente | Uso Principal | Variables Clave |
|--------|---------------|-----------------|
| Open‑Meteo | Base horaria principal | nubes_bajas, medias, altas, visibilidad, temperatura, humedad, viento, uv_index, presión |
| OpenWeather | Complemento lluvia + icono | lluvia_ow (POP), icono (condición) |
| AccuWeather | Complemento lluvia + techo nube | lluvia_aw, ceiling |

Todas se convierten a un formato horario unificado: `YYYY-MM-DD -> hora -> { features }`.

## 3. Flujo General
```
(1) Descarga paralela APIs
(2) Adaptadores → estructuras unificadas
(3) Merge horario por fecha
(4) Calcular hora local real de atardecer (SunCalc)
(5) Seleccionar hora disponible más cercana al atardecer
(6) Ejecutar modelos: MarDeNubes y Despejado
(7) Reglas de detección rápida → escoger modelo directo o comparar
(8) Aplicar penalizaciones (neblina, lluvia, humedad extrema, viento fuerte)
(9) Limitar 0–100, mapear a categoría semántica
(10) Empaquetar y guardar pronostico.json
```

## 4. Selección de la Hora Clave
Se calcula `sunset` con SunCalc (lat/long de Yacuviña + TZ America/Guayaquil). De las horas disponibles en el día se toma la más cercana al atardecer (no se promedia; se considera la experiencia puntual).

## 5. Modelos de Escenario
### 5.1. Modelo Mar de Nubes
Ponderaciones:
- Nubes Bajas (50%) – Formación del “mar”.
- Visibilidad (30%) – Debe ser buena arriba; si hay neblina local se penaliza fuerte.
- Nubes Altas (10%) – Pocas para no tapar el sol.
- Temperatura (5%) – Rango cómodo/estabilidad.
- Viento (5%) – Suave mantiene colchón.

### 5.2. Modelo Atardecer Despejado
Ponderaciones:
- Cobertura Total Baja (40%) – Cielo abierto.
- Visibilidad (35%) – Horizonte limpio.
- Índice UV (15%) – Energía previa para colores intensos.
- Temperatura (5%) – Confort.
- Viento (5%) – Ligero ayuda a claridad sin levantar polvo/bruma.

## 6. Detección del Tipo
Reglas rápidas:
1. Si nubes_bajas ≥ 60% → se asume escenario MAR DE NUBES dominante.
2. Si (nubes_bajas + nubes_medias + nubes_altas) ≤ 60% y nubes_bajas ≤ 30% → escenario DESPEJADO.
3. En caso contrario: se calculan ambos modelos y se escoge el que entregue mayor puntaje.

## 7. Penalizaciones Posteriores
| Condición | Umbral | Penalización | Razón |
|-----------|--------|--------------|-------|
| Visibilidad < 1 km | Crítico | -40 | Neblina densa anula experiencia |
| Visibilidad 1–3 km | Fuerte | -25 | Neblina limita colores/profundidad |
| Lluvia activa (icono 09/10) | — | -30 | Lluvia incompatible con observación |
| Prob. Lluvia ≥ 30% | Alerta | -20 | Alta chance de arruinar cielo |
| Prob. Lluvia 15–29% | Moderada | -10 | Inestabilidad |
| Humedad ≥ 98% | Extrema | -15 | Riesgo neblina súbita |
| Viento > 30 km/h | Fuerte | -15 | Dispersa mar de nubes o introduce bruma |

Las penalizaciones se suman (acumulativas) y luego se clamp a [0, 100].

## 8. Conversión a Categoría
| Rangos Puntaje | Categoría |
|----------------|-----------|
| ≥ 85 | Excelente |
| 70–84 | Bueno |
| 50–69 | Regular |
| 30–49 | Malo |
| < 30 | Muy Malo |

Confianza actual: `confianza = 80 + (puntaje / 5)` (bounded 80–100 aprox.).

## 9. Estructura de Salida (por día)
```json
{
  "diaSemana": "martes",
  "fecha": "12 de agosto",
  "prediccion": "Bueno",
  "tipoAtardecer": "Mar de Nubes",
  "puntajeNumerico": 74,
  "razon": "Mar de nubes bueno, Visibilidad excelente...",
  "horaAtardecer": "18:14",
  "humedad": 82,
  "viento": 8,
  "uvIndex": 4,
  "visibilidad": 11.2,
  "nubesBajas": 72,
  "nubesMedias": 18,
  "nubesAltas": 10,
  "temperatura": 15,
  "confianza": 94
}
```

## 10. Ejemplo Comparativo
| Día | nubes_bajas | total_nubes | visibilidad | Resultado | Explicación |
|-----|-------------|-------------|-------------|-----------|------------|
| A | 75% | 85% | 11 km | Excelente (Mar de Nubes) | Colchón denso + horizonte limpio |
| B | 15% | 28% | 16 km | Excelente (Despejado) | Cielo abierto + gran claridad |
| C | 58% | 70% | 2 km | Regular | Penalizado por neblina (visibilidad baja) |
| D | 65% | 90% | 9 km | Bueno (Mar de Nubes) | Denso pero nubes altas moderadas |
| E | 10% | 65% | 14 km | Bueno (Despejado) | Parcialmente despejado + buena visibilidad |

## 11. Limitaciones Actuales
- Solo usa la hora más cercana al sunset (no curva de tendencia previa/posterior).
- Sin mezcla ponderada de ambos modelos (elige el mejor en mixto).
- Sin intervalo de incertidumbre / probabilidad calibrada.
- Sin modelado explícito de punto de rocío / spread térmico.
- Penalizaciones estáticas (no estacionales).

## 12. Posibles Mejoras Próximas
| Mejora | Beneficio |
|--------|----------|
| Mezcla ponderada modelos | Reduce falsos optimistas en mixtos |
| Intervalo (scoreMin/Max) | Transparencia en incertidumbre |
| Dew Point + Spread Temp | Detección anticipada de neblina |
| Pesos estacionales | Ajuste según época húmeda/seca |
| Curvas suaves (sigmoid) | Menos saltos de puntuación |
| Calibración histórica | Puntajes alineados a resultados reales |

## 13. Explicación Simple (Pitch)
“Recolectamos datos de tres servicios, calculamos la hora real del atardecer y evaluamos dos escenarios: mar de nubes y cielo despejado. Sumamos puntos cuando las condiciones ayudan al espectáculo y restamos cuando lluvia, neblina o viento lo arruinan. El resultado: una categoría clara que dice si vale la pena subir hoy.”

## 14. Glosario Rápido
| Término | Significado |
|---------|-------------|
| Mar de Nubes | Capa densa de nubes bajas vista desde arriba |
| Visibilidad | Distancia horizontal clara (km) |
| UV Index | Energía solar disponible previa (colores) |
| Puntaje | Valor agregado de factores ± penalizaciones |
| Categoría | Traducción humana del puntaje |

## 15. Preguntas Frecuentes (FAQ)
**¿Por qué solo una hora?**  Porque el momento clave es la ventana estrecha del atardecer donde el fenómeno es visible.
**¿Puede haber mar de nubes y buen cielo a la vez?** Sí; el algoritmo evalúa ambos modelos y elige el que da mayor espectáculo.
**¿Qué causa una gran penalización instantánea?** Neblina densa (<1 km) o lluvia activa.
**¿Por qué a veces baja de “Bueno” a “Regular” sin mucha diferencia en nubes?** Probablemente por visibilidad o viento elevándose.

---
**Contacto / Notas:** Ajustes futuros deben documentar cambios de pesos para mantener trazabilidad histórica.
