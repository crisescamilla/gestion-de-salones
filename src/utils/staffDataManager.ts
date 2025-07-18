// ✅ NUEVO: Gestor centralizado de datos de personal con invalidación de caché
import type { StaffMember, ServiceCategory } from "../types"
import { emitEvent, subscribeToEvent, AppEvents } from "./eventManager"
import { getCurrentTenant } from "./tenantManager"
import { syncToSupabase, SyncDataType } from "./crossBrowserSync"
import { saveStaffToSupabase, deleteStaffFromSupabase } from './staffSupabase'
import { v4 as uuidv4 } from 'uuid';

// ✅ MODIFICADO: Clave de almacenamiento con prefijo para tenant
const getStaffStorageKey = (tenantId?: string): string => {
  // Si no se proporciona tenantId, intentar obtenerlo del contexto actual
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  if (!tenantId) {
    console.warn("No tenant ID available, using default storage")
    return "beauty-salon-staff" // Fallback para compatibilidad
  }

  return `tenant-${tenantId}-beauty-salon-staff`
}

// Cache en memoria para mejorar rendimiento (ahora por tenant)
const staffCache: Map<string, StaffMember[]> = new Map()
const cacheTimestamps: Map<string, number> = new Map()
const CACHE_DURATION = 5000 // 5 segundos

