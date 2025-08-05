#!/bin/bash

# Script de build para Render
echo "🚀 Iniciando build para Render..."

# Ir al directorio del servidor
cd server

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Verificar que las variables de entorno estén configuradas
echo "🔑 Verificando variables de entorno..."
if [ -z "$OPENWEATHER_API_KEY" ]; then
    echo "❌ OPENWEATHER_API_KEY no está configurada"
    exit 1
fi

if [ -z "$ACCUWEATHER_API_KEY" ]; then
    echo "❌ ACCUWEATHER_API_KEY no está configurada"
    exit 1
fi

echo "✅ Build completado para Render"
