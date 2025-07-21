import { supabase } from './supabaseClient';
import type { Tenant } from '../types/tenant';
import type { TenantOwner } from '../types/tenant';

// Obtener todos los tenants
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true);
  if (error) throw error;
  return data.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    businessType: t.business_type, // Mapeo correcto
    logo: t.logo,
    primaryColor: t.primary_color,
    secondaryColor: t.secondary_color,
    address: t.address,
    phone: t.phone,
    email: t.email,
    website: t.website,
    description: t.description,
    isActive: t.is_active,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    ownerId: t.owner_id, // Mapeo correcto
    subscription: {
      plan: t.subscription_plan,
      status: t.subscription_status,
      expiresAt: t.subscription_expires_at,
    },
    settings: {
      allowOnlineBooking: t.allow_online_booking,
      requireApproval: t.require_approval,
      timeZone: t.timezone,
      currency: t.currency,
      language: t.language,
    },
  })) as Tenant[];
}

// Obtener tenant por slug
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  console.log("Consultando Supabase por slug:", slug);
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();
  if (error) {
    console.error("Error consultando Supabase:", error);
    return null;
  }
  console.log("Resultado de Supabase:", data);
  
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    businessType: data.business_type, // Mapeo correcto
    logo: data.logo,
    primaryColor: data.primary_color,
    secondaryColor: data.secondary_color,
    address: data.address,
    phone: data.phone,
    email: data.email,
    website: data.website,
    description: data.description,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    ownerId: data.owner_id, // Mapeo correcto
    subscription: {
      plan: data.subscription_plan,
      status: data.subscription_status,
      expiresAt: data.subscription_expires_at,
    },
    settings: {
      allowOnlineBooking: data.allow_online_booking,
      requireApproval: data.require_approval,
      timeZone: data.timezone,
      currency: data.currency,
      language: data.language,
    },
  } as Tenant;
}

// Crear un nuevo tenant
export async function createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').insert([tenant]).select().single();
  if (error) throw error;
  return data as Tenant;
}

// Guardar propietario en Supabase
export async function createTenantOwner(owner: TenantOwner): Promise<void> {
  const { error } = await supabase.from('tenant_owners').upsert([owner], { onConflict: 'id' });
  if (error) throw error;
}

// Buscar propietario por email y tenant
export async function getTenantOwnerByEmail(email: string, tenantId: string): Promise<TenantOwner | null> {
  const { data, error } = await supabase
    .from('tenant_owners')
    .select('*')
    .eq('email', email)
    .eq('tenant_id', tenantId)
    .single();
  if (error) return null;
  return data as TenantOwner;
}


