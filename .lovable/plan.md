

## Plan: Marca blanca via dominios verificados en Resend

La Opcion 2 permite que los emails salgan desde el dominio real del organizador (ej: `carlos@suempresa.com`) sin necesidad de OAuth ni credenciales de Google. Funciona verificando el dominio del organizador directamente en Resend via API.

### Flujo del organizador

1. En su dashboard, sección "Configuracion de email", introduce su dominio (ej: `suempresa.com`)
2. El sistema llama a la API de Resend para registrar el dominio y obtiene los registros DNS necesarios (DKIM, SPF, etc.)
3. El organizador (o su equipo IT) añade esos registros DNS en su proveedor de dominio
4. Una vez verificado, los emails de resultados salen desde `noreply@suempresa.com` o la dirección que el organizador configure

### Cambios necesarios

**1. Nueva tabla `organizer_verified_domains`**
- `organizer_id`, `domain`, `resend_domain_id`, `status` (pending/verified/failed), `dns_records` (jsonb con los registros a configurar), `sender_email`, `sender_name`

**2. Edge Function `manage-domain`**
- Accion `add`: llama a Resend API `POST /domains` para registrar dominio, guarda los DNS records
- Accion `check`: llama a Resend API `GET /domains/{id}` para verificar estado
- Accion `remove`: elimina el dominio de Resend y de la tabla

**3. Modificar `send-match-emails` y `send-scheduled-emails`**
- Antes de enviar, consultar si el organizador tiene un dominio verificado
- Si lo tiene: usar `from: "Nombre <email@sudominio.com>"` en Resend (mismo API key, diferente remitente)
- Si no: fallback a `Konektum <noreply@konektum.com>`

**4. UI en el dashboard del organizador**
- Reemplazar el componente `EmailConnectionManager` actual (que era para OAuth) por uno nuevo que:
  - Permita introducir dominio
  - Muestre los registros DNS que debe configurar
  - Tenga boton "Verificar" para comprobar estado
  - Muestre estado actual (pendiente/verificado)

**5. Limpieza**
- Eliminar el codigo Gmail OAuth de `send-match-emails` y `send-scheduled-emails` (funciones `sendViaGmail`, `refreshGmailToken`)
- Eliminar Edge Functions `initiate-oauth` y `oauth-callback`
- La tabla `organizer_email_connections` se puede reutilizar o reemplazar

### Requisito del organizador

El organizador necesita acceso a la configuracion DNS de su dominio (o que su equipo IT lo haga). Es un proceso estandar: añadir 2-3 registros TXT/CNAME que Resend proporciona.

### Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Migracion SQL | Crear tabla `organizer_verified_domains` |
| `supabase/functions/manage-domain/index.ts` | Nueva Edge Function |
| `supabase/functions/send-match-emails/index.ts` | Reemplazar Gmail OAuth por logica de dominio verificado |
| `supabase/functions/send-scheduled-emails/index.ts` | Igual |
| `src/components/email/EmailConnectionManager.tsx` | Reescribir para verificacion de dominios |
| Eliminar `supabase/functions/initiate-oauth/` | Ya no necesario |
| Eliminar `supabase/functions/oauth-callback/` | Ya no necesario |

