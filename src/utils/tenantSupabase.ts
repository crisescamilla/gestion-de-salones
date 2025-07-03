import { supabase } from './supabaseClient';
import type { Tenant } from '../types/tenant';

// Obtener todos los tenants
export async function getTenants(): Promise<Tenant[]> {
  const { data, error } = await supabase.from('tenants').select('*').eq('is_active', true);
  if (error) throw error;
  return data as Tenant[];
}

// Obtener tenant por slug
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase.from('tenants').select('*').eq('slug', slug).eq('is_active', true).single();
  if (error) return null;
  return data as Tenant;
}

// Crear un nuevo tenant
export async function createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
  const { data, error } = await supabase.from('tenants').insert([tenant]).select().single();
  if (error) throw error;
  return data as Tenant;
}
