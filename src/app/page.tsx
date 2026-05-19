import DashboardClient from "./dashboard-client";
import {
  getEstadoCaja,
  getDashboardData,
  getMovimientosHoy,
  getTareasJefe,
  getLiquidaciones,
} from "./actions";

export const revalidate = 0;

export default async function Home() {
  const [caja, dashboard, movimientos, tareas, liquidaciones] = await Promise.all([
    getEstadoCaja(),
    getDashboardData(),
    getMovimientosHoy(),
    getTareasJefe(),
    getLiquidaciones(),
  ]);

  return (
    <DashboardClient
      initialCaja={caja}
      initialDashboard={dashboard}
      initialMovimientos={movimientos}
      initialTareas={tareas}
      initialLiquidaciones={liquidaciones}
    />
  );
}
