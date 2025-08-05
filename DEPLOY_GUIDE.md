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

## 🚀 **PASO 2: DEPLOY EN VERCEL (Frontend)**

### **🏆 OPCIÓN RECOMENDADA: Configuración Manual (Dashboard)**

**⭐ Esta es la mejor opción para tu proyecto**

#### **Pasos Detallados:**
1. Ve a [vercel.com](https://vercel.com) y **Sign in with GitHub**
2. Click **"Add New Project"**
3. Busca y selecciona `Sherman95/predictor-yacuvina`
4. **ANTES de hacer deploy**, click **"Configure Project"**
5. **CONFIGURACIÓN CRÍTICA** (⚠️ MUY IMPORTANTE):
   ```
   Framework Preset: Vite
   Root Directory: client
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
6. **Environment Variables** → Add:
   ```
   VITE_API_URL = https://predictor-yacuvina-api.onrender.com
   ```
7. Click **"Deploy"**

#### **✅ Ventajas de esta opción:**
- ✅ Control total de la configuración
- ✅ Logs detallados si hay errores
- ✅ Fácil modificar configuración después
- ✅ Funciona perfecto con monorepos
- ✅ Redeploy automático desde GitHub

---

### **🔧 Alternativa 2: CLI (Solo si falla la primera)**
```bash
# Solo usar si la opción 1 no funciona
npm i -g vercel
cd client
vercel --prod
```

### **⚠️ Alternativa 3: Eliminar y Recrear**
```bash
# Solo como último recurso
1. Eliminar proyecto en Vercel Dashboard
2. Reimportar desde GitHub
3. Usar configuración manual (Opción 1)
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

## 🔍 **TROUBLESHOOTING - ORDEN DE SOLUCIONES:**

### **❌ Problema #1: Build Failed en Vercel**
```
Command "cd client && npm install" exited with 1
```
**🎯 Solución (en orden):**
1. **Verificar Root Directory**: Debe ser `client` (no vacío)
2. **Verificar Build Command**: Debe ser `npm run build` (no `npm run vercel-build`)
3. **Reinstalar terser**: Tu package.json ya lo tiene, pero puede fallar en Vercel
4. **Usar configuración manual** (Opción 1 recomendada)

### **❌ Problema #2: Error CORS en Frontend**
```
Access to fetch blocked by CORS policy
```
**🎯 Solución:**
Tu servidor ya tiene CORS configurado para Vercel. Verificar que:
- Backend esté funcionando en Render
- Frontend use la URL correcta: `https://predictor-yacuvina-api.onrender.com`

### **❌ Problema #3: Variables de Entorno**
```
import.meta.env.VITE_API_URL is undefined
```
**🎯 Solución:**
En Vercel Dashboard → Project → Settings → Environment Variables:
```
VITE_API_URL = https://predictor-yacuvina-api.onrender.com
```

### **❌ Problema #4: 404 en API Endpoints**
**🎯 Verificar que el backend esté funcionando:**
```bash
curl https://predictor-yacuvina-api.onrender.com/api/prediccion
# Debería devolver JSON con pronósticos
```

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

### **✅ URLs Finales:**
- **Frontend**: `https://predictor-yacuvina.vercel.app`
- **Backend**: `https://predictor-yacuvina-api.onrender.com`

### **✅ Verificación Completa:**
```bash
# 1. Verificar backend
curl https://predictor-yacuvina-api.onrender.com/api/prediccion

# 2. Verificar frontend (abrir en navegador)
https://predictor-yacuvina.vercel.app

# 3. Verificar conexión (en DevTools del frontend)
fetch('https://predictor-yacuvina-api.onrender.com/api/prediccion')
  .then(res => res.json())
  .then(data => console.log('✅ Algoritmo Yacuviña 3.0:', data))
```

### **🚀 Funcionalidades que deben funcionar:**
✅ **Pronósticos de 7 días** con Algoritmo Yacuviña 3.0  
✅ **Clima actual** en tiempo real  
✅ **Tipos de atardecer**: Mar de Nubes vs Despejado  
✅ **Cards expandibles** con detalles meteorológicos  
✅ **Responsive design** para móviles  
✅ **Mejor día recomendado** destacado  

**¡Tu aplicación estará disponible 24/7 en la nube con el Algoritmo Yacuviña 3.0!** 🌤️⛰️
