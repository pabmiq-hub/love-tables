

## Módulo Marca Blanca: Visión completa de principio a fin

### Estado actual

- Todos los emails se envían desde `Konektum <hola@konektum.com>` vía Resend
- No existe ninguna infraestructura de OAuth2 ni de marca blanca
- La tabla `organizers` tiene `contact_email` pero no se usa como remitente
- El módulo profesional ya tiene plantillas de email B2B funcionando (presentaciones a 3 bandas)

---

### Arquitectura completa

```text
FASE 1: OAuth2 Gmail                    FASE 2: Outlook (futura)
─────────────────────                    ────────────────────────

  ┌──────────────────────┐
  │  Dashboard Organizador│
  │  "Conectar mi Gmail"  │
  └──────────┬───────────┘
             │ clic
             ▼
  ┌──────────────────────┐       ┌─────────────────┐
  │  Edge Fn:             │──────▶│ Google OAuth2    │
  │  initiate-oauth       │       │ Consent Screen   │
  └──────────────────────┘       └────────┬────────┘
                                          │ código autorización
                                          ▼
                                 ┌─────────────────┐
                                 │ Edge Fn:         │
                                 │ oauth-callback   │
                                 └────────┬────────┘
                                          │ intercambia código
                                          │ por tokens
                                          ▼
                                 ┌─────────────────┐
                                 │ DB:              │
                                 │ organizer_email  │
                                 │ _connections     │
                                 │ (refresh_token)  │
                                 └────────┬────────┘
                                          │
             ┌────────────────────────────┘
             ▼
  ┌──────────────────────────────────┐
  │  send-match-emails               │
  │                                  │
  │  ¿Organizador tiene OAuth? ──▶ SÍ: Gmail API
  │                              ──▶ NO: Resend (fallback)
  └──────────────────────────────────┘
```

---

### Flujo completo paso a paso

#### Paso 1: Configurar credenciales Google (una sola vez, tú como admin)

1. Crear proyecto en Google Cloud Console
2. Habilitar Gmail API
3. Crear credenciales OAuth 2.0 (tipo "Web application")
4. Añadir redirect URI: `https://wvmrmapnzdixesfasivs.supabase.co/functions/v1/oauth-callback`
5. Guardar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` como secrets del proyecto

#### Paso 2: Crear tabla `organizer_email_connections`

Nueva tabla para almacenar las conexiones OAuth de cada organizador:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | uuid | PK |
| organizer_id | uuid | FK a organizers |
| provider | text | 'gmail' o 'outlook' |
| email_address | text | Email autorizado |
| refresh_token | text | Token encriptado para renovar acceso |
| access_token | text | Token temporal (1h vida) |
| token_expires_at | timestamptz | Cuándo caduca el access_token |
| is_active | boolean | Si la conexión está activa |
| created_at | timestamptz | Fecha de creación |

RLS: Solo el organizador propietario y super_admin pueden leer/escribir.

#### Paso 3: Edge Function `initiate-oauth`

- El organizador hace clic en "Conectar Gmail" en su dashboard
- La función genera la URL de consentimiento de Google con scopes: `gmail.send`, `userinfo.email`
- Incluye un `state` parameter con el `organizer_id` cifrado para seguridad
- Redirige al organizador a Google

#### Paso 4: Edge Function `oauth-callback`

- Google redirige aquí con el código de autorización
- Intercambia el código por `access_token` + `refresh_token`
- Guarda los tokens en `organizer_email_connections`
- Redirige al organizador de vuelta al dashboard con un mensaje de éxito

#### Paso 5: UI en el Dashboard del organizador

Añadir una sección "Configuración de email" que muestre:
- Estado: "No conectado" / "Conectado como carlos@empresa.com"
- Botón "Conectar Gmail" (si no está conectado)
- Botón "Desconectar" (si está conectado)
- Indicador de que los emails de resultados se enviarán desde su cuenta

#### Paso 6: Modificar `send-match-emails` y `send-scheduled-emails`

Antes de enviar cada email:
1. Consultar `organizer_email_connections` para el organizador del evento
2. Si tiene conexión activa con `is_active = true`:
   - Refrescar el `access_token` si ha caducado (usando el `refresh_token`)
   - Enviar via Gmail API (`POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send`)
   - El email sale desde la cuenta real del organizador
   - Las respuestas llegan directamente a su bandeja de entrada
3. Si no tiene conexión o ha fallado: fallback a Resend con `noreply@konektum.com`

---

### Lo que el organizador experimenta

1. Entra en su dashboard → ve sección "Configuración de email"
2. Hace clic en "Conectar Gmail" → Google le pide permiso
3. Autoriza → vuelve al dashboard, ve "Conectado como carlos@empresa.com"
4. Cuando cierra un evento y se envían los emails de resultados, salen desde `carlos@empresa.com`
5. Los participantes pueden responder directamente a Carlos

---

### Seguridad

- Los `refresh_token` se almacenan en la base de datos, accesibles solo vía Edge Functions con `service_role`
- El `access_token` se renueva automáticamente (vida de 1h) y nunca se expone al frontend
- El `state` parameter en OAuth previene ataques CSRF
- RLS impide que un organizador vea tokens de otro

---

### Requisito previo para implementar

Necesito que crees las credenciales en Google Cloud Console (pasos del Paso 1). Una vez tengas el **Client ID** y **Client Secret**, los guardaremos como secrets y procederé con toda la implementación (pasos 2-6) de una vez.

---

### Resumen de archivos a crear/modificar

| Archivo | Acción |
|---------|--------|
| Migración SQL | Crear tabla `organizer_email_connections` con RLS |
| `supabase/functions/initiate-oauth/index.ts` | Nueva Edge Function |
| `supabase/functions/oauth-callback/index.ts` | Nueva Edge Function |
| `supabase/functions/send-match-emails/index.ts` | Añadir lógica Gmail API |
| `supabase/functions/send-scheduled-emails/index.ts` | Añadir lógica Gmail API |
| `src/pages/AdminDashboard.tsx` o nuevo componente | UI de conexión email |
| `supabase/config.toml` | Registrar nuevas Edge Functions |

