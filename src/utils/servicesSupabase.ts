import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { Service } from '../types';

// Utilidad para mapear Service a formato de Supabase
function mapServiceToSupabase(service: Service, tenantId: string) {
  return {
    id: service.id || uuidv4(),
    tenant_id: tenantId,
    name: service.name,
    category: service.category,
    duration: service.duration,
    price: service.price,
    description: service.description,
    is_active: service.isActive !== false, // default true
    created_at: service.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Obtener todos los servicios de un tenant
export async function getServicesFromSupabase(tenantId: string): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching services from Supabase:', error);
    return [];
  }
  // Mapear campos de Supabase a Service
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    duration: s.duration,
    price: s.price,
    description: s.description,
    isActive: s.is_active,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  })) as Service[];
}

// Guardar (insertar o actualizar) un servicio
export async function saveServiceToSupabase(service: Service, tenantId: string): Promise<boolean> {
  const serviceToSave = mapServiceToSupabase(service, tenantId);
  const { error } = await supabase
    .from('services')
    .upsert([serviceToSave], { onConflict: 'id' });
  if (error) {
    console.error('Error saving service to Supabase:', error);
    return false;
  }
  return true;
}

// Eliminar un servicio
export async function deleteServiceFromSupabase(serviceId: string, tenantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('tenant_id', tenantId);
  if (error) {
    console.error('Error deleting service from Supabase:', error);
    return false;
  }
  return true;
} 