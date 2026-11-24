# TripFlow ✈️

Aplicación web para **planificar viajes de forma colaborativa**. Un grupo de amigos, una pareja o una familia organiza el
viaje en un solo lugar, en vez de tener la información repartida entre WhatsApp, notas y documentos compartidos.

## Funcionalidades (MVP)

- **Cuentas** con email y contraseña.
- **Viajes** con nombre, destino, fechas y descripción.
- **Itinerario día por día**: cada día del viaje tiene sus actividades, con hora opcional.
- **Drag & drop**: arrastrar actividades para reordenarlas o moverlas entre días e ideas, también con teclado
  (Espacio + flechas). Los cambios se ven al instante y, si no se pueden guardar, se revierten.
- **Tablero de ideas**: actividades sin día asignado (restaurantes, excursiones, lugares…) que después se mueven a un día.
- **Categorías**, ubicación, link y notas para cada actividad, con registro de quién la agregó.
- **Buscador de lugares**: al cargar la ubicación se sugieren lugares reales, priorizando los cercanos al viaje.
- **Mapa del viaje**: todas las actividades ubicadas, con marcadores numerados y coloreados por día, filtro por día y el
  recorrido de cada día dibujado **por las calles**, con el tiempo y la distancia en auto entre cada parada y el total
  del día.
