"use client"

import { useState, useEffect } from "react"
import type { SalonSettings } from "../types"
import { getSalonSettings, subscribeSalonSettingsChanges } from "../utils/salonSettings"
import { getSalonSettingsFromSupabase, saveSalonSettings } from "../utils/salonSettings";
import { getCurrentTenant } from "../utils/tenantManager";

// Custom hook for real-time salon settings
export const useSalonSettings = () => {
  const [settings, setSettings] = useState<SalonSettings>(getSalonSettings())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      const tenant = getCurrentTenant();
      let localSettings = getSalonSettings();

      // Si no hay settings en localStorage, consulta Supabase
      if (
        (!localSettings || !localSettings.salonName || localSettings.salonName === "El nombre de tu salón") &&
        tenant?.id
      ) {
        try {
          const dbSettings = await getSalonSettingsFromSupabase(tenant.id);
          if (dbSettings) {
            saveSalonSettings(dbSettings, "sync_system");
            setSettings({
              ...localSettings,
              ...dbSettings,
            });
          } else {
            setSettings(localSettings);
          }
        } catch (e) {
          setSettings(localSettings);
        }
      } else {
        setSettings(localSettings);
      }
      setLoading(false);
    };

    fetchSettings();

    // Suscripción a cambios locales
    const unsubscribe = subscribeSalonSettingsChanges((newSettings) => {
      setSettings(newSettings);
    });

    return unsubscribe;
  }, []);

  const refreshSettings = () => {
    setLoading(true)
    try {
      const currentSettings = getSalonSettings()
      setSettings(currentSettings)
    } finally {
      setLoading(false)
    }
  }

  return {
    settings,
    salonName: settings.salonName,
    salonMotto: settings.salonMotto,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    whatsapp: settings.whatsapp,
    instagram: settings.instagram,
    facebook: settings.facebook,
    website: settings.website,
    logo: settings.logo,
    hours: settings.hours,
    loading,
    refreshSettings,
  }
}

// Hook specifically for salon name with real-time updates
export const useSalonName = (): string => {
  const [salonName, setSalonName] = useState<string>(getSalonSettings().salonName)

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setSalonName(settings.salonName)
    })

    return unsubscribe
  }, [])

  return salonName
}

// Hook specifically for salon motto with real-time updates
export const useSalonMotto = (): string => {
  const [salonMotto, setSalonMotto] = useState<string>(getSalonSettings().salonMotto)

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setSalonMotto(settings.salonMotto)
    })

    return unsubscribe
  }, [])

  return salonMotto
}

// Hook for salon address with real-time updates
export const useSalonAddress = (): string => {
  const [address, setAddress] = useState<string>(getSalonSettings().address || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setAddress(settings.address || "")
    })

    return unsubscribe
  }, [])

  return address
}

// Hook for salon phone with real-time updates
export const useSalonPhone = (): string => {
  const [phone, setPhone] = useState<string>(getSalonSettings().phone || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setPhone(settings.phone || "")
    })

    return unsubscribe
  }, [])

  return phone
}

// Hook for salon email with real-time updates
export const useSalonEmail = (): string => {
  const [email, setEmail] = useState<string>(getSalonSettings().email || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setEmail(settings.email || "")
    })

    return unsubscribe
  }, [])

  return email
}

// Hook for salon WhatsApp with real-time updates
export const useSalonWhatsApp = (): string => {
  const [whatsapp, setWhatsApp] = useState<string>(getSalonSettings().whatsapp || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setWhatsApp(settings.whatsapp || "")
    })

    return unsubscribe
  }, [])

  return whatsapp
}

// Hook for salon Instagram with real-time updates
export const useSalonInstagram = (): string => {
  const [instagram, setInstagram] = useState<string>(getSalonSettings().instagram || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setInstagram(settings.instagram || "")
    })

    return unsubscribe
  }, [])

  return instagram
}

// Hook for salon Facebook with real-time updates
export const useSalonFacebook = (): string => {
  const [facebook, setFacebook] = useState<string>(getSalonSettings().facebook || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setFacebook(settings.facebook || "")
    })

    return unsubscribe
  }, [])

  return facebook
}

// Hook for salon website with real-time updates
export const useSalonWebsite = (): string => {
  const [website, setWebsite] = useState<string>(getSalonSettings().website || "")

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      setWebsite(settings.website || "")
    })

    return unsubscribe
  }, [])

  return website
}

// Hook for salon logo with real-time updates
export const useSalonLogo = (): string => {
  const [logo, setLogo] = useState<string>("")
  
  useEffect(() => {
    // First check tenant logo
    const tenant = getCurrentTenant();
    if (tenant && tenant.logo) {
      setLogo(tenant.logo);
    } else {
      // Fallback to salon settings
      const settings = getSalonSettings();
      setLogo(settings.logo || "");
    }
    
    // Subscribe to settings changes
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      // Only update if tenant doesn't have a logo
      const tenant = getCurrentTenant();
      if (!tenant?.logo) {
        setLogo(settings.logo || "");
      }
    });
    
    return unsubscribe;
  }, []);
  
  return logo;
}

// Función para obtener horarios por defecto
const getDefaultHours = () => ({
  monday: { open: "09:00", close: "19:00", isOpen: true },
  tuesday: { open: "09:00", close: "19:00", isOpen: true },
  wednesday: { open: "09:00", close: "19:00", isOpen: true },
  thursday: { open: "09:00", close: "19:00", isOpen: true },
  friday: { open: "09:00", close: "19:00", isOpen: true },
  saturday: { open: "09:00", close: "18:00", isOpen: true },
  sunday: { open: "10:00", close: "18:00", isOpen: false }, // Domingo cerrado por defecto
})

// Hook for salon hours with real-time updates
export const useSalonHours = () => {
  const [hours, setHours] = useState(() => {
    const settings = getSalonSettings()
    return settings.hours || getDefaultHours()
  })

  useEffect(() => {
    const unsubscribe = subscribeSalonSettingsChanges((settings) => {
      console.log("🔄 Salon hours updated in hook:", settings.hours)

      // Si no hay horarios configurados, usar los por defecto
      const updatedHours = settings.hours || getDefaultHours()

      // Asegurar que cada día tenga la estructura correcta
      const normalizedHours = {
        monday: updatedHours.monday || { open: "09:00", close: "19:00", isOpen: true },
        tuesday: updatedHours.tuesday || { open: "09:00", close: "19:00", isOpen: true },
        wednesday: updatedHours.wednesday || { open: "09:00", close: "19:00", isOpen: true },
        thursday: updatedHours.thursday || { open: "09:00", close: "19:00", isOpen: true },
        friday: updatedHours.friday || { open: "09:00", close: "19:00", isOpen: true },
        saturday: updatedHours.saturday || { open: "09:00", close: "18:00", isOpen: true },
        sunday: updatedHours.sunday || { open: "10:00", close: "18:00", isOpen: false },
      }

      console.log("📅 Normalized hours:", normalizedHours)
      console.log("📅 Sunday isOpen status:", normalizedHours.sunday.isOpen)
      setHours(normalizedHours)
    })

    return unsubscribe
  }, [])

  return hours
}