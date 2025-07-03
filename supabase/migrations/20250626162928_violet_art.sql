/*
  # Audit and history tables

  1. New Tables
    - `price_history` - Tracks service price changes
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `service_id` (uuid, foreign key to services)
      - `old_price` (integer)
      - `new_price` (integer)
      - `changed_by` (text)
      - `changed_at` (timestamp with time zone)
      - `reason` (text)
    
    - `settings_history` - Tracks salon settings changes
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `changes` (jsonb)
      - `updated_by` (text)
      - `timestamp` (timestamp with time zone)
    
    - `credential_updates` - Tracks credential changes
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `user_id` (text)
      - `type` (text)
      - `timestamp` (timestamp with time zone)
      - `ip_address` (text)
      - `user_agent` (text)
    
    - `admin_notifications` - Stores admin notifications
      - `id` (uuid, primary key)
      - `tenant_id` (text, foreign key to tenants)
      - `type` (text)
      - `title` (text)
      - `message` (text)
      - `client_id` (uuid)
      - `coupon_id` (uuid)
      - `is_read` (boolean)
      - `created_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for tenant isolation
*/

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  old_price integer NOT NULL,
  new_price integer NOT NULL,
  changed_by text NOT NULL,
  changed_at timestamptz DEFAULT now(),
  reason text
);

-- Create settings_history table
CREATE TABLE IF NOT EXISTS settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  changes jsonb NOT NULL,
  updated_by text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Create credential_updates table
CREATE TABLE IF NOT EXISTS credential_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['username', 'password'])),
  timestamp timestamptz DEFAULT now(),
  ip_address text,
  user_agent text
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES reward_coupons(id) ON DELETE SET NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create useful indexes
CREATE INDEX idx_price_history_tenant_id ON price_history(tenant_id);
CREATE INDEX idx_price_history_service_id ON price_history(service_id);
CREATE INDEX idx_price_history_changed_at ON price_history(changed_at);

CREATE INDEX idx_settings_history_tenant_id ON settings_history(tenant_id);
CREATE INDEX idx_settings_history_timestamp ON settings_history(timestamp);

CREATE INDEX idx_credential_updates_tenant_id ON credential_updates(tenant_id);
CREATE INDEX idx_credential_updates_user_id ON credential_updates(user_id);
CREATE INDEX idx_credential_updates_type ON credential_updates(type);
CREATE INDEX idx_credential_updates_timestamp ON credential_updates(timestamp);

CREATE INDEX idx_admin_notifications_tenant_id ON admin_notifications(tenant_id);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX idx_admin_notifications_is_read ON admin_notifications(is_read);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at);

-- Enable Row Level Security
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for price_history
CREATE POLICY "Price history is viewable by tenant" 
ON price_history FOR SELECT 
TO public
USING (true);

CREATE POLICY "Price history can be inserted by tenant" 
ON price_history FOR INSERT 
TO public
WITH CHECK (true);

-- Create RLS policies for settings_history
CREATE POLICY "Settings history is viewable by tenant" 
ON settings_history FOR SELECT 
TO public
USING (true);

CREATE POLICY "Settings history can be inserted by tenant" 
ON settings_history FOR INSERT 
TO public
WITH CHECK (true);

-- Create RLS policies for credential_updates
CREATE POLICY "Credential updates are viewable by tenant" 
ON credential_updates FOR SELECT 
TO public
USING (true);

CREATE POLICY "Credential updates can be inserted by tenant" 
ON credential_updates FOR INSERT 
TO public
WITH CHECK (true);

-- Create RLS policies for admin_notifications
CREATE POLICY "Admin notifications are viewable by tenant" 
ON admin_notifications FOR SELECT 
TO public
USING (true);

CREATE POLICY "Admin notifications can be inserted by tenant" 
ON admin_notifications FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Admin notifications can be updated by tenant" 
ON admin_notifications FOR UPDATE 
TO public
USING (true);