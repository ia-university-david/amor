# Desplegar Amor Tóxico

La app es un solo proceso Node: sirve la web ya construida y la API. No hace falta un segundo servidor para el frontend.

Esto **no publica** la app. Solo describe cómo hacerlo cuando el propietario tenga un servidor y las claves.

## Qué hace falta antes

- Node 22 si se despliega sin Docker.
- Un dominio apuntando al servidor (por ejemplo `amortoxico.com`).
- Copia de `.env.example` a `.env`, con valores reales. Ninguna clave va en el repositorio.
- Como mínimo, en producción: `APP_URL`, `DATA_ENCRYPTION_KEY` (con `npm run secrets`), `SESSION` implícita en esa clave, y una base de datos.

Sin claves de correo, de modelo de lenguaje, de Stripe o de notificaciones push, la app arranca igual: el correo queda en consola, el asistente usa el modo guiado, los planes dicen que el pago aún no está conectado y los avisos pueden quedar en el dispositivo.

## Con Docker (servidor propio)

```bash
cp .env.example .env
# Completa APP_URL, DATA_ENCRYPTION_KEY y POSTGRES_PASSWORD
docker compose up -d --build
```

`docker-compose.yml` levanta la app y Postgres 16. La app escucha solo en `127.0.0.1:8787`. Delante va nginx con `deploy/nginx.conf` (HTTPS con Let's Encrypt) o Caddy.

Comprobar: `curl -fsS http://127.0.0.1:8787/api/health`

Los datos de Postgres viven en el volumen `pgdata`. No lo borres al actualizar.

## Sin Docker

```bash
npm ci
npm run build
npm start
```

`DATABASE_URL` puede ser SQLite (`sqlite:./data/amor.db`) en un solo servidor, o Postgres.

## Variables que el propietario tiene que poner

| Variable | Para qué | Sin ella |
| --- | --- | --- |
| `DATA_ENCRYPTION_KEY` | Cifrar lo que se sincroniza | Obligatoria en producción |
| `APP_URL` | Enlaces de correo, pagos y acceso | Los enlaces salen mal |
| `EMAIL_TRANSPORT` + `RESEND_API_KEY` o `SMTP_URL` | Verificación y enlace mágico | Solo consola, útil en pruebas |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` y los de Apple | Entrar con Google o Apple | Sigue el correo y la contraseña |
| `LLM_API_KEY` y `LLM_BASE_URL` | Asistente con modelo externo | Asistente guiado, sin clave |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y los precios | Cobrar planes | La sección Planes no cobra |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Avisos push | Recordatorio local si el navegador lo permite |
| `ADMIN_EMAILS` | Quién entra al CMS al registrarse | Nadie recibe el rol solo |

Generar secretos: `npm run secrets` y `npm run vapid`. Dar un rol a mano: `npm run role`.

## Dominio canónico

La dirección pública es `https://amortoxico.com`. El proceso Node responde **301** a esa dirección cuando la petición de una página llega con host `www.amortoxico.com` (conserva ruta y query). La API acepta los dos orígenes, así que un formulario abierto en `www` puede guardar aunque la página aún no haya redirigido.

En Hostinger, si LiteSpeed sirve los HTML y Node solo recibe `/api`, esa redirección no afecta a las páginas. En ese caso, en hPanel añade **una** redirección 301 de `https://www.amortoxico.com` a `https://amortoxico.com`, conservando ruta y query. No cambies los registros DNS.

## Qué no hacer

- No subir `.env`.
- No poner claves en variables que empiecen por `VITE_`: el navegador las vería.
- No forzar el historial de `main`.
