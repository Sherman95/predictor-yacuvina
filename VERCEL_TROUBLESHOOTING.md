# 🔧 SOLUCIÓN DE PROBLEMAS - VERCEL DEPLOY

## ❌ **ERROR: "Command 'cd client && npm install' exited with 1"**

### 🎯 **SOLUCIONES EN ORDEN DE PRIORIDAD:**

---

### **SOLUCIÓN 1: Configurar Root Directory en Vercel Dashboard**

1. Ve a tu proyecto en Vercel Dashboard
2. **Settings** → **General** → **Build & Output Settings**
3. Configura:
   ```
   Root Directory: client
   Build Command: npm run build  
   Output Directory: dist
   Install Command: npm install
   ```
4. **Redeploy** el proyecto

---

### **SOLUCIÓN 2: Deploy Manual desde CLI**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Ir al directorio client
cd client

# Deploy desde client directamente
vercel --prod

# Seguir las instrucciones interactivas
```

---

### **SOLUCIÓN 3: Usar la configuración client/vercel.json**

En lugar del vercel.json raíz, Vercel debería usar `client/vercel.json`:

```json
{
  "name": "predictor-yacuvina-frontend",
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "env": {
    "VITE_API_URL": "https://predictor-yacuvina-api.onrender.com"
  }
}
```

---

### **SOLUCIÓN 4: Verificar Dependencias Localmente**

```bash
# Probar build local
cd client
npm install
npm run build

# Si falla, instalar dependencia faltante:
npm install --save-dev terser

# Reintentar build
npm run build
```

---

### **SOLUCIÓN 5: Importar Solo el Subdirectorio Client**

1. En Vercel, crear **nuevo proyecto**
2. **Import Git Repository**
3. **Advanced Options** → **Root Directory**: `client`
4. Framework: **Vite**
5. **Deploy**

---

## 🔍 **DIAGNÓSTICO DE ERRORES COMUNES:**

### **Error: "terser not found"**
```bash
cd client
npm install --save-dev terser
```

### **Error: "Module not found"**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

### **Error: "VITE_API_URL undefined"**
```bash
# En Vercel Dashboard → Settings → Environment Variables:
VITE_API_URL = https://predictor-yacuvina-api.onrender.com
```

---

## ✅ **VERIFICACIÓN POST-DEPLOY:**

### **1. Verificar Variables de Entorno:**
```javascript
// En DevTools del navegador:
console.log(import.meta.env.VITE_API_URL)
// Debería mostrar: https://predictor-yacuvina-api.onrender.com
```

### **2. Probar Conectividad API:**
```javascript
// En DevTools del navegador:
fetch('https://predictor-yacuvina-api.onrender.com/api/prediccion')
  .then(res => res.json())
  .then(data => console.log('API funciona:', data))
  .catch(err => console.error('Error API:', err))
```

### **3. Verificar Build Assets:**
```bash
# Los archivos deben estar en client/dist/:
client/dist/index.html
client/dist/assets/index-[hash].js
client/dist/assets/index-[hash].css
```

---

## 🚀 **CONFIGURACIÓN RECOMENDADA FINAL:**

### **En Vercel Dashboard:**
- **Framework**: Vite
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### **Variables de Entorno:**
```
VITE_API_URL = https://predictor-yacuvina-api.onrender.com
```

### **Resultado Esperado:**
- ✅ Frontend desplegado en Vercel
- ✅ Backend funcionando en Render  
- ✅ Conexión entre frontend y backend
- ✅ Algoritmo Yacuviña 3.0 funcionando en producción

---

## 📞 **SI NADA FUNCIONA:**

1. **Eliminar proyecto** de Vercel
2. **Reimportar** desde GitHub
3. **Configurar Root Directory**: `client`
4. **Deploy nuevamente**

¡Tu aplicación debería funcionar perfectamente! 🎉
