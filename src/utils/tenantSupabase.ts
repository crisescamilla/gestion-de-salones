import { supabase } from './supabaseClient';
import type { Tenant } from '../types/tenant';
import type { TenantOwner } from '../types/tenant';

// Obtener todos los tenants
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true);
  if (error) throw error;
  return data as Tenant[];
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
  return data as Tenant;
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

