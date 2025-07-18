import { supabase } from "./supabaseClient"
import type { StaffMember } from "../types"


// Mapear StaffMember al formato de Supabase
function mapStaffToSupabase(staff: StaffMember, tenantId: string) {
  return {
    id: staff.id,
    tenant_id: tenantId,
    name: staff.name,
    role: staff.role,
    specialties: staff.specialties,
    bio: staff.bio || "",
    experience: staff.experience || "",
    image_url: staff.image || "", // <-- CORRECTO
    is_active: staff.isActive !== false,
    schedule: staff.schedule || {},
    rating: staff.rating || 5.0,
    completed_services: staff.completedServices || 0,
    created_at: staff.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// Mapear datos de Supabase a StaffMember
function mapSupabaseToStaff(data: any): StaffMember {
  return {
    id: data.id,
    name: data.name,
    role: data.role,
    specialties: data.specialties || [],
    bio: data.bio || "",
    experience: data.experience || "",
    image: data.image || "",
    isActive: data.is_active !== false,
    schedule: data.schedule || {},
    rating: data.rating || 5.0,
    completedServices: data.completed_services || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// Obtener todos los especialistas de un tenant desde Supabase
export async function getStaffFromSupabase(tenantId: string): Promise<StaffMember[]> {
  try {
    console.log("🔍 Fetching staff from Supabase for tenant:", tenantId)

    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("❌ Error fetching staff from Supabase:", error)
      return []
    }

    const staffMembers = (data || []).map(mapSupabaseToStaff)
    console.log("✅ Staff fetched from Supabase:", staffMembers.length, "members")

    return staffMembers
  } catch (error) {
    console.error("❌ Exception fetching staff from Supabase:", error)
    return []
  }
}

// Guardar (insertar o actualizar) un especialista
// Ahora retorna { ok: boolean, errorMsg?: string }
export async function saveStaffToSupabase(staff: StaffMember, tenantId: string): Promise<{ ok: boolean, errorMsg?: string }> {
  try {
    console.log("💾 Saving staff to Supabase:", staff.name, "for tenant:", tenantId)

    const staffToSave = mapStaffToSupabase(staff, tenantId)

    const { data, error } = await supabase
      .from("staff")
      .upsert([staffToSave], {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ Error saving staff to Supabase:", error)
      console.error("Staff data that failed:", staffToSave)
      return { ok: false, errorMsg: error.message || JSON.stringify(error) };
    }

    console.log("✅ Staff saved to Supabase successfully:", data)
    return { ok: true };
  } catch (error: any) {
    console.error("❌ Exception saving staff to Supabase:", error)
    return { ok: false, errorMsg: error.message || JSON.stringify(error) };
  }
}

// Eliminar un especialista
export async function deleteStaffFromSupabase(staffId: string, tenantId: string): Promise<boolean> {
  try {
    console.log("🗑️ Deleting staff from Supabase:", staffId, "for tenant:", tenantId)

    const { error } = await supabase.from("staff").delete().eq("id", staffId).eq("tenant_id", tenantId)

    if (error) {
      console.error("❌ Error deleting staff from Supabase:", error)
      return false
    }

    console.log("✅ Staff deleted from Supabase successfully")
    return true
  } catch (error) {
    console.error("❌ Exception deleting staff from Supabase:", error)
    return false
  }
}

// Sincronizar todos los datos de staff de localStorage a Supabase
export async function syncAllStaffToSupabase(tenantId: string, staffMembers: StaffMember[]): Promise<boolean> {
  try {
    console.log("🔄 Syncing all staff to Supabase for tenant:", tenantId, "Count:", staffMembers.length)

    if (staffMembers.length === 0) {
      console.log("ℹ️ No staff members to sync")
      return true
    }

    const staffToSave = staffMembers.map((staff) => mapStaffToSupabase(staff, tenantId))

    const { data, error } = await supabase
      .from("staff")
      .upsert(staffToSave, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error("❌ Error syncing all staff to Supabase:", error)
      return false
    }

    console.log("✅ All staff synced to Supabase successfully:", data?.length, "records")
    return true
  } catch (error) {
    console.error("❌ Exception syncing all staff to Supabase:", error)
    return false
  }
}

// Verificar si la tabla staff existe y tiene la estructura correcta
export async function verifyStaffTable(): Promise<boolean> {
  try {
    console.log("🔍 Verifying staff table structure...")

    const { error } = await supabase.from("staff").select("*").limit(1)

    if (error) {
      console.error("❌ Staff table verification failed:", error)
      return false
    }

    console.log("✅ Staff table verified successfully")
    return true
  } catch (error) {
    console.error("❌ Exception verifying staff table:", error)
    return false
  }
}
