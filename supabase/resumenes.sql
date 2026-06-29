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
