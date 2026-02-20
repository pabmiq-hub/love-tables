
# Plan: Sistema bilingüe (Español / Inglés)

## Alcance y dos capas de traducción

El proyecto tiene **dos tipos de textos** con necesidades distintas:

1. **Interfaz del administrador y la landing page** (ES/EN automático según navegador, con selector manual)
2. **Formularios y comunicaciones del participante** (idioma configurado por el organizador en cada evento)

---

## Arquitectura elegida: i18n ligero sin librerías externas

En lugar de instalar i18next u otras librerías pesadas, se implementará un sistema propio minimalista con:
- Un `LanguageContext` con React Context que detecta el idioma del navegador al entrar
- Un fichero de traducciones `src/i18n/translations.ts` con todos los textos en ES y EN
- Un hook `useTranslation()` consumido en todos los componentes
- Persistencia en `localStorage` para respetar la preferencia del usuario
- Una columna `language` en la tabla `events` para el idioma de los eventos

---

## Partes afectadas

### Capa 1 - Interfaz general (landing + admin + participante)

| Archivo | Textos a traducir |
|---|---|
| `src/components/landing/Navbar.tsx` | Menú, botones login/registro |
| `src/components/landing/Hero.tsx` | Título, subtítulo, features |
| `src/components/landing/HowItWorks.tsx` | Pasos del flujo |
| `src/components/landing/Features.tsx` | Tabs y descripciones |
| `src/components/landing/Pricing.tsx` | Planes y precios |
| `src/components/landing/CallToAction.tsx` | CTA final |
| `src/components/landing/Footer.tsx` | Links del footer |
| `src/pages/AdminLogin.tsx` | Formulario de login |
| `src/pages/AdminRegister.tsx` | Formulario de registro |
| `src/pages/ParticipantJoin.tsx` | Formulario de inscripción |
| `src/pages/ParticipantCheckin.tsx` | Página de check-in |
| `src/pages/ParticipantSelect.tsx` | Selección de matches |
| `src/pages/ParticipantTables.tsx` | Vista de mesas |
| `src/components/cookies/CookieBanner.tsx` | Banner de cookies |

### Capa 2 - Idioma por evento (formulario participante + emails)

- Se añade columna `language` (`es` / `en`) a la tabla `events`
- En `CreateEvent.tsx` y `EventSettingsEditor.tsx`: selector de idioma del evento
- En `ParticipantJoin.tsx`: la página carga el idioma del evento desde la BD y muestra el formulario en ese idioma, independientemente del idioma del navegador del usuario

---

## Cambios técnicos detallados

### 1. Base de datos

```sql
ALTER TABLE events ADD COLUMN language text NOT NULL DEFAULT 'es';
```

### 2. Nuevos ficheros

**`src/i18n/translations.ts`**
Objeto con todas las cadenas de texto en ES y EN organizadas por sección:
```typescript
export const translations = {
  es: {
    nav: { howItWorks: "Cómo funciona", ... },
    hero: { title: "Conecta personas, crea momentos", ... },
    join: { name: "Nombre", submit: "Registrarme", ... },
    checkin: { title: "Check-in", enterCode: "Introduce tu código", ... },
    // ...
  },
  en: {
    nav: { howItWorks: "How it works", ... },
    hero: { title: "Connect people, create moments", ... },
    join: { name: "Name", submit: "Register", ... },
    checkin: { title: "Check-in", enterCode: "Enter your code", ... },
    // ...
  }
}
```

**`src/i18n/LanguageContext.tsx`**
```typescript
// Detecta navigator.language al inicio
// Persiste en localStorage bajo clave "konektum_language"
// Expone: language, setLanguage, t (función de traducción)
```

**`src/hooks/useTranslation.ts`**
```typescript
// Wrapper del contexto para uso en componentes
export const useTranslation = () => useContext(LanguageContext)
```

### 3. Selector de idioma

Se añade un pequeño selector ES / EN en la `Navbar` de la landing page y en las páginas del admin (header). Al hacer clic cambia el idioma en tiempo real y lo persiste en localStorage.

```
[🌐 ES | EN]
```

### 4. Detección automática

Al entrar por primera vez (sin preferencia guardada en localStorage), se detecta `navigator.language`. Si empieza por `en`, se muestra en inglés. En cualquier otro caso, español.

### 5. Idioma del evento (formulario participante)

`ParticipantJoin.tsx` ya carga datos del evento desde la BD. Se añade `language` a la query y, si el evento es `en`, el formulario completo (labels, opciones, mensajes de error, texto de éxito) se muestra en inglés, ignorando la preferencia del navegador del participante.

### 6. Emails (fase futura)

Los edge functions (`send-checkin-code`, `send-registration-confirmation`, `send-match-emails`) reciben el idioma del evento y envían el email en el idioma correspondiente. Se añade la lógica de plantillas bilingüe dentro de cada función.

---

## Orden de implementación

1. Migración de BD: añadir columna `language` a `events`
2. Crear `src/i18n/translations.ts` con todas las cadenas ES + EN
3. Crear `src/i18n/LanguageContext.tsx` con detección automática y persistencia
4. Crear `src/hooks/useTranslation.ts`
5. Actualizar `App.tsx` para envolver la app con `LanguageProvider`
6. Añadir selector de idioma en `Navbar.tsx`
7. Traducir landing page: Hero, HowItWorks, Features, Pricing, CallToAction, Footer
8. Traducir páginas de participante: ParticipantJoin, ParticipantCheckin, ParticipantSelect, ParticipantTables
9. Traducir páginas de admin: AdminLogin, AdminRegister, CookieBanner
10. Añadir selector de idioma del evento en CreateEvent y EventSettingsEditor
11. Adaptar ParticipantJoin para leer el idioma del evento (independiente del navegador)
12. Actualizar edge functions de email para ser bilingues

---

## Comportamiento esperado

- Un usuario con el navegador en inglés entra a la landing: la ve en inglés automáticamente
- Puede cambiar a español con el selector en el menú
- La preferencia se guarda y se mantiene en futuras visitas
- Un organizador crea un evento en inglés
- Los participantes que acceden al formulario de inscripción de ese evento lo ven en inglés, aunque su navegador esté en español
- Los emails de ese evento llegan en inglés
