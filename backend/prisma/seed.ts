import { prisma } from "../src/db";

async function main() {
  await prisma.user.createMany({
    data: [{ username: "shubhamsingh1", password: "1223445" }],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
