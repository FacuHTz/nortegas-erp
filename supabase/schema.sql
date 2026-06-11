-- ============================================================
-- NorteGAS ERP · Esquema completo de base de datos (Supabase)
-- Versión para CONVIVIR con una base existente: todo el ERP vive
-- en el schema "erp", separado de tus tablas actuales en "public"
-- (pedidos, pedido_items, sesiones_reparto quedan intactas).
--
-- Pegar en SQL Editor de Supabase y ejecutar de una sola vez.
--
-- ⚠ PASO MANUAL OBLIGATORIO después de ejecutar este script:
--   Supabase → Settings → API → "Exposed schemas" → agregar: erp
--   (sin eso la app no puede leer el schema desde la API)
-- ============================================================

create schema if not exists erp;
set search_path = erp, public;

-- ---------- ENUMS ----------
create type condicion_fiscal as enum ('responsable_inscripto','monotributo','consumidor_final','exento');
create type tipo_cliente as enum ('particular','comercio','industria','distribuidor');
create type canal_venta as enum ('mostrador','reparto','telefono','whatsapp','voz');
create type estado_pedido as enum ('borrador','confirmado','en_reparto','entregado','cancelado');
create type estado_ruta as enum ('planificada','en_curso','cerrada');
create type estado_compra as enum ('borrador','confirmada','recibida','cancelada');
create type estado_factura as enum ('emitida','anulada');
create type tipo_comprobante as enum ('factura_a','factura_b','factura_c','nota_credito_a','nota_credito_b','nota_credito_c','recibo_x');
create type metodo_pago as enum ('efectivo','transferencia','mercadopago','tarjeta','cheque','cuenta_corriente');
create type tipo_mov_stock as enum ('compra','venta','ajuste','devolucion_envase','entrega_comodato','recuento');
create type tipo_mov_caja as enum ('ingreso','egreso');
create type rol_usuario as enum ('admin','ventas','chofer','contable');

-- ---------- PERFILES (extiende auth.users) ----------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null default 'Usuario',
  rol rol_usuario not null default 'ventas',
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = erp, public as $$
begin
  insert into erp.perfiles (id, nombre, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email,'@',1)),
    case when (select count(*) from erp.perfiles) = 0 then 'admin'::rol_usuario else 'ventas'::rol_usuario end
  );
  return new;
end; $$;

create trigger on_auth_user_created_erp
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- EMPRESA (config, fila única) ----------
create table empresa (
  id int primary key default 1 check (id = 1),
  razon_social text not null default 'NorteGAS',
  cuit text not null default '',
  condicion condicion_fiscal not null default 'responsable_inscripto',
  domicilio text default 'General Ramírez, Entre Ríos',
  punto_venta int not null default 1,
  iibb text default '',
  alicuota_iibb numeric(5,2) not null default 3.50,
  inicio_actividades date,
  telefono text,
  email text
);

-- ---------- MAESTROS ----------
create table listas_precios (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  activa boolean not null default true
);

