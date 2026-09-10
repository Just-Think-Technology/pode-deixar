import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({
  path: path.resolve(
    __dirname,
    `../../../../.env.${process.env.NODE_ENV || "development"}`,
  ),
});

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pode_deixar_test_reviews?schema=public';

const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
const host = url.hostname;
const port = url.port || '5432';
const testDbName = url.pathname.slice(1).split('?')[0];
const user = url.username;
const password = url.password;

const adminUrl = `postgresql://${user}:${password}@${host}:${port}/postgres?schema=public`;

process.env.DATABASE_URL = databaseUrl;

export default async function globalSetup() {
  console.log(`Using test database: ${testDbName} at ${host}:${port}`);

  const adminPrisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await adminPrisma.$connect();
    try {
      await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${testDbName}"`);
      console.log(`Database ${testDbName} dropped`);
    } catch (e: any) {
      console.error('Error dropping database:', e.message);
    }
    try {
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
      console.log(`Database ${testDbName} created fresh`);
    } catch (e: any) {
      if (e.meta?.code === '42P04' || e.message?.includes('already exists') || e.code === 'P2010') {
        console.log(`Database ${testDbName} already exists (will be recreated)`);
        try {
          await adminPrisma.$executeRawUnsafe(`DROP DATABASE "${testDbName}"`);
          await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
          console.log(`Database ${testDbName} freshly recreated`);
        } catch (e2: any) {
          console.error('Could not recreate database:', e2.message);
        }
      } else {
        throw e;
      }
    }
    await adminPrisma.$disconnect();
  } catch (error) {
    console.error('Failed to connect to admin database:', error);
    throw error;
  }

  console.log('Running Prisma migrations to ensure schema is current...');
  const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
  const { execSync } = await import('child_process');
  try {
    execSync(`npx -p prisma@5.22.0 prisma migrate deploy --schema="${schemaPath}"`, {
      cwd: __dirname,
      env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    });
    console.log('Migrations applied successfully');
  } catch (migrateError: any) {
    console.error('Migration failed, but continuing test setup:', migrateError.message);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$connect();
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await prisma.$disconnect();
    console.log('Test database connected and extension created');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}
