# 🔐 Configurar GitHub Secrets (HACER AHORA)

## 🚨 PROBLEMA DETECTADO

Tu sitio está usando la API key VIEJA:
```
❌ Actual: 5qIXA1UZ...W7Ot (vieja)
✅ Debería ser: fgoABFGf...HPjU (nueva)
```

## ✅ SOLUCIÓN: GitHub Secrets

Necesitas configurar 3 secrets en tu repositorio de GitHub:

### 📋 Paso a Paso

1. **Ve a tu repositorio en GitHub:**
   ```
   https://github.com/adriangallery/AdrianPunks
   ```

2. **Click en:** `Settings` (del repositorio)

3. **En el menú izquierdo:** 
   - Expande `Secrets and variables`
   - Click en `Actions`

4. **Agrega/Actualiza estos 3 secrets:**

   #### Secret 1: SUPABASE_URL
   ```
   Name: SUPABASE_URL
   Value: https://scsxdqudvprtfikkepmu.supabase.co
   ```
   - Click: `New repository secret` (o `Update` si ya existe)
   - Pega el valor
   - Click: `Add secret`

   #### Secret 2: SUPABASE_ANON_KEY
   ```
   Name: SUPABASE_ANON_KEY
   Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjc3hkcXVkdnBydGZpa2tlcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzM0NTUsImV4cCI6MjA3OTAwOTQ1NX0.0li2dAbyh5Ed4FjnZxxr63RSEPlWvsvZ923hBoK8YjY
   ```
   - Click: `New repository secret`
   - Pega el valor
   - Click: `Add secret`

   #### Secret 3: ALCHEMY_API_KEY (NUEVA)
   ```
   Name: ALCHEMY_API_KEY
   Value: fgoABFGfYfI7yIPOSW7_bHPiXLQuHPjU
   ```
   - Click: `New repository secret` (o `Update` si ya existe)
   - Pega el valor
   - Click: `Add secret`

5. **Verifica que los 3 secrets estén configurados:**
   ```
   ✓ SUPABASE_URL
   ✓ SUPABASE_ANON_KEY
   ✓ ALCHEMY_API_KEY
   ```

---

## 🤖 GitHub Action Configurado

He creado `.github/workflows/update-config.yml` que:
- ✅ Se ejecuta automáticamente en cada push
- ✅ Lee los secrets de GitHub
- ✅ Genera `market/supabase-config.js` con los valores correctos
- ✅ Hace commit automático si hay cambios

---

## 🚀 Probar la Configuración

Después de configurar los secrets:

### Opción A: Trigger Manual (Recomendado)

1. En GitHub, ve a: `Actions` tab
2. Click en: `Update Config with Secrets` (workflow)
3. Click en: `Run workflow` → `Run workflow`
4. Espera 1-2 minutos
5. Verifica que se creó un nuevo commit: "🤖 Auto-update config from secrets"

### Opción B: Push Cualquier Cambio

```bash
cd /Users/adrian/Documents/GitHub/AdrianPunks
git commit --allow-empty -m "Trigger config update"
git push
```

---

## 🔍 Verificar que Funcionó

1. **Espera 3-5 minutos** después del workflow

2. **Abre tu marketplace:**
   ```
   https://adriangallery.github.io/AdrianPunks/market/
   ```

3. **Abre consola (F12) y busca:**
   ```javascript
   API Key (masked): fgoABFGf...HPjU  ← ¡Debería ser la NUEVA!
   ```

4. **NO deberías ver errores 429** (o muy pocos)

---

## ⚠️ Si los Secrets No Están Disponibles

Si por alguna razón no puedes configurar secrets en GitHub:

### Alternativa: Actualizar Manualmente y Limpiar Caché

```bash
cd /Users/adrian/Documents/GitHub/AdrianPunks

# Actualizar archivo
cat > market/supabase-config.js << 'EOF'
// Auto-generated - DO NOT EDIT
window.SUPABASE_URL = 'https://scsxdqudvprtfikkepmu.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjc3hkcXVkdnBydGZpa2tlcG11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MzM0NTUsImV4cCI6MjA3OTAwOTQ1NX0.0li2dAbyh5Ed4FjnZxxr63RSEPlWvsvZ923hBoK8YjY';
window.ALCHEMY_API_KEY = 'fgoABFGfYfI7yIPOSW7_bHPiXLQuHPjU';
EOF

# Commit forzado
git add market/supabase-config.js
git commit -m "FORCE: Update to new Alchemy key"
git push origin main --force-with-lease

# Limpiar caché de GitHub Pages
# (ve a Settings → Pages → Unpublish → Re-publish)
```

---

## 📊 Por Qué Pasó Esto

El problema fue que:
1. ✅ Actualizamos el archivo localmente
2. ✅ Hicimos commit y push
3. ❌ GitHub Pages sirvió una versión cacheada
4. ❌ O el archivo no se actualizó correctamente

**Solución permanente:** GitHub Secrets + Action automático

---

## 🎯 Checklist Final

- [ ] Configuré los 3 secrets en GitHub (Settings → Secrets → Actions)
- [ ] Verifiqué que el workflow `.github/workflows/update-config.yml` existe
- [ ] Ejecuté el workflow manualmente (Actions → Run workflow)
- [ ] Esperé 3-5 minutos
- [ ] Verifiqué en la consola que la nueva API key está cargando
- [ ] No veo (o veo muchos menos) errores 429

---

## 📞 Si Necesitas Ayuda

1. **Screenshot de tus secrets:**
   - GitHub → Settings → Secrets → Actions
   - Debe mostrar los 3 secrets

2. **Screenshot del workflow run:**
   - GitHub → Actions
   - Muestra el estado (success/failed)

3. **Console log:**
   - Después de esperar 5 minutos
   - ¿Qué API key muestra ahora?

---

**ACCIÓN INMEDIATA:** Configura los 3 GitHub Secrets AHORA, luego avísame. 🚀

