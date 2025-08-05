# 🚀 GUÍA DE DEPLOY - RENDER + VERCEL

## 📋 **RESUMEN DE ARQUITECTURA:**
- **Backend (Render)**: API del servidor con algoritmo Yacuviña 3.0
- **Frontend (Vercel)**: Aplicación React con interfaz de usuario
- **URL Backend**: `https://predictor-yacuvina-api.onrender.com`
- **URL Frontend**: `https://predictor-yacuvina.vercel.app`

---

## 🔧 **PASO 1: DEPLOY EN RENDER (Backend)**

### **Configuración Manual:**
1. Ve a [render.com](https://render.com) y crea una cuenta
2. Conecta tu repositorio GitHub `Sherman95/predictor-yacuvina`
3. Crear un **Web Service** con estas configuraciones:

```yaml
Name: predictor-yacuvina-api
Environment: Node
Build Command: cd server && npm install
Start Command: cd server && npm start
Auto-Deploy: Yes
Branch: main
```

### **Variables de Entorno en Render:**
```bash
NODE_ENV=production
PORT=10000
OPENWEATHER_API_KEY=8bef6e87ce4a3cf48837b829fcbd2465
ACCUWEATHER_API_KEY=bfJNNNGdBxY2Xs8H93cHgjoyA66KIXZM
WEATHERAPI_KEY=26b46f51e4d44c3e93505637250207
```

### **Usando render.yaml (Automático):**
```bash
# El archivo render.yaml ya está configurado
# Solo haz push a main y Render detectará automáticamente la configuración
```

---

## 🚀 **PASO 2: DEPLOY EN VERCEL (Frontend)**

### **Opción 1: Desde la Web**
1. Ve a [vercel.com](https://vercel.com) y conecta tu GitHub
2. Importa el repositorio `Sherman95/predictor-yacuvina`
3. Configura:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### **Opción 2: Desde CLI**
```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy desde el directorio client
cd client
vercel --prod
```

### **Variables de Entorno en Vercel:**
```bash
VITE_API_URL=https://predictor-yacuvina-api.onrender.com
```

---

## ✅ **PASO 3: VERIFICACIÓN**

### **Verificar Backend (Render):**
```bash
# Probar endpoints principales
curl https://predictor-yacuvina-api.onrender.com/api/prediccion
curl https://predictor-yacuvina-api.onrender.com/api/current-weather
curl https://predictor-yacuvina-api.onrender.com/api/debug/environment
```

### **Verificar Frontend (Vercel):**
```bash
# Abrir en navegador
https://predictor-yacuvina.vercel.app
```

### **Probar Conexión Frontend ↔ Backend:**
```bash
# Desde DevTools del navegador en el frontend:
fetch('https://predictor-yacuvina-api.onrender.com/api/prediccion')
  .then(res => res.json())
  .then(data => console.log(data))
```

---

## 🔍 **TROUBLESHOOTING COMÚN:**

### **❌ Error CORS:**
```
Access to fetch at 'https://predictor-yacuvina-api.onrender.com' 
from origin 'https://predictor-yacuvina.vercel.app' has been blocked by CORS
```
**Solución**: Verificar que el dominio de Vercel esté en la configuración CORS del servidor.

### **❌ API Endpoints 404:**
```
Cannot GET /api/prediccion
```
**Solución**: Verificar que el servidor en Render esté corriendo correctamente.

### **❌ Variables de Entorno:**
```
TypeError: Cannot read properties of undefined
```
**Solución**: Verificar que todas las variables estén configuradas en ambas plataformas.

---

## 🚀 **COMANDOS ÚTILES:**

```bash
# Desarrollo local
npm run dev  # Corre ambos: cliente y servidor

# Build local
npm run build:client
npm run build:server

# Comparar localhost vs producción
npm run compare-envs -- --production-url https://predictor-yacuvina-api.onrender.com

# Deploy manual
npm run deploy:vercel
```

---

## 📊 **MONITOREO:**

### **Logs de Render:**
- Dashboard → Service → Logs
- Eventos de deploy y errores en tiempo real

### **Logs de Vercel:**
- Dashboard → Project → Functions
- Analytics y performance

### **Endpoint de Salud:**
```bash
# Verificar que todo funciona
curl https://predictor-yacuvina-api.onrender.com/api/debug/environment
```

---

## 🎯 **RESULTADO ESPERADO:**

✅ **Backend en Render**: API funcionando con algoritmo Yacuviña 3.0  
✅ **Frontend en Vercel**: Interfaz moderna y responsiva  
✅ **Conexión**: Frontend consume API del backend sin errores  
✅ **CORS**: Configurado correctamente para producción  
✅ **Variables**: Todas las API keys funcionando  

**¡Tu aplicación estará disponible 24/7 en la nube!** 🌤️
