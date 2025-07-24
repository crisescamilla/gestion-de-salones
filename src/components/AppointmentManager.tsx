"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Activity,
  Bug,
  Wrench,
} from "lucide-react"
import { useTheme } from "../hooks/useTheme"
import { getClients, getAppointments, saveAppointment, deleteAppointment } from "../utils/storage"
import { getActiveServices } from "../utils/servicesManager"
import { getStaffData } from "../utils/staffDataManager"
import type { Appointment, Client, Service, StaffMember } from "../types"
import { subscribeToEvent, unsubscribeFromEvent, AppEvents, emitEvent } from "../utils/eventManager"
import AppointmentForm from "./AppointmentForm"
import { getTodayString } from "../utils/dateUtils"
import { isSameDate, formatDateSpanish } from "../utils/dateHelpers"
// ✅ IMPORTAR: Funciones de debugging
import { debugAppointments, repairStaffAssignments } from "../utils/appointmentDebugger"
import { getClientsFromSupabase } from "../utils/clientsSupabase";
import { getCurrentTenant } from "../utils/tenantManager";
import { getAppointments as getAppointmentsSupabase, deleteAppointment as deleteAppointmentSupabase, updateAppointment } from '../utils/appointmentsSupabase';
import { updateClientInSupabase } from '../utils/clientsSupabase';
import { useTranslation } from 'react-i18next';


