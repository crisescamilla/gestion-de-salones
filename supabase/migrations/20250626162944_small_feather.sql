/*
  # Rollback script for all migrations

  This script will drop all tables created in the previous migrations.
  Use with caution as this will delete all data.
*/

-- Drop audit tables
DROP TABLE IF EXISTS admin_notifications;
DROP TABLE IF EXISTS credential_updates;
DROP TABLE IF EXISTS settings_history;
DROP TABLE IF EXISTS price_history;

-- Drop settings tables
DROP TABLE IF EXISTS reward_coupons;
DROP TABLE IF EXISTS reward_settings;
DROP TABLE IF EXISTS theme_settings;
DROP TABLE IF EXISTS salon_settings;

-- Drop business tables
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS clients;
DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS services;

-- Drop tenant tables
DROP TABLE IF EXISTS tenants;
DROP TABLE IF EXISTS tenant_owners;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column;

-- Drop extensions
DROP EXTENSION IF EXISTS "pgcrypto";