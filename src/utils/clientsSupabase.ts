import { supabase } from "./supabaseClient";
import type { Client } from "../types";
import { v4 as uuidv4 } from "uuid";

// Mapear Client al formato de Supabase
function mapClientToSupabase(client: Client, tenantId: string) {
  return {
    id: client.id || uuidv4(),
    tenant_id: tenantId,
    full_name: client.fullName,
    email: client.email,
    phone: client.phone,
    total_spent: client.totalSpent || 0,
    rewards_earned: client.rewardsEarned || 0,
    created_at: client.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Guardar (insertar o actualizar) un cliente
// Ahora retorna un objeto { ok: boolean, errorMsg?: string }
export async function saveClientToSupabase(client: Client, tenantId: string): Promise<{ ok: boolean, errorMsg?: string }> {
  try {
    const clientToSave = mapClientToSupabase(client, tenantId);
    console.log("🟦 Intentando guardar cliente en Supabase:", clientToSave);
    const { error } = await supabase
      .from("clients")
      .upsert([clientToSave], { onConflict: "id" });
    if (error) {
      console.error("❌ Error saving client to Supabase:", error);
      console.error("Client data that failed:", clientToSave);
      return { ok: false, errorMsg: error.message || JSON.stringify(error) };
    }
    return { ok: true };
  } catch (error: any) {
    console.error("❌ Exception saving client to Supabase:", error);
    return { ok: false, errorMsg: error.message || JSON.stringify(error) };
  }
}

// Obtener todos los clientes de un tenant
export async function getClientsFromSupabase(tenantId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Error fetching clients from Supabase:", error);
    return [];
  }
  // Mapea los datos si es necesario
  return (data || []).map((c: any) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone,
    totalSpent: c.total_spent,
    rewardsEarned: c.rewards_earned,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

export async function updateClientInSupabase(clientId: string, updates: Partial<Client>) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', clientId)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}
