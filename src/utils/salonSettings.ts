import type { SalonSettings } from "../types"
import { getCurrentTenant } from "./tenantManager"
import { syncToSupabase, SyncDataType } from "./crossBrowserSync"
import { supabase } from './supabaseClient';

const STORAGE_KEY = "beauty-salon-settings"

// Get tenant-specific storage key
const getTenantStorageKey = (key: string): string => {
  const tenant = getCurrentTenant()
  if (tenant) {
    return `tenant-${tenant.id}-${key}`
  }
  return key // Fallback to legacy key for backward compatibility
}

// Default salon settings
const DEFAULT_SALON_SETTINGS: SalonSettings = {
  id: "1",
  salonName: "El nombre de tu salón",
  salonMotto: "Tu Lema",
  address: "Calle, # Número, Colonia, Tijuana, BC, C.P, México",
  phone: "Tu Número de contacto",
  email: "info@salon.com",
  whatsapp: "Tu numero de WhatsApp",
  instagram: "@Tu Instagram",
  facebook: "Tu Facebook",
  logo: "",
  hours: {
    monday: { open: "09:00", close: "19:00", isOpen: true },
    tuesday: { open: "09:00", close: "19:00", isOpen: true },
    wednesday: { open: "09:00", close: "19:00", isOpen: true },
    thursday: { open: "09:00", close: "19:00", isOpen: true },
    friday: { open: "09:00", close: "19:00", isOpen: true },
    saturday: { open: "09:00", close: "18:00", isOpen: true },
    sunday: { open: "10:00", close: "16:00", isOpen: true },
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "system",
}

// Event system for real-time updates
const eventListeners: ((settings: SalonSettings) => void)[] = []

export const subscribeSalonSettingsChanges = (callback: (settings: SalonSettings) => void): (() => void) => {
  eventListeners.push(callback)

  // Return unsubscribe function
  return () => {
    const index = eventListeners.indexOf(callback)
    if (index > -1) {
      eventListeners.splice(index, 1)
    }
  }
}

const notifySettingsChange = (settings: SalonSettings) => {
  console.log("🔔 Notifying settings change:", settings.hours)
  eventListeners.forEach((callback) => {
    try {
      callback(settings)
    } catch (error) {
      console.error("Error in settings change callback:", error)
    }
  })
}

// Get salon settings
export const getSalonSettings = (): SalonSettings => {
  const tenant = getCurrentTenant()
  let defaultSettings = DEFAULT_SALON_SETTINGS

  // Use tenant name if available
  if (tenant) {
    defaultSettings = {
      ...DEFAULT_SALON_SETTINGS,
      salonName: tenant.name,
      salonMotto: tenant.description || DEFAULT_SALON_SETTINGS.salonMotto,
      logo: tenant.logo || DEFAULT_SALON_SETTINGS.logo,
    }
  }

  const stored = localStorage.getItem(getTenantStorageKey(STORAGE_KEY))
  const settings = stored ? JSON.parse(stored) : defaultSettings

  return settings
}

// Save salon settings with validation and real-time sync
export const saveSalonSettings = async (
  settings: Partial<SalonSettings>,
  updatedBy: string,
): Promise<{ success: boolean; error?: string }> => {
  console.log("💾 Saving salon settings:", settings)

  // Input validation básica
  if (settings.salonName && settings.salonName.trim().length === 0) {
    return { success: false, error: "El nombre del salón es requerido" }
  }

  if (settings.salonMotto && settings.salonMotto.trim().length === 0) {
    return { success: false, error: "El lema del salón es requerido" }
  }

  // Validación de email si se proporciona y no está vacío
  if (settings.email && settings.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(settings.email.trim())) {
      return { success: false, error: "El formato del email no es válido" }
    }
  }

  // Validación de teléfono si se proporciona
  if (settings.phone && settings.phone.trim().length > 0) {
    const phoneDigits = settings.phone.replace(/\D/g, "")
    if (phoneDigits.length < 10) {
      return { success: false, error: "El teléfono debe tener al menos 10 dígitos" }
    }
  }

  // Character limits
  if (settings.salonName && settings.salonName.length > 50) {
    return { success: false, error: "El nombre del salón no puede exceder 50 caracteres" }
  }

  if (settings.salonMotto && settings.salonMotto.length > 100) {
    return { success: false, error: "El lema del salón no puede exceder 100 caracteres" }
  }

  // Get current settings
  const currentSettings = getSalonSettings()

  // Sanitize and merge settings
  const sanitizedSettings: SalonSettings = {
    ...currentSettings,
    ...Object.keys(settings).reduce(
      (acc, key) => {
        const value = settings[key as keyof SalonSettings]
        if (typeof value === "string") {
          acc[key as keyof SalonSettings] = value.trim().replace(/[<>]/g, "") as any
        } else {
          acc[key as keyof SalonSettings] = value as any
        }
        return acc
      },
      {} as Partial<SalonSettings>,
    ),
    updatedAt: new Date().toISOString(),
    updatedBy,
  }

  try {
    // 1. Guardar en localStorage primero
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(sanitizedSettings))
    console.log("✅ Settings saved to localStorage successfully")

    // 2. Obtener el tenant actual
    const tenant = getCurrentTenant();
    if (!tenant) {
      console.error("❌ No hay tenant seleccionado");
      return { success: false, error: "No hay tenant seleccionado" };
    }

    console.log("🏢 Tenant actual:", tenant.id);

    // 3. Construir el payload para Supabase con mejor manejo de datos
    const payload = {
      tenant_id: tenant.id,
      salon_name: sanitizedSettings.salonName,
      salon_motto: sanitizedSettings.salonMotto,
      address: sanitizedSettings.address || null,
      phone: sanitizedSettings.phone || null,
      email: sanitizedSettings.email || null,
      whatsapp: sanitizedSettings.whatsapp || null,
      instagram: sanitizedSettings.instagram || null,
      facebook: sanitizedSettings.facebook || null,
      website: sanitizedSettings.website || null,
      logo: sanitizedSettings.logo || null,
      hours: sanitizedSettings.hours ? JSON.stringify(sanitizedSettings.hours) : null, // Serializar el JSON
      updated_at: sanitizedSettings.updatedAt,
      updated_by: sanitizedSettings.updatedBy,
    };

    console.log("📤 Payload para Supabase:", payload);

    // 4. Intentar guardar en Supabase con mejor manejo de errores
    const { data, error } = await supabase
      .from('salon_settings')
      .upsert([payload], { onConflict: 'tenant_id' })
      .select(); // Agregar select para obtener los datos insertados

    console.log("📡 Respuesta de Supabase:", { data, error });

    if (error) {
      console.error("❌ Error al guardar en Supabase:", error);
      
      // Mostrar error más detallado
      let errorMessage = "Error al guardar en Supabase";
      if (error.message) {
        errorMessage += ": " + error.message;
      }
      if (error.details) {
        errorMessage += " - " + error.details;
      }
      if (error.hint) {
        errorMessage += " (Sugerencia: " + error.hint + ")";
      }
      
      console.error("Error detallado:", errorMessage);
      
      // Opcional: mostrar alert solo en desarrollo
      if (process.env.NODE_ENV === 'development') {
        alert(
          "Error al guardar en Supabase:\n\n" +
          JSON.stringify(error, null, 2) +
          "\n\nPayload enviado:\n" +
          JSON.stringify(payload, null, 2)
        );
      }
      
      return { success: false, error: errorMessage };
    }

    console.log("✅ Settings saved to Supabase successfully:", data);

    // 5. Notificar cambios a los listeners
    notifySettingsChange(sanitizedSettings);
    
    // 6. Sincronizar con el sistema de sync cruzado
    try {
      await syncToSupabase(SyncDataType.SETTINGS);
      console.log("✅ Cross-browser sync completed");
    } catch (syncError) {
      console.error("⚠️ Warning: Cross-browser sync failed:", syncError);
      // No fallar toda la operación por esto
    }

    return { success: true }
    
  } catch (error) {
    console.error("❌ Error general al guardar settings:", error)
    return { success: false, error: "Error inesperado al guardar la configuración: " + (error as Error).message }
  }
}

