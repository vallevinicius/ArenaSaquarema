// Roda fora do Next (tsx puro): não importa server/lib/prisma, que é 'server-only'.
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '../server/generated/prisma/client';

const dbUrl = new URL(process.env.DATABASE_URL ?? '');
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 3306),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.slice(1),
    allowPublicKeyRetrieval: process.env.DB_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true',
  }),
});

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password || password.length < 10) {
    throw new Error('Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD (mín. 10 caracteres) no .env');
  }

  // upsert com update vazio: rodar o seed de novo NUNCA reseta a senha de um admin existente.
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: process.env.SEED_ADMIN_NAME ?? 'Administrador',
      email,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, 12),
    },
  });

  // [nome, categoria, preço, estoque inicial, mínimo] — estoque null = preparado na hora
  const products: Array<[string, Prisma.ProductCreateInput['category'], string, number | null, number]> = [
    ['Cerveja Long Neck 355ml', 'CERVEJA', '12.00', 120, 24],
    ['Cerveja Lata 350ml', 'CERVEJA', '8.00', 200, 48],
    ['Água Mineral 500ml', 'AGUA', '5.00', 150, 30],
    ['Água de Coco 300ml', 'SUCO', '9.00', 40, 10],
    ['Refrigerante Lata 350ml', 'REFRIGERANTE', '7.00', 96, 24],
    ['Isotônico 500ml', 'ISOTONICO', '10.00', 60, 12],
    ['Caipirinha', 'DRINK', '22.00', null, 0],
    ['Porção de Batata Frita', 'PETISCO', '35.00', null, 0],
  ];
  for (const [name, category, price, stock, minStock] of products) {
    const exists = await prisma.product.findUnique({ where: { name } });
    if (exists) continue;
    await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: { name, category, price: new Prisma.Decimal(price), stock: stock ?? 0, minStock, trackStock: stock !== null },
      });
      if (stock) {
        await tx.stockMovement.create({
          data: { productId: p.id, type: 'ENTRADA', quantity: stock, balance: stock, reason: 'Seed inicial', userId: admin.id },
        });
      }
    });
  }

  const plans: Array<[string, string, string]> = [
    ['Day Use Avulso', 'Acesso às quadras de futevôlei durante o dia', '40.00'],
    ['Day Use + Aula', 'Day use com 1 aula de futevôlei com professor', '70.00'],
    ['Day Use Infantil', 'Até 12 anos', '20.00'],
  ];
  for (const [name, description, price] of plans) {
    await prisma.dayUsePlan.upsert({
      where: { name },
      update: {},
      create: { name, description, price: new Prisma.Decimal(price) },
    });
  }

  console.log(`Seed OK. Admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
