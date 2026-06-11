# NorteGAS ERP

ERP interno estilo Odoo para distribución de gas envasado. Hecho a medida para NorteGAS (General Ramírez, Entre Ríos): ventas con canje de envases, reparto con hojas de ruta, stock dual (llenas/vacías), cuenta corriente, caja, compras a ExtraGAS/YPF GAS, facturación con CAE manual y libro IVA.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Auth + RLS) · Recharts

## Módulos

| Módulo | Qué hace |
|---|---|
| **Tablero** | Ventas de hoy y del mes, pedidos por entregar, saldos a cobrar, gráfico de 14 días, stock crítico |
| **Ventas** | Pedidos con precios por lista, canje de envases, estados borrador → confirmado → en reparto → entregado |
| **Clientes** | Ficha con cuenta corriente, cobranzas, envases en su poder (comodato/canje) |
| **Productos** | Catálogo con IVA 10,5% (GLP) / 21%, costo y precio por cada lista |
| **Inventario** | Stock por depósito: unidades llenas y envases vacíos, mínimos, ajustes auditados |
| **Reparto** | Hojas de ruta por chofer y vehículo, asignación de pedidos, entrega con método de pago |
| **Compras** | Órdenes a proveedores; al recibir suma stock y actualiza costos |
| **Facturación** | Numeración automática por tipo y punto de venta, alícuotas separadas, carga de CAE |
| **Tesorería** | Caja con ingresos/egresos, gastos con crédito fiscal |
| **Impuestos** | Libro IVA ventas y compras por período, posición de IVA, IIBB estimado |
| **Equipo** | Roles admin / ventas / chofer / contable con permisos por RLS |
| **Ajustes** | Datos fiscales de la empresa, vehículos, listas y depósitos |

La lógica transaccional vive en funciones de Postgres (RPC), al estilo Odoo: `confirmar_pedido` valida y descuenta stock, `entregar_pedido` impacta caja o cuenta corriente, `recibir_compra` suma stock y actualiza costos, `facturar_pedido` numera y separa alícuotas.

## Puesta en marcha

### 1. Crear el proyecto en Supabase

1. Entrá a [supabase.com](https://supabase.com) → **New project** (el plan gratis alcanza).
2. Elegí región `South America (São Paulo)` y una contraseña para la base.

### 2. Crear la base de datos (schema `erp`, convive con tus tablas)

Todo el ERP se crea dentro de un **schema propio llamado `erp`**, así puede convivir en la misma base con otras apps tuyas (por ejemplo tablas `pedidos`, `pedido_items`, `sesiones_reparto` en `public`): no se toca nada de lo existente.

1. En Supabase: **SQL Editor → New query**.
2. Pegá el contenido completo de [`supabase/schema.sql`](supabase/schema.sql) y ejecutá (**Run**).
3. (Recomendado) Pegá y ejecutá [`supabase/seed.sql`](supabase/seed.sql): carga empresa, listas, depósito, proveedores, productos con precios, stock inicial y clientes de ejemplo.
4. **⚠ Paso obligatorio:** en **Settings → API (Data API) → Exposed schemas**, agregá `erp` a la lista (quedará `public, graphql_public, erp`). Sin esto la app no puede consultar el schema.

> Si tenés el archivo único `nortegas_database.sql`, es schema + seed juntos: un solo copy-paste (el paso 4 sigue siendo manual).

### 3. Crear tu usuario

En Supabase: **Authentication → Users → Add user** → email y contraseña.
**El primer usuario creado después de correr el script queda como admin del ERP automáticamente.** Los siguientes entran con rol Ventas y se ajustan desde el módulo Equipo.

> El login de Supabase es compartido entre las apps de la misma base. Si ya tenés un usuario (de otra app tuya) y querés usarlo como admin del ERP, al final de `schema.sql` hay un bloque comentado para "adoptarlo" poniendo tu email. Y al revés: cualquier usuario nuevo que crees para otra app también recibe un perfil en el ERP (rol Ventas) — lo desactivás desde Equipo si no corresponde.

### 4. Variables de entorno

En Supabase: **Settings → API**. Copiá los dos valores en `.env.local` (local) o en las variables del proyecto (v0/Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 5. Subir a GitHub e importar en v0

1. Creá un repo nuevo en GitHub y subí este proyecto (o subí el ZIP descomprimido).
2. En [v0.app](https://v0.app): **New → Import from GitHub** y elegí el repo.
3. En la configuración del proyecto de v0, agregá las dos variables de entorno del paso 4.
4. Deploy. La app te lleva a `/login`; si faltan las variables, te muestra `/setup` con esta misma guía.

### Correr local (opcional)

```bash
npm install
npm run dev
# http://localhost:3000
```

## Estructura

```
app/                # Páginas (App Router): un directorio por módulo
components/         # ui.tsx (design system), app-shell.tsx (sidebar), gráficos
lib/actions/        # Server Actions (mutaciones → RPC de Postgres)
lib/supabase/       # Clientes Supabase (server + browser)
supabase/schema.sql # Tablas, enums, funciones RPC, vistas, RLS, triggers
supabase/seed.sql   # Datos iniciales de NorteGAS
```

## Convivencia con otras apps en la misma base

- El ERP vive 100% en el schema `erp`: tablas, enums, funciones, vistas y políticas RLS. Tus tablas de `public` no se modifican (este script ni siquiera les activa RLS).
- Los clientes Supabase de esta app ya vienen configurados con `db: { schema: "erp" }`, por eso el código consulta `pedidos`, `clientes`, etc. sin prefijo y va siempre al schema correcto.
- El único objeto fuera de `erp` es un trigger en `auth.users` (`on_auth_user_created_erp`) que crea el perfil del ERP cuando se registra un usuario nuevo.

## Notas

- **Facturación:** la numeración y el libro IVA son internos; el CAE se obtiene en Comprobantes en línea (ARCA) y se registra acá. Si más adelante querés emisión electrónica directa, se integra el webservice WSFE sin tocar el resto.
- **Seguridad:** RLS activo en todas las tablas. Choferes solo pueden actualizar pedidos y rutas; configuración de empresa, solo admin.
- **Envases:** cada venta registra envases devueltos; la diferencia queda en la cuenta de envases del cliente.
