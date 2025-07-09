"use client"

// ✅ NUEVO: Hook personalizado para gestión reactiva de datos de personal
import { useState, useEffect, useCallback } from "react"
import type { StaffMember, ServiceCategory } from "../types"
import {
  getStaffData,
  getActiveStaff,
  getStaffForServices,
  getStaffById,
  refreshStaffData,
  initializeStaffDataManager,
  saveStaffMember,
} from "../utils/staffDataManager"
import { getStaffFromSupabase } from "../utils/staffSupabase"
import { subscribeToEvent, unsubscribeFromEvent, AppEvents } from "../utils/eventManager"
import { getCurrentTenant } from "../utils/tenantManager"

// Hook para obtener todos los datos de personal
export const useStaffData = (autoRefresh = true) => {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const currentTenant = getCurrentTenant()
  const tenantId = currentTenant?.id

  const refreshData = useCallback(() => {
    console.log("🔄 useStaffData: Refreshing data...")
    setLoading(true)
    try {
      const data = refreshStaffData(tenantId)
      setStaff(data)
      setLastUpdate(new Date())
    } catch (error) {
      console.error("❌ useStaffData: Error refreshing data:", error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    const loadStaff = async () => {
      if (!tenantId) return;

      // 1. Intenta cargar del localStorage
      let localStaff = getStaffData(false, tenantId);

      // 2. Si está vacío, carga de Supabase
      if (!localStaff || localStaff.length === 0) {
        const remoteStaff = await getStaffFromSupabase(tenantId);
        setStaff(remoteStaff);

        // 3. Guarda cada staff en localStorage para futuras cargas rápidas
        for (const s of remoteStaff) {
          await saveStaffMember(s, tenantId);
        }
      } else {
        setStaff(localStaff);
      }
    };

    loadStaff();

    // Inicializar gestor de datos
    initializeStaffDataManager()

    // Cargar datos iniciales
    console.log("🚀 useStaffData: Loading initial data for tenant:", tenantId)
    const initialData = getStaffData(false, tenantId)
    setStaff(initialData)
    setLoading(false)

    if (autoRefresh) {
      // Suscribirse a eventos de cambios
      const handleStaffChange = () => {
        console.log("📡 useStaffData: Staff change detected, refreshing...")
        refreshData()
      }

      subscribeToEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DELETED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)

      return () => {
        unsubscribeFromEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DELETED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)
      }
    }
  }, [autoRefresh, refreshData, tenantId])

  return {
    staff,
    loading,
    lastUpdate,
    refreshData,
    tenantId
  }
}

// Hook para obtener personal activo
export const useActiveStaff = (autoRefresh = true) => {
  const [activeStaff, setActiveStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const currentTenant = getCurrentTenant()
  const tenantId = currentTenant?.id

  const refreshData = useCallback(() => {
    console.log("🔄 useActiveStaff: Refreshing data...")
    setLoading(true)
    try {
      const data = getActiveStaff(true, tenantId)
      setActiveStaff(data)
    } catch (error) {
      console.error("❌ useActiveStaff: Error refreshing data:", error)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    // Cargar datos iniciales
    const initialData = getActiveStaff(false, tenantId)
    setActiveStaff(initialData)
    setLoading(false)

    if (autoRefresh) {
      // Suscribirse a eventos de cambios
      const handleStaffChange = () => {
        console.log("📡 useActiveStaff: Staff change detected, refreshing...")
        refreshData()
      }

      subscribeToEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DELETED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)

      return () => {
        unsubscribeFromEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DELETED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)
      }
    }
  }, [autoRefresh, refreshData, tenantId])

  return {
    activeStaff,
    loading,
    refreshData,
    tenantId
  }
}

// Hook para obtener personal por servicios específicos
export const useStaffForServices = (requiredSpecialties: ServiceCategory[], autoRefresh = true) => {
  const [availableStaff, setAvailableStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const currentTenant = getCurrentTenant()
  const tenantId = currentTenant?.id

  const refreshData = useCallback(() => {
    console.log("🔄 useStaffForServices: Refreshing data for specialties:", requiredSpecialties)
    setLoading(true)
    try {
      const data = getStaffForServices(requiredSpecialties, true, tenantId)
      setAvailableStaff(data)
    } catch (error) {
      console.error("❌ useStaffForServices: Error refreshing data:", error)
    } finally {
      setLoading(false)
    }
  }, [requiredSpecialties, tenantId])

  useEffect(() => {
    if (requiredSpecialties.length === 0) {
      setAvailableStaff([])
      setLoading(false)
      return
    }

    // Cargar datos iniciales
    const initialData = getStaffForServices(requiredSpecialties, false, tenantId)
    setAvailableStaff(initialData)
    setLoading(false)

    if (autoRefresh) {
      // Suscribirse a eventos de cambios
      const handleStaffChange = () => {
        console.log("📡 useStaffForServices: Staff change detected, refreshing...")
        refreshData()
      }

      subscribeToEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DELETED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)

      return () => {
        unsubscribeFromEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DELETED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)
      }
    }
  }, [requiredSpecialties, autoRefresh, refreshData, tenantId])

  return {
    availableStaff,
    loading,
    refreshData,
    tenantId
  }
}

// Hook para obtener un empleado específico por ID
export const useStaffById = (staffId: string, autoRefresh = true) => {
  const [staff, setStaff] = useState<StaffMember | null>(null)
  const [loading, setLoading] = useState(true)
  const currentTenant = getCurrentTenant()
  const tenantId = currentTenant?.id

  const refreshData = useCallback(() => {
    console.log("🔄 useStaffById: Refreshing data for ID:", staffId)
    setLoading(true)
    try {
      const data = getStaffById(staffId, true, tenantId)
      setStaff(data)
    } catch (error) {
      console.error("❌ useStaffById: Error refreshing data:", error)
    } finally {
      setLoading(false)
    }
  }, [staffId, tenantId])

  useEffect(() => {
    if (!staffId) {
      setStaff(null)
      setLoading(false)
      return
    }

    // Cargar datos iniciales
    const initialData = getStaffById(staffId, false, tenantId)
    setStaff(initialData)
    setLoading(false)

    if (autoRefresh) {
      // Suscribirse a eventos de cambios
      const handleStaffChange = () => {
        console.log("📡 useStaffById: Staff change detected, refreshing...")
        refreshData()
      }

      subscribeToEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DELETED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
      subscribeToEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)

      return () => {
        unsubscribeFromEvent(AppEvents.STAFF_UPDATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DELETED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_ACTIVATED, handleStaffChange)
        unsubscribeFromEvent(AppEvents.STAFF_DEACTIVATED, handleStaffChange)
      }
    }
  }, [staffId, autoRefresh, refreshData, tenantId])

  return {
    staff,
    loading,
    refreshData,
    tenantId
  }
}