import { supabase } from './supabaseClient';
import type { StaffMember } from '../types';

function mapStaffToSupabase(staff: StaffMember, tenantId: string) {
  return {
    id: staff.id,
    tenant_id: tenantId,
    name: staff.name,
    role: staff.role,
    specialties: staff.specialties,
    bio: staff.bio,
    experience: staff.experience,
    image: staff.image,
    is_active: staff.isActive !== false,
    schedule: staff.schedule,
    rating: staff.rating,
    completed_services: staff.completedServices,
    created_at: staff.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Guardar (insertar o actualizar) un especialista en Supabase
export async function saveStaffToSupabase(staff: StaffMember, tenantId: string): Promise<boolean> {
  const staffToSave = mapStaffToSupabase(staff, tenantId);
  console.log('Intentando guardar en Supabase:', staffToSave);
  const { error } = await supabase
    .from('staff')
    .upsert([staffToSave], { onConflict: 'id' });
  if (error) {
    console.error('Error saving staff to Supabase:', error);
    return false;
  }
  console.log('Guardado exitoso en Supabase');
  return true;
}

// Eliminar un especialista de Supabase
export async function deleteStaffFromSupabase(staffId: string, tenantId: string): Promise<boolean> {
  const { error } = await supabase
    .from('staff')
    .delete()
    .eq('id', staffId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting staff from Supabase:', error);
    return false;
  }
  return true;
}

// Obtener todos los especialistas de un tenant desde Supabase
export async function getStaffFromSupabase(tenantId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error fetching staff from Supabase:', error);
    return [];
  }
  // Mapea los campos de la base de datos al formato de la app
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    specialties: s.specialties,
    bio: s.bio,
    experience: s.experience,
    image: s.image,
    isActive: s.is_active,
    schedule: s.schedule,
    rating: s.rating,
    completedServices: s.completed_services,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  })) as StaffMember[];
} 