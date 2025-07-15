import { supabase } from './supabaseClient';
import { Appointment } from '../types';

export async function getAppointments(tenant_id: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('tenant_id', tenant_id)
    .order('date', { ascending: true })
    .order('time', { ascending: true });
  if (error) throw error;
  return data as Appointment[];
}

export async function createAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointment])
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
  const { data, error } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function deleteAppointment(id: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
