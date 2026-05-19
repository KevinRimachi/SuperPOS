"use server";

import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

// Helper to get local date string YYYY-MM-DD
function getLocalDateString() {
  const date = new Date();
  // Adjust to Peruvian timezone (GMT-5)
  const offset = -5;
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const localDate = new Date(utc + 3600000 * offset);
  
  const yyyy = localDate.getFullYear();
  const mm = String(localDate.getMonth() + 1).padStart(2, "0");
  const dd = String(localDate.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to get or create today's open cash drawer
async function getOrCreateTodayCierre() {
  const todayStr = getLocalDateString();
  
  // Convert local day boundaries to absolute UTC: GMT-5 midnight is 05:00:00 UTC
  const startOfDay = new Date(new Date(`${todayStr}T00:00:00.000Z`).getTime() + 5 * 3600000);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 3600000 - 1);

  // Look for the latest closure record for today
  let cierre = await prisma.cierreDiario.findFirst({
    where: {
      fecha: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: {
      fecha: "desc",
    },
  });

  if (!cierre) {
    cierre = await prisma.cierreDiario.create({
      data: {
        fecha: new Date(),
        estado: "Abierto",
        saldo_efectivo_entregado: 0,
        saldo_yape_entregado: 0,
      },
    });
  }

  return cierre;
}

// 1. Get POS and cash drawer state
export async function getEstadoCaja() {
  const cierre = await getOrCreateTodayCierre();
  
  // Calculate current active expected totals
  const movimientos = await prisma.movimiento.findMany({
    where: {
      id_cierre_diario: cierre.id,
    },
  });

  let totalEfectivo = 0;
  let totalYape = 0;

  movimientos.forEach((m: any) => {
    if (m.tipo === "Ingreso") {
      totalEfectivo += m.ingreso_efectivo - m.salida_vuelto_efectivo;
      totalYape += m.ingreso_yape - m.salida_vuelto_yape;
    } else if (m.tipo === "Egreso") {
      totalEfectivo -= m.ingreso_efectivo;
      totalYape -= m.ingreso_yape;
    }
  });

  return {
    cierre,
    resumenActual: {
      esperadoEfectivo: Math.max(0, totalEfectivo),
      esperadoYape: Math.max(0, totalYape),
      totalEsperado: Math.max(0, totalEfectivo) + Math.max(0, totalYape),
      count: movimientos.length,
    },
  };
}

// 2. Register new movement
export async function registrarMovimiento(data: {
  categoria: string;
  tipo: string; // Ingreso, Egreso, Inversion
  monto_total: number;
  ingreso_efectivo: number;
  ingreso_yape: number;
  salida_vuelto_efectivo: number;
  salida_vuelto_yape: number;
}) {
  const { cierre } = await getEstadoCaja();

  if (cierre.estado === "Entregado") {
    throw new Error("La caja de hoy ya está cerrada y entregada. No se pueden registrar más movimientos.");
  }

  const nuevo = await prisma.movimiento.create({
    data: {
      categoria: data.categoria,
      tipo: data.tipo,
      monto_total: data.monto_total,
      ingreso_efectivo: data.ingreso_efectivo,
      ingreso_yape: data.ingreso_yape,
      salida_vuelto_efectivo: data.salida_vuelto_efectivo,
      salida_vuelto_yape: data.salida_vuelto_yape,
      id_cierre_diario: cierre.id,
      fecha: new Date(),
    },
  });

  revalidatePath("/");
  return nuevo;
}

// 3. Get movements for today
export async function getMovimientosHoy() {
  const { cierre } = await getEstadoCaja();
  return prisma.movimiento.findMany({
    where: {
      id_cierre_diario: cierre.id,
    },
    orderBy: {
      fecha: "desc",
    },
  });
}

// Get movements filtered by range (hoy, semana, mes) adjusting to Peruvian local timezone (GMT-5)
export async function getMovimientosFiltrados(rango: "hoy" | "semana" | "mes") {
  const now = new Date();
  let startDate = new Date();

  // Adjust now to Peru local time (GMT-5) to calculate local boundaries correctly
  const offset = -5;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const localNow = new Date(utc + 3600000 * offset);

  if (rango === "hoy") {
    const todayStr = getLocalDateString();
    startDate = new Date(`${todayStr}T00:00:00.000Z`);
  } else if (rango === "semana") {
    // Start of the week (Monday) in Peru local time
    const day = localNow.getDay();
    const diff = localNow.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeekLocal = new Date(localNow.setDate(diff));
    
    const yyyy = startOfWeekLocal.getFullYear();
    const mm = String(startOfWeekLocal.getMonth() + 1).padStart(2, "0");
    const dd = String(startOfWeekLocal.getDate()).padStart(2, "0");
    
    startDate = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  } else if (rango === "mes") {
    // Start of the month in Peru local time
    const yyyy = localNow.getFullYear();
    const mm = String(localNow.getMonth() + 1).padStart(2, "0");
    
    startDate = new Date(`${yyyy}-${mm}-01T00:00:00.000Z`);
  }

  // Convert the Peruvian local day start (parsed as UTC in Z) back to database absolute UTC reference.
  // Midnight in GMT-5 is 05:00:00 UTC. So we add 5 hours to the parsed date.
  const utcStartDate = new Date(startDate.getTime() + 5 * 3600000);

  return prisma.movimiento.findMany({
    where: {
      fecha: {
        gte: utcStartDate,
      },
    },
    orderBy: {
      fecha: "desc",
    },
  });
}

// 4. Close Cash Drawer (Cierre de Caja)
export async function cerrarCajaDiaria(data: {
  saldo_efectivo_entregado: number;
  saldo_yape_entregado: number;
}) {
  const { cierre } = await getEstadoCaja();

  if (cierre.estado === "Entregado") {
    throw new Error("La caja de hoy ya está cerrada.");
  }

  const cierreActualizado = await prisma.cierreDiario.update({
    where: {
      id: cierre.id,
    },
    data: {
      estado: "Entregado",
      saldo_efectivo_entregado: data.saldo_efectivo_entregado,
      saldo_yape_entregado: data.saldo_yape_entregado,
      fecha: new Date(), // finalize closing timestamp
    },
  });

  revalidatePath("/");
  return cierreActualizado;
}

export async function abrirNuevaCaja() {
  const cierre = await prisma.cierreDiario.create({
    data: {
      fecha: new Date(),
      estado: "Abierto",
      saldo_efectivo_entregado: 0,
      saldo_yape_entregado: 0,
    },
  });

  revalidatePath("/");
  return cierre;
}

// 5. Tareas del Jefe
export async function getTareasJefe() {
  return prisma.tareaJefe.findMany({
    orderBy: {
      fecha_solicitud: "desc",
    },
  });
}

export async function crearTareaJefe(descripcion: string) {
  const nueva = await prisma.tareaJefe.create({
    data: {
      descripcion,
      estado: "Pendiente",
    },
  });
  revalidatePath("/");
  return nueva;
}

export async function cotizarTareaJefe(id: string, precio_final: number, metodo_pago: "Efectivo" | "Yape") {
  const actualizada = await prisma.tareaJefe.update({
    where: { id },
    data: {
      precio_final,
      estado: "Cotizado",
    },
  });

  // Get current active cash drawer
  const { cierre } = await getEstadoCaja();

  // If the box is open, automatically record this task as a movement
  if (cierre && cierre.estado === "Abierto") {
    await prisma.movimiento.create({
      data: {
        categoria: `Trabajo Jefe: ${actualizada.descripcion.substring(0, 30)}`,
        tipo: "Ingreso",
        monto_total: precio_final,
        ingreso_efectivo: metodo_pago === "Efectivo" ? precio_final : 0,
        ingreso_yape: metodo_pago === "Yape" ? precio_final : 0,
        salida_vuelto_efectivo: 0,
        salida_vuelto_yape: 0,
        id_cierre_diario: cierre.id,
        fecha: new Date(),
      },
    });
  }

  revalidatePath("/");
  return actualizada;
}

// 6. Dashboard analytics & trends (7 days)
export async function getDashboardData() {
  // Get all closures for chart or list
  const cierres = await prisma.cierreDiario.findMany({
    take: 7,
    orderBy: {
      fecha: "desc",
    },
    include: {
      movimientos: true,
    },
  });

  // Format closures for chart (older to newer)
  const chartSalesData = cierres.reverse().map((c: any) => {
    const totalVentas = c.movimientos.reduce((acc: number, curr: any) => {
      if (curr.tipo === "Ingreso") {
        return acc + curr.monto_total;
      } else if (curr.tipo === "Egreso") {
        return acc - curr.monto_total;
      }
      return acc;
    }, 0);

    const formattedDate = new Date(c.fecha).toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
    });

    return {
      name: formattedDate,
      Ingresos: totalVentas,
      Efectivo: c.movimientos.reduce((acc: number, curr: any) => {
        if (curr.tipo === "Ingreso") return acc + (curr.ingreso_efectivo - curr.salida_vuelto_efectivo);
        if (curr.tipo === "Egreso") return acc - curr.ingreso_efectivo;
        return acc;
      }, 0),
      Yape: c.movimientos.reduce((acc: number, curr: any) => {
        if (curr.tipo === "Ingreso") return acc + (curr.ingreso_yape - curr.salida_vuelto_yape);
        if (curr.tipo === "Egreso") return acc - curr.ingreso_yape;
        return acc;
      }, 0),
    };
  });

  // Calculate payment distributions overall (Yape vs Cash) for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const movimientosMes = await prisma.movimiento.findMany({
    where: {
      fecha: {
        gte: startOfMonth,
      },
    },
  });

  let totalEfectivoMes = 0;
  let totalYapeMes = 0;
  movimientosMes.forEach((m: any) => {
    if (m.tipo === "Ingreso") {
      totalEfectivoMes += m.ingreso_efectivo - m.salida_vuelto_efectivo;
      totalYapeMes += m.ingreso_yape - m.salida_vuelto_yape;
    } else if (m.tipo === "Egreso") {
      totalEfectivoMes -= m.ingreso_efectivo;
      totalYapeMes -= m.ingreso_yape;
    }
  });

  // Include cotizadas tasks in the gross income of this month
  const tareasCotizadasMes = await prisma.tareaJefe.findMany({
    where: {
      estado: "Cotizado",
      fecha_solicitud: {
        gte: startOfMonth,
      },
    },
  });

  const totalTareasJefeMes = tareasCotizadasMes.reduce((acc: number, t: any) => acc + (t.precio_final || 0), 0);

  const totalIngresoBrutoMes = totalEfectivoMes + totalYapeMes + totalTareasJefeMes;
  const pagoOperadorEstimado = totalIngresoBrutoMes / 2;

  // Group by category to analyze monthly service performance
  const categorizacion: Record<string, number> = {};
  movimientosMes.forEach((m: any) => {
    let catName = m.categoria;
    if (catName.startsWith("Otros:")) {
      catName = "Otros";
    } else if (catName.startsWith("Gasto:")) {
      catName = "Gastos Operativos";
    } else if (catName.startsWith("Trabajo Jefe:")) {
      catName = "Tareas Jefe";
    }
    
    if (m.tipo === "Ingreso") {
      categorizacion[catName] = (categorizacion[catName] || 0) + m.monto_total;
    } else if (m.tipo === "Egreso") {
      categorizacion["Gastos Operativos"] = (categorizacion["Gastos Operativos"] || 0) + m.monto_total;
    }
  });

  if (totalTareasJefeMes > 0 && !categorizacion["Tareas Jefe"]) {
    categorizacion["Tareas Jefe"] = totalTareasJefeMes;
  }

  const rendimientoCategorias = Object.entries(categorizacion)
    .map(([name, value]) => ({
      name,
      value: Math.max(0, value)
    }))
    .sort((a, b) => b.value - a.value);

  return {
    chartSalesData,
    distribucionMetodos: [
      { name: "Efectivo", value: Math.max(0, totalEfectivoMes) },
      { name: "Yape", value: Math.max(0, totalYapeMes) },
      { name: "Tareas Jefe", value: Math.max(0, totalTareasJefeMes) },
    ],
    rendimientoCategorias,
    resumenMensual: {
      ingresoBruto: totalIngresoBrutoMes,
      pagoOperador: pagoOperadorEstimado,
      totalEfectivo: totalEfectivoMes,
      totalYape: totalYapeMes,
      totalTareas: totalTareasJefeMes,
    },
  };
}

