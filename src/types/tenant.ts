export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL personalizada (ej: mi-salon-belleza)
  businessType: 'salon' | 'barberia' | 'spa' | 'unas' | 'centro-bienestar';
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  subscription: {
    plan: 'basic' | 'premium' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    expiresAt: string;
  };
  settings: {
    allowOnlineBooking: boolean;
    requireApproval: boolean;
    timeZone: string;
    currency: string;
    language: string;
  };
}

export interface TenantOwner {
  phone: null;
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  created_at: string;
  is_active: boolean;
  // ...otros campos si necesitas...
}

export interface TenantContext {
  tenant: Tenant | null;
  owner: TenantOwner | null;
  isLoading: boolean;
  error: string | null;
}

export interface BusinessTypeConfig {
  id: string;
  name: string;
  description: string;
  defaultServices: Array<{
    name: string;
    category: string;
    duration: number;
    price: number;
  }>;
  defaultColors: {
    primary: string;
    secondary: string;
  };
  features: string[];
}