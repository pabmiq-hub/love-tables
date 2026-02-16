

# Plan: Corregir emails y unificar QR de participantes

## Problemas identificados

### 1. Error en recordatorios (send-reminder-email)
- La URL en el email usa una ruta incorrecta: `/participant/{id}/select` en vez de `/event/{id}/select`
- La URL base se genera desde el Supabase URL (`wvmrmapnzdixesfasivs.lovable.app`) en vez de usar la URL publicada real (`love-tables.lovable.app`)
- No hay logs de la funcion, lo que sugiere que no se desplegó correctamente o devuelve error antes de ejecutarse

### 2. Error en envio de match emails
- Con 91 participantes y 550ms de delay entre emails, el envio tarda ~50 segundos, lo que puede causar timeout en la Edge Function (limite de 60s)
- El error en consola "Edge Function returned a non-2xx status code" confirma esto

### 3. QR separados para mesas y selecciones
- Actualmente hay dos QR distintos: uno para ver mesas (`/event/{id}/tables`) y otro para enviar selecciones (`/event/{id}/select`)
- El usuario quiere un unico QR que permita ambas acciones
- Ademas, en la pantalla de selecciones se deberia ver con quien coincidio en cada mesa

## Solucion propuesta

### Parte 1: Corregir send-reminder-email
- Corregir la URL: cambiar `/participant/{event_id}/select` a `/event/{event_id}/select`
- Usar la URL publicada del proyecto en vez de derivarla del Supabase URL
- Redesplegar la funcion

### Parte 2: Corregir send-match-emails (timeout)
- Reducir el delay entre emails a 350ms para mantenerse dentro del limite de tiempo
- Alternativa: si hay muchos participantes, enviar sin esperar el resultado completo

### Parte 3: Unificar QR (Mesas + Selecciones)
- Crear una nueva pagina unificada `/event/{id}/access` que sirva como panel del participante
- El participante introduce su codigo de 6 digitos una sola vez
- Tras verificar, ve un panel con dos secciones/tabs:
  - **Mis mesas**: muestra las asignaciones de mesa por ronda (igual que ParticipantTables)
  - **Enviar selecciones**: permite seleccionar matches, mostrando en que mesa coincidio con cada persona
- Actualizar EventQRCode para que cuando el evento este activo o completado, use la URL unificada `/event/{id}/access`
- Actualizar el componente QR del admin para mostrar un solo QR "Panel del participante" en vez de dos separados

### Parte 4: Mostrar mesa de coincidencia en selecciones
- En la pantalla de selecciones, junto a cada compañero de mesa, mostrar un badge indicando "Mesa X, Ronda Y" para que el participante recuerde donde coincidio con esa persona

## Detalles tecnicos

### Archivos a modificar:
1. `supabase/functions/send-reminder-email/index.ts` - Corregir URL y remitente
2. `supabase/functions/send-match-emails/index.ts` - Optimizar delay para evitar timeout
3. `src/pages/ParticipantAccess.tsx` (nuevo) - Panel unificado del participante con tabs para mesas y selecciones
4. `src/components/event/EventQRCode.tsx` - Añadir tipo "access" para QR unificado
5. `src/App.tsx` - Añadir ruta `/event/:id/access`
6. `src/pages/EventDetail.tsx` - Reemplazar los dos QR separados (mesas y selecciones) por uno solo de tipo "access"

### Flujo del panel unificado:
```text
Participante escanea QR
        |
        v
  Introduce codigo 6 digitos
        |
        v
  Panel con 2 tabs:
  +------------------+-------------------+
  | Mis mesas        | Mis selecciones   |
  +------------------+-------------------+
  | Ronda 1: Mesa 3  | [Lista de         |
  | Ronda 2: Mesa 7  |  compañeros con   |
  | Ronda 3: Mesa 1  |  badge de mesa    |
  |                  |  donde coincidio] |
  +------------------+-------------------+
```

### Logica de selecciones con mesa visible:
- Para cada compañero de mesa, se cruzaran los datos de `tablesData` para determinar en que ronda/mesa coincidieron
- Se mostrara como badge: "Mesa 3, R1" junto al nombre del participante