// 7. Liquidaciones mensuales
export async function getLiquidaciones() {
  const liquidaciones = await prisma.liquidacionMensual.findMany({
    orderBy: {
      mes_anio: "desc",
    },
  });

  // Calculate current month's live data
  const now = new Date();
  const mesAnioActual = `${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;

  const hasLiquidacionRegistrada = liquidaciones.some((l: any) => l.mes_anio === mesAnioActual);

  let liquidacionActualCalculadaObj = null;

  if (!hasLiquidacionRegistrada) {
    const data = await getDashboardData();
    liquidacionActualCalculadaObj = {
      id: "actual-live",
      mes_anio: mesAnioActual,
      ingreso_bruto_total: data.resumenMensual.ingresoBruto,
      pago_operador: data.resumenMensual.pagoOperador,
      estado_pago: "Pendiente",
    };
  }

  return {
    registradas: liquidaciones,
    actualEstimada: liquidacionActualCalculadaObj,
  };
}

export async function guardarYMarcarLiquidacionComoPagada(mes_anio: string, ingreso_bruto: number, pago_operador: number) {
  // Check if it already exists
  const existente = await prisma.liquidacionMensual.findFirst({
    where: { mes_anio },
  });

  if (existente) {
    await prisma.liquidacionMensual.update({
      where: { id: existente.id },
      data: {
        estado_pago: "Pagado",
        ingreso_bruto_total: ingreso_bruto,
        pago_operador: pago_operador,
      },
    });
  } else {
    await prisma.liquidacionMensual.create({
      data: {
        mes_anio,
        ingreso_bruto_total: ingreso_bruto,
        pago_operador: pago_operador,
        estado_pago: "Pagado",
      },
    });
  }

  revalidatePath("/");
  return { success: true };
}

// 8. Base de Datos Backups JSON & Historial de Cierres
export async function exportarBaseDatos() {
  const cierreDiario = await prisma.cierreDiario.findMany();
  const movimientos = await prisma.movimiento.findMany();
  const tareasJefe = await prisma.tareaJefe.findMany();
  const liquidaciones = await prisma.liquidacionMensual.findMany();
  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    cierreDiario,
    movimientos,
    tareasJefe,
    liquidaciones
  };
}

export async function importarBaseDatos(data: any): Promise<{ success: boolean; error?: string }> {
  try {
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    if (!parsedData || parsedData.version !== "1.0" || !parsedData.cierreDiario || !parsedData.movimientos) {
      return { success: false, error: "Formato de archivo de respaldo inválido" };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Clean existing records in dependency order
      await tx.movimiento.deleteMany({});
      await tx.cierreDiario.deleteMany({});
      await tx.tareaJefe.deleteMany({});
      await tx.liquidacionMensual.deleteMany({});

      // 2. Insert CierreDiario
      if (parsedData.cierreDiario && parsedData.cierreDiario.length > 0) {
        await tx.cierreDiario.createMany({
          data: parsedData.cierreDiario.map((c: any) => ({
            id: c.id,
            fecha: new Date(c.fecha),
            saldo_efectivo_entregado: c.saldo_efectivo_entregado,
            saldo_yape_entregado: c.saldo_yape_entregado,
            estado: c.estado
          }))
        });
      }

      // 3. Insert Movimientos
      if (parsedData.movimientos && parsedData.movimientos.length > 0) {
        await tx.movimiento.createMany({
          data: parsedData.movimientos.map((m: any) => ({
            id: m.id,
            fecha: new Date(m.fecha),
            categoria: m.categoria,
            tipo: m.tipo,
            monto_total: m.monto_total,
            ingreso_efectivo: m.ingreso_efectivo,
            ingreso_yape: m.ingreso_yape,
            salida_vuelto_efectivo: m.salida_vuelto_efectivo,
            salida_vuelto_yape: m.salida_vuelto_yape,
            id_cierre_diario: m.id_cierre_diario
          }))
        });
      }

      // 4. Insert TareasJefe
      if (parsedData.tareasJefe && parsedData.tareasJefe.length > 0) {
        await tx.tareaJefe.createMany({
          data: parsedData.tareasJefe.map((t: any) => ({
            id: t.id,
            descripcion: t.descripcion,
            fecha_solicitud: new Date(t.fecha_solicitud),
            precio_final: t.precio_final,
            estado: t.estado
          }))
        });
      }

      // 5. Insert Liquidaciones
      if (parsedData.liquidaciones && parsedData.liquidaciones.length > 0) {
        await tx.liquidacionMensual.createMany({
          data: parsedData.liquidaciones.map((l: any) => ({
            id: l.id,
            mes_anio: l.mes_anio,
            ingreso_bruto_total: l.ingreso_bruto_total,
            pago_operador: l.pago_operador,
            estado_pago: l.estado_pago
          }))
        });
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Error al realizar restauración" };
  }
}

export async function getHistorialCierres() {
  return prisma.cierreDiario.findMany({
    where: {
      estado: "Entregado"
    },
    include: {
      movimientos: true
    },
    orderBy: {
      fecha: "desc"
    }
  });
}
