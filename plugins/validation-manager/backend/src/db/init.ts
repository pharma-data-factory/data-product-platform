/**
 * Database Initialization
 * Create schema, tables, indexes, views
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export async function initializeDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🔄 Initializing database schema...');

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      try {
        await client.query(statement);
      } catch (err) {
        // Ignore "already exists" errors
        if (!String(err).includes('already exists')) {
          console.error('Error executing statement:', statement.substring(0, 100));
          throw err;
        }
      }
    }

    console.log('✅ Database schema initialized successfully');
  } finally {
    client.release();
  }
}

/**
 * Seed default data
 */
export async function seedDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding default data...');

    // Create default system users
    const users = [
      {
        id: 'user-qa-001',
        email: 'qa-lead@pharma-factory.com',
        firstName: 'John',
        lastName: 'Quality',
        role: 'QA_LEAD',
        department: 'Quality Assurance',
      },
      {
        id: 'user-val-001',
        email: 'validation-lead@pharma-factory.com',
        firstName: 'Sarah',
        lastName: 'Validation',
        role: 'VALIDATION_LEAD',
        department: 'Validation',
      },
      {
        id: 'user-legal-001',
        email: 'legal@pharma-factory.com',
        firstName: 'Peter',
        lastName: 'Legal',
        role: 'LEGAL',
        department: 'Legal & Compliance',
      },
      {
        id: 'user-sig-001',
        email: 'signatory@pharma-factory.com',
        firstName: 'Admin',
        lastName: 'Signatory',
        role: 'SIGNATURE',
        department: 'Administration',
      },
      {
        id: 'user-admin-001',
        email: 'admin@pharma-factory.com',
        firstName: 'System',
        lastName: 'Admin',
        role: 'PLATFORM_ADMIN',
        department: 'IT',
      },
      {
        id: 'user-dev-001',
        email: 'developer@pharma-factory.com',
        firstName: 'Dev',
        lastName: 'Developer',
        role: 'DEVELOPER',
        department: 'Engineering',
      },
    ];

    for (const user of users) {
      const query = `
        INSERT INTO system_users (id, email, first_name, last_name, role, department)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `;

      await client.query(query, [
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.department,
      ]);
    }

    console.log(`✅ Seeded ${users.length} default users`);
  } finally {
    client.release();
  }
}

/**
 * Health check
 */
export async function healthCheck(pool: Pool): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}

/**
 * Main initialization function
 */
export async function initializeValidationManagerDB(
  connectionString: string
): Promise<Pool> {
  console.log('🚀 Starting Validation Manager Database Initialization');
  console.log(`📍 Connection: ${connectionString.replace(/:[^:]*@/, ':***@')}`);

  const pool = new Pool({
    connectionString,
  });

  try {
    // Test connection
    const isHealthy = await healthCheck(pool);
    if (!isHealthy) {
      throw new Error('Failed to connect to database');
    }

    console.log('✅ Database connection successful');

    // Initialize schema
    await initializeDatabase(pool);

    // Seed data
    await seedDatabase(pool);

    console.log('✨ Database initialization complete');
    return pool;
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    await pool.end();
    throw err;
  }
}

/**
 * Cleanup function (for testing)
 */
export async function dropAllTables(pool: Pool): Promise<void> {
  const client = await pool.connect();

  try {
    console.log('🗑️  Dropping all tables...');

    const dropQuery = `
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS change_control_forms CASCADE;
      DROP TABLE IF EXISTS exported_documents CASCADE;
      DROP TABLE IF EXISTS signature_records CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS change_logs CASCADE;
      DROP TABLE IF EXISTS approval_records CASCADE;
      DROP TABLE IF EXISTS requirements CASCADE;
      DROP TABLE IF EXISTS system_users CASCADE;
      DROP TABLE IF EXISTS system_configuration CASCADE;
      DROP VIEW IF EXISTS v_audit_activity CASCADE;
      DROP VIEW IF EXISTS v_export_statistics CASCADE;
      DROP VIEW IF EXISTS v_pending_approvals CASCADE;
      DROP VIEW IF EXISTS v_approval_status CASCADE;
    `;

    await client.query(dropQuery);
    console.log('✅ All tables dropped');
  } finally {
    client.release();
  }
}

/**
 * CLI Entry Point
 */
if (require.main === module) {
  const connectionString = process.env.DATABASE_URL || 'postgresql://localhost/validation_manager';

  initializeValidationManagerDB(connectionString)
    .then(pool => {
      console.log('\n✨ Setup complete! Pool ready to use.');
      pool.end();
    })
    .catch(err => {
      console.error('\n❌ Setup failed:', err.message);
      process.exit(1);
    });
}
