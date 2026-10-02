const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const openCierres = await prisma.cierreDiario.findMany({
    orderBy: {
      fecha: 'asc'
    }
  });
  console.log("ALL CIERRES DIARIOS:");
  openCierres.forEach(c => {
    console.log(`ID: ${c.id} | Fecha UTC: ${c.fecha.toISOString()} | Local: ${c.fecha.toString()} | Estado: ${c.estado}`);
  });
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
