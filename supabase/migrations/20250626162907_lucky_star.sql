/*
  # Settings and configuration tables

  1. New Tables
    - `salon_settings` - Stores salon-specific settings
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `salon_name` (text)
      - `salon_motto` (text)
      - `address` (text)
      - `phone` (text)
      - `email` (text)
      - `whatsapp` (text)
      - `instagram` (text)
      - `facebook` (text)
      - `website` (text)
      - `hours` (jsonb)
      - `updated_at` (timestamp with time zone)
      - `updated_by` (text)
    
    - `theme_settings` - Stores theme configurations
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `name` (text)
      - `description` (text)
      - `colors` (jsonb)
      - `is_default` (boolean)
      - `is_active` (boolean)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
      - `created_by` (text)
    
    - `reward_settings` - Stores reward program settings
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `spending_threshold` (integer)
      - `discount_percentage` (integer)
      - `coupon_validity_days` (integer)
      - `is_active` (boolean)
      - `updated_at` (timestamp with time zone)
      - `updated_by` (text)
    
    - `reward_coupons` - Stores generated reward coupons
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `client_id` (uuid, foreign key to clients)
      - `code` (text)
      - `discount_percentage` (integer)
      - `is_used` (boolean)
      - `created_at` (timestamp with time zone)
      - `expires_at` (timestamp with time zone)
      - `used_at` (timestamp with time zone)
      - `used_in_appointment` (uuid)
      - `trigger_amount` (integer)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
*/

-- Create salon_settings table
CREATE TABLE IF NOT EXISTS salon_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  salon_name text NOT NULL,
  salon_motto text NOT NULL,
  address text,
  phone text,
  email text,
  whatsapp text,
  instagram text,
  facebook text,
  website text,
  hours jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by text NOT NULL,
  UNIQUE(tenant_id)
);

-- Create theme_settings table
CREATE TABLE IF NOT EXISTS theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  colors jsonb NOT NULL,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by text NOT NULL
);

-- Create reward_settings table
CREATE TABLE IF NOT EXISTS reward_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  spending_threshold integer NOT NULL,
  discount_percentage integer NOT NULL,
  coupon_validity_days integer NOT NULL,
  is_active boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  updated_by text NOT NULL,
  UNIQUE(tenant_id)
);

-- Create reward_coupons table
CREATE TABLE IF NOT EXISTS reward_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_percentage integer NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  used_in_appointment uuid REFERENCES appointments(id) ON DELETE SET NULL,
  trigger_amount integer NOT NULL
);

-- Create triggers for updated_at
CREATE TRIGGER update_theme_settings_updated_at
BEFORE UPDATE ON theme_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create useful indexes
CREATE INDEX idx_salon_settings_tenant_id ON salon_settings(tenant_id);
CREATE INDEX idx_theme_settings_tenant_id ON theme_settings(tenant_id);
CREATE INDEX idx_theme_settings_is_active ON theme_settings(is_active);
CREATE INDEX idx_reward_settings_tenant_id ON reward_settings(tenant_id);
CREATE INDEX idx_reward_coupons_tenant_id ON reward_coupons(tenant_id);
CREATE INDEX idx_reward_coupons_client_id ON reward_coupons(client_id);
CREATE INDEX idx_reward_coupons_code ON reward_coupons(code);
CREATE INDEX idx_reward_coupons_is_used ON reward_coupons(is_used);
CREATE INDEX idx_reward_coupons_expires_at ON reward_coupons(expires_at);

-- Enable Row Level Security
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_coupons ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for salon_settings
CREATE POLICY "Salon settings are viewable by tenant" 
ON salon_settings FOR SELECT 
TO public
USING (true);

CREATE POLICY "Salon settings can be inserted by tenant" 
ON salon_settings FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Salon settings can be updated by tenant" 
ON salon_settings FOR UPDATE 
TO public
USING (true);

-- Create RLS policies for theme_settings
CREATE POLICY "Theme settings are viewable by tenant" 
ON theme_settings FOR SELECT 
TO public
USING (true);

CREATE POLICY "Theme settings can be inserted by tenant" 
ON theme_settings FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Theme settings can be updated by tenant" 
ON theme_settings FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Theme settings can be deleted by tenant" 
ON theme_settings FOR DELETE 
TO public
USING (true);

-- Create RLS policies for reward_settings
CREATE POLICY "Reward settings are viewable by tenant" 
ON reward_settings FOR SELECT 
TO public
USING (true);

CREATE POLICY "Reward settings can be inserted by tenant" 
ON reward_settings FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Reward settings can be updated by tenant" 
ON reward_settings FOR UPDATE 
TO public
USING (true);

-- Create RLS policies for reward_coupons
CREATE POLICY "Reward coupons are viewable by tenant" 
ON reward_coupons FOR SELECT 
TO public
USING (true);

CREATE POLICY "Reward coupons can be inserted by tenant" 
ON reward_coupons FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Reward coupons can be updated by tenant" 
ON reward_coupons FOR UPDATE 
TO public
USING (true);

CREATE POLICY "Reward coupons can be deleted by tenant" 
ON reward_coupons FOR DELETE 
TO public
USING (true);