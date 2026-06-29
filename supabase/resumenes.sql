-- ============================================================
-- Módulo Resúmenes Mensuales · NorteGAS ERP
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================
set search_path = erp, public;

-- ---------- REGISTROS DIARIOS ----------
create table if not exists erp.registros_diarios (
  id               bigint generated always as identity primary key,
  fecha            date not null,
  -- Finanzas diarias
  dinero_recaudado   numeric(14,2) not null default 0,
  empleados_pagados  numeric(14,2) not null default 0,
  gastos_vehiculos   numeric(14,2) not null default 0,
  gastos_extras      numeric(14,2) not null default 0,
  -- Ventas GAS (cantidades)
  ventas_10c  int not null default 0,
  ventas_10b  int not null default 0,
  ventas_15c  int not null default 0,
  ventas_15b  int not null default 0,
  ventas_45c  int not null default 0,
  ventas_45b  int not null default 0,
  -- Compras YPF
  compra_ypf_pago   numeric(14,2) not null default 0,
  compra_ypf_x10    int not null default 0,
  compra_ypf_x15    int not null default 0,
  compra_ypf_x45    int not null default 0,
  -- Compras Acosta
  compra_acosta_pago   numeric(14,2) not null default 0,
  compra_acosta_x10    int not null default 0,
  compra_acosta_x15    int not null default 0,
  compra_acosta_x45    int not null default 0,
  -- Compras Viajes
  compra_viajes_pago   numeric(14,2) not null default 0,
  compra_viajes_x10    int not null default 0,
  compra_viajes_x15    int not null default 0,
  compra_viajes_x45    int not null default 0,
  -- Compras Gustavo
  compra_gustavo_pago   numeric(14,2) not null default 0,
  compra_gustavo_x10    int not null default 0,
  compra_gustavo_x15    int not null default 0,
  compra_gustavo_x45    int not null default 0,
  -- Campos extra dinámicos (Bug 7 fix)
  datos_extra  jsonb not null default '{}',
  -- Meta
  notas        text,
  usuario_id   uuid references erp.perfiles(id),
  created_at   timestamptz not null default now(),
  constraint registros_diarios_fecha_unique unique (fecha)
);

create index if not exists idx_registros_diarios_fecha on erp.registros_diarios (fecha desc);

alter table erp.registros_diarios enable row level security;
create policy "autenticados pueden todo en registros_diarios"
  on erp.registros_diarios for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ---------- RESUMEN CONFIG ----------
create table if not exists erp.resumen_config (
  id           bigint generated always as identity primary key,
  orden        int not null default 0,
  etiqueta     text not null,
  campos_suma  text[] not null default '{}',
  campos_resta text[] not null default '{}',
  activo       boolean not null default true
);

alter table erp.resumen_config enable row level security;
create policy "autenticados pueden todo en resumen_config"
  on erp.resumen_config for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Seed de configuración por defecto
insert into erp.resumen_config (orden, etiqueta, campos_suma, campos_resta) values
  (1, 'Dinero recaudado',    array['dinero_recaudado'], array[]::text[]),
  (2, 'Proveedores pagados', array['compra_ypf_pago','compra_acosta_pago','compra_viajes_pago','compra_gustavo_pago'], array[]::text[]),
  (3, 'Empleados pagados',   array['empleados_pagados'], array[]::text[]),
  (4, 'Gastos vehículos',    array['gastos_vehiculos'], array[]::text[]),
  (5, 'Gastos extras',       array['gastos_extras'], array[]::text[])
on conflict do nothing;

-- Bug 7 fix: migración segura para instancias que ya tienen la tabla sin datos_extra
alter table erp.registros_diarios
  add column if not exists datos_extra jsonb not null default '{}';

-- ---------- CAMPOS CONFIG ----------
-- Bug 8 fix: seed de campos base del sistema
create table if not exists erp.campos_config (
  id         bigint generated always as identity primary key,
  clave      text not null,
  etiqueta   text not null,
  tipo       text not null default 'numeric',
  grupo      text not null default 'otros',
  orden      int  not null default 0,
  activo     boolean not null default true,
  es_base    boolean not null default false,
  created_at timestamptz not null default now(),
  constraint campos_config_clave_unique unique (clave)
);

alter table erp.campos_config enable row level security;
create policy "autenticados pueden todo en campos_config"
  on erp.campos_config for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

insert into erp.campos_config (clave, etiqueta, tipo, grupo, orden, activo, es_base) values
  ('dinero_recaudado',    'Dinero recaudado',    'numeric', 'Finanzas',  1,  true, true),
  ('empleados_pagados',   'Empleados pagados',   'numeric', 'Finanzas',  2,  true, true),
  ('gastos_vehiculos',    'Gastos vehículos',    'numeric', 'Finanzas',  3,  true, true),
  ('gastos_extras',       'Gastos extras',       'numeric', 'Finanzas',  4,  true, true),
  ('ventas_10c',  'Ventas GAS x10C', 'integer', 'Ventas GAS', 5,  true, true),
  ('ventas_10b',  'Ventas GAS x10B', 'integer', 'Ventas GAS', 6,  true, true),
  ('ventas_15c',  'Ventas GAS x15C', 'integer', 'Ventas GAS', 7,  true, true),
  ('ventas_15b',  'Ventas GAS x15B', 'integer', 'Ventas GAS', 8,  true, true),
  ('ventas_45c',  'Ventas GAS x45C', 'integer', 'Ventas GAS', 9,  true, true),
  ('ventas_45b',  'Ventas GAS x45B', 'integer', 'Ventas GAS', 10, true, true),
  ('compra_ypf_pago',     'YPF — Pago',       'numeric',  'Compras', 11, true, true),
  ('compra_ypf_x10',      'YPF — x10',        'integer',  'Compras', 12, true, true),
  ('compra_ypf_x15',      'YPF — x15',        'integer',  'Compras', 13, true, true),
  ('compra_ypf_x45',      'YPF — x45',        'integer',  'Compras', 14, true, true),
  ('compra_acosta_pago',  'Acosta — Pago',    'numeric',  'Compras', 15, true, true),
  ('compra_acosta_x10',   'Acosta — x10',     'integer',  'Compras', 16, true, true),
  ('compra_acosta_x15',   'Acosta — x15',     'integer',  'Compras', 17, true, true),
  ('compra_acosta_x45',   'Acosta — x45',     'integer',  'Compras', 18, true, true),
  ('compra_viajes_pago',  'Viajes — Pago',    'numeric',  'Compras', 19, true, true),
  ('compra_viajes_x10',   'Viajes — x10',     'integer',  'Compras', 20, true, true),
  ('compra_viajes_x15',   'Viajes — x15',     'integer',  'Compras', 21, true, true),
  ('compra_viajes_x45',   'Viajes — x45',     'integer',  'Compras', 22, true, true),
  ('compra_gustavo_pago', 'Gustavo — Pago',   'numeric',  'Compras', 23, true, true),
  ('compra_gustavo_x10',  'Gustavo — x10',    'integer',  'Compras', 24, true, true),
  ('compra_gustavo_x15',  'Gustavo — x15',    'integer',  'Compras', 25, true, true),
  ('compra_gustavo_x45',  'Gustavo — x45',    'integer',  'Compras', 26, true, true)
on conflict (clave) do nothing;
