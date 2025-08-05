#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE COMPARACIÓN LOCALHOST vs PRODUCCIÓN
 * 
 * Uso:
 * node compare-environments.js
 * node compare-environments.js --production-url https://tu-servidor.com
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';

const LOCALHOST_URL = 'http://localhost:3001';
const PRODUCTION_URL = process.argv.includes('--production-url') 
    ? process.argv[process.argv.indexOf('--production-url') + 1]
    : 'https://predictor-yacuvina-api.onrender.com';

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const log = {
    info: (msg) => console.log(`${BLUE}ℹ️  ${msg}${RESET}`),
    success: (msg) => console.log(`${GREEN}✅ ${msg}${RESET}`),
    warning: (msg) => console.log(`${YELLOW}⚠️  ${msg}${RESET}`),
    error: (msg) => console.log(`${RED}❌ ${msg}${RESET}`)
};

async function fetchEndpoint(url, endpoint) {
    try {
        const response = await fetch(`${url}${endpoint}`, { timeout: 10000 });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

async function compareEnvironments() {
    log.info('🔍 Iniciando comparación de entornos...\n');
    
    const endpoints = [
        '/api/debug/environment',
        '/api/prediccion',
        '/api/current-weather',
        '/api/debug/api-test'
    ];
    
    const results = {
        localhost: {},
        production: {},
        differences: []
    };
    
    // Obtener datos de ambos entornos
    for (const endpoint of endpoints) {
        log.info(`Consultando ${endpoint}...`);
        
        results.localhost[endpoint] = await fetchEndpoint(LOCALHOST_URL, endpoint);
        results.production[endpoint] = await fetchEndpoint(PRODUCTION_URL, endpoint);
        
        // Verificar disponibilidad
        if (results.localhost[endpoint].error) {
            log.error(`Localhost ${endpoint}: ${results.localhost[endpoint].error}`);
        } else {
            log.success(`Localhost ${endpoint}: ✅`);
        }
        
        if (results.production[endpoint].error) {
            log.error(`Producción ${endpoint}: ${results.production[endpoint].error}`);
        } else {
            log.success(`Producción ${endpoint}: ✅`);
        }
    }
    
    console.log('\n' + '='.repeat(60));
    log.info('📊 ANÁLISIS DE DIFERENCIAS');
    console.log('='.repeat(60));
    
    // Comparar configuraciones de entorno
    const localEnv = results.localhost['/api/debug/environment']?.debug;
    const prodEnv = results.production['/api/debug/environment']?.debug;
    
    if (localEnv && prodEnv) {
        console.log('\n🌍 CONFIGURACIÓN DE ENTORNO:');
        
        // Comparar zona horaria
        if (localEnv.environment.timezone !== prodEnv.environment.timezone) {
            log.warning(`Zona horaria diferente:`);
            console.log(`  Localhost: ${localEnv.environment.timezone}`);
            console.log(`  Producción: ${prodEnv.environment.timezone}`);
            results.differences.push('timezone');
        }
        
        // Comparar API keys
        console.log('\n🔑 API KEYS:');
        Object.keys(localEnv.apiKeys).forEach(key => {
            const localStatus = localEnv.apiKeys[key];
            const prodStatus = prodEnv.apiKeys[key];
            
            if (localStatus !== prodStatus) {
                log.warning(`${key}: Localhost(${localStatus}) vs Producción(${prodStatus})`);
                results.differences.push(`apiKey_${key}`);
            } else {
                log.success(`${key}: ${localStatus}`);
            }
        });
    }
    
    // Comparar datos de pronóstico
    const localForecast = results.localhost['/api/prediccion'];
    const prodForecast = results.production['/api/prediccion'];
    
    if (localForecast && prodForecast && !localForecast.error && !prodForecast.error) {
        console.log('\n📈 DATOS DE PRONÓSTICO:');
        
        const localLastUpdate = localForecast.lastUpdated;
        const prodLastUpdate = prodForecast.lastUpdated;
        
        log.info(`Localhost última actualización: ${localLastUpdate}`);
        log.info(`Producción última actualización: ${prodLastUpdate}`);
        
        const timeDiff = Math.abs(new Date(localLastUpdate) - new Date(prodLastUpdate));
        const minutesDiff = Math.floor(timeDiff / (1000 * 60));
        
        if (minutesDiff > 60) {
            log.warning(`Diferencia de tiempo: ${minutesDiff} minutos`);
            results.differences.push('forecast_timestamp');
        } else {
            log.success(`Sincronización temporal: ${minutesDiff} minutos de diferencia`);
        }
        
        // Comparar número de predicciones
        const localCount = localForecast.forecast?.length || 0;
        const prodCount = prodForecast.forecast?.length || 0;
        
        if (localCount !== prodCount) {
            log.warning(`Número de predicciones: Localhost(${localCount}) vs Producción(${prodCount})`);
            results.differences.push('forecast_count');
        } else {
            log.success(`Número de predicciones: ${localCount}`);
        }
    }
    
    // Guardar reporte completo
    const reportPath = `./comparison-report-${new Date().toISOString().split('T')[0]}.json`;
    await fs.writeFile(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        localhost_url: LOCALHOST_URL,
        production_url: PRODUCTION_URL,
        results,
        summary: {
            total_differences: results.differences.length,
            differences: results.differences,
            status: results.differences.length === 0 ? 'IDENTICAL' : 'DIFFERENCES_FOUND'
        }
    }, null, 2));
    
    console.log('\n' + '='.repeat(60));
    
    if (results.differences.length === 0) {
        log.success('🎉 Los entornos son idénticos!');
    } else {
        log.warning(`⚠️  Se encontraron ${results.differences.length} diferencias`);
        console.log('\nDiferencias encontradas:');
        results.differences.forEach(diff => console.log(`  - ${diff}`));
    }
    
    log.info(`📄 Reporte completo guardado en: ${reportPath}`);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    compareEnvironments().catch(error => {
        log.error(`Error durante la comparación: ${error.message}`);
        process.exit(1);
    });
}

export { compareEnvironments };
