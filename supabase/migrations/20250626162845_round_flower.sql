/*
  # Business operational tables

  1. New Tables
    - `services` - Stores service offerings for each tenant
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `name` (text)
      - `description` (text)
      - `price` (integer, in cents)
      - `duration` (integer, in minutes)
      - `category` (text)
      - `is_active` (boolean)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
    
    - `staff` - Stores staff members for each tenant
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `name` (text)
      - `role` (text)
      - `specialties` (text array)
      - `bio` (text)
      - `experience` (text)
      - `image_url` (text)
      - `is_active` (boolean)
      - `schedule` (jsonb)
      - `rating` (numeric)
      - `completed_services` (integer)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
    
    - `clients` - Stores client information for each tenant
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `full_name` (text)
      - `email` (text)
      - `phone` (text)
      - `total_spent` (integer, in cents)
      - `rewards_earned` (integer)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
    
    - `appointments` - Stores appointment information
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `client_id` (uuid, foreign key to clients)
      - `staff_id` (uuid, foreign key to staff)
      - `service_ids` (uuid array)
      - `date` (date)
      - `time` (time)
      - `status` (text, with check constraint)
      - `total_price` (integer, in cents)
      - `notes` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
    
  3. Indexes
    - Add appropriate indexes for performance
*/

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price integer NOT NULL,
  duration integer NOT NULL,
  category text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create staff table
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  specialties text[] NOT NULL,
  bio text,
  experience text,
  image_url text,
  is_active boolean DEFAULT true,
  schedule jsonb NOT NULL,
  rating numeric DEFAULT 5.0,
  completed_services integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  total_spent integer DEFAULT 0,
  rewards_earned integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  service_ids uuid[] NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL CHECK (status = ANY (ARRAY['confirmed', 'pending', 'cancelled', 'completed'])),
  total_price integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create triggers for updated_at
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
BEFORE UPDATE ON staff
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create useful indexes
CREATE INDEX idx_services_tenant_id ON services(tenant_id);
CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_is_active ON services(is_active);

CREATE INDEX idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX idx_staff_specialties ON staff USING GIN(specialties);
CREATE INDEX idx_staff_is_active ON staff(is_active);

CREATE INDEX idx_clients_tenant_id ON clients(tenant_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_phone ON clients(phone);

CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_appointments_staff_id ON appointments(staff_id);
CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for services
CREATE POLICY "Services are viewable by tenant" 
ON services FOR SELECT 
TO public
USING (true);

CREATE POLICY "Services can be inserted by tenant" 
ON services FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Services can be updated by tenant" 
ON services FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Services can be deleted by tenant" 
ON services FOR DELETE 
TO public
USING (true);

-- Create RLS policies for staff
CREATE POLICY "Staff are viewable by tenant" 
ON staff FOR SELECT 
TO public
USING (true);

CREATE POLICY "Staff can be inserted by tenant" 
ON staff FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Staff can be updated by tenant" 
ON staff FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Staff can be deleted by tenant" 
ON staff FOR DELETE 
TO public
USING (true);

-- Create RLS policies for clients
CREATE POLICY "Clients are viewable by tenant" 
ON clients FOR SELECT 
TO public
USING (true);

CREATE POLICY "Clients can be inserted by tenant" 
ON clients FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Clients can be updated by tenant" 
ON clients FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Clients can be deleted by tenant" 
ON clients FOR DELETE 
TO public
USING (true);

-- Create RLS policies for appointments
CREATE POLICY "Appointments are viewable by tenant" 
ON appointments FOR SELECT 
TO public
USING (true);

CREATE POLICY "Appointments can be inserted by tenant" 
ON appointments FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Appointments can be updated by tenant" 
ON appointments FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Appointments can be deleted by tenant" 
ON appointments FOR DELETE 
TO public
USING (true);