const AppointmentManager: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [newAppointmentCount, setNewAppointmentCount] = useState(0)
  const [isConnected] = useState(true)
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: string }>>([])
  // ✅ AGREGAR: Estado para debugging
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugResults, setDebugResults] = useState<any[]>([])
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientEditForm, setClientEditForm] = useState({ phone: '', email: '' });

  const { colors } = useTheme()
  const notificationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map())

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  useEffect(() => {
    console.log("🔄 Configurando listeners de eventos en tiempo real...")

    const handleAppointmentCreated = (eventData: any) => {
      console.log("✅ Nueva cita detectada:", eventData)
      loadData()
      setLastUpdate(new Date())
      setNewAppointmentCount((prev) => prev + 1)
      showNotification(t('nueva_cita_creada'), "success")
    }

    const handleAppointmentUpdated = (eventData: any) => {
      console.log("🔄 Cita actualizada:", eventData)
      loadData()
      setLastUpdate(new Date())
    }

    const handleAppointmentDeleted = (eventData: any) => {
      console.log("🗑️ Cita eliminada:", eventData)
      loadData()
      setLastUpdate(new Date())
      showNotification(t('cita_eliminada'), "warning")
    }

    const handleClientCreated = (eventData: any) => {
      console.log("👤 Nuevo cliente creado:", eventData)
      loadData()
      setLastUpdate(new Date())
    }

    const handleStaffUpdated = (eventData: any) => {
      console.log("👥 Staff actualizado:", eventData)
      loadData()
      setLastUpdate(new Date())
    }

    subscribeToEvent(AppEvents.APPOINTMENT_CREATED, handleAppointmentCreated)
    subscribeToEvent(AppEvents.APPOINTMENT_UPDATED, handleAppointmentUpdated)
    subscribeToEvent(AppEvents.APPOINTMENT_DELETED, handleAppointmentDeleted)
    subscribeToEvent(AppEvents.CLIENT_CREATED, handleClientCreated)
    subscribeToEvent(AppEvents.STAFF_UPDATED, handleStaffUpdated)

    return () => {
      console.log("🧹 Limpiando listeners de eventos...")
      unsubscribeFromEvent(AppEvents.APPOINTMENT_CREATED, handleAppointmentCreated)
      unsubscribeFromEvent(AppEvents.APPOINTMENT_UPDATED, handleAppointmentUpdated)
      unsubscribeFromEvent(AppEvents.APPOINTMENT_DELETED, handleAppointmentDeleted)
      unsubscribeFromEvent(AppEvents.CLIENT_CREATED, handleClientCreated)
      unsubscribeFromEvent(AppEvents.STAFF_UPDATED, handleStaffUpdated)
    }
  }, [])

  useEffect(() => {
    if (newAppointmentCount > 0) {
      const timer = setTimeout(() => {
        setNewAppointmentCount(0)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [newAppointmentCount])

  useEffect(() => {
    return () => {
      notificationTimeouts.current.forEach((timeout) => clearTimeout(timeout))
    }
  }, [])

  const loadData = async () => {
    console.log("📊 Cargando datos de citas desde Supabase...");
    try {
      const currentTenant = getCurrentTenant();
      let appointmentsData: Appointment[] = [];
      if (currentTenant?.id) {
        appointmentsData = await getAppointmentsSupabase(currentTenant.id);
      } else {
        appointmentsData = [];
      }
      let clientsData = [];
      if (currentTenant?.id) {
        clientsData = await getClientsFromSupabase(currentTenant.id);
      } else {
        clientsData = await Promise.resolve(getClients()); // fallback, ensure Promise for consistency
      }
      const servicesData = await getActiveServices();
      const staffData = await Promise.resolve(getStaffData());
      setAppointments(appointmentsData)
      setClients(clientsData)
      setServices(servicesData)
      setStaffMembers(staffData)
      appointmentsData.forEach((apt: Appointment) => {
        console.log("📝 Appointment staff assignment:", {
          appointmentId: apt.id,
          staffId: apt.staff_id,
          staffFound: staffData.find((s) => s.id === apt.staff_id)?.name || "NOT FOUND",
        })
      })
    } catch (error) {
      console.error("Error loading data:", error)
      showNotification(t('error_cargar_datos'), "error")
    }
  }

  const showNotification = (message: string, type: "success" | "info" | "warning" | "error") => {
    const id = Date.now().toString()
    const notification = { id, message, type }

    setNotifications((prev) => [...prev, notification])

    const timeout = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      notificationTimeouts.current.delete(id)
    }, 3000)

    notificationTimeouts.current.set(id, timeout)
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const timeout = notificationTimeouts.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      notificationTimeouts.current.delete(id)
    }
  }

  // ✅ AGREGAR: Funciones de debugging
  const handleDebugAppointments = () => {
    console.log("🔍 Ejecutando debugging de citas...")
    const results = debugAppointments()
    setDebugResults(results)
    setShowDebugInfo(true)

    const issuesCount = results.filter((r) => r.issues.length > 0).length
    showNotification(t('debug_completado', { count: issuesCount }), issuesCount > 0 ? "warning" : "success")
  }

  const handleRepairStaffAssignments = () => {
    console.log("🔧 Reparando asignaciones de especialistas...")
    const repairedCount = repairStaffAssignments()

    if (repairedCount > 0) {
      loadData() // Recargar datos después de reparar
      showNotification(t('reparadas_asignaciones', { count: repairedCount }), "success")
    } else {
      showNotification(t('no_problemas_reparar'), "info")
    }
  }

  const filteredAppointments = appointments.filter((appointment: Appointment) => {
    const client = clients.find((c) => c.id === appointment.client_id)
    const appointmentServices = services.filter((s) => appointment.service_ids.includes(s.id))
    const staff = staffMembers.find((s) => s.id === appointment.staff_id)

    const matchesSearch =
      client?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      appointmentServices.some((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      staff?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || appointment.status === statusFilter
    const matchesDate = isSameDate(appointment.date, selectedDate)

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />
      case "completed":
        return <CheckCircle className="w-4 h-4 text-blue-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment["status"]) => {
    try {
      const appointment = appointments.find((apt) => apt.id === appointmentId);
      if (appointment) {
        await updateAppointment(appointmentId, { status: newStatus });
        emitEvent(AppEvents.APPOINTMENT_UPDATED, {
          appointment: { ...appointment, status: newStatus },
          oldStatus: appointment.status,
          newStatus: newStatus,
          isStatusUpdate: true,
          changedBy: "Administrador",
        });
        showNotification(t('estado_actualizado'), "success");
        loadData();
      }
    } catch (error) {
      console.error("Error updating appointment status:", error);
      showNotification(t('error_actualizar_estado'), "error");
    }
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      await deleteAppointmentSupabase(appointmentId);
      showNotification(t('cita_eliminada'), "warning");
      loadData();
    } catch (error) {
      showNotification(t('error_eliminar_cita'), "error");
    }
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setShowAddForm(true)
  }

  const handleFormClose = () => {
    setShowAddForm(false)
    setEditingAppointment(null)
  }

  const handleFormSave = () => {
    setShowAddForm(false);
    setEditingAppointment(null);
    loadData();
  }

  const handleManualRefresh = () => {
    loadData()
    setLastUpdate(new Date())
    setNewAppointmentCount(0)
    showNotification(t('datos_actualizados'), "info")
  }

  return (
    <div className="space-y-6">
      {/* Notificaciones flotantes */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg border-l-4 transition-all duration-300 transform translate-x-0 ${
              notification.type === "success"
                ? "bg-green-50 border-green-500 text-green-800"
                : notification.type === "info"
                  ? "bg-blue-50 border-blue-500 text-blue-800"
                  : notification.type === "warning"
                    ? "bg-yellow-50 border-yellow-500 text-yellow-800"
                    : "bg-red-50 border-red-500 text-red-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {notification.type === "success" && <CheckCircle className="w-5 h-5 mr-2" />}
                {notification.type === "info" && <Activity className="w-5 h-5 mr-2" />}
                {notification.type === "warning" && <AlertCircle className="w-5 h-5 mr-2" />}
                {notification.type === "error" && <XCircle className="w-5 h-5 mr-2" />}
                <span className="font-medium">{notification.message}</span>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-4 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center">
            <h1 className="text-xl font-bold theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {t('gestion_citas')}
            </h1>
            {newAppointmentCount > 0 && (
              <div
                className="ml-3 px-3 py-1 rounded-full text-sm font-medium animate-pulse theme-transition"
                style={{
                  backgroundColor: `${colors?.success || "#10b981"}1a`,
                  color: colors?.success || "#10b981",
                }}
              >
                +{t(newAppointmentCount === 1 ? 'nueva' : 'nuevas', { count: newAppointmentCount })}
              </div>
            )}
            {isConnected && (
              <div className="ml-3 flex items-center">
                <div
                  className="w-2 h-2 rounded-full mr-2 animate-pulse"
                  style={{ backgroundColor: colors?.success || "#10b981" }}
                ></div>
                <span className="text-xs font-medium" style={{ color: colors?.success || "#10b981" }}>
                  {t('en_vivo')}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center mt-1">
            <p className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              {t('administra_citas')}
            </p>
            <div className="ml-4 flex items-center text-xs">
              <Activity className="w-3 h-3 mr-1" style={{ color: colors?.textSecondary || "#6b7280" }} />
              <span style={{ color: colors?.textSecondary || "#6b7280" }}>
                {t('actualizado')}: {lastUpdate.toLocaleTimeString(i18n.language === 'es' ? 'es-ES' : 'en-US')}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm" style={{ color: colors?.textSecondary || "#6b7280" }}>
            📅 {t('mostrando_citas_para')}: <strong>{formatDateSpanish(selectedDate)}</strong> ({selectedDate})
          </div>
          <div className="mt-1 text-xs" style={{ color: colors?.textSecondary || "#6b7280" }}>
            👥 {t('staff_cargado', { count: staffMembers.length })}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {/* ✅ AGREGAR: Botones de debugging */}
          <button
            onClick={handleDebugAppointments}
            className="flex items-center px-3 py-2 rounded-lg transition-colors theme-transition"
            style={{
              backgroundColor: colors?.warning ? `${colors.warning}1a` : "#f59e0b1a",
              color: colors?.warning || "#f59e0b",
            }}
            title={t('diagnosticar_problemas')}
          >
            <Bug className="w-4 h-4" />
          </button>

          <button
            onClick={handleRepairStaffAssignments}
            className="flex items-center px-3 py-2 rounded-lg transition-colors theme-transition"
            style={{
              backgroundColor: colors?.info ? `${colors.info}1a` : "#06b6d41a",
              color: colors?.info || "#06b6d4",
            }}
            title={t('reparar_asignaciones')}
          >
            <Wrench className="w-4 h-4" />
          </button>

          <button
            onClick={handleManualRefresh}
            className="flex items-center px-3 py-2 rounded-lg transition-colors theme-transition"
            style={{
              backgroundColor: colors?.background || "#f8fafc",
              color: colors?.textSecondary || "#6b7280",
            }}
            title={t('actualizar_manual')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center px-4 py-2 rounded-lg font-medium text-white transition-all duration-200 hover:shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${colors?.primary || "#0ea5e9"}, ${colors?.secondary || "#06b6d4"})`,
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('nueva_cita')}
          </button>
        </div>
      </div>

      {/* ✅ AGREGAR: Panel de debugging */}
      {showDebugInfo && (
        <div
          className="p-4 rounded-lg border theme-transition"
          style={{
            backgroundColor: colors?.surface || "#ffffff",
            borderColor: colors?.border || "#e5e7eb",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium" style={{ color: colors?.text || "#1f2937" }}>
              🔍 {t('informacion_debugging')}
            </h3>
            <button onClick={() => setShowDebugInfo(false)} className="text-gray-400 hover:text-gray-600">
              ×
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <strong>{t('total_citas')}:</strong> {debugResults.length}
            </div>
            <div>
              <strong>{t('citas_con_problemas')}:</strong> {debugResults.filter((r) => r.issues.length > 0).length}
            </div>
            <div>
              <strong>{t('citas_sin_especialista')}:</strong> {debugResults.filter((r) => !r.staff && r.appointment.staff_id).length}
            </div>

            {debugResults.filter((r) => r.issues.length > 0).length > 0 && (
              <div className="mt-4">
                <strong>{t('problemas_encontrados')}:</strong>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {debugResults
                    .filter((r) => r.issues.length > 0)
                    .map((result, index) => (
                      <li key={index} className="text-red-600">
                        {t('nueva_cita')} {result.appointment.id}: {result.issues.join(", ")}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || "#6b7280" }}
          />
          <input
            type="text"
            placeholder={t('buscar_citas')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border theme-transition focus:ring-2 focus:ring-opacity-50"
            style={{
              backgroundColor: colors?.surface || "#ffffff",
              borderColor: colors?.border || "#e5e7eb",
              color: colors?.text || "#1f2937",
            }}
          />
        </div>

        <div className="relative">
          <Calendar
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || "#6b7280" }}
          />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              console.log("📅 Date changed from", selectedDate, "to", e.target.value)
              setSelectedDate(e.target.value)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-lg border theme-transition focus:ring-2 focus:ring-opacity-50"
            style={{
              backgroundColor: colors?.surface || "#ffffff",
              borderColor: colors?.border || "#e5e7eb",
              color: colors?.text || "#1f2937",
            }}
          />
        </div>

        <div className="relative">
          <Filter
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 theme-transition"
            style={{ color: colors?.textSecondary || "#6b7280" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border theme-transition focus:ring-2 focus:ring-opacity-50 appearance-none"
            style={{
              backgroundColor: colors?.surface || "#ffffff",
              borderColor: colors?.border || "#e5e7eb",
              color: colors?.text || "#1f2937",
            }}
          >
            <option value="all">{t('todos_los_estados')}</option>
            <option value="confirmed">{t('confirmadas')}</option>
            <option value="pending">{t('pendientes')}</option>
            <option value="completed">{t('completadas')}</option>
            <option value="cancelled">{t('canceladas')}</option>
          </select>
        </div>

        <div
          className="flex items-center justify-center p-2 rounded-lg theme-transition"
          style={{ backgroundColor: colors?.surface || "#ffffff" }}
        >
          <span className="text-sm font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
            {filteredAppointments.length} {t('citas')}
          </span>
        </div>
      </div>

      {/* Appointments List */}
      <div className="grid gap-4">
        {filteredAppointments.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg theme-transition"
            style={{ backgroundColor: colors?.surface || "#ffffff" }}
          >
            <Calendar
              className="w-12 h-12 mx-auto mb-4 theme-transition"
              style={{ color: colors?.textSecondary || "#6b7280" }}
            />
            <h3 className="text-lg font-medium mb-2 theme-transition" style={{ color: colors?.text || "#1f2937" }}>
              {t('no_hay_citas')}
            </h3>
            <p className="theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
              {t('selecciona_otra_fecha')}
            </p>
            <div className="mt-4 text-sm" style={{ color: colors?.textSecondary || "#6b7280" }}>
              <p>{t('fecha_seleccionada')}: {selectedDate}</p>
              <p>{t('total_citas_sistema')}: {appointments.length}</p>
              <p>
                {t('fechas_con_citas')}: {" "}
                {[...new Set(appointments.map((apt) => apt.date))]
                  .sort()
                  .map((date) => `${date} (${appointments.filter((apt) => apt.date === date).length})`)
                  .join(", ")}
              </p>
            </div>
          </div>
        ) : (
          filteredAppointments.map((appointment: Appointment) => {
            const client = clients.find((c) => c.id === appointment.client_id)
            const appointmentServices = services.filter((s) => appointment.service_ids.includes(s.id))
            const staff = staffMembers.find((s) => s.id === appointment.staff_id)

            console.log("🔍 Rendering appointment:", {
              appointmentId: appointment.id,
              staffId: appointment.staff_id,
              staffFound: staff,
              staffName: staff?.name,
              allStaffIds: staffMembers.map((s) => s.id),
            })

            return (
              <div
                key={appointment.id}
                className="p-6 rounded-lg border theme-transition hover:shadow-md transition-all duration-200"
                style={{
                  backgroundColor: colors?.surface || "#ffffff",
                  borderColor: colors?.border || "#e5e7eb",
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Client Info */}
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <User
                          className="w-4 h-4 mr-2 theme-transition"
                          style={{ color: colors?.primary || "#0ea5e9" }}
                        />
                        <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                          {client?.fullName || t('cliente_no_encontrado')}
                        </span>
                        {client && (
                          <button
                            onClick={() => {
                              setEditingClient(client);
                              setClientEditForm({ phone: client.phone, email: client.email });
                            }}
                            className="ml-2 p-1 rounded transition-colors theme-transition"
                            style={{ color: colors?.info || "#3b82f6", backgroundColor: `${colors?.info || "#3b82f6"}0d` }}
                            title={t('editar_cliente')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {client && (
                        <>
                          <div
                            className="flex items-center text-sm theme-transition"
                            style={{ color: colors?.textSecondary || "#6b7280" }}
                          >
                            <Phone className="w-3 h-3 mr-1" />
                            {client.phone}
                          </div>
                          <div
                            className="flex items-center text-sm theme-transition"
                            style={{ color: colors?.textSecondary || "#6b7280" }}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            {client.email}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Service & Staff */}
                    <div className="space-y-1">
                      <div className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                        {appointmentServices.map((s) => s.name).join(", ") || t('servicios_no_encontrados')}
                      </div>

                      <div className="space-y-1">
                        {staff ? (
                          <div className="flex items-center">
                            <img
                              src={staff.image || "/placeholder.svg?height=24&width=24"}
                              alt={staff.name}
                              className="w-6 h-6 rounded-full object-cover mr-2"
                            />
                            <div>
                              <div
                                className="text-sm font-medium theme-transition"
                                style={{ color: colors?.text || "#1f2937" }}
                              >
                                {staff.name}
                              </div>
                              <div
                                className="text-xs theme-transition"
                                style={{ color: colors?.textSecondary || "#6b7280" }}
                              >
                                {staff.role}
                              </div>
                            </div>
                          </div>
                        ) : appointment.staff_id ? (
                          <div className="text-sm">
                            <span style={{ color: colors?.error || "#ef4444" }}>{t('especialista_no_encontrado')}</span>
                            <div className="text-xs" style={{ color: colors?.textSecondary || "#6b7280" }}>
                              ID: {appointment.staff_id}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm" style={{ color: colors?.warning || "#f59e0b" }}>
                            {t('sin_especialista')}
                          </div>
                        )}
                      </div>

                      <div className="text-sm theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
                        {appointmentServices.reduce((total, s) => total + s.duration, 0)} min • $
                        {appointment.total_price}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Clock
                          className="w-4 h-4 mr-2 theme-transition"
                          style={{ color: colors?.primary || "#0ea5e9" }}
                        />
                        <span className="font-medium theme-transition" style={{ color: colors?.text || "#1f2937" }}>
                          {appointment.time}
                        </span>
                      </div>
                      <div className="text-sm theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
                        {formatDateSpanish(appointment.date)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="space-y-2">
                      <div className="flex items-center">
                        {getStatusIcon(appointment.status)}
                        <span
                          className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                        >
                          {appointment.status === "confirmed" && t('confirmada')}
                          {appointment.status === "pending" && t('pendiente')}
                          {appointment.status === "cancelled" && t('cancelada')}
                          {appointment.status === "completed" && t('completada')}
                        </span>
                      </div>
                      {appointment.notes && (
                        <div className="text-xs theme-transition" style={{ color: colors?.textSecondary || "#6b7280" }}>
                          {appointment.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <select
                      value={appointment.status}
                      onChange={(e) => handleStatusChange(appointment.id, e.target.value as Appointment["status"])}
                      className="px-3 py-1 rounded border text-sm theme-transition"
                      style={{
                        backgroundColor: colors?.surface || "#ffffff",
                        borderColor: colors?.border || "#e5e7eb",
                        color: colors?.text || "#1f2937",
                      }}
                    >
                      <option value="pending">{t('pendiente')}</option>
                      <option value="confirmed">{t('confirmada')}</option>
                      <option value="completed">{t('completada')}</option>
                      <option value="cancelled">{t('cancelada')}</option>
                    </select>

                    <button
                      onClick={() => handleEditAppointment(appointment)}
                      className="p-2 rounded-lg transition-colors theme-transition"
                      style={{
                        color: colors?.primary || "#0ea5e9",
                        backgroundColor: `${colors?.primary || "#0ea5e9"}0d`,
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteAppointment(appointment.id)}
                      className="p-2 rounded-lg transition-colors theme-transition"
                      style={{
                        color: colors?.error || "#ef4444",
                        backgroundColor: `${colors?.error || "#ef4444"}0d`,
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <AppointmentForm onClose={handleFormClose} onSave={handleFormSave} editingAppointment={editingAppointment} />
      )}

      {/* Modal de edición de cliente */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('editar_cliente')}</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await updateClientInSupabase(editingClient.id, clientEditForm);
                  showNotification(t('cliente_actualizado'), 'success');
                  setEditingClient(null);
                  loadData();
                } catch (error) {
                  showNotification(t('error_actualizar_cliente'), 'error');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">{t('telefono')}</label>
                <input
                  type="text"
                  value={clientEditForm.phone}
                  onChange={(e) => setClientEditForm({ ...clientEditForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('correo_electronico')}</label>
                <input
                  type="email"
                  value={clientEditForm.email}
                  onChange={(e) => setClientEditForm({ ...clientEditForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded border"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                  {t('cancelar')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                >
                  {t('guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppointmentManager