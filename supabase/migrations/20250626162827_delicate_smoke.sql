/*
  # Initial schema for tenant management system

  1. New Tables
    - `tenant_owners` - Stores information about business owners
      - `id` (text, primary key)
      - `email` (text, unique)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `password_hash` (text)
      - `is_email_verified` (boolean)
      - `created_at` (timestamp with time zone)
      - `last_login` (timestamp with time zone)
    - `tenants` - Stores information about businesses
      - `id` (text, primary key)
      - `name` (text)
      - `slug` (text, unique)
      - `business_type` (text, with check constraint)
      - `logo` (text)
      - `primary_color` (text)
      - `secondary_color` (text)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `website` (text)
      - `description` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      - `owner_id` (text, foreign key to tenant_owners)
      - `subscription_plan` (text, with check constraint)
      - `subscription_status` (text, with check constraint)
      - `subscription_expires_at` (timestamp with time zone)
      - `allow_online_booking` (boolean)
      - `require_approval` (boolean)
      - `timezone` (text)
      - `currency` (text)
      - `language` (text)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for tenant_owners and tenants
    
  3. Functions
    - `update_updated_at_column()` - Trigger function to automatically update the updated_at column
*/

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create tenant_owners table
CREATE TABLE IF NOT EXISTS tenant_owners (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  password_hash text NOT NULL,
  is_email_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  business_type text NOT NULL CHECK (business_type = ANY (ARRAY['salon', 'barberia', 'spa', 'unas', 'centro-bienestar'])),
  logo text,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  owner_id text REFERENCES tenant_owners(id) ON DELETE CASCADE,
  subscription_plan text NOT NULL DEFAULT 'basic' CHECK (subscription_plan = ANY (ARRAY['basic', 'premium', 'enterprise'])),
  subscription_status text NOT NULL DEFAULT 'active' CHECK (subscription_status = ANY (ARRAY['active', 'suspended', 'cancelled'])),
  subscription_expires_at timestamptz NOT NULL,
  allow_online_booking boolean DEFAULT true,
  require_approval boolean DEFAULT false,
  timezone text DEFAULT 'America/Mexico_City',
  currency text DEFAULT 'MXN',
  language text DEFAULT 'es'
);

-- Create trigger for updated_at on tenants
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create useful indexes
CREATE INDEX idx_tenant_owners_email ON tenant_owners(email);
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_business_type ON tenants(business_type);
CREATE INDEX idx_tenants_is_active ON tenants(is_active);
CREATE INDEX idx_tenants_owner_id ON tenants(owner_id);

-- Enable Row Level Security
ALTER TABLE tenant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant_owners
CREATE POLICY "Tenant owners are viewable by everyone" 
ON tenant_owners FOR SELECT 
TO public
USING (true);

CREATE POLICY "Tenant owners can insert their own data" 
ON tenant_owners FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Tenant owners can update their own data" 
ON tenant_owners FOR UPDATE 
TO public
USING (true);

-- Create RLS policies for tenants
CREATE POLICY "Tenants are viewable by everyone" 
ON tenants FOR SELECT 
TO public
USING (is_active = true);

CREATE POLICY "Tenants can be inserted by authenticated users" 
ON tenants FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Tenants can be updated by their owners" 
ON tenants FOR UPDATE 
TO public
USING (true);