// Get settings history (for audit purposes)
export const getSalonSettingsHistory = () => {
  const stored = localStorage.getItem(getTenantStorageKey("beauty-salon-settings-history"))
  return stored ? JSON.parse(stored) : []
}

// Save settings change to history
export const saveSalonSettingsHistory = (oldSettings: SalonSettings, newSettings: SalonSettings) => {
  const history = getSalonSettingsHistory()
  const change = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    updatedBy: newSettings.updatedBy,
    changes: {
      salonName: {
        from: oldSettings.salonName,
        to: newSettings.salonName,
      },
      salonMotto: {
        from: oldSettings.salonMotto,
        to: newSettings.salonMotto,
      },
      logo: {
        from: oldSettings.logo,
        to: newSettings.logo,
      }
    },
  }

  history.push(change)

  // Keep only last 50 changes
  if (history.length > 50) {
    history.splice(0, history.length - 50)
  }

  localStorage.setItem(getTenantStorageKey("beauty-salon-settings-history"), JSON.stringify(history))
}

/**
 * Obtiene la configuración del salón desde Supabase para el tenant actual.
 */
export async function getSalonSettingsFromSupabase(tenant_id: string) {
  try {
    const { data, error } = await supabase
      .from('salon_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();
    
    if (error) {
      console.error("Error al obtener settings de Supabase:", error);
      throw error;
    }
    
    // Parsear el JSON de hours si existe
    if (data && data.hours && typeof data.hours === 'string') {
      data.hours = JSON.parse(data.hours);
    }
    
    return data;
  } catch (error) {
    console.error("Error en getSalonSettingsFromSupabase:", error);
    throw error;
  }
}

/**
 * Guarda (inserta o actualiza) la configuración del salón en Supabase.
 */
export async function saveSalonSettingsToSupabase(tenant_id: string, settings: any) {
  try {
    // Preparar el payload
    const payload = {
      ...settings,
      tenant_id,
      hours: settings.hours ? JSON.stringify(settings.hours) : null,
      updated_at: new Date().toISOString()
    };

    // Intenta actualizar primero
    const { data, error } = await supabase
      .from('salon_settings')
      .upsert(payload, { onConflict: 'tenant_id' })
      .select()
      .single();
    
    if (error) {
      console.error("Error al guardar settings en Supabase:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Error en saveSalonSettingsToSupabase:", error);
    throw error;
  }
}

// Real-time salon name getter for components
export const useSalonName = (): string => {
  return getSalonSettings().salonName
}

// Real-time salon motto getter for components
export const useSalonMotto = (): string => {
  return getSalonSettings().salonMotto
}

// Real-time salon logo getter for components
export const useSalonLogo = (): string => {
  const tenant = getCurrentTenant();
  if (tenant && tenant.logo) {
    return tenant.logo;
  }
  return getSalonSettings().logo || '';
}