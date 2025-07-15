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
export const saveSalonSettings = (
  settings: Partial<SalonSettings>,
  updatedBy: string,
): { success: boolean; error?: string } => {
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
    localStorage.setItem(getTenantStorageKey(STORAGE_KEY), JSON.stringify(sanitizedSettings))
    console.log("✅ Settings saved successfully")

    // Notify all listeners about the change
    notifySettingsChange(sanitizedSettings)
    
    // Sync settings to Supabase
    syncToSupabase(SyncDataType.SETTINGS);

    return { success: true }
  } catch (error) {
    console.error("❌ Error saving settings:", error)
    return { success: false, error: "Error al guardar la configuración" }
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
  const { data, error } = await supabase
    .from('salon_settings')
    .select('*')
    .eq('tenant_id', tenant_id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Guarda (inserta o actualiza) la configuración del salón en Supabase.
 */
export async function saveSalonSettingsToSupabase(tenant_id: string, settings: any) {
  // Intenta actualizar primero
  const { data, error } = await supabase
    .from('salon_settings')
    .upsert({ ...settings, tenant_id }, { onConflict: 'tenant_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
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