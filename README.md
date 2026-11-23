# TripFlow ✈️

Aplicación web para **planificar viajes de forma colaborativa**. Un grupo de amigos, una pareja o una familia organiza el
viaje en un solo lugar, en vez de tener la información repartida entre WhatsApp, notas y documentos compartidos.

## Funcionalidades (MVP)

- **Cuentas** con email y contraseña.
- **Viajes** con nombre, destino, fechas y descripción.
- **Itinerario día por día**: cada día del viaje tiene sus actividades, con hora opcional y orden manual (↑ ↓).
- **Tablero de ideas**: actividades sin día asignado (restaurantes, excursiones, lugares…) que después se mueven a un día.
- **Categorías**, ubicación, link y notas para cada actividad, con registro de quién la agregó.
- **Invitación por link** (pensado para compartir por WhatsApp): vence a los 7 días y regenerarlo invalida el anterior.
- **Roles**: quien organiza (`OWNER`) edita el viaje, invita y gestiona integrantes; quienes colaboran (`EDITOR`)
  agregan y organizan actividades.
- Si se acorta el viaje, las actividades de los días quitados **vuelven a Ideas** en vez de perderse.

## Stack

| Capa          | Tecnología                                                            |
| ------------- | --------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router, Server Actions, Cache Components) + React 19  |
| Lenguaje      | TypeScript (strict)                                                   |
| Estilos       | Tailwind CSS 4                                                        |
| Base de datos | PostgreSQL 17 (Docker) + Prisma 7 (driver adapter `pg`)               |
| Auth          | Better Auth (email + contraseña, sesiones en base de datos)           |
| Validación    | Zod 4                                                                 |
| Testing       | Vitest                                                                |
| Calidad       | ESLint, Prettier, GitHub Actions (lint, formato, tipos, tests, build) |

> **¿Por qué Better Auth y no Auth.js?** Auth.js v5 sigue en beta y desde 2025 lo mantiene el equipo de Better Auth,
> que lo recomienda para proyectos nuevos. Además, Better Auth guarda sesiones en Postgres vía Prisma sin configuración
> extra. Igual, la autenticación quedó aislada en `src/server/auth/`, así que cambiarla solo toca esa carpeta.

## Cómo correrlo

Requisitos: Node 22+ y Docker.

```bash
npm install
cp .env.example .env            # y generá un secreto: openssl rand -base64 32
npm run db:up                   # levanta Postgres en localhost:5433
npm run db:migrate              # aplica las migraciones
npm run dev                     # http://localhost:3000
```

### Scripts

| Script                  | Qué hace                                        |
| ----------------------- | ----------------------------------------------- |
| `npm run dev`           | Servidor de desarrollo                          |
| `npm test`              | Tests unitarios (Vitest)                        |
| `npm run test:coverage` | Tests con reporte de cobertura                  |
| `npm run typecheck`     | Genera los tipos de rutas de Next y corre `tsc` |
| `npm run lint`          | ESLint                                          |
| `npm run format`        | Prettier                                        |
| `npm run db:studio`     | Prisma Studio para inspeccionar la base         |

## Arquitectura

El código separa **qué hace la aplicación** (reglas de negocio) de **cómo se entrega** (Next.js) y **dónde se guarda**
(Prisma/Postgres). Las dependencias apuntan siempre hacia adentro:

```
app/ (rutas)  ──►  features/ (UI + server actions)  ──►  server/ (dominio + casos de uso)
                                                             ▲
                                     server/infrastructure ──┘ (implementa los puertos)
```

```
src/
├── app/                      # Rutas de Next.js. Delgadas: componen features y leen datos.
├── features/                 # Presentación por feature
│   ├── auth/                 #   formularios + server actions
│   ├── trips/
│   ├── activities/
│   └── members/
├── components/ui/            # Componentes visuales reutilizables (Button, Field, Card…)
├── lib/                      # Utilidades de presentación (formato de fechas, ActionState…)
└── server/                   # Núcleo de la aplicación, independiente de Next.js
    ├── trips/                #   entidad + esquemas Zod + puerto (repository) + servicio
    ├── activities/
    ├── members/              #   membresías, invitaciones y política de acceso
    ├── shared/               #   errores, fechas, validación, puertos (Clock, TokenGenerator)
    ├── auth/                 #   adaptador de Better Auth (único lugar que lo importa)
    ├── infrastructure/prisma #   implementaciones de los repositorios con Prisma
    ├── testing/              #   repositorios en memoria para tests
    └── container.ts          #   composition root: conecta servicios con implementaciones
```

