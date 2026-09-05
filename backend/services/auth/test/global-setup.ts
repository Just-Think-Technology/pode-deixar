import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../../../.env.staging') });

// Use test database URL from env or default to localhost
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pode_deixar_test?schema=public';

// Parse the URL to extract components
const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
const host = url.hostname;
const port = url.port || '5432';
const testDbName = url.pathname.slice(1).split('?')[0]; // e.g., "pode_deixar_test"
const user = url.username;
const password = url.password;

// Admin URL to connect to default postgres database to create test database
const adminUrl = `postgresql://${user}:${password}@${host}:${port}/pode_deixar?schema=public`;

process.env.DATABASE_URL = databaseUrl;

export default async function globalSetup() {
  console.log(`Using test database: ${testDbName} at ${host}:${port}`);

  // First, connect to default database to create test database if needed
  const adminPrisma = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  try {
    await adminPrisma.$connect();
    // Create test database if not exists
    try {
      await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${testDbName}"`);
      console.log(`Database ${testDbName} created`);
    } catch (e: any) {
      // 42P04 = duplicate_database
      if (e.meta?.code === '42P04' || e.message?.includes('already exists') || e.code === 'P2010') {
        console.log(`Database ${testDbName} already exists`);
      } else {
        throw e;
      }
    }
    await adminPrisma.$disconnect();
  } catch (error) {
    console.error('Failed to connect to admin database:', error);
    throw error;
  }

  // Check if tables already exist (migrations already applied)
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    await prisma.$connect();
    // Check if users table exists
    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'`
    );
    
    if (tables.length === 0) {
      console.log('Tables not found, running Prisma migrations...');
      const schemaPath = path.resolve(__dirname, '../../../prisma/schema.prisma');
      const { execSync } = await import('child_process');
      execSync(`npx -p prisma@5.22.0 prisma migrate deploy --schema="${schemaPath}"`, {
        cwd: __dirname,
        env: { 
          ...process.env, 
          DATABASE_URL: databaseUrl,
          DIRECT_DATABASE_URL: databaseUrl,
        },
        stdio: 'inherit',
      });
      console.log('Migrations applied successfully');
    } else {
      console.log('Tables already exist, skipping migrations');
    }
    
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await prisma.$disconnect();
    console.log('Test database connected and extension created');
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
}