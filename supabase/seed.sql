set search_path = erp, public;

-- ============================================================
-- NorteGAS ERP · Datos iniciales (ejecutar después de schema.sql)
-- ============================================================

insert into empresa (id, razon_social, cuit, condicion, domicilio, punto_venta, alicuota_iibb)
values (1, 'NorteGAS', '20-00000000-0', 'responsable_inscripto', 'General Ramírez, Entre Ríos', 1, 3.50)
on conflict (id) do nothing;

insert into listas_precios (nombre) values ('Mostrador'), ('Reparto'), ('Mayorista');

insert into depositos (nombre) values ('Depósito Central');

insert into proveedores (nombre, cuit, condicion) values
 ('ExtraGAS', '30-00000000-0', 'responsable_inscripto'),
 ('YPF GAS',  '30-11111111-1', 'responsable_inscripto');

insert into vehiculos (patente, descripcion, capacidad_garrafas) values
 ('AA000AA', 'Camioneta de reparto', 80);

-- Productos típicos del rubro (IVA GLP envasado 10,5% · accesorios 21%)
insert into productos (codigo, nombre, tipo, capacidad_kg, marca, costo, iva_alicuota, requiere_envase) values
 ('G10-EX', 'Garrafa 10 kg ExtraGAS', 'garrafa', 10, 'ExtraGAS', 9000, 10.5, true),
 ('G15-EX', 'Garrafa 15 kg ExtraGAS', 'garrafa', 15, 'ExtraGAS', 13500, 10.5, true),
 ('G10-YPF','Garrafa 10 kg YPF GAS',  'garrafa', 10, 'YPF GAS', 9200, 10.5, true),
 ('C45',    'Cilindro 45 kg',          'cilindro', 45, 'ExtraGAS', 40000, 10.5, true),
 ('REG-01', 'Regulador de gas',        'accesorio', null, null, 8000, 21, false),
 ('MAN-2M', 'Manguera 2 m con abrazaderas', 'accesorio', null, null, 3500, 21, false),
 ('FLETE',  'Servicio de entrega',     'servicio', null, null, 0, 21, false);

-- Precios por lista (Mostrador / Reparto / Mayorista)
insert into precios_productos (lista_id, producto_id, precio)
select l.id, p.id,
  case
    when p.codigo = 'G10-EX'  and l.nombre = 'Mostrador' then 14000
    when p.codigo = 'G10-EX'  and l.nombre = 'Reparto'   then 15500
    when p.codigo = 'G10-EX'  and l.nombre = 'Mayorista' then 12500
    when p.codigo = 'G15-EX'  and l.nombre = 'Mostrador' then 20500
    when p.codigo = 'G15-EX'  and l.nombre = 'Reparto'   then 22500
    when p.codigo = 'G15-EX'  and l.nombre = 'Mayorista' then 18500
    when p.codigo = 'G10-YPF' and l.nombre = 'Mostrador' then 14500
    when p.codigo = 'G10-YPF' and l.nombre = 'Reparto'   then 16000
    when p.codigo = 'G10-YPF' and l.nombre = 'Mayorista' then 13000
    when p.codigo = 'C45'     and l.nombre = 'Mostrador' then 62000
    when p.codigo = 'C45'     and l.nombre = 'Reparto'   then 66000
    when p.codigo = 'C45'     and l.nombre = 'Mayorista' then 57000
    when p.codigo = 'REG-01'  then 14000
    when p.codigo = 'MAN-2M'  then 6500
    when p.codigo = 'FLETE'   and l.nombre = 'Reparto' then 1500
    else 0
  end
from listas_precios l cross join productos p;

-- Stock inicial en Depósito Central
insert into stock (producto_id, deposito_id, llenas, vacias, minimo)
select p.id, d.id,
  case p.codigo when 'G10-EX' then 120 when 'G15-EX' then 60 when 'G10-YPF' then 80 when 'C45' then 15
                when 'REG-01' then 25 when 'MAN-2M' then 40 else 0 end,
  case p.codigo when 'G10-EX' then 30 when 'G15-EX' then 10 when 'G10-YPF' then 20 when 'C45' then 5 else 0 end,
  case p.codigo when 'G10-EX' then 30 when 'G15-EX' then 15 when 'G10-YPF' then 20 when 'C45' then 4 else 0 end
from productos p cross join depositos d;

-- Clientes de ejemplo
insert into clientes (nombre, cuit_dni, condicion, tipo, telefono, direccion, zona_reparto, lista_precio_id) values
 ('Consumidor Final Mostrador', null, 'consumidor_final', 'particular', null, null, null, (select id from listas_precios where nombre='Mostrador')),
 ('Rotisería El Buen Sabor', '30-22222222-2', 'responsable_inscripto', 'comercio', '343-5550001', 'San Martín 450', 'Centro', (select id from listas_precios where nombre='Reparto')),
 ('Panadería La Espiga', '27-33333333-3', 'monotributo', 'comercio', '343-5550002', 'Urquiza 1200', 'Norte', (select id from listas_precios where nombre='Reparto')),
 ('María González', '30123456', 'consumidor_final', 'particular', '343-5550003', 'Belgrano 890', 'Sur', (select id from listas_precios where nombre='Reparto'));