create table clientes (
  id bigint generated always as identity primary key,
  codigo text generated always as ('CLI-' || lpad(id::text, 5, '0')) stored,
  nombre text not null,
  cuit_dni text,
  condicion condicion_fiscal not null default 'consumidor_final',
  tipo tipo_cliente not null default 'particular',
  telefono text,
  email text,
  direccion text,
  localidad text default 'General Ramírez',
  zona_reparto text,
  lista_precio_id bigint references listas_precios(id),
  limite_credito numeric(14,2) not null default 0,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_clientes_nombre on clientes using gin (to_tsvector('spanish', nombre));

create table proveedores (
  id bigint generated always as identity primary key,
  nombre text not null,
  cuit text,
  condicion condicion_fiscal not null default 'responsable_inscripto',
  telefono text,
  email text,
  notas text,
  activo boolean not null default true
);

create table productos (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  tipo text not null default 'garrafa' check (tipo in ('garrafa','cilindro','accesorio','servicio')),
  capacidad_kg numeric(6,2),
  marca text,
  costo numeric(14,2) not null default 0,
  iva_alicuota numeric(5,2) not null default 21.00,
  requiere_envase boolean not null default false,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table precios_productos (
  lista_id bigint not null references listas_precios(id) on delete cascade,
  producto_id bigint not null references productos(id) on delete cascade,
  precio numeric(14,2) not null default 0,
  primary key (lista_id, producto_id)
);

create table depositos (
  id bigint generated always as identity primary key,
  nombre text not null unique
);

create table vehiculos (
  id bigint generated always as identity primary key,
  patente text not null unique,
  descripcion text,
  capacidad_garrafas int default 0,
  activo boolean not null default true
);

-- ---------- STOCK ----------
-- Para garrafas el stock es dual: unidades llenas y envases vacíos en depósito.
create table stock (
  producto_id bigint not null references productos(id) on delete cascade,
  deposito_id bigint not null references depositos(id) on delete cascade,
  llenas numeric(12,2) not null default 0,
  vacias numeric(12,2) not null default 0,
  minimo numeric(12,2) not null default 0,
  primary key (producto_id, deposito_id)
);

create table movimientos_stock (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  tipo tipo_mov_stock not null,
  producto_id bigint not null references productos(id),
  deposito_id bigint not null references depositos(id),
  delta_llenas numeric(12,2) not null default 0,
  delta_vacias numeric(12,2) not null default 0,
  referencia text,
  notas text,
  usuario_id uuid references perfiles(id)
);
create index idx_mov_stock_fecha on movimientos_stock (fecha desc);

-- Envases en poder de clientes (comodato / canje pendiente)
create table envases_clientes (
  cliente_id bigint not null references clientes(id) on delete cascade,
  producto_id bigint not null references productos(id) on delete cascade,
  cantidad numeric(12,2) not null default 0,
  primary key (cliente_id, producto_id)
);

-- Función central de stock: aplica delta + registra movimiento
create or replace function aplicar_stock(
  p_producto bigint, p_deposito bigint,
  p_delta_llenas numeric, p_delta_vacias numeric,
  p_tipo tipo_mov_stock, p_ref text, p_notas text default null
) returns void language plpgsql security definer set search_path = erp, public as $$
begin
  insert into stock (producto_id, deposito_id, llenas, vacias)
  values (p_producto, p_deposito, 0, 0)
  on conflict (producto_id, deposito_id) do nothing;

  update stock
     set llenas = llenas + p_delta_llenas,
         vacias = vacias + p_delta_vacias
   where producto_id = p_producto and deposito_id = p_deposito;

  insert into movimientos_stock (tipo, producto_id, deposito_id, delta_llenas, delta_vacias, referencia, notas, usuario_id)
  values (p_tipo, p_producto, p_deposito, p_delta_llenas, p_delta_vacias, p_ref, p_notas, auth.uid());
end; $$;

-- ---------- REPARTO ----------
create table rutas_reparto (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  chofer_id uuid references perfiles(id),
  vehiculo_id bigint references vehiculos(id),
  estado estado_ruta not null default 'planificada',
  notas text,
  created_at timestamptz not null default now()
);

-- ---------- VENTAS ----------
create table pedidos (
  id bigint generated always as identity primary key,
  numero text generated always as ('PED-' || lpad(id::text, 6, '0')) stored,
  fecha timestamptz not null default now(),
  cliente_id bigint not null references clientes(id),
  canal canal_venta not null default 'mostrador',
  estado estado_pedido not null default 'borrador',
  lista_precio_id bigint references listas_precios(id),
  deposito_id bigint references depositos(id),
  ruta_id bigint references rutas_reparto(id),
  direccion_entrega text,
  metodo_pago metodo_pago,
  subtotal numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  observaciones text,
  usuario_id uuid references perfiles(id),
  entregado_at timestamptz
);
create index idx_pedidos_estado on pedidos (estado);
create index idx_pedidos_fecha on pedidos (fecha desc);

create table pedido_items (
  id bigint generated always as identity primary key,
  pedido_id bigint not null references pedidos(id) on delete cascade,
  producto_id bigint not null references productos(id),
  cantidad numeric(12,2) not null,
  precio_unitario numeric(14,2) not null,
  iva_alicuota numeric(5,2) not null default 21.00,
  envases_devueltos numeric(12,2) not null default 0,
  subtotal numeric(14,2) generated always as (round(cantidad * precio_unitario, 2)) stored
);

create or replace function recalcular_pedido(p_pedido bigint)
returns void language plpgsql security definer set search_path = erp, public as $$
declare v_sub numeric(14,2); v_iva numeric(14,2);
begin
  select coalesce(sum(subtotal),0),
         coalesce(sum(round(subtotal * iva_alicuota / 100, 2)),0)
    into v_sub, v_iva
    from pedido_items where pedido_id = p_pedido;
  update pedidos set subtotal = v_sub, iva = v_iva, total = v_sub + v_iva where id = p_pedido;
end; $$;

create or replace function trg_items_recalc() returns trigger language plpgsql set search_path = erp, public as $$
begin
  perform recalcular_pedido(coalesce(new.pedido_id, old.pedido_id));
  return coalesce(new, old);
end; $$;
create trigger pedido_items_recalc
  after insert or update or delete on pedido_items
  for each row execute function trg_items_recalc();

-- ---------- CUENTA CORRIENTE / TESORERÍA ----------
create table movimientos_cc (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  cliente_id bigint not null references clientes(id),
  concepto text not null,
  debe numeric(14,2) not null default 0,
  haber numeric(14,2) not null default 0,
  referencia text,
  usuario_id uuid references perfiles(id)
);
create index idx_cc_cliente on movimientos_cc (cliente_id, fecha desc);

create table caja_movimientos (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  tipo tipo_mov_caja not null,
  concepto text not null,
  monto numeric(14,2) not null check (monto >= 0),
  metodo metodo_pago not null default 'efectivo',
  referencia text,
  usuario_id uuid references perfiles(id)
);
create index idx_caja_fecha on caja_movimientos (fecha desc);

create table cobranzas (
  id bigint generated always as identity primary key,
  fecha timestamptz not null default now(),
  cliente_id bigint not null references clientes(id),
  monto numeric(14,2) not null check (monto > 0),
  metodo metodo_pago not null default 'efectivo',
  referencia text,
  notas text,
  usuario_id uuid references perfiles(id)
);

create table gastos (
  id bigint generated always as identity primary key,
  fecha date not null default current_date,
  categoria text not null default 'general',
  descripcion text not null,
  proveedor_id bigint references proveedores(id),
  neto numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  comprobante text,
  usuario_id uuid references perfiles(id)
);

-- ---------- COMPRAS ----------
create table compras (
  id bigint generated always as identity primary key,
  numero text generated always as ('OC-' || lpad(id::text, 5, '0')) stored,
  fecha date not null default current_date,
  proveedor_id bigint not null references proveedores(id),
  deposito_id bigint references depositos(id),
  estado estado_compra not null default 'borrador',
  nro_factura_prov text,
  subtotal numeric(14,2) not null default 0,
  iva numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notas text,
  usuario_id uuid references perfiles(id)
);

create table compra_items (
  id bigint generated always as identity primary key,
  compra_id bigint not null references compras(id) on delete cascade,
  producto_id bigint not null references productos(id),
  cantidad numeric(12,2) not null,
  costo_unitario numeric(14,2) not null,
  iva_alicuota numeric(5,2) not null default 21.00,
  subtotal numeric(14,2) generated always as (round(cantidad * costo_unitario, 2)) stored
);

create or replace function recalcular_compra(p_compra bigint)
returns void language plpgsql security definer set search_path = erp, public as $$
declare v_sub numeric(14,2); v_iva numeric(14,2);
begin
  select coalesce(sum(subtotal),0),
         coalesce(sum(round(subtotal * iva_alicuota / 100, 2)),0)
    into v_sub, v_iva from compra_items where compra_id = p_compra;
  update compras set subtotal = v_sub, iva = v_iva, total = v_sub + v_iva where id = p_compra;
end; $$;

create or replace function trg_compra_items_recalc() returns trigger language plpgsql set search_path = erp, public as $$
begin
  perform recalcular_compra(coalesce(new.compra_id, old.compra_id));
  return coalesce(new, old);
end; $$;
create trigger compra_items_recalc
  after insert or update or delete on compra_items
  for each row execute function trg_compra_items_recalc();

-- ---------- FACTURACIÓN ----------
create table facturas (
  id bigint generated always as identity primary key,
  tipo tipo_comprobante not null,
  punto_venta int not null default 1,
  numero int not null,
  fecha date not null default current_date,
  cliente_id bigint not null references clientes(id),
  pedido_id bigint references pedidos(id),
  estado estado_factura not null default 'emitida',
  neto_21 numeric(14,2) not null default 0,
  iva_21 numeric(14,2) not null default 0,
  neto_105 numeric(14,2) not null default 0,
  iva_105 numeric(14,2) not null default 0,
  exento numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  cae text,
  cae_vencimiento date,
  usuario_id uuid references perfiles(id),
  unique (tipo, punto_venta, numero)
);

create table factura_items (
  id bigint generated always as identity primary key,
  factura_id bigint not null references facturas(id) on delete cascade,
  descripcion text not null,
  cantidad numeric(12,2) not null default 1,
  precio_unitario numeric(14,2) not null default 0,
  iva_alicuota numeric(5,2) not null default 21.00,
  subtotal numeric(14,2) generated always as (round(cantidad * precio_unitario, 2)) stored
);

create or replace function siguiente_numero_factura(p_tipo tipo_comprobante, p_pv int)
returns int language sql security definer set search_path = erp, public as $$
  select coalesce(max(numero), 0) + 1 from facturas where tipo = p_tipo and punto_venta = p_pv;
$$;

-- ============================================================
-- FUNCIONES DE NEGOCIO (RPC transaccionales, estilo Odoo)
-- ============================================================

-- Confirmar pedido: valida y descuenta stock de llenas, suma vacías por canje
create or replace function confirmar_pedido(p_pedido bigint)
returns void language plpgsql security definer set search_path = erp, public as $$
declare r record; v_dep bigint; v_num text; v_est estado_pedido;
begin
  select deposito_id, numero, estado into v_dep, v_num, v_est from pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido inexistente'; end if;
  if v_est <> 'borrador' then
    raise exception 'Solo se pueden confirmar pedidos en borrador';
  end if;
  if v_dep is null then
    select id into v_dep from depositos order by id limit 1;
    update pedidos set deposito_id = v_dep where id = p_pedido;
  end if;

  for r in select * from pedido_items where pedido_id = p_pedido loop
    if exists (
      select 1 from stock s join productos p on p.id = s.producto_id
      where s.producto_id = r.producto_id and s.deposito_id = v_dep
        and p.tipo in ('garrafa','cilindro') and s.llenas < r.cantidad
    ) then
      raise exception 'Stock insuficiente para el producto % en el depósito', r.producto_id;
    end if;
  end loop;

  for r in select pi.*, p.tipo as ptipo from pedido_items pi join productos p on p.id = pi.producto_id
           where pi.pedido_id = p_pedido loop
    if r.ptipo in ('garrafa','cilindro') then
      perform aplicar_stock(r.producto_id, v_dep, -r.cantidad, r.envases_devueltos, 'venta', v_num, null);
      if r.cantidad - r.envases_devueltos <> 0 then
        insert into envases_clientes (cliente_id, producto_id, cantidad)
        select cliente_id, r.producto_id, (r.cantidad - r.envases_devueltos) from pedidos where id = p_pedido
        on conflict (cliente_id, producto_id)
        do update set cantidad = envases_clientes.cantidad + excluded.cantidad;
      end if;
    elsif r.ptipo = 'accesorio' then
      perform aplicar_stock(r.producto_id, v_dep, -r.cantidad, 0, 'venta', v_num, null);
    end if;
  end loop;

  update pedidos set estado = 'confirmado' where id = p_pedido;
end; $$;

-- Entregar pedido: cobra (caja) o debita en cuenta corriente
create or replace function entregar_pedido(p_pedido bigint, p_metodo metodo_pago)
returns void language plpgsql security definer set search_path = erp, public as $$
declare v record;
begin
  select * into v from pedidos where id = p_pedido for update;
  if not found then raise exception 'Pedido inexistente'; end if;
  if v.estado not in ('confirmado','en_reparto') then
    raise exception 'El pedido debe estar confirmado o en reparto';
  end if;

  if p_metodo = 'cuenta_corriente' then
    insert into movimientos_cc (cliente_id, concepto, debe, referencia)
    values (v.cliente_id, 'Pedido ' || v.numero, v.total, v.numero);
  else
    insert into caja_movimientos (tipo, concepto, monto, metodo, referencia)
    values ('ingreso', 'Cobro pedido ' || v.numero, v.total, p_metodo, v.numero);
  end if;

  update pedidos set estado = 'entregado', metodo_pago = p_metodo, entregado_at = now()
  where id = p_pedido;
end; $$;

-- Cancelar pedido: si estaba confirmado, repone stock y revierte canje
create or replace function cancelar_pedido(p_pedido bigint)
returns void language plpgsql security definer set search_path = erp, public as $$
declare v record; r record;
begin
  select * into v from pedidos where id = p_pedido for update;
  if v.estado = 'entregado' then raise exception 'No se puede cancelar un pedido entregado'; end if;
  if v.estado in ('confirmado','en_reparto') then
    for r in select pi.*, p.tipo as ptipo from pedido_items pi join productos p on p.id = pi.producto_id
             where pi.pedido_id = p_pedido loop
      if r.ptipo in ('garrafa','cilindro') then
        perform aplicar_stock(r.producto_id, v.deposito_id, r.cantidad, -r.envases_devueltos, 'ajuste', v.numero, 'Cancelación');
        update envases_clientes set cantidad = cantidad - (r.cantidad - r.envases_devueltos)
        where cliente_id = v.cliente_id and producto_id = r.producto_id;
      elsif r.ptipo = 'accesorio' then
        perform aplicar_stock(r.producto_id, v.deposito_id, r.cantidad, 0, 'ajuste', v.numero, 'Cancelación');
      end if;
    end loop;
  end if;
  update pedidos set estado = 'cancelado', ruta_id = null where id = p_pedido;
end; $$;

-- Registrar cobranza: crédito en CC + ingreso en caja (si no es CC interna)
create or replace function registrar_cobranza(
  p_cliente bigint, p_monto numeric, p_metodo metodo_pago, p_referencia text default null, p_notas text default null
) returns bigint language plpgsql security definer set search_path = erp, public as $$
declare v_id bigint;
begin
  insert into cobranzas (cliente_id, monto, metodo, referencia, notas, usuario_id)
  values (p_cliente, p_monto, p_metodo, p_referencia, p_notas, auth.uid()) returning id into v_id;

  insert into movimientos_cc (cliente_id, concepto, haber, referencia, usuario_id)
  values (p_cliente, 'Cobranza #' || v_id, p_monto, p_referencia, auth.uid());

  insert into caja_movimientos (tipo, concepto, monto, metodo, referencia, usuario_id)
  values ('ingreso', 'Cobranza cliente #' || p_cliente, p_monto, p_metodo, 'COB-' || v_id, auth.uid());
  return v_id;
end; $$;

-- Recibir compra: suma stock de llenas y registra movimiento
create or replace function recibir_compra(p_compra bigint)
returns void language plpgsql security definer set search_path = erp, public as $$
declare v record; r record; v_dep bigint;
begin
  select * into v from compras where id = p_compra for update;
  if v.estado <> 'confirmada' then raise exception 'La compra debe estar confirmada'; end if;
  v_dep := coalesce(v.deposito_id, (select id from depositos order by id limit 1));
  for r in select * from compra_items where compra_id = p_compra loop
    perform aplicar_stock(r.producto_id, v_dep, r.cantidad, 0, 'compra', v.numero, null);
    update productos set costo = r.costo_unitario where id = r.producto_id;
  end loop;
  update compras set estado = 'recibida', deposito_id = v_dep where id = p_compra;
end; $$;

-- Crear factura desde un pedido entregado (numeración automática)
create or replace function facturar_pedido(p_pedido bigint, p_tipo tipo_comprobante)
returns bigint language plpgsql security definer set search_path = erp, public as $$
declare v record; v_pv int; v_num int; v_fac bigint;
declare v_n21 numeric := 0; v_i21 numeric := 0; v_n105 numeric := 0; v_i105 numeric := 0;
begin
  select * into v from pedidos where id = p_pedido;
  if not found then raise exception 'Pedido inexistente'; end if;
  select punto_venta into v_pv from empresa where id = 1;
  v_num := siguiente_numero_factura(p_tipo, v_pv);

  select coalesce(sum(case when iva_alicuota = 21 then subtotal end),0),
         coalesce(sum(case when iva_alicuota = 21 then round(subtotal*0.21,2) end),0),
         coalesce(sum(case when iva_alicuota = 10.5 then subtotal end),0),
         coalesce(sum(case when iva_alicuota = 10.5 then round(subtotal*0.105,2) end),0)
    into v_n21, v_i21, v_n105, v_i105
    from pedido_items where pedido_id = p_pedido;

  insert into facturas (tipo, punto_venta, numero, cliente_id, pedido_id, neto_21, iva_21, neto_105, iva_105, total, usuario_id)
  values (p_tipo, v_pv, v_num, v.cliente_id, p_pedido, v_n21, v_i21, v_n105, v_i105, v_n21+v_i21+v_n105+v_i105, auth.uid())
  returning id into v_fac;

  insert into factura_items (factura_id, descripcion, cantidad, precio_unitario, iva_alicuota)
  select v_fac, pr.nombre, pi.cantidad, pi.precio_unitario, pi.iva_alicuota
  from pedido_items pi join productos pr on pr.id = pi.producto_id
  where pi.pedido_id = p_pedido;

  return v_fac;
end; $$;

-- ============================================================
-- VISTAS DE REPORTE
-- ============================================================
create or replace view v_saldos_clientes as
select c.id as cliente_id, c.nombre,
       coalesce(sum(m.debe),0) - coalesce(sum(m.haber),0) as saldo
from clientes c left join movimientos_cc m on m.cliente_id = c.id
group by c.id, c.nombre;

create or replace view v_stock_actual as
select s.producto_id, p.codigo, p.nombre, p.tipo, p.capacidad_kg,
       s.deposito_id, d.nombre as deposito, s.llenas, s.vacias, s.minimo,
       (s.llenas <= s.minimo) as critico
from stock s
join productos p on p.id = s.producto_id
join depositos d on d.id = s.deposito_id;

create or replace view v_ventas_diarias as
select date_trunc('day', fecha)::date as dia,
       count(*) as pedidos,
       coalesce(sum(total),0) as total
from pedidos
where estado in ('confirmado','en_reparto','entregado')
group by 1 order by 1;

create or replace view v_libro_iva_ventas as
select f.fecha, f.tipo, f.punto_venta, f.numero,
       c.nombre as cliente, c.cuit_dni, c.condicion,
       f.neto_21, f.iva_21, f.neto_105, f.iva_105, f.exento, f.total, f.estado
from facturas f join clientes c on c.id = f.cliente_id
order by f.fecha, f.tipo, f.numero;

create or replace view v_libro_iva_compras as
select g.fecha, 'gasto' as origen, p.nombre as proveedor, g.descripcion,
       g.neto, g.iva, g.total
from gastos g left join proveedores p on p.id = g.proveedor_id
union all
select co.fecha, 'compra' as origen, pr.nombre, 'OC ' || co.numero,
       co.subtotal, co.iva, co.total
from compras co join proveedores pr on pr.id = co.proveedor_id
where co.estado = 'recibida'
order by 1;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
create or replace function rol_actual()
returns rol_usuario language sql stable security definer set search_path = erp, public as $$
  select rol from perfiles where id = auth.uid() and activo;
$$;

create or replace function es_usuario_activo()
returns boolean language sql stable security definer set search_path = erp, public as $$
  select exists (select 1 from perfiles where id = auth.uid() and activo);
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'perfiles','empresa','listas_precios','clientes','proveedores','productos','precios_productos',
    'depositos','vehiculos','stock','movimientos_stock','envases_clientes','rutas_reparto',
    'pedidos','pedido_items','movimientos_cc','caja_movimientos','cobranzas','gastos',
    'compras','compra_items','facturas','factura_items'
  ] loop
    execute format('alter table erp.%I enable row level security', t);
    execute format('create policy "lectura_equipo" on erp.%I for select using (erp.es_usuario_activo())', t);
  end loop;
end $$;

-- Escritura: admin/ventas/contable sobre operatoria; choferes solo actualizan pedidos y rutas
do $$
declare t text;
begin
  foreach t in array array[
    'listas_precios','clientes','proveedores','productos','precios_productos','depositos','vehiculos',
    'stock','movimientos_stock','envases_clientes','pedidos','pedido_items','movimientos_cc',
    'caja_movimientos','cobranzas','gastos','compras','compra_items','facturas','factura_items','rutas_reparto'
  ] loop
    execute format(
      'create policy "escritura_operativa" on erp.%I for all using (erp.rol_actual() in (''admin'',''ventas'',''contable'')) with check (erp.rol_actual() in (''admin'',''ventas'',''contable''))', t);
  end loop;
end $$;

create policy "chofer_actualiza_pedidos" on erp.pedidos for update
  using (rol_actual() = 'chofer') with check (rol_actual() = 'chofer');
create policy "chofer_actualiza_rutas" on erp.rutas_reparto for update
  using (rol_actual() = 'chofer') with check (rol_actual() = 'chofer');

create policy "perfil_propio_update" on erp.perfiles for update
  using (id = auth.uid() or rol_actual() = 'admin')
  with check (id = auth.uid() or rol_actual() = 'admin');
create policy "empresa_admin" on erp.empresa for all
  using (rol_actual() = 'admin') with check (rol_actual() = 'admin');
create policy "empresa_insert_admin" on erp.empresa for insert with check (rol_actual() = 'admin');

-- ============================================================
-- PERMISOS para exponer el schema "erp" vía la API de Supabase
-- (RLS sigue mandando: estos grants solo habilitan el acceso base)
-- ============================================================
grant usage on schema erp to anon, authenticated, service_role;
grant all on all tables in schema erp to anon, authenticated, service_role;
grant all on all routines in schema erp to anon, authenticated, service_role;
grant all on all sequences in schema erp to anon, authenticated, service_role;
alter default privileges in schema erp grant all on tables to anon, authenticated, service_role;
alter default privileges in schema erp grant all on routines to anon, authenticated, service_role;
alter default privileges in schema erp grant all on sequences to anon, authenticated, service_role;

-- ============================================================
-- OPCIONAL: usar un usuario YA existente (p. ej. el de tu app de
-- reparto) como ADMIN del ERP. Descomentá y poné tu email:
-- ============================================================
-- insert into erp.perfiles (id, nombre, rol)
-- select id, coalesce(raw_user_meta_data->>'nombre', split_part(email,'@',1)), 'admin'
-- from auth.users where email = 'TU_EMAIL_ACA'
-- on conflict (id) do update set rol = 'admin', activo = true;