// Datos por defecto (importados desde staff.ts)
const defaultStaffMembers: StaffMember[] = [
  {
    id: uuidv4(),
    name: "Isabella Martínez",
    role: "Especialista en Tratamientos Faciales",
    specialties: ["tratamientos-faciales", "tratamientos-corporales"],
    bio: "Especialista certificada en cuidado facial con más de 8 años de experiencia.",
    experience: "8 años",
    image: "https://images.pexels.com/photos/3762800/pexels-photo-3762800.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "10:00", end: "16:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    rating: 4.9,
    completedServices: 1250,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Sofía Hernández",
    role: "Estilista Senior",
    specialties: ["servicios-cabello"],
    bio: "Estilista profesional especializada en colorimetría y cortes modernos.",
    experience: "6 años",
    image: "https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "10:00", end: "18:00", available: true },
      tuesday: { start: "10:00", end: "18:00", available: true },
      wednesday: { start: "10:00", end: "18:00", available: true },
      thursday: { start: "10:00", end: "18:00", available: true },
      friday: { start: "10:00", end: "18:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    rating: 4.8,
    completedServices: 980,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Carmen López",
    role: "Especialista en Uñas",
    specialties: ["servicios-unas"],
    bio: "Técnica certificada en nail art y extensiones.",
    experience: "5 años",
    image: "https://images.pexels.com/photos/3764013/pexels-photo-3764013.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: false },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "10:00", end: "16:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    rating: 4.7,
    completedServices: 750,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Alejandra Ruiz",
    role: "Masajista Terapéutica",
    specialties: ["masajes", "tratamientos-corporales"],
    bio: "Terapeuta certificada en masajes relajantes y descontracturantes.",
    experience: "7 años",
    image: "https://images.pexels.com/photos/3985163/pexels-photo-3985163.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "11:00", end: "19:00", available: true },
      tuesday: { start: "11:00", end: "19:00", available: true },
      wednesday: { start: "11:00", end: "19:00", available: true },
      thursday: { start: "11:00", end: "19:00", available: true },
      friday: { start: "11:00", end: "19:00", available: true },
      saturday: { start: "10:00", end: "16:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: true },
    },
    rating: 4.9,
    completedServices: 1100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Valeria Torres",
    role: "Especialista Integral",
    specialties: ["tratamientos-faciales", "servicios-unas", "tratamientos-corporales"],
    bio: "Especialista versátil con certificaciones múltiples.",
    experience: "4 años",
    image: "https://images.pexels.com/photos/3762879/pexels-photo-3762879.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    rating: 4.6,
    completedServices: 650,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: "Gabriela Morales",
    role: "Directora de Spa",
    specialties: ["masajes", "tratamientos-faciales", "tratamientos-corporales"],
    bio: "Directora y fundadora del spa con más de 12 años de experiencia.",
    experience: "12 años",
    image: "https://images.pexels.com/photos/3985167/pexels-photo-3985167.jpeg?auto=compress&cs=tinysrgb&w=400",
    isActive: true,
    schedule: {
      monday: { start: "10:00", end: "18:00", available: true },
      tuesday: { start: "10:00", end: "18:00", available: true },
      wednesday: { start: "10:00", end: "18:00", available: true },
      thursday: { start: "10:00", end: "18:00", available: true },
      friday: { start: "10:00", end: "18:00", available: true },
      saturday: { start: "10:00", end: "16:00", available: true },
      sunday: { start: "10:00", end: "14:00", available: false },
    },
    rating: 5.0,
    completedServices: 2100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// ✅ Función para invalidar caché de un tenant específico
export const invalidateStaffCache = (tenantId?: string): void => {
  if (tenantId) {
    console.log(`🗑️ Invalidating staff cache for tenant: ${tenantId}`)
    staffCache.delete(tenantId)
    cacheTimestamps.delete(tenantId)
  } else {
    console.log("🗑️ Invalidating all staff cache")
    staffCache.clear()
    cacheTimestamps.clear()
  }
}

// ✅ Función principal para obtener personal (con caché inteligente por tenant)
export const getStaffData = (forceRefresh = false, tenantId?: string): StaffMember[] => {
  // Obtener el tenant actual si no se proporciona uno
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  // Si no hay tenant, devolver datos vacíos
  if (!tenantId) {
    console.warn("⚠️ No tenant ID available for staff data")
    return []
  }

  const now = Date.now()
  const cacheTimestamp = cacheTimestamps.get(tenantId) || 0

  // Verificar si necesitamos refrescar el caché
  if (forceRefresh || !staffCache.has(tenantId) || now - cacheTimestamp > CACHE_DURATION) {
    console.log(`🔄 Refreshing staff cache from localStorage for tenant: ${tenantId}`)

    try {
      if (typeof window === "undefined") {
        staffCache.set(tenantId, defaultStaffMembers)
      } else {
        const storageKey = getStaffStorageKey(tenantId)
        const stored = localStorage.getItem(storageKey)
        
        if (stored) {
          const parsedData = JSON.parse(stored)
          console.log(`📊 Staff data loaded from localStorage for tenant ${tenantId}:`, parsedData.length, "members")
          staffCache.set(tenantId, parsedData)
        } else {
          console.log(`📊 No staff data in localStorage for tenant ${tenantId}, using defaults`)
          // Inicializar localStorage con datos por defecto
          localStorage.setItem(storageKey, JSON.stringify(defaultStaffMembers))
          staffCache.set(tenantId, defaultStaffMembers)
        }
      }

      cacheTimestamps.set(tenantId, now)
    } catch (error) {
      console.error(`❌ Error loading staff data for tenant ${tenantId}:`, error)
      staffCache.set(tenantId, [])
    }
  } else {
    console.log(`✅ Using cached staff data for tenant: ${tenantId}`)
  }

  return staffCache.get(tenantId) || []
}

// ✅ Función para obtener personal activo
export const getActiveStaff = (forceRefresh = false, tenantId?: string): StaffMember[] => {
  const allStaff = getStaffData(forceRefresh, tenantId)
  const activeStaff = allStaff.filter((staff) => staff.isActive)
  console.log(`👥 Active staff members for tenant ${tenantId || 'current'}:`, activeStaff.length, "of", allStaff.length)
  return activeStaff
}

// ✅ Función para obtener personal por especialidades
export const getStaffForServices = (requiredSpecialties: ServiceCategory[], forceRefresh = false, tenantId?: string): StaffMember[] => {
  const activeStaff = getActiveStaff(forceRefresh, tenantId)
  const availableStaff = activeStaff.filter((staff) =>
    requiredSpecialties.some((specialty) => staff.specialties.includes(specialty)),
  )

  console.log(`🎯 Staff available for specialties in tenant ${tenantId || 'current'}:`, {
    requiredSpecialties,
    availableStaff: availableStaff.length,
    staffNames: availableStaff.map((s) => s.name),
  })

  return availableStaff
}

// ✅ Función para obtener personal por ID
export const getStaffById = (staffId: string, forceRefresh = false, tenantId?: string): StaffMember | null => {
  const allStaff = getStaffData(forceRefresh, tenantId)
  const staff = allStaff.find((s) => s.id === staffId) || null

  console.log(`🔍 Staff lookup by ID in tenant ${tenantId || 'current'}:`, { staffId, found: !!staff, name: staff?.name })
  return staff
}

// ✅ Función para obtener personal por especialidad específica
export const getStaffBySpecialty = (specialty: ServiceCategory, forceRefresh = false, tenantId?: string): StaffMember[] => {
  const activeStaff = getActiveStaff(forceRefresh, tenantId)
  const specialtyStaff = activeStaff.filter((staff) => staff.specialties.includes(specialty))

  console.log(`🏷️ Staff for specialty in tenant ${tenantId || 'current'}:`, { specialty, count: specialtyStaff.length })
  return specialtyStaff
}

// ✅ Función para verificar disponibilidad en día específico
export const isStaffAvailableOnDay = (staffId: string, dayOfWeek: string, forceRefresh = false, tenantId?: string): boolean => {
  const staff = getStaffById(staffId, forceRefresh, tenantId)
  if (!staff) return false

  const daySchedule = staff.schedule[dayOfWeek.toLowerCase()]
  const isAvailable = daySchedule ? daySchedule.available : false

  console.log(`📅 Staff availability check in tenant ${tenantId || 'current'}:`, { staffId, dayOfWeek, isAvailable })
  return isAvailable
}

// ✅ Función para guardar datos de personal
export const saveStaffMember = async (staffMember: StaffMember, tenantId?: string): Promise<{ ok: boolean, errorMsg?: string }> => {
  // Obtener el tenant actual si no se proporciona uno
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  // Si no hay tenant, no guardar
  if (!tenantId) {
    console.warn("⚠️ No tenant ID available for saving staff data")
    return { ok: false, errorMsg: "No tenant ID available" };
  }

  try {
    // Guardar en Supabase primero
    const supabaseResult = await saveStaffToSupabase(staffMember, tenantId);
    if (!supabaseResult.ok) {
      return supabaseResult;
    }
    // Si Supabase fue exitoso, guardar en localStorage
    const storageKey = getStaffStorageKey(tenantId)
    const allStaff = getStaffData(true, tenantId)
    const existingIndex = allStaff.findIndex((s) => s.id === staffMember.id)

    if (existingIndex >= 0) {
      // Actualizar miembro existente
      allStaff[existingIndex] = {
        ...staffMember,
        updatedAt: new Date().toISOString()
      }
    } else {
      // Agregar nuevo miembro
      allStaff.push({
        ...staffMember,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
    }

    localStorage.setItem(storageKey, JSON.stringify(allStaff))

    // Invalidar caché para este tenant
    invalidateStaffCache(tenantId)
    // Emitir evento
    emitEvent(AppEvents.STAFF_UPDATED, {
      staffId: staffMember.id,
      tenantId,
      timestamp: new Date().toISOString()
    })
    // Sincronizar con Supabase para compartir entre navegadores
    syncToSupabase(SyncDataType.STAFF);
    console.log(`✅ Staff member saved for tenant ${tenantId}:`, staffMember.id)
    return { ok: true };
  } catch (error: any) {
    console.error(`❌ Error saving staff member for tenant ${tenantId}:`, error)
    return { ok: false, errorMsg: error.message || JSON.stringify(error) };
  }
}

// ✅ Función para eliminar miembro del personal
export const deleteStaffMember = async (staffId: string, tenantId?: string): Promise<boolean> => {
  // Obtener el tenant actual si no se proporciona uno
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  // Si no hay tenant, no eliminar
  if (!tenantId) {
    console.warn("⚠️ No tenant ID available for deleting staff data")
    return false
  }

  try {
    const storageKey = getStaffStorageKey(tenantId)
    const allStaff = getStaffData(true, tenantId)
    const staffToDelete = allStaff.find((s) => s.id === staffId)
    
    if (!staffToDelete) {
      console.warn(`⚠️ Staff member not found for deletion: ${staffId}`)
      return false
    }
    
    const updatedStaff = allStaff.filter((s) => s.id !== staffId)
    localStorage.setItem(storageKey, JSON.stringify(updatedStaff))
    
    // Eliminar en Supabase
    await deleteStaffFromSupabase(staffId, tenantId);

    // Invalidar caché para este tenant
    invalidateStaffCache(tenantId)
    
    // Emitir evento
    emitEvent(AppEvents.STAFF_DELETED, {
      staffId,
      staffName: staffToDelete.name,
      tenantId,
      timestamp: new Date().toISOString()
    })
    
    // Sincronizar con Supabase para compartir entre navegadores
    syncToSupabase(SyncDataType.STAFF);
    
    console.log(`🗑️ Staff member deleted for tenant ${tenantId}:`, staffId)
    return true
  } catch (error) {
    console.error(`❌ Error deleting staff member for tenant ${tenantId}:`, error)
    return false
  }
}

// ✅ Función para forzar actualización de datos
export const refreshStaffData = (tenantId?: string): StaffMember[] => {
  // Obtener el tenant actual si no se proporciona uno
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  // Si no hay tenant, devolver datos vacíos
  if (!tenantId) {
    console.warn("⚠️ No tenant ID available for refreshing staff data")
    return []
  }

  console.log(`🔄 Force refreshing staff data for tenant: ${tenantId}`)
  invalidateStaffCache(tenantId)

  // Emitir evento para notificar a componentes
  emitEvent(AppEvents.STAFF_UPDATED, {
    type: "data_refresh",
    tenantId,
    timestamp: new Date().toISOString(),
  })

  // Sincronizar con Supabase para compartir entre navegadores
  syncToSupabase(SyncDataType.STAFF);

  return getStaffData(true, tenantId)
}

// ✅ Suscribirse a eventos de cambios de personal
export const initializeStaffDataManager = (): void => {
  console.log("🚀 Initializing Staff Data Manager...")

  // Invalidar caché cuando se actualice el personal
  subscribeToEvent(AppEvents.STAFF_UPDATED, (eventData) => {
    console.log("📡 Staff updated event received, invalidating cache...", eventData)
    invalidateStaffCache(eventData.tenantId)
  })

  // Invalidar caché cuando se elimine personal
  subscribeToEvent(AppEvents.STAFF_DELETED, (eventData) => {
    console.log("📡 Staff deleted event received, invalidating cache...", eventData)
    invalidateStaffCache(eventData.tenantId)
  })

  // Invalidar caché cuando se active/desactive personal
  subscribeToEvent(AppEvents.STAFF_ACTIVATED, (eventData) => {
    console.log("📡 Staff activated event received, invalidating cache...", eventData)
    invalidateStaffCache(eventData.tenantId)
  })

  subscribeToEvent(AppEvents.STAFF_DEACTIVATED, (eventData) => {
    console.log("📡 Staff deactivated event received, invalidating cache...", eventData)
    invalidateStaffCache(eventData.tenantId)
  })
}

// ✅ Función de debugging para verificar estado
export const debugStaffData = (tenantId?: string): void => {
  // Obtener el tenant actual si no se proporciona uno
  if (!tenantId) {
    const currentTenant = getCurrentTenant()
    tenantId = currentTenant?.id
  }

  console.log("🔍 === STAFF DATA DEBUG ===")
  console.log("Current tenant ID:", tenantId || "No tenant")
  
  if (tenantId) {
    console.log("Cache status for tenant:", tenantId, {
      hasCacheData: staffCache.has(tenantId),
      cacheAge: staffCache.has(tenantId) ? Date.now() - (cacheTimestamps.get(tenantId) || 0) : "No cache",
      cacheSize: staffCache.get(tenantId)?.length || 0,
    })

    const storageKey = getStaffStorageKey(tenantId)
    const localStorageData = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null
    console.log("LocalStorage status for tenant:", tenantId, {
      hasData: !!localStorageData,
      dataSize: localStorageData ? JSON.parse(localStorageData).length : 0,
      storageKey
    })

    const currentData = getStaffData(false, tenantId)
    console.log("Current staff data for tenant:", tenantId, {
      total: currentData.length,
      active: currentData.filter((s) => s.isActive).length,
      names: currentData.map((s) => s.name),
    })
  }

  // Mostrar todos los tenants con datos en caché
  console.log("All tenants with cached staff data:", {
    tenantIds: Array.from(staffCache.keys()),
    totalCachedTenants: staffCache.size
  })

  console.log("🔍 === END DEBUG ===")
}

// ✅ Función para migrar datos de personal antiguos al nuevo formato por tenant
export const migrateStaffDataToTenants = (): void => {
  try {
    const oldStorageKey = "beauty-salon-staff"
    const oldData = localStorage.getItem(oldStorageKey)
    
    if (oldData) {
      console.log("🔄 Migrating old staff data to tenant-specific storage")
      const staffData = JSON.parse(oldData)
      
      // Obtener todos los tenants
      const tenantsString = localStorage.getItem("beauty-app-tenants")
      if (tenantsString) {
        const tenants = JSON.parse(tenantsString)
        
        // Para cada tenant, crear una copia de los datos
        tenants.forEach((tenant: any) => {
          const tenantStorageKey = getStaffStorageKey(tenant.id)
          
          // Verificar si ya tiene datos
          if (!localStorage.getItem(tenantStorageKey)) {
            localStorage.setItem(tenantStorageKey, JSON.stringify(staffData))
            console.log(`✅ Migrated staff data to tenant: ${tenant.name} (${tenant.id})`)
          }
        })
        
        // No eliminar los datos antiguos por seguridad
        console.log("✅ Staff data migration completed")
      }
    }
  } catch (error) {
    console.error("❌ Error migrating staff data:", error)
  }
}

// ✅ Función para limpiar datos de personal de todos los tenants
export const cleanupAllStaffData = (): number => {
  try {
    console.log("🧹 Cleaning up all staff data...")
    
    // Limpiar caché en memoria
    staffCache.clear()
    cacheTimestamps.clear()
    
    // Obtener todas las claves de localStorage relacionadas con personal
    const keysToRemove = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.includes('beauty-salon-staff')) {
        keysToRemove.push(key)
      }
    }
    
    // Eliminar todas las claves
    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      console.log(`🗑️ Removed: ${key}`)
    })
    
    console.log(`✅ Cleaned up ${keysToRemove.length} staff data entries`)
    
    // Reinicializar con datos por defecto para el tenant actual
    const currentTenant = getCurrentTenant()
    if (currentTenant) {
      const tenantStorageKey = getStaffStorageKey(currentTenant.id)
      localStorage.setItem(tenantStorageKey, JSON.stringify(defaultStaffMembers))
      console.log(`✅ Reinitialized staff data for current tenant: ${currentTenant.name}`)
    }
    
    return keysToRemove.length
  } catch (error) {
    console.error("❌ Error cleaning up staff data:", error)
    return 0
  }
}

// ✅ Función para reparar datos de personal específicos de un tenant
export const repairTenantStaffData = (tenantId: string): boolean => {
  try {
    console.log(`🔧 Repairing staff data for tenant: ${tenantId}`)
    
    // Eliminar datos existentes
    const storageKey = getStaffStorageKey(tenantId)
    localStorage.removeItem(storageKey)
    
    // Reinicializar con datos por defecto
    localStorage.setItem(storageKey, JSON.stringify(defaultStaffMembers))
    
    // Invalidar caché
    invalidateStaffCache(tenantId)
    
    // Sincronizar con Supabase para compartir entre navegadores
    syncToSupabase(SyncDataType.STAFF);
    
    console.log(`✅ Staff data repaired for tenant: ${tenantId}`)
    return true
  } catch (error) {
    console.error(`❌ Error repairing staff data for tenant: ${tenantId}`, error)
    return false
  }
}

// ✅ Hacer funciones disponibles globalmente para debugging
if (typeof window !== "undefined") {
  const w = window as any
  w.debugStaffData = debugStaffData
  w.migrateStaffDataToTenants = migrateStaffDataToTenants
  w.cleanupAllStaffData = cleanupAllStaffData
  w.repairTenantStaffData = repairTenantStaffData
  w.getStaffStorageKey = getStaffStorageKey
}