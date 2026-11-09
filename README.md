# Amor Tóxico

Aplicación de acompañamiento (web progresiva + API). El recorrido de la app sigue la situación de la persona y los capítulos de *Amor tóxico*, de Laura Rojas. Cómo publicarla: [DEPLOY.md](DEPLOY.md).

Aplicación web progresiva de acompañamiento emocional para amortoxico.com, con referencia editorial en el libro *Amor Tóxico* de Laura Rojas.

> Principio central: **“Amar a alguien no debería significar abandonarte a ti mismo.”**
>
> Es una herramienta de acompañamiento y educación. **No es terapia**, no hace diagnósticos y no promete recuperación en un número de días.

Este repositorio es solo Amor Tóxico. No comparte código con ningún otro proyecto.

## Cómo ejecutarlo

Requisitos: Node 22 y npm 10.

```bash
cd amor
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173 (sin service worker)
npm test           # pruebas unitarias (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # tsc + build de producción en dist/ (genera dist/sw.js)
npm run preview    # sirve dist/ en http://localhost:4173 (con service worker)
npm run icons      # regenera los PNG de public/icons a partir de public/logo.svg (sharp)
```

El service worker solo se registra en producción (`npm run build && npm run preview`).

## Arquitectura

- **Vite 5 + React 18 + TypeScript + react-router-dom 6.** CSS propio con variables (`src/styles/global.css`), sin frameworks de estilos ni fuentes externas.
- **Rutas públicas** (`src/pages/public`): `/`, `/blog`, `/blog/:slug`, `/guia-72-horas`, `/test`, `/privacidad`, `/contacto`, `/cerebro`, `/cerebro/:id`, `/biblioteca`, `/admin`. `/vsl` redirige a `/test`.
- **App** (`src/pages/app`, bajo `/app`, carga diferida): Inicio, Mi Camino (+ módulos y ejercicios), Pausa, Mi Espacio, Perfil, Contacto y límites, Hoy fue difícil, Asistente, Cerebro y Biblioteca. Onboarding en `/bienvenida`.
- **Navegación:** barra inferior con 5 destinos en móvil, navegación lateral en escritorio y botón persistente «Necesito una pausa».
- **Contenido** (`src/content`): todo el texto editorial vive en módulos tipados y separados de la UI (mensajes, programa y ejercicios, 15 temas del cerebro, biblioteca, blog, guía 72 h, test, opciones del onboarding, pausa, límites).
- **Lógica pura con pruebas** (`src/lib`): `plan.ts` (plan inicial), `testScoring.ts`, `crisis.ts`, `patterns.ts`, `noContact.ts`, `difficultDay.ts`, `assistant/localProvider.ts`.

### Adaptadores (para sustituir por el backend en fases siguientes)

| Interfaz | Implementación fase 1 | Archivo |
| --- | --- | --- |
| `DataAdapter` | `LocalDataAdapter`: IndexedDB + AES-GCM | `src/lib/data/` |
| `AuthAdapter` | `LocalAuthAdapter`: **solo desarrollo**, PBKDF2 local | `src/lib/auth/` |
| `AssistantProvider` | guiado local (offline) y remoto vía proxy | `src/lib/assistant/` |
| Leads (eBook/contacto) | `submitLead`: POST a endpoint o guardado local cifrado | `src/lib/leads.ts` |
| `PushAdapter` | solo interfaz (notificaciones locales en fase 1) | `src/lib/notifications.ts` |

`setDataAdapter()` permite inyectar una implementación remota sin tocar la UI.

### Variables de entorno

Copia `.env.example` a `.env.local`. **Nunca pongas claves en variables `VITE_`**: terminan en el navegador.

- `VITE_ASSISTANT_ENDPOINT`: URL del proxy del asistente. Recibe `{ messages: {role, text}[], context: { name?, memory } }` y devuelve `{ reply, suggestions? }`. El proxy guarda la clave del LLM y el *system prompt*. Vacío → asistente guiado local.
- `VITE_LEADS_ENDPOINT`: URL que recibe por POST JSON los formularios de eBook y contacto. Vacío → se guardan cifrados en el dispositivo y pueden exportarse desde `/admin`.

## Privacidad y seguridad

- Todo lo sensible (perfil, respuestas del onboarding, diario, notas, mensajes sin enviar, registros de pausa y de «Hoy fue difícil», límites, conversaciones, contactos de confianza, formularios) se guarda en **IndexedDB cifrado con AES-GCM 256** (IV aleatorio por registro). La clave se genera con WebCrypto como **no extraíble** y se guarda como `CryptoKey` en IndexedDB. Solo los ajustes de interfaz, el contenido editable y el hash de la cuenta local se guardan sin cifrar.
- Límite honesto: este cifrado protege frente a la inspección casual del almacenamiento y frente a fugas en cachés o copias, pero no frente a código que se ejecute en el mismo origen.
- **El service worker nunca cachea datos sensibles**: precachea el *shell*, la página offline, iconos y los *chunks* de la build (que incluyen el contenido educativo público); cachea en tiempo de ejecución los recursos con hash; ignora peticiones que no sean GET, de otros orígenes, y cualquier ruta `/api/`, `/auth/`, `/lead(s)` o `/assistant`.
- Consentimientos **separados** para memoria personalizada y para análisis de texto sensible por la IA. Sin este último, el asistente solo responde a temas elegidos con botones. La detección de crisis se ejecuta siempre en el dispositivo y no envía nada.
- Perfil permite **exportar todo** (JSON descifrado, sin credenciales) y **borrar todo**, incluida la clave, con confirmación escrita.
- Notificaciones solo tras un toque explícito; recordatorio diario local.
- El dictado por voz (Web Speech API) es opcional y la UI avisa de que el navegador puede procesar el audio en sus servidores.

