import { supabase } from './supabaseClient';
import type { Tenant } from '../types/tenant';
import type { TenantOwner } from '../types/tenant';

// Helper function to map Supabase data to Tenant type
const mapSupabaseToTenant = (data: any): Tenant => ({
  id: data.id,
  name: data.name,
  slug: data.slug,
  businessType: data.business_type,
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
  ownerId: data.owner_id,
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
});

// Obtener todos los tenants
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true);
  if (error) throw error;
  return data.map(mapSupabaseToTenant);
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

  return mapSupabaseToTenant(data);
}

// Crear o actualizar un tenant
export async function createOrUpdateTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').upsert({
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    business_type: tenant.businessType,
    logo: tenant.logo,
    primary_color: tenant.primaryColor,
    secondary_color: tenant.secondaryColor,
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    website: tenant.website,
    description: tenant.description,
    is_active: tenant.isActive,
    owner_id: tenant.ownerId,
    subscription_plan: tenant.subscription?.plan,
    subscription_status: tenant.subscription?.status,
    subscription_expires_at: tenant.subscription?.expiresAt,
    allow_online_booking: tenant.settings?.allowOnlineBooking,
    require_approval: tenant.settings?.requireApproval,
    timezone: tenant.settings?.timeZone,
    currency: tenant.settings?.currency,
    language: tenant.settings?.language,
  }, { onConflict: 'id', ignoreDuplicates: false }).select().single();
  
  if (error) {
    // If there's a conflict on slug, try to update by ID instead
    if (error.code === '23505' && error.message.includes('tenants_slug_key')) {
      console.warn('Slug conflict detected, attempting to update by ID:', tenant.id);
      const { data: updatedData, error: updateError } = await supabase.from('tenants').upsert({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        business_type: tenant.businessType,
        logo: tenant.logo,
        primary_color: tenant.primaryColor,
        secondary_color: tenant.secondaryColor,
        address: tenant.address,
        phone: tenant.phone,
        email: tenant.email,
        website: tenant.website,
        description: tenant.description,
        is_active: tenant.isActive,
        owner_id: tenant.ownerId,
        subscription_plan: tenant.subscription?.plan,
        subscription_status: tenant.subscription?.status,
        subscription_expires_at: tenant.subscription?.expiresAt,
        allow_online_booking: tenant.settings?.allowOnlineBooking,
        require_approval: tenant.settings?.requireApproval,
        timezone: tenant.settings?.timeZone,
        currency: tenant.settings?.currency,
        language: tenant.settings?.language,
      }, { onConflict: 'id', ignoreDuplicates: false }).select().single();
      
      if (updateError) throw updateError;
      return mapSupabaseToTenant(updatedData);
    }
    throw error;
  }
  return mapSupabaseToTenant(data);
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

// Obtener tenant por email del propietario
export async function getTenantByOwnerEmail(email: string): Promise<Tenant | null> {
  const { data: ownerData, error: ownerError } = await supabase
    .from("tenant_owners")
    .select("tenant_id")
    .eq("email", email)
    .single();
    
  if (ownerError || !ownerData) {
    console.error("Error fetching owner by email or owner not found:", ownerError);
    return null;
  }
  
  const { data: tenantData, error: tenantError } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", ownerData.tenant_id)
    .eq("is_active", true)
    .single();
    
  if (tenantError || !tenantData) {
    console.error("Error fetching tenant by ID or tenant not found:", tenantError);
    return null;
  }
  
  return mapSupabaseToTenant(tenantData);
}
