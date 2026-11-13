// Run on every deploy: seeds the demo only when the database is empty,
// so data survives redeploys. Use the in-app "Reset demo" button to reseed.
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/demo-seed";

const prisma = new PrismaClient();

async function main() {
  if ((await prisma.business.count()) > 0) {
    console.log("Database already has data; not seeding.");
    return;
  }
  console.log(`Seeded demo business (${await seedDemo(prisma)}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