### Principios SOLID aplicados

- **S — Responsabilidad única.** Cada servicio cubre un área (`TripService`, `ActivityService`, `MembershipService`), la
  autorización vive en un solo lugar (`TripAccessPolicy`) y los mapeos a la base, en los repositorios.
- **O — Abierto/cerrado.** Los permisos se definen en un mapa rol → capacidades (`server/members/member.ts`). Agregar un
  rol nuevo (por ejemplo `VIEWER`) no requiere tocar los servicios, que solo preguntan `"activity:manage"`.
- **L — Sustitución de Liskov.** Las implementaciones Prisma y en memoria cumplen el mismo contrato y son
  intercambiables: los mismos servicios corren en producción y en tests.
- **I — Segregación de interfaces.** Los servicios piden solo lo que usan, por ejemplo
  `Pick<ActivityRepository, "unscheduleOutsideRange">` en `TripService`.
- **D — Inversión de dependencias.** Los servicios dependen de interfaces (`TripRepository`, `Clock`, `TokenGenerator`)
  inyectadas por constructor. Solo `container.ts` conoce las clases concretas.

### Otras decisiones de diseño

- **Fechas sin hora (`DateOnly`).** Un día del viaje es un concepto de calendario: "10 de julio" es el mismo día para
  todo el grupo, esté en la zona horaria que esté. El dominio usa strings `YYYY-MM-DD` y solo la capa de persistencia
  convierte a `@db.Date`, lo que evita los clásicos errores de un día de diferencia.
- **Errores de dominio, no HTTP.** Los servicios lanzan `ValidationError`, `NotFoundError`, `ForbiddenError` y
  `BusinessRuleError`. Las server actions los traducen a un `ActionState` (helper `runAction`) y las páginas, a 404.
- **No revelar existencia.** Si alguien que no es integrante pide un viaje, recibe un 404 y no un 403.
- **Validación en el borde del caso de uso.** Los servicios reciben input sin validar (`RawInput`) y lo validan con
  Zod, así que cualquier entrada (formulario, API futura, test) pasa por las mismas reglas.
- **Seguridad.** Cada server action vuelve a verificar la sesión, los `callbackUrl` se validan contra open redirects,
  los links de las actividades solo aceptan `http(s)` y los tokens de invitación son aleatorios (192 bits).
- **Formularios con mejora progresiva.** Server Actions + `useActionState`. Tras un error, el formulario conserva lo que
  se escribió (excepto contraseñas).
- **Cache Components.** Las partes que dependen de la sesión se transmiten dentro de `<Suspense>`, mientras el resto de
  cada página se prerenderiza.

## Tests

La lógica de negocio se testea sin base de datos, con repositorios en memoria (`src/server/testing/in-memory.ts`):

- Fechas: años bisiestos, cambios de mes y año, rangos.
- Itinerario: armado por día, orden y reordenamiento.
- Viajes: validaciones, permisos y que acortar el viaje mueva actividades a Ideas.
- Actividades: ideas vs. días programados, fechas fuera del viaje, URLs peligrosas, reordenar, mover.
- Invitaciones: unirse, idempotencia, vencimiento, invalidar el link anterior, quitar integrantes y abandonar el viaje.

## Próximos pasos

- Tests de integración de los repositorios contra un Postgres efímero (Testcontainers) y tests E2E con Playwright.
- Drag & drop para reordenar y mover actividades entre días.
- Actualización en tiempo real (SSE o WebSockets) cuando otra persona edita el viaje.
- Login con Google, verificación de email y recuperación de contraseña.
- Votos o comentarios en las ideas, gastos compartidos, mapa con las ubicaciones.
- Deploy (Vercel + Neon/Supabase) con `prisma migrate deploy` en el pipeline.
