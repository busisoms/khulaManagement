// `npm run db:seed` / `npm run db:reset`: wipe and recreate the fictional demo business.
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/lib/demo-seed";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then((id) => console.log(`Seeded "Thandi's Tailoring" (${id}).`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
