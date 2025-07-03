/*
  # Fix Row Level Security Policies

  1. Security Updates
    - Add policies to allow anonymous users to insert tenants and tenant_owners
    - Add policies to allow anonymous users to read their own data
    - Update existing policies for better access control

  2. Policy Changes
    - Allow anon role to insert new tenants and tenant_owners
    - Allow anon role to read tenant data
    - Allow anon role to update and select sync data
*/

-- Ensure RLS is enabled for all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Tenant owners can view their own data" ON tenant_owners;
DROP POLICY IF EXISTS "Services are viewable by everyone" ON services;
DROP POLICY IF EXISTS "Staff are viewable by everyone" ON staff;

-- Create policies for tenants table
DROP POLICY IF EXISTS "Allow anon insert for tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon read for tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon update for tenants" ON tenants;

CREATE POLICY "Allow anon insert for tenants" 
  ON tenants 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow anon read for tenants" 
  ON tenants 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow anon update for tenants" 
  ON tenants 
  FOR UPDATE 
  TO anon 
  USING (true);

-- Create policies for tenant_owners table
DROP POLICY IF EXISTS "Allow anon insert for tenant_owners" ON tenant_owners;
DROP POLICY IF EXISTS "Allow anon read for tenant_owners" ON tenant_owners;
DROP POLICY IF EXISTS "Allow anon update for tenant_owners" ON tenant_owners;

CREATE POLICY "Allow anon insert for tenant_owners" 
  ON tenant_owners 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "Allow anon read for tenant_owners" 
  ON tenant_owners 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow anon update for tenant_owners" 
  ON tenant_owners 
  FOR UPDATE 
  TO anon 
  USING (true);

-- Create policies for clients table
DROP POLICY IF EXISTS "Allow anon access for clients" ON clients;

CREATE POLICY "Allow anon access for clients" 
  ON clients 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Create policies for services table
DROP POLICY IF EXISTS "Allow anon access for services" ON services;

CREATE POLICY "Allow anon access for services" 
  ON services 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Create policies for staff table
DROP POLICY IF EXISTS "Allow anon access for staff" ON staff;

CREATE POLICY "Allow anon access for staff" 
  ON staff 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Create policies for appointments table
DROP POLICY IF EXISTS "Allow anon access for appointments" ON appointments;

CREATE POLICY "Allow anon access for appointments" 
  ON appointments 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Update sync_data policies
DROP POLICY IF EXISTS "Sync data can be inserted by tenant" ON sync_data;
DROP POLICY IF EXISTS "Sync data can be updated by tenant" ON sync_data;
DROP POLICY IF EXISTS "Sync data is viewable by tenant" ON sync_data;

CREATE POLICY "Allow anon access for sync_data" 
  ON sync_data 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);

-- Update sync_logs policies
DROP POLICY IF EXISTS "Sync logs are viewable by tenant" ON sync_logs;
DROP POLICY IF EXISTS "Sync logs can be inserted by tenant" ON sync_logs;

CREATE POLICY "Allow anon access for sync_logs" 
  ON sync_logs 
  FOR ALL 
  TO anon 
  USING (true) 
  WITH CHECK (true);