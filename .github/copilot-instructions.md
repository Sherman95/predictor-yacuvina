# Yacuviña Sunset Predictor - AI Coding Agent Instructions

## 🌅 Project Overview
Yacuviña Sunset Predictor is a specialized weather application that predicts optimal sunset viewing conditions at Yacuviña archaeological site in Ecuador. The system uses a sophisticated **Yacuviña 3.0 Algorithm** that evaluates cloud formations to predict "sea of clouds" phenomena and clear sunset conditions.

## 🏗️ Architecture
**Monorepo Structure**: `/client` (React/Vite frontend) + `/server` (Express.js backend)
- **Frontend**: Deployed on Vercel from `/client` directory
- **Backend**: Deployed on Render with root directory build
- **Data Flow**: Multi-API weather aggregation → Custom scoring algorithm → Real-time predictions

## 🚀 Development Workflow

### Local Development
```bash
# Start both services (from root)
npm run dev

# Individual services
npm run dev:server  # Server on localhost:3001
npm run dev:client  # Client on localhost:5173
```

### API Testing
```bash
# Server has debug endpoints for development
curl http://localhost:3001/api/debug/environment
curl http://localhost:3001/api/debug/fresh-data
curl http://localhost:3001/api/current-weather
```

## 🧠 Core Algorithm (Yacuviña 3.0)
Located in `/server/services/weatherService.js`, the algorithm automatically detects sunset scenarios:

1. **Sea of Clouds**: Dense low clouds (60%+) create dramatic "mar de nubes" effect
2. **Clear Sky**: Minimal cloud cover (≤60% total, ≤30% low) for classic sunsets
3. **Mixed Conditions**: Evaluates both scenarios and selects optimal

**Key Scoring Factors**: Low cloud density, visibility, wind conditions, humidity, UV index
**Anti-patterns**: Avoid modifying the core algorithm without understanding cloud meteorology

## 🎨 Frontend Design System
Uses **glassmorphism sunset theme** with CSS custom properties:
- **Colors**: `--gradient-primary/secondary/accent` (sunset oranges/golds)
- **Glass Effects**: `--glass-ultra`, `--glass-premium` with backdrop-filter blur
- **Typography**: Enhanced contrast system with `--text-super-bright`, `--text-bright`

**Critical Files**: 
- `/client/src/index.css` (desktop styles)
- `/client/src/ios-fixes.css` (mobile overrides)

## 🌐 API Integration Patterns
**Multi-source Weather Data**: OpenMeteo (primary) + OpenWeatherMap + AccuWeather
- **Caching**: 1-hour intelligent cache with fallback (`currentWeatherService.js`)
- **Adaptation**: Each API has dedicated adapter functions for data normalization
- **Error Handling**: Promise.allSettled pattern with graceful degradation

## 📊 Data Models
**Current Weather**: Temperature, humidity, visibility, wind, cloud coverage + Yacuviña evaluation
**Forecast**: 7-day predictions with numerical scores (0-100) and categorical ratings
**Evaluation Structure**: Score, category, factors (positive/negative), recommendations

## 🔧 Configuration Management
Environment variables in `/server/config/index.js`:
- **Location**: Fixed coordinates for Yacuviña (-3.572854, -79.689287)
- **APIs**: Multiple weather service keys required
- **Timezone**: America/Guayaquil for accurate sunset calculations
- **Caching**: File-based with configurable duration

## 🚢 Deployment Specifics
**Vercel Frontend**: Uses `/client` as root directory, `npm run build` command
**Render Backend**: Uses repository root, `cd server && npm install` build, `cd server && npm start`
**Environment Variables**: Must be configured in both platforms
**CORS**: Configured for localhost development + production domains

## 🎯 Component Architecture
**Centralized State**: Main `App.jsx` manages all weather state and API calls
**Component Props**: Data flows down through props, no global state management
**Real-time Updates**: 1-hour automatic refresh with visual loading indicators
**Image Gallery**: Mobile-optimized horizontal scroll with indicators

## 🔍 Debugging & Monitoring
- **Debug Routes**: `/api/debug/*` endpoints for environment and API testing
- **Caching Inspection**: Check `/server/current-weather-cache.json` for cache state
- **Logging**: Comprehensive console logging with timestamps and emojis for visual parsing
- **Error Boundaries**: Graceful fallbacks when APIs fail

## ⚠️ Critical Constraints
- **Never modify** core algorithm without understanding meteorological principles
- **Always test** both current weather and forecast endpoints after weather service changes
- **Maintain** mobile-first responsive design principles
- **Preserve** accessibility features and semantic HTML structure
- **Respect** API rate limits and caching strategies
