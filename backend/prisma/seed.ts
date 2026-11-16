import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de CarWash Pro (PostgreSQL)...');

  await prisma.empresaConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombre: 'CarWash Pro',
      razon_social: 'CarWash Pro S.A.C.',
      ruc: '20123456789',
      direccion: 'Av. Principal 123, Lima',
      telefono: '999888777',
      email: 'contacto@carwashpro.pe',
      moneda_codigo: 'PEN',
      moneda_simbolo: 'S/',
      simbolo_posicion: 'antes',
      decimales: 2,
      sep_decimal: '.',
      sep_miles: ',',
      impuesto_nombre: 'IGV',
      impuesto_porcentaje: 18,
      precios_incluyen_impuesto: 1,
      zona_horaria: 'America/Lima',
      formato_fecha: 'd/m/Y',
      prefijo_orden: 'OS-',
      pie_ticket: 'Gracias por su preferencia',
    },
  });

  const roles = [
    { id: 1, nombre: 'Administrador', permisos: '*' },
    { id: 2, nombre: 'Cajero', permisos: 'dashboard,ordenes,citas,caja,clientes,vehiculos' },
    {
      id: 3,
      nombre: 'Supervisor',
      permisos:
        'dashboard,ordenes,citas,caja,clientes,vehiculos,servicios,productos,proveedores,empleados,gastos,reportes',
    },
  ];
  for (const r of roles) {
    await prisma.rol.upsert({
      where: { nombre: r.nombre },
      update: { permisos: r.permisos },
      create: { nombre: r.nombre, permisos: r.permisos },
    });
  }

  const adminRole = await prisma.rol.findUnique({ where: { nombre: 'Administrador' } });
  const passwordHash = await bcrypt.hash('admin123', 10);
  await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      nombre: 'Administrador General',
      usuario: 'admin',
      email: 'admin@carwash.pe',
      password: passwordHash,
      rol_id: adminRole.id,
      estado: 1,
    },
  });

  await prisma.crmConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      programa_activo: 1,
      monto_por_punto: 10,
      valor_punto: 0.5,
      puntos_minimo: 50,
      puntos_desde: new Date(),
      vip_visitas: 10,
      vip_monto: 1000,
      dias_riesgo: 45,
      dias_inactivo: 90,
      prefijo_pais: '51',
      msg_cumple:
        'Hola {nombre} 🎂 ¡Feliz cumpleaños de parte de {empresa}! Te regalamos un descuento especial: usa el cupón {cupon} en tu próximo lavado.',
      msg_riesgo:
        'Hola {nombre}, te extrañamos en {empresa} 🚗✨ Hace tiempo que no vienes. Tienes {puntos} puntos acumulados. ¡Te esperamos!',
      msg_encuesta:
        'Hola {nombre}, gracias por visitar {empresa}. ¿Nos regalas 1 minuto para calificar tu servicio? {enlace}',
    },
  });

  await prisma.asistenciaConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hora_entrada: '08:00:00',
      hora_salida: '17:00:00',
      tolerancia: 10,
      dias_laborales: '1,2,3,4,5,6',
      dias_mes: 30,
      desc_tardanza: 1,
    },
  });

  for (const s of [
    { tipo: 'boleta', serie: 'B001' },
    { tipo: 'factura', serie: 'F001' },
    { tipo: 'nota_venta', serie: 'NV01' },
  ]) {
    await prisma.comprobanteSerie.upsert({
      where: { tipo: s.tipo },
      update: {},
      create: { tipo: s.tipo, serie: s.serie, correlativo: 0 },
    });
  }

  const countTipos = await prisma.tipoVehiculo.count();
  if (countTipos === 0) {
    await prisma.tipoVehiculo.createMany({
      data: [
        { nombre: 'Auto' },
        { nombre: 'SUV / Camioneta' },
        { nombre: 'Pickup' },
        { nombre: 'Moto' },
        { nombre: 'Furgoneta / Van' },
      ],
    });
  }

  const countCat = await prisma.categoriaServicio.count();
  if (countCat === 0) {
    await prisma.categoriaServicio.createMany({
      data: [{ nombre: 'Lavado' }, { nombre: 'Detallado' }, { nombre: 'Mantenimiento' }],
    });
  }

  const countServ = await prisma.servicio.count();
  if (countServ === 0) {
    const cats = await prisma.categoriaServicio.findMany({ orderBy: { id: 'asc' } });
    const c1 = cats[0]?.id || 1;
    const c2 = cats[1]?.id || 2;
    const c3 = cats[2]?.id || 3;
    const s1 = await prisma.servicio.create({
      data: { categoria_id: c1, nombre: 'Lavado Express', descripcion: 'Lavado exterior y secado', precio: 15, duracion_min: 20, comision_pct: 10 },
    });
    const s2 = await prisma.servicio.create({
      data: { categoria_id: c1, nombre: 'Lavado Completo', descripcion: 'Exterior, interior y aspirado', precio: 30, duracion_min: 45, comision_pct: 10 },
    });
    await prisma.servicio.createMany({
      data: [
        { categoria_id: c1, nombre: 'Lavado de Motor', descripcion: 'Desengrase y lavado de motor', precio: 25, duracion_min: 30, comision_pct: 10 },
        { categoria_id: c2, nombre: 'Encerado', descripcion: 'Cera protectora y brillo', precio: 45, duracion_min: 40, comision_pct: 12 },
        { categoria_id: c2, nombre: 'Pulido de Faros', descripcion: 'Restauración de faros opacos', precio: 40, duracion_min: 35, comision_pct: 12 },
        { categoria_id: c2, nombre: 'Lavado de Tapicería', descripcion: 'Limpieza profunda de asientos', precio: 80, duracion_min: 90, comision_pct: 12 },
        { categoria_id: c3, nombre: 'Tratamiento Cerámico', descripcion: 'Protección cerámica de pintura', precio: 250, duracion_min: 180, comision_pct: 8 },
      ],
    });
    const tipos = await prisma.tipoVehiculo.findMany({ orderBy: { id: 'asc' } });
    if (tipos.length >= 5) {
      await prisma.servicioPrecio.createMany({
        data: [
          { servicio_id: s1.id, tipo_vehiculo_id: tipos[0].id, precio: 15 },
          { servicio_id: s1.id, tipo_vehiculo_id: tipos[1].id, precio: 20 },
          { servicio_id: s1.id, tipo_vehiculo_id: tipos[2].id, precio: 22 },
          { servicio_id: s1.id, tipo_vehiculo_id: tipos[3].id, precio: 10 },
          { servicio_id: s1.id, tipo_vehiculo_id: tipos[4].id, precio: 25 },
          { servicio_id: s2.id, tipo_vehiculo_id: tipos[0].id, precio: 30 },
          { servicio_id: s2.id, tipo_vehiculo_id: tipos[1].id, precio: 40 },
          { servicio_id: s2.id, tipo_vehiculo_id: tipos[2].id, precio: 45 },
          { servicio_id: s2.id, tipo_vehiculo_id: tipos[3].id, precio: 20 },
          { servicio_id: s2.id, tipo_vehiculo_id: tipos[4].id, precio: 50 },
        ],
      });
    }
  }

  if ((await prisma.empleado.count()) === 0) {
    await prisma.empleado.createMany({
      data: [
        { nombre: 'Carlos Ramírez', documento: '45123456', telefono: '987654321', cargo: 'Lavador', sueldo: 1200, comision_pct: 10, fecha_ingreso: new Date() },
        { nombre: 'Luis Torres', documento: '46234567', telefono: '976543210', cargo: 'Lavador', sueldo: 1200, comision_pct: 10, fecha_ingreso: new Date() },
        { nombre: 'Miguel Flores', documento: '47345678', telefono: '965432109', cargo: 'Detallador', sueldo: 1500, comision_pct: 12, fecha_ingreso: new Date() },
      ],
    });
  }

  if ((await prisma.proveedor.count()) === 0) {
    const prov = await prisma.proveedor.create({
      data: { nombre: 'Distribuidora AutoQuímica', ruc: '20123456789', contacto: 'Ventas', telefono: '014567890' },
    });
    await prisma.producto.createMany({
      data: [
        { codigo: 'SH-001', nombre: 'Shampoo automotriz (galón)', proveedor_id: prov.id, unidad: 'GL', precio_compra: 35, precio_venta: 0, stock: 10, stock_minimo: 3, se_vende: 0 },
        { codigo: 'CE-001', nombre: 'Cera líquida 500ml', proveedor_id: prov.id, unidad: 'UND', precio_compra: 18, precio_venta: 35, stock: 12, stock_minimo: 4, se_vende: 1 },
        { codigo: 'AM-001', nombre: 'Ambientador de auto', proveedor_id: prov.id, unidad: 'UND', precio_compra: 3, precio_venta: 8, stock: 40, stock_minimo: 10, se_vende: 1 },
      ],
    });
  }

  console.log('✅ Seed completado con éxito. Usuario: admin / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