- **Optimización de recorridos**: para cada día, sugiere el orden que minimiza el recorrido total ("de 89,9 km a
  25,7 km, 71 % menos"). Las actividades con horario quedan fijas y el resto se reordena entre ellas; el usuario ve la
  propuesta y decide si aplicarla.
- **Presupuesto compartido**: gastos estimados por categoría (alojamiento, transporte, comidas…), opcionalmente
  vinculados a una actividad, con un presupuesto total, cuánto queda, desglose por categoría y cuánto toca por persona.
  El costo de cada actividad se ve en el itinerario.
- **Invitación por link** (pensado para compartir por WhatsApp): vence a los 7 días y regenerarlo invalida el anterior.
- **Roles**: quien organiza (`OWNER`) edita el viaje, invita y gestiona integrantes; quienes colaboran (`EDITOR`)
  agregan y organizan actividades.
- Si se acorta el viaje, las actividades de los días quitados **vuelven a Ideas** en vez de perderse.

## Stack

| Capa          | Tecnología                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------ |
| Framework     | Next.js 16 (App Router, Server Actions, Cache Components) + React 19                       |
| Lenguaje      | TypeScript (strict)                                                                        |
| Estilos       | Tailwind CSS 4                                                                             |
| Base de datos | PostgreSQL 17 (Docker) + Prisma 7 (driver adapter `pg`)                                    |
| Auth          | Better Auth (email + contraseña, sesiones en base de datos)                                |
| Mapas         | MapLibre GL + OpenFreeMap (mapas) y Photon (búsqueda de lugares), todo sobre OpenStreetMap |
| Validación    | Zod 4                                                                                      |
| Testing       | Vitest                                                                                     |
| Calidad       | ESLint, Prettier, GitHub Actions (lint, formato, tipos, tests, build)                      |

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

## Deploy (Vercel + Neon)

1. Importar el repositorio en [Vercel](https://vercel.com/new).
2. En el proyecto, **Storage → Neon (Postgres)**: crea la base y define `DATABASE_URL` y `DATABASE_URL_UNPOOLED`.
3. Agregar la variable `BETTER_AUTH_SECRET` (`openssl rand -base64 32`).
4. Opcional: `ROUTING_URL` (por ejemplo `https://router.project-osrm.org`) para recorridos por calle y tiempos en auto.
   Sin ella, el mapa y la optimización usan distancias en línea recta.
5. Deploy. El script `vercel-build` aplica las migraciones (`prisma migrate deploy`) antes de compilar.

`BETTER_AUTH_URL` toma el dominio de producción de Vercel automáticamente; solo hace falta definirla si se usa un
dominio propio.

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
- **D — Inversión de dependencias.** Los servicios dependen de interfaces (`TripRepository`, `PlaceSearch`, `Clock`,
  `TokenGenerator`) inyectadas por constructor. Solo `container.ts` conoce las clases concretas: cambiar Photon por
  otro proveedor de búsqueda de lugares es escribir un adaptador nuevo.

### Otras decisiones de diseño

- **Dinero en centavos enteros.** Los montos se guardan como `BIGINT` de centavos (con `Int` el máximo sería ~21
  millones, poco para un viaje en pesos) y nunca se opera con decimales. Los montos se escriben como en Argentina
  (`1.234,50`) o en inglés (`1,234.50`): `parseAmountToCents` resuelve la ambigüedad con reglas explícitas y testeadas. La
  división por persona reparte el resto centavo a centavo (`splitEvenly`), así la suma da exactamente el total.
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
- **Optimización de recorridos (Smart Itinerary).** Es un problema del viajante (TSP) de camino abierto con
  restricciones de precedencia, NP-hard en general, pero un día de viaje es chico:
  - Hasta 12 paradas: solución **exacta** con programación dinámica de Held–Karp, O(n²·2ⁿ), que admite precedencias de
    forma natural (una parada solo se agrega si sus predecesoras ya están en el recorrido).
  - Más paradas: vecino más cercano desde cada inicio posible + mejora local 2-opt.
  - Los horarios se traducen en precedencias: las actividades con hora mantienen el orden cronológico y funcionan como
    anclas (lo que está entre el desayuno y la cena no se mueve antes del desayuno).
  - Los tests comparan el resultado contra fuerza bruta en cientos de casos aleatorios.
  - Las distancias vienen de un puerto `TravelCostProvider`: por defecto, distancia en línea recta (haversine),
    instantánea y sin servicios externos; con `ROUTING_URL` usa tiempos reales en auto de OSRM y, si falla, vuelve a la
    línea recta. Al aplicar un recorrido, el servidor verifica que el día no haya cambiado mientras tanto.
- **Recorridos en el mapa.** Un segundo puerto, `DirectionsProvider`, devuelve la línea a dibujar y la distancia y el
  tiempo de cada tramo (servicio Route de OSRM, cacheado por secuencia de paradas). Es más lento que el resto de la
  página, así que el server component pasa la promesa sin esperarla y el mapa la recibe en streaming: primero dibuja
  líneas rectas punteadas y después las reemplaza por el recorrido real. Sin `ROUTING_URL`, o si OSRM falla, quedan las
  líneas rectas con la distancia y sin tiempo, porque sin calles no hay una estimación honesta.
- **Búsqueda de lugares por un endpoint propio** (`/api/places`), solo para usuarios logueados, con resultados
  cacheados (`"use cache"`) para no abusar de la API pública de Photon mientras se escribe. Las búsquedas se envían a
  Photon (komoot); la URL es configurable con `PHOTON_URL` para usar una instancia propia.
- **Cache Components.** Las partes que dependen de la sesión se transmiten dentro de `<Suspense>`, mientras el resto de
  cada página se prerenderiza.

## Tests

La lógica de negocio se testea sin base de datos, con repositorios en memoria (`src/server/testing/in-memory.ts`):

- Fechas: años bisiestos, cambios de mes y año, rangos.
- Itinerario: armado por día y cálculo de cómo queda cada día al mover una actividad (`planMove`).
- Viajes: validaciones, permisos y que acortar el viaje mueva actividades a Ideas.
- Actividades: ideas vs. días programados, fechas fuera del viaje, URLs peligrosas, reordenar, mover.
- Invitaciones: unirse, idempotencia, vencimiento, invalidar el link anterior, quitar integrantes y abandonar el viaje.
- Presupuesto: parseo de montos en distintos formatos, resumen contra el presupuesto (ok / cerca del límite /
  excedido), desglose por categoría, división por persona sin perder centavos y permisos.
- Recorridos: optimizador vs. fuerza bruta (con y sin horarios), heurística para días largos, anclas por horario,
  actividades sin ubicación fijas, respuesta de OSRM y fallback, y que no se aplique una sugerencia desactualizada.
- Lugares y mapa: coordenadas válidas (ambas o ninguna, rangos), parseo de respuestas de Photon, sesgo por zona del
  viaje y armado de las capas del mapa por día.

## Próximos pasos

- Tests de integración de los repositorios contra un Postgres efímero (Testcontainers) y tests E2E con Playwright.
- Actualización en tiempo real (SSE o WebSockets) cuando otra persona edita el viaje.
- Login con Google, verificación de email y recuperación de contraseña.
- Gastos divididos: quién pagó cada gasto y quién le debe a quién, con la menor cantidad de transferencias.
- Votos o comentarios en las ideas.
