import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Create multiple users
  await prisma.user.createMany({
    data: [
      {
        username: "shubhamsingh1",
        password: "123456",
      },
      {
        username: "ankit",
        password: "password123",
      },
    ],
    skipDuplicates: true, // prevents errors if you run the seed multiple times
  });

  await prisma.stock.createMany({
    data: [
      { name: "Bitcoin", symbol: "BTC" },
      { name: "Solana", symbol: "SOL" },
      { name: "US Dollar", symbol: "USD" },
      { name: "Apple Inc.", symbol: "AAPL" },
      { name: "Microsoft Corporation", symbol: "MSFT" },
      { name: "Tesla Inc.", symbol: "TSLA" },
    ],
    skipDuplicates: true,
  });

  console.log("Seed data inserted!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
