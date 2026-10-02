const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the boxes that were wrongly updated to today during the retroactive closure.
  // We know they were updated to May 20th around 17:18:00 UTC.
  const targetDateStr = "2026-05-20T00:00:00.000Z";
  
  const wronglyUpdatedCierres = await prisma.cierreDiario.findMany({
    where: {
      estado: 'Entregado',
      fecha: {
        gte: new Date(targetDateStr)
      }
    }
  });

  console.log("Found wrongly updated boxes:", wronglyUpdatedCierres.length);

  for (const c of wronglyUpdatedCierres) {
    // Revert them back to May 19th
    await prisma.cierreDiario.update({
      where: { id: c.id },
      data: {
        fecha: new Date("2026-05-19T12:00:00.000Z")
      }
    });
    console.log(`Reverted box ${c.id} back to May 19`);
  }
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