## Qué incluye la fase 1

- **Landing** con todas las secciones pedidas (qué es, cómo funciona, para quién, cerebro, herramientas, programa, libro, test, guía 72 h, artículos, eBook y comunidad, FAQ, planes como marcador, contacto, privacidad) y aviso claro de que no es terapia.
- **Test «¿Tienes un amor tóxico?»** (7 preguntas, Sí / A veces / No) con bandas de orientación no diagnósticas.
- **Onboarding conversacional** de 12 pasos, una pregunta por pantalla, progreso, preguntas sensibles omitibles, guardado progresivo, modo invitado, recursos de seguridad si se marca «Violencia o amenazas», y **plan inicial** generado por una función pura.
- **Inicio** con «¿Qué necesitas en este momento?» y tarjetas (camino, emoción del día, siguiente paso, un minuto de cerebro, pequeños avances observables, recordatorio, asistente).
- **Pausa** en 7 pasos (acción, intensidad 0–10, necesidad, explicación, menú de regulación, re-evaluación y registro). Herramientas: temporizador 2/5/10 min, respiración cómoda con alternativa 5-4-3-2-1, escribir sin enviar, mis motivos, contactos de confianza (tel/SMS/WhatsApp) y asistente. Nunca bloquea ni intercepta el contacto. Accesible incluso sin perfil y sin conexión.
- **Contacto cero y límites**: 6 modalidades, reglas predefinidas y propias, vista de tarjetas y lista, activar/suspender/editar, contador opcional que **nunca** se reinicia solo.
- **Hoy fue difícil**: flujo no punitivo, respuesta adaptada, reinicio del contador solo con confirmación explícita, el contacto necesario nunca cuenta como retroceso, el progreso nunca se borra, patrones observacionales.
- **Asistente** claramente identificado como IA (no es Laura Rojas ni un terapeuta), proveedor local y remoto, pantalla de seguridad ante señales de crisis.
- **Mi Camino**: 5 pilares, 17 módulos (temas del libro como «contenido autorizado pendiente» y 6 ejercicios originales: apego, qué perdí, creencias, soledad, amor y autonomía, prácticas de atención y agencia), progreso persistente.
- **Tu cerebro después de una ruptura**: 15 temas con ejemplo cotidiano, metáforas señaladas, evidencia con limitaciones y aviso de revisión profesional pendiente. **Biblioteca** con referencias verificadas.
- **Mi Espacio** (diario, recuerdos y notas, mensajes sin enviar, recordatorios, herramientas) y **Perfil** (estadísticas simples, tema claro/oscuro, reducir animaciones, recordatorios, contactos de confianza, permisos, exportar y borrar).
- **Panel `/admin`** (modo local) para editar los mensajes del producto y la biblioteca, y exportar formularios guardados localmente.
- **PWA**: manifest completo (iconos 192/512/maskable, apple-touch-icon, atajos a Pausa, Hoy fue difícil y Diario), service worker generado en build, página offline, aviso de instalación (`beforeinstallprompt` e instrucciones para iOS).
- **Despliegue**: `public/_redirects` (Netlify/Cloudflare) y `deploy/nginx.conf.example` con fallback SPA y 301 de `/vsl` a `/test`.

## Contenido pendiente de aprobación o revisión

- **Textos de Laura Rojas**: los módulos de reconocer patrones, ciclo de control y manipulación, pérdida de identidad, creencias y límites, señales de alerta, amor propio, autonomía y relaciones futuras se muestran como «contenido autorizado pendiente». No se le atribuye ninguna cita, afirmación clínica ni credencial.
- **Artículos del blog**: se conservan las URL, títulos, categorías y tiempos de lectura; el cuerpo aparece como «contenido pendiente de migración» (`src/content/blog.ts`, campo `body`).
- **Guía de 72 horas**: texto original y provisional, marcado como tal, hasta recibir el contenido aprobado.
- **eBook**: el formulario recoge la solicitud; el envío real del archivo depende del endpoint.
- **Módulo del cerebro y resúmenes de la biblioteca**: redactados en lenguaje sencillo; requieren **revisión profesional** (`reviewedAt` vacío en todas las referencias). Los títulos, autores y años se verificaron en PubMed, Europe PMC y OMS.
- **Política de privacidad**: informativa, pendiente de revisión legal.
- **Números de emergencia**: solo se muestran los generales (123 Colombia, 911 México/EE. UU., 112 España/UE) y se pide marcar el número local. No se incluyen líneas de ayuda específicas sin verificar.

## Recorrido en la app

Mi Camino tiene siete capítulos según la situación (sigue en la relación, acaba de terminar, primeros días, distancia elegida, comprender, identidad, relaciones futuras). El orden sale de `orderedChapters` en `src/lib/journey.ts`. Los ejercicios del libro son paráfrasis; el capítulo autorizado de Laura se puede sustituir en el CMS con el mismo identificador (`source: laura`). Las citas cortas llevan página y el aviso de que faltan su aprobación para publicarse tal cual.

Pausa, check-in, plan de protección y números de emergencia no dependen de un plan de pago.

## Qué ya está en el código y qué falta por claves

En el repositorio: cuentas (correo, enlace mágico, Google y Apple cuando hay claves), sincronización cifrada opcional, asistente con proxy, comunidad moderada, planes Stripe cuando hay claves, avisos push cuando hay claves VAPID, CMS, blog y SEO. Sin esas claves la app sigue funcionando en modo local o guiado. Ver `.env.example` y [DEPLOY.md](DEPLOY.md).

Sigue pendiente: el texto autorizado de Laura, la revisión profesional del módulo del cerebro y de las paráfrasis, la revisión legal de la privacidad, el cuerpo migrado de algunos artículos y una auditoría de accesibilidad con personas.
