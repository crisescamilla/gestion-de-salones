import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import type { StaffMember } from '../types';

// Mapear StaffMember al formato de Supabase
function mapStaffToSupabase(staff: StaffMember, tenantId: string) {
  return {
    id: staff.id || uuidv4(),
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

// Obtener todos los especialistas de un tenant desde Supabase
export async function getStaffFromSupabase(tenantId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching staff from Supabase:', error);
    return [];
  }

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

// Guardar (insertar o actualizar) un especialista
export async function saveStaffToSupabase(staff: StaffMember, tenantId: string): Promise<boolean> {
  const staffToSave = mapStaffToSupabase(staff, tenantId);
  const { error } = await supabase
    .from('staff')
    .upsert([staffToSave], { onConflict: 'id' });

  if (error) {
    console.error('Error saving staff to Supabase:', error);
    return false;
  }
  return true;
}

// Eliminar un especialista
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
