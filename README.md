# Supabase Migration Guide

This directory contains the SQL migration files for the Salon Appointment Management System database.

## Migration Files

The migrations are split into several files to make them more manageable:

1. `create_tenant_tables.sql` - Creates the core tenant and owner tables
2. `create_business_tables.sql` - Creates tables for services, staff, clients, and appointments
3. `create_settings_tables.sql` - Creates tables for salon settings, themes, and rewards
4. `create_audit_tables.sql` - Creates tables for tracking history and changes
5. `create_functions.sql` - Creates helper functions and stored procedures
6. `create_views.sql` - Creates views for common queries
7. `create_rollback.sql` - Script to roll back all migrations
8. `seed_data.sql` - Adds sample data for testing

## Running Migrations

### Using Supabase CLI

```bash
supabase migration up
```

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each migration file in order
4. Run the SQL statements

## Testing the Migration

After running the migrations, you can verify the setup by:

1. Checking that all tables were created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

2. Verifying the seed data:
   ```sql
   SELECT * FROM tenants;
   SELECT * FROM salon_settings;
   SELECT * FROM services;
   ```

3. Testing a function:
   ```sql
   SELECT * FROM get_tenant_services('tenant-1');
   ```

4. Testing a view:
   ```sql
   SELECT * FROM tenant_appointments_summary;
   ```

## Rollback

If you need to roll back the migrations, run the `create_rollback.sql` script:

```sql
-- WARNING: This will delete all data
\i create_rollback.sql
```

## Database Schema Diagram

The database schema follows this structure:

- `tenant_owners` ← One-to-many → `tenants`
- `tenants` ← One-to-many → `services`, `staff`, `clients`, `salon_settings`, etc.
- `clients` ← One-to-many → `appointments`
- `staff` ← One-to-many → `appointments`
- `services` ← Many-to-many → `appointments` (via service_ids array)

## Security

All tables have Row Level Security (RLS) enabled with appropriate policies to ensure data isolation between tenants.# gestion-de-salones
