# ObraClara Web

Frontend React del MVP de control documental de ObraClara.

## Desarrollo

```bash
cp .env.example .env
npm install
npm run dev
```

`VITE_DEMO_MODE=true` usa exclusivamente datos tipados locales. Con cualquier otro valor, todas las operaciones se realizan contra `VITE_API_URL` y no existe fallback silencioso.

## Verificación

```bash
npm test
npm run build
```

## API REST

- `GET /dashboard`
- `GET /projects`
- `GET /projects/:projectId`
- `GET /projects/:projectId/documents`
- `POST /projects/:projectId/documents` con `multipart/form-data` y campo `file`
- `GET /projects/:projectId/anomalies`
- `POST /anomalies/:anomalyId/review` con `{ "decision": "...", "comment": "..." }`
- `POST /projects/:projectId/questions` con `{ "question": "..." }`
- `GET /projects/:projectId/audit-events`

Todas las rutas se resuelven respecto a `VITE_API_URL` (por defecto `/api`) y reciben `Authorization: Bearer <token>` tras iniciar sesión. La API no expone historial de preguntas, por lo que esa lista comienza vacía fuera del modo demo.

La imagen de nginx reenvía `/api/` a `http://backend:8080/api/`; el servicio del backend debe estar disponible con el nombre Docker `backend`.
