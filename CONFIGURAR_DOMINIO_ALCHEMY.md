# Configurar Dominio en Alchemy (Solución Error 403)

## Problema
TraitLAB en `adrianzero.com` está obteniendo errores **403 Forbidden** al usar la nueva API key `pqRmKgTa...ML1f`.

## Causa
La nueva app de Alchemy tiene restricciones de dominio que **no incluyen** `adrianzero.com`.

## Solución: Agregar Dominio a Allowlist

### Paso 1: Acceder al Dashboard de Alchemy
1. Ve a https://dashboard.alchemy.com/
2. Inicia sesión con tu cuenta
3. Selecciona tu workspace

### Paso 2: Encontrar la App Correcta
1. Busca la app con API key que termina en `...ML1f`
2. O busca por nombre (la que creaste recientemente para AdrianPunks)
3. La app debe estar en la red **Base Mainnet**

### Paso 3: Configurar Allowlist de Dominios
1. Click en la app
2. Ve a **Settings** (⚙️) o **Security**
3. Busca la sección **"Domain Allowlist"** o **"HTTP Referrers"**
4. Agregar los siguientes dominios:
   ```
   adrianzero.com
   www.adrianzero.com
   *.adrianzero.com
   adrianpunks.com
   www.adrianpunks.com
   *.adrianpunks.com
   ```

### Paso 4: Verificar APIs Habilitadas
Asegúrate de que estas APIs estén habilitadas:
- ✅ **NFT API** (getNFTsForOwner, getNFTMetadata)
- ✅ **Core API** (getBlockNumber, etc.)
- ✅ **Enhanced APIs** (si está disponible en tu plan)

### Paso 5: Guardar y Esperar
1. Click en **"Save"** o **"Update"**
2. **Espera 2-3 minutos** para que los cambios se propaguen
3. Haz un **Hard Refresh** en TraitLAB (`Cmd + Shift + R`)

## Alternativa: Quitar Restricciones (Menos Seguro)

Si no encuentras la opción de allowlist, puedes:
1. Ir a Settings → Security
2. Desactivar completamente las restricciones de dominio
3. **Nota**: Esto es menos seguro pero funcionará inmediatamente

## Verificación

Después de configurar, verifica en la consola del navegador:
- ✅ Las peticiones a Alchemy deberían retornar **200 OK**
- ✅ Deberías ver: `📦 Page 1: X tokens received`
- ❌ No deberías ver más errores **403 Forbidden**

## Notas Importantes

- **La API key está correcta** (`pqRmKgTa...ML1f`)
- **El código está correcto** (no se cambió la manera de llamar a Alchemy)
- **Solo falta agregar los dominios permitidos**

## Comandos de Verificación (Opcional)

Puedes probar la API key desde terminal:

```bash
# Probar con curl (sin dominio)
curl -X GET \
  "https://base-mainnet.g.alchemy.com/nft/v3/pqRmKgTaLqm2eak9iML1f/getNFTsForOwner?owner=0x4943407105999e3e97efa2035f5cbc64d72581c6&contractAddresses[]=0x6e369bf0e4e0c106192d606fb6d85836d684da75&withMetadata=true&pageSize=10&tokenType=ERC721"
```

Si este comando funciona pero el navegador da 403, **confirma que es un problema de allowlist de dominios**.

