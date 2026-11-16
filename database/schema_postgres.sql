
CREATE TABLE IF NOT EXISTS empresa_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  nombre VARCHAR(150) NOT NULL DEFAULT 'Mi Carwash',
  razon_social VARCHAR(180) NULL,
  ruc VARCHAR(30) NULL,
  direccion VARCHAR(255) NULL,
  telefono VARCHAR(40) NULL,
  email VARCHAR(120) NULL,
  web VARCHAR(150) NULL,
  logo VARCHAR(255) NULL,
  moneda_codigo VARCHAR(5) NOT NULL DEFAULT 'PEN',
  moneda_simbolo VARCHAR(8) NOT NULL DEFAULT 'S/',
  simbolo_posicion VARCHAR(10) NOT NULL DEFAULT 'antes',
  decimales SMALLINT NOT NULL DEFAULT 2,
  sep_decimal CHAR(1) NOT NULL DEFAULT '.',
  sep_miles CHAR(1) NOT NULL DEFAULT ',',
  impuesto_nombre VARCHAR(20) NOT NULL DEFAULT 'IGV',
  impuesto_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 18.00,
  precios_incluyen_impuesto SMALLINT NOT NULL DEFAULT 1,
  zona_horaria VARCHAR(50) NOT NULL DEFAULT 'America/Lima',
  formato_fecha VARCHAR(20) NOT NULL DEFAULT 'd/m/Y',
  prefijo_orden VARCHAR(10) NOT NULL DEFAULT 'OS-',
  pie_ticket VARCHAR(255) NULL DEFAULT 'Gracias por su preferencia',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  permisos TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) NULL,
  password VARCHAR(255) NOT NULL,
  rol_id INT NOT NULL REFERENCES roles(id),
  estado SMALLINT NOT NULL DEFAULT 1,
  ultimo_acceso TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  tipo_doc VARCHAR(10) NOT NULL DEFAULT 'DNI',
  nro_doc VARCHAR(20) NULL,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(200) NULL,
  notas TEXT NULL,
  fecha_nacimiento DATE NULL,
  acepta_marketing SMALLINT NOT NULL DEFAULT 1,
  estado SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_vehiculo (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vehiculos (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  placa VARCHAR(15) NOT NULL,
  marca VARCHAR(50) NULL,
  modelo VARCHAR(50) NULL,
  color VARCHAR(30) NULL,
  anio SMALLINT NULL,
  tipo_vehiculo_id INT NULL REFERENCES tipos_vehiculo(id) ON DELETE SET NULL,
  notas VARCHAR(255) NULL,
  estado SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categorias_servicio (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS servicios (
  id SERIAL PRIMARY KEY,
  categoria_id INT NULL REFERENCES categorias_servicio(id) ON DELETE SET NULL,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  duracion_min INT NOT NULL DEFAULT 30,
  comision_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS servicio_precios (
  servicio_id INT NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
  tipo_vehiculo_id INT NOT NULL REFERENCES tipos_vehiculo(id) ON DELETE CASCADE,
  precio NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (servicio_id, tipo_vehiculo_id)
);

CREATE TABLE IF NOT EXISTS empleados (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  documento VARCHAR(20) NULL,
  telefono VARCHAR(30) NULL,
  cargo VARCHAR(60) NOT NULL DEFAULT 'Lavador',
  sueldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  comision_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  fecha_ingreso DATE NULL,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS proveedores (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  ruc VARCHAR(20) NULL,
  contacto VARCHAR(100) NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  direccion VARCHAR(200) NULL,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NULL,
  nombre VARCHAR(150) NOT NULL,
  proveedor_id INT NULL REFERENCES proveedores(id) ON DELETE SET NULL,
  unidad VARCHAR(20) NOT NULL DEFAULT 'UND',
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 0,
  se_vende SMALLINT NOT NULL DEFAULT 1,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id SERIAL PRIMARY KEY,
  producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  cantidad NUMERIC(12,2) NOT NULL,
  motivo VARCHAR(150) NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordenes (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'servicio',
  cliente_id INT NULL REFERENCES clientes(id) ON DELETE SET NULL,
  vehiculo_id INT NULL REFERENCES vehiculos(id) ON DELETE SET NULL,
  empleado_id INT NULL REFERENCES empleados(id) ON DELETE SET NULL,
  usuario_id INT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(20) NULL,
  pagado SMALLINT NOT NULL DEFAULT 0,
  fecha_pago TIMESTAMPTZ NULL,
  observaciones VARCHAR(255) NULL,
  fecha_ingreso TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_fin TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha_ingreso ON ordenes(fecha_ingreso);

CREATE TABLE IF NOT EXISTS orden_detalle (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  item_id INT NOT NULL,
  descripcion VARCHAR(180) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS citas (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vehiculo_id INT NULL REFERENCES vehiculos(id) ON DELETE SET NULL,
  servicio_id INT NULL REFERENCES servicios(id) ON DELETE SET NULL,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'programada',
  notas VARCHAR(255) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cajas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,
  monto_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_final NUMERIC(12,2) NULL,
  monto_esperado NUMERIC(12,2) NULL,
  fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_cierre TIMESTAMPTZ NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
  observaciones VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS gastos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL,
  categoria VARCHAR(60) NOT NULL DEFAULT 'Otros',
  concepto VARCHAR(180) NOT NULL,
  monto NUMERIC(12,2) NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bitacora (
  id SERIAL PRIMARY KEY,
  usuario_id INT NULL,
  usuario VARCHAR(50) NULL,
  accion VARCHAR(60) NOT NULL,
  detalle VARCHAR(255) NULL,
  ip VARCHAR(45) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS paquetes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  descripcion VARCHAR(255) NULL,
  servicio_id INT NOT NULL REFERENCES servicios(id),
  usos INT NOT NULL DEFAULT 4,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  vigencia_dias INT NOT NULL DEFAULT 90,
  estado SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cliente_paquetes (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  paquete_id INT NOT NULL REFERENCES paquetes(id),
  servicio_id INT NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  usos_total INT NOT NULL,
  usos_restantes INT NOT NULL,
  precio_pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pago VARCHAR(20) NOT NULL DEFAULT 'efectivo',
  fecha_compra TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vence DATE NULL,
  usuario_id INT NULL
);

CREATE TABLE IF NOT EXISTS orden_paquete_uso (
  orden_id INT NOT NULL PRIMARY KEY REFERENCES ordenes(id) ON DELETE CASCADE,
  cliente_paquete_id INT NOT NULL REFERENCES cliente_paquetes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS compras (
  id SERIAL PRIMARY KEY,
  proveedor_id INT NULL REFERENCES proveedores(id) ON DELETE SET NULL,
  fecha DATE NOT NULL,
  nro_doc VARCHAR(40) NULL,
  condicion VARCHAR(20) NOT NULL DEFAULT 'contado',
  vence DATE NULL,
  pagado NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas VARCHAR(255) NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS compra_detalle (
  id SERIAL PRIMARY KEY,
  compra_id INT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  producto_id INT NOT NULL REFERENCES productos(id),
  cantidad NUMERIC(12,2) NOT NULL,
  costo NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS comisiones_pagos (
  id SERIAL PRIMARY KEY,
  empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  desde DATE NOT NULL,
  hasta DATE NOT NULL,
  ventas NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto NUMERIC(12,2) NOT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ia_config (
  clave VARCHAR(40) PRIMARY KEY,
  valor TEXT NULL
);

CREATE TABLE IF NOT EXISTS ia_consultas (
  id SERIAL PRIMARY KEY,
  usuario_id INT NOT NULL,
  pregunta VARCHAR(500) NOT NULL,
  titulo VARCHAR(160) NULL,
  sql_texto TEXT NOT NULL,
  grafico VARCHAR(255) NULL,
  favorito SMALLINT NOT NULL DEFAULT 0,
  veces INT NOT NULL DEFAULT 1,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  ultimo_uso TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ia_consultas_user_fav ON ia_consultas(usuario_id, favorito);

CREATE TABLE IF NOT EXISTS crm_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  programa_activo SMALLINT NOT NULL DEFAULT 1,
  monto_por_punto NUMERIC(10,2) NOT NULL DEFAULT 10,
  valor_punto NUMERIC(10,2) NOT NULL DEFAULT 0.50,
  puntos_minimo INT NOT NULL DEFAULT 50,
  puntos_desde DATE NULL,
  vip_visitas INT NOT NULL DEFAULT 10,
  vip_monto NUMERIC(12,2) NOT NULL DEFAULT 1000,
  dias_riesgo INT NOT NULL DEFAULT 45,
  dias_inactivo INT NOT NULL DEFAULT 90,
  prefijo_pais VARCHAR(5) NOT NULL DEFAULT '51',
  msg_cumple TEXT NULL,
  msg_riesgo TEXT NULL,
  msg_encuesta TEXT NULL
);

CREATE TABLE IF NOT EXISTS crm_puntos (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  orden_id INT NULL,
  tipo VARCHAR(20) NOT NULL,
  puntos INT NOT NULL,
  detalle VARCHAR(200) NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (orden_id, tipo)
);
CREATE INDEX IF NOT EXISTS idx_crm_puntos_cliente ON crm_puntos(cliente_id);

CREATE TABLE IF NOT EXISTS crm_cupones (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  descripcion VARCHAR(150) NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'porcentaje',
  valor NUMERIC(10,2) NOT NULL,
  cliente_id INT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  vigente_hasta DATE NULL,
  usos_max INT NOT NULL DEFAULT 1,
  usos INT NOT NULL DEFAULT 0,
  estado SMALLINT NOT NULL DEFAULT 1,
  origen VARCHAR(20) NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_interacciones (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL DEFAULT 'nota',
  asunto VARCHAR(150) NOT NULL,
  detalle TEXT NULL,
  seguimiento_fecha DATE NULL,
  seguimiento_hecho SMALLINT NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_oportunidades (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(120) NULL,
  interes VARCHAR(150) NULL,
  origen VARCHAR(40) NULL,
  valor_est NUMERIC(12,2) NOT NULL DEFAULT 0,
  etapa VARCHAR(20) NOT NULL DEFAULT 'nuevo',
  cliente_id INT NULL REFERENCES clientes(id) ON DELETE SET NULL,
  notas TEXT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campanas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  segmento VARCHAR(30) NOT NULL,
  canal VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  mensaje TEXT NOT NULL,
  total INT NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_campana_envios (
  id SERIAL PRIMARY KEY,
  campana_id INT NOT NULL REFERENCES crm_campanas(id) ON DELETE CASCADE,
  cliente_id INT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  enviado SMALLINT NOT NULL DEFAULT 0,
  enviado_at TIMESTAMPTZ NULL,
  UNIQUE (campana_id, cliente_id)
);

CREATE TABLE IF NOT EXISTS crm_encuestas (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL UNIQUE REFERENCES ordenes(id) ON DELETE CASCADE,
  cliente_id INT NULL,
  token VARCHAR(40) NOT NULL UNIQUE,
  puntaje SMALLINT NULL,
  recomendaria SMALLINT NULL,
  comentario VARCHAR(500) NULL,
  respondido_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orden_pagos (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  propina NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo VARCHAR(20) NOT NULL DEFAULT 'efectivo',
  referencia VARCHAR(80) NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INT NULL,
  anulado SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recepciones (
  id SERIAL PRIMARY KEY,
  orden_id INT NULL,
  cliente_id INT NULL,
  vehiculo_id INT NULL,
  placa VARCHAR(20) NOT NULL,
  combustible SMALLINT NOT NULL DEFAULT 50,
  kilometraje INT NULL,
  checklist TEXT NULL,
  danos TEXT NULL,
  fotos TEXT NULL,
  firma VARCHAR(120) NULL,
  observaciones VARCHAR(500) NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  cliente_id INT NULL,
  nombre VARCHAR(150) NULL,
  telefono VARCHAR(30) NULL,
  placa VARCHAR(20) NULL,
  tipo_vehiculo_id INT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'borrador',
  vence DATE NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  descuento NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observaciones VARCHAR(500) NULL,
  orden_id INT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cotizacion_detalle (
  id SERIAL PRIMARY KEY,
  cotizacion_id INT NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  item_id INT NOT NULL,
  descripcion VARCHAR(180) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comprobante_series (
  tipo VARCHAR(20) PRIMARY KEY,
  serie VARCHAR(6) NOT NULL,
  correlativo INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS comprobantes (
  id SERIAL PRIMARY KEY,
  orden_id INT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL,
  serie VARCHAR(6) NOT NULL,
  numero INT NOT NULL,
  doc_tipo VARCHAR(10) NULL,
  doc_numero VARCHAR(20) NULL,
  razon_social VARCHAR(150) NULL,
  direccion VARCHAR(200) NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  impuesto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  anulado SMALLINT NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tipo, serie, numero)
);

CREATE TABLE IF NOT EXISTS compra_pagos (
  id SERIAL PRIMARY KEY,
  compra_id INT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
  monto NUMERIC(12,2) NOT NULL,
  metodo VARCHAR(20) NOT NULL DEFAULT 'efectivo',
  referencia VARCHAR(80) NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id INT NULL
);

CREATE TABLE IF NOT EXISTS asistencia_config (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  hora_entrada VARCHAR(8) NOT NULL DEFAULT '08:00:00',
  hora_salida VARCHAR(8) NOT NULL DEFAULT '17:00:00',
  tolerancia INT NOT NULL DEFAULT 10,
  dias_laborales VARCHAR(20) NOT NULL DEFAULT '1,2,3,4,5,6',
  dias_mes INT NOT NULL DEFAULT 30,
  desc_tardanza SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS asistencias (
  id SERIAL PRIMARY KEY,
  empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  entrada VARCHAR(8) NULL,
  salida VARCHAR(8) NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'presente',
  min_tarde INT NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  UNIQUE (empleado_id, fecha)
);

CREATE TABLE IF NOT EXISTS planilla_adelantos (
  id SERIAL PRIMARY KEY,
  empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  motivo VARCHAR(150) NULL,
  planilla_id INT NULL,
  usuario_id INT NULL
);

CREATE TABLE IF NOT EXISTS planillas (
  id SERIAL PRIMARY KEY,
  periodo CHAR(7) NOT NULL,
  empleado_id INT NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  sueldo NUMERIC(12,2) NOT NULL DEFAULT 0,
  faltas INT NOT NULL DEFAULT 0,
  min_tarde INT NOT NULL DEFAULT 0,
  desc_faltas NUMERIC(12,2) NOT NULL DEFAULT 0,
  desc_tardanza NUMERIC(12,2) NOT NULL DEFAULT 0,
  adelantos NUMERIC(12,2) NOT NULL DEFAULT 0,
  comisiones NUMERIC(12,2) NOT NULL DEFAULT 0,
  neto NUMERIC(12,2) NOT NULL DEFAULT 0,
  usuario_id INT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (periodo, empleado_id)
);

CREATE OR REPLACE VIEW v_ia_ordenes AS
SELECT o.id AS orden_id, o.codigo, o.fecha_ingreso, DATE(o.fecha_ingreso) AS dia,
       o.fecha_pago, DATE(o.fecha_pago) AS dia_pago, COALESCE(c.nombre,'Cliente general') AS cliente,
       v.placa, TRIM(CONCAT(COALESCE(v.marca,''),' ',COALESCE(v.modelo,''))) AS vehiculo,
       tv.nombre AS tipo_vehiculo, e.nombre AS lavador, u.nombre AS cajero,
       o.estado, o.subtotal, o.descuento, o.impuesto, o.total, o.metodo_pago, o.pagado,
       EXTRACT(EPOCH FROM (o.fecha_fin - o.fecha_ingreso))::INT / 60 AS minutos_servicio
FROM ordenes o
LEFT JOIN clientes c ON c.id=o.cliente_id
LEFT JOIN vehiculos v ON v.id=o.vehiculo_id
LEFT JOIN tipos_vehiculo tv ON tv.id=v.tipo_vehiculo_id
LEFT JOIN empleados e ON e.id=o.empleado_id
LEFT JOIN usuarios u ON u.id=o.usuario_id;

CREATE OR REPLACE VIEW v_ia_detalle_ordenes AS
SELECT d.orden_id, o.codigo, o.fecha_ingreso, DATE(o.fecha_ingreso) AS dia,
       o.fecha_pago, DATE(o.fecha_pago) AS dia_pago, d.tipo, d.descripcion AS item,
       CASE WHEN d.tipo='servicio' THEN COALESCE(cs.nombre,'Sin categoría') ELSE 'Producto' END AS categoria,
       d.cantidad, d.precio, d.subtotal AS importe, e.nombre AS lavador,
       COALESCE(cl.nombre,'Cliente general') AS cliente, o.estado AS estado_orden, o.pagado, o.metodo_pago
FROM orden_detalle d
JOIN ordenes o ON o.id=d.orden_id
LEFT JOIN servicios s ON d.tipo='servicio' AND s.id=d.item_id
LEFT JOIN categorias_servicio cs ON cs.id=s.categoria_id
LEFT JOIN empleados e ON e.id=o.empleado_id
LEFT JOIN clientes cl ON cl.id=o.cliente_id;

CREATE OR REPLACE VIEW v_ia_clientes AS
SELECT c.id AS cliente_id, c.nombre, c.tipo_doc, c.nro_doc AS documento, c.telefono, c.email,
       c.estado AS activo, c.created_at AS creado_en,
       (SELECT COUNT(*) FROM ordenes o WHERE o.cliente_id=c.id AND o.estado<>'cancelado') AS num_visitas,
       (SELECT COALESCE(SUM(o.total),0) FROM ordenes o WHERE o.cliente_id=c.id AND o.pagado=1 AND o.estado<>'cancelado') AS total_gastado,
       (SELECT MAX(o.fecha_ingreso) FROM ordenes o WHERE o.cliente_id=c.id AND o.estado<>'cancelado') AS ultima_visita,
       (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id=c.id) AS num_vehiculos
FROM clientes c;

CREATE OR REPLACE VIEW v_ia_vehiculos AS
SELECT v.id AS vehiculo_id, v.placa, v.marca, v.modelo, v.color, v.anio,
       tv.nombre AS tipo_vehiculo, c.nombre AS cliente, v.estado AS activo,
       (SELECT COUNT(*) FROM ordenes o WHERE o.vehiculo_id=v.id AND o.estado<>'cancelado') AS num_visitas
FROM vehiculos v
JOIN clientes c ON c.id=v.cliente_id
LEFT JOIN tipos_vehiculo tv ON tv.id=v.tipo_vehiculo_id;

CREATE OR REPLACE VIEW v_ia_servicios AS
SELECT s.id AS servicio_id, s.nombre AS servicio, COALESCE(cs.nombre,'Sin categoría') AS categoria,
       s.precio AS precio_base, s.duracion_min, s.comision_pct, s.estado AS activo,
       (SELECT COALESCE(SUM(d.cantidad),0) FROM orden_detalle d JOIN ordenes o ON o.id=d.orden_id WHERE d.tipo='servicio' AND d.item_id=s.id AND o.estado<>'cancelado') AS veces_vendido,
       (SELECT COALESCE(SUM(d.subtotal),0) FROM orden_detalle d JOIN ordenes o ON o.id=d.orden_id WHERE d.tipo='servicio' AND d.item_id=s.id AND o.estado<>'cancelado') AS total_vendido
FROM servicios s
LEFT JOIN categorias_servicio cs ON cs.id=s.categoria_id;

CREATE OR REPLACE VIEW v_ia_productos AS
SELECT p.id AS producto_id, p.codigo, p.nombre AS producto, pr.nombre AS proveedor, p.unidad,
       p.precio_compra, p.precio_venta, p.stock, p.stock_minimo,
       CASE WHEN p.stock <= p.stock_minimo THEN 1 ELSE 0 END AS stock_bajo,
       (p.stock * p.precio_compra) AS valor_costo, p.se_vende, p.estado AS activo
FROM productos p
LEFT JOIN proveedores pr ON pr.id=p.proveedor_id;

CREATE OR REPLACE VIEW v_ia_empleados AS
SELECT e.id AS empleado_id, e.nombre, e.cargo, e.sueldo, e.comision_pct, e.fecha_ingreso, e.estado AS activo,
       (SELECT COUNT(*) FROM ordenes o WHERE o.empleado_id=e.id AND o.estado<>'cancelado') AS num_ordenes,
       (SELECT COALESCE(SUM(o.total),0) FROM ordenes o WHERE o.empleado_id=e.id AND o.pagado=1 AND o.estado<>'cancelado') AS ventas_cobradas
FROM empleados e;

CREATE OR REPLACE VIEW v_ia_citas AS
SELECT ci.id AS cita_id, ci.fecha_hora, DATE(ci.fecha_hora) AS dia, c.nombre AS cliente,
       v.placa, s.nombre AS servicio, ci.estado, ci.notas
FROM citas ci
JOIN clientes c ON c.id=ci.cliente_id
LEFT JOIN vehiculos v ON v.id=ci.vehiculo_id
LEFT JOIN servicios s ON s.id=ci.servicio_id;

CREATE OR REPLACE VIEW v_ia_gastos AS
SELECT g.id AS gasto_id, g.fecha, g.categoria, g.concepto, g.monto
FROM gastos g;

CREATE OR REPLACE VIEW v_ia_compras AS
SELECT co.id AS compra_id, co.fecha, pr.nombre AS proveedor, co.nro_doc, co.total
FROM compras co
LEFT JOIN proveedores pr ON pr.id=co.proveedor_id;

CREATE OR REPLACE VIEW v_ia_detalle_compras AS
SELECT dc.compra_id, co.fecha, pr.nombre AS proveedor, p.nombre AS producto,
       dc.cantidad, dc.costo, dc.subtotal AS importe
FROM compra_detalle dc
JOIN compras co ON co.id=dc.compra_id
JOIN productos p ON p.id=dc.producto_id
LEFT JOIN proveedores pr ON pr.id=co.proveedor_id;

CREATE OR REPLACE VIEW v_ia_paquetes AS
SELECT cp.id AS venta_paquete_id, cp.fecha_compra, c.nombre AS cliente, cp.nombre AS paquete,
       s.nombre AS servicio, cp.usos_total, cp.usos_restantes, cp.precio_pagado,
       cp.metodo_pago, cp.fecha_vence,
       CASE WHEN cp.usos_restantes > 0 AND (cp.fecha_vence IS NULL OR cp.fecha_vence >= CURRENT_DATE) THEN 1 ELSE 0 END AS vigente
FROM cliente_paquetes cp
JOIN clientes c ON c.id=cp.cliente_id
JOIN servicios s ON s.id=cp.servicio_id;

CREATE OR REPLACE VIEW v_ia_cajas AS
SELECT ca.id AS caja_id, ca.fecha_apertura, ca.fecha_cierre, u.nombre AS cajero,
       ca.monto_inicial, ca.monto_esperado, ca.monto_final,
       (ca.monto_final - ca.monto_esperado) AS diferencia, ca.estado
FROM cajas ca
LEFT JOIN usuarios u ON u.id=ca.usuario_id;

CREATE OR REPLACE VIEW v_ia_movimientos_inventario AS
SELECT mi.created_at AS fecha, p.nombre AS producto, mi.tipo, mi.cantidad, mi.motivo
FROM movimientos_inventario mi
JOIN productos p ON p.id=mi.producto_id;
