/*
  # Create salon management database schema

  1. New Tables
    - `tenants` - Stores information about each salon business
    - `tenant_owners` - Stores information about salon owners
    - `clients` - Stores client information
    - `appointments` - Stores appointment information
    - `services` - Stores service information
    - `staff` - Stores staff information
  2. Views
    - `active_tenants_view` - Shows active tenants with owner information
    - `tenant_appointments_summary` - Summarizes appointment statistics by tenant
    - `tenant_clients_summary` - Summarizes client statistics by tenant
    - `tenant_revenue_summary` - Summarizes revenue statistics by tenant
*/

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  business_type TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#0ea5e9',
  secondary_color TEXT NOT NULL DEFAULT '#06b6d4',
  logo TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  owner_id UUID NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'basic',
  subscription_status TEXT NOT NULL DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tenant_owners table
CREATE TABLE IF NOT EXISTS tenant_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  password_hash TEXT NOT NULL,
  is_email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  total_spent NUMERIC(10,2) DEFAULT 0,
  rewards_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  specialties TEXT[] NOT NULL,
  bio TEXT,
  experience TEXT,
  image TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,1),
  completed_services INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  staff_id UUID REFERENCES staff(id),
  service_ids UUID[] NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- View for active tenants
CREATE OR REPLACE VIEW active_tenants_view AS
SELECT 
  t.id,
  t.name,
  t.slug,
  t.business_type,
  t.primary_color,
  t.secondary_color,
  t.subscription_plan,
  t.subscription_status,
  t.subscription_expires_at,
  towner.first_name || ' ' || towner.last_name AS owner_name,
  towner.email AS owner_email
FROM 
  tenants t
JOIN 
  tenant_owners towner ON t.owner_id = towner.id
WHERE 
  t.is_active = true;

-- View for tenant appointments summary
CREATE OR REPLACE VIEW tenant_appointments_summary AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  COUNT(a.id) AS total_appointments,
  COUNT(CASE WHEN a.status = 'confirmed' THEN 1 END) AS confirmed_appointments,
  COUNT(CASE WHEN a.status = 'pending' THEN 1 END) AS pending_appointments,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed_appointments,
  COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
  COUNT(CASE WHEN a.date = CURRENT_DATE THEN 1 END) AS today_appointments,
  COUNT(CASE WHEN a.date > CURRENT_DATE THEN 1 END) AS future_appointments,
  COUNT(CASE WHEN a.date < CURRENT_DATE THEN 1 END) AS past_appointments
FROM 
  tenants t
LEFT JOIN 
  appointments a ON t.id = a.tenant_id
WHERE 
  t.is_active = true
GROUP BY 
  t.id, t.name;

-- View for tenant clients summary
CREATE OR REPLACE VIEW tenant_clients_summary AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  COUNT(c.id) AS total_clients,
  AVG(c.total_spent) AS average_spent,
  SUM(c.total_spent) AS total_revenue,
  COUNT(CASE WHEN c.created_at > (CURRENT_DATE - INTERVAL '30 days') THEN 1 END) AS new_clients_30d,
  COUNT(CASE WHEN c.rewards_earned > 0 THEN 1 END) AS clients_with_rewards
FROM 
  tenants t
LEFT JOIN 
  clients c ON t.id = c.tenant_id
WHERE 
  t.is_active = true
GROUP BY 
  t.id, t.name;

-- View for tenant revenue summary
CREATE OR REPLACE VIEW tenant_revenue_summary AS
SELECT 
  t.id AS tenant_id,
  t.name AS tenant_name,
  SUM(CASE WHEN a.status = 'completed' THEN a.total_price ELSE 0 END) AS total_revenue,
  SUM(CASE WHEN a.status = 'completed' AND a.date >= (CURRENT_DATE - INTERVAL '7 days') THEN a.total_price ELSE 0 END) AS revenue_7d,
  SUM(CASE WHEN a.status = 'completed' AND a.date >= (CURRENT_DATE - INTERVAL '30 days') THEN a.total_price ELSE 0 END) AS revenue_30d,
  SUM(CASE WHEN a.status = 'completed' AND a.date >= (CURRENT_DATE - INTERVAL '90 days') THEN a.total_price ELSE 0 END) AS revenue_90d,
  SUM(CASE WHEN a.status = 'completed' AND EXTRACT(YEAR FROM a.date) = EXTRACT(YEAR FROM CURRENT_DATE) THEN a.total_price ELSE 0 END) AS revenue_year,
  COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.client_id END) AS paying_clients,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.client_id END) > 0 
    THEN SUM(CASE WHEN a.status = 'completed' THEN a.total_price ELSE 0 END) / COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.client_id END)
    ELSE 0
  END AS average_client_value
FROM 
  tenants t
LEFT JOIN 
  appointments a ON t.id = a.tenant_id
WHERE 
  t.is_active = true
GROUP BY 
  t.id, t.name;

-- Enable row level security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for tenants
CREATE POLICY "Tenants are viewable by everyone" 
  ON tenants FOR SELECT 
  USING (true);

-- Create policies for tenant_owners
CREATE POLICY "Tenant owners can view their own data" 
  ON tenant_owners FOR SELECT 
  USING (auth.uid() = id);

-- Create policies for clients
CREATE POLICY "Clients are viewable by tenant staff" 
  ON clients FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM tenants t 
    WHERE t.id = tenant_id AND t.owner_id = auth.uid()
  ));

-- Create policies for services
CREATE POLICY "Services are viewable by everyone" 
  ON services FOR SELECT 
  USING (true);

-- Create policies for staff
CREATE POLICY "Staff are viewable by everyone" 
  ON staff FOR SELECT 
  USING (true);

-- Create policies for appointments
CREATE POLICY "Appointments are viewable by tenant staff and client" 
  ON appointments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM tenants t 
      WHERE t.id = tenant_id AND t.owner_id = auth.uid()
    ) OR 
    client_id = auth.uid()
  );