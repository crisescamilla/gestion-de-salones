"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useTheme } from "../hooks/useTheme"
import { getClients, saveAppointment, getAppointments } from "../utils/storage"
import { saveClientToSupabase } from "../utils/clientsSupabase";
import { getClientsFromSupabase } from "../utils/clientsSupabase";
import { getActiveServices } from "../utils/servicesManager"
import type { Appointment, Client, Service } from "../types"
import { useStaffForServices } from "../hooks/useStaffData"
import { CheckCircle } from "lucide-react"
import {
  getTodayString,
  generateTimeSlots,
} from "../utils/dateUtils"
import {
  isValidDateString,
  filterPastTimeSlots,
  filterBookedTimeSlots,
  getDateFromInput,
} from "../utils/dateHelpers"
import { debugSpecificAppointment } from "../utils/appointmentDebugger"
import { validatePhoneServerSide } from "../utils/phoneValidation"
import PhoneInput from "./PhoneInput"
import { emitEvent, AppEvents } from "../utils/eventManager"
import { createAppointment, updateAppointment } from '../utils/appointmentsSupabase';
import { getCurrentTenant } from '../utils/tenantManager';
import { useTranslation } from 'react-i18next';


interface AppointmentFormProps {
  onClose: () => void
  onSave: () => void
  editingAppointment?: Appointment | null
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onClose, onSave, editingAppointment }) => {
  const { t } = useTranslation();
  const [clients, setClients] = useState<Client[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, error: "" })

  const [formData, setFormData] = useState({
    client_id: "",
    staff_id: "",
    service_ids: [] as string[],
    date: getTodayString(),
    time: "",
    notes: "",
    status: "pending" as Appointment["status"],
  })

  const [newClient, setNewClient] = useState({
    fullName: "",
    email: "",
    phone: "",
  })

  const { colors } = useTheme()

  useEffect(() => {
    const loadData = async () => {
      const currentTenant = getCurrentTenant();
      let clientsData: Client[] = [];
      if (currentTenant?.id) {
        clientsData = await getClientsFromSupabase(currentTenant.id);
      }
      setClients(clientsData);
      const servicesData = await getActiveServices();
      setServices(servicesData);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (editingAppointment) {
      setFormData({
        client_id: editingAppointment.client_id,
        staff_id: editingAppointment.staff_id || "",
        service_ids: editingAppointment.service_ids,
        date: editingAppointment.date,
        time: editingAppointment.time,
        notes: editingAppointment.notes || "",
        status: editingAppointment.status,
      })
    }
  }, [editingAppointment])

  const selectedServices = services.filter((s) => formData.service_ids.includes(s.id))
  const requiredSpecialties = [...new Set(selectedServices.map((service) => service.category))]
  const { availableStaff } = useStaffForServices(requiredSpecialties)

  // ✅ Función mejorada para actualizar horarios disponibles
  const updateAvailableTimeSlots = () => {
    console.log("🕐 Updating available time slots...")
    console.log("Current form data:", {
      date: formData.date,
      staff_id: formData.staff_id,
      service_ids: formData.service_ids,
    })

    // Validar que tenemos los datos necesarios
    if (!formData.date || !isValidDateString(formData.date)) {
      console.log("❌ Invalid or missing date")
      setAvailableTimeSlots([])
      return
    }

    if (formData.service_ids.length === 0) {
      console.log("❌ No services selected")
      setAvailableTimeSlots([])
      return
    }

    try {
      // Calcular duración total de los servicios
      const selectedServices = services.filter((s) => formData.service_ids.includes(s.id))
      const totalDuration = selectedServices.reduce((total, service) => total + service.duration, 0)

      console.log(
        "📋 Selected services:",
        selectedServices.map((s) => s.name),
      )
      console.log("⏱️ Total duration:", totalDuration, "minutes")

      // Obtener todas las citas existentes
      const allAppointments = getAppointments()
      console.log("📅 Total appointments in system:", allAppointments.length)

      // Generar horarios base (9:00 AM a 7:00 PM con descanso de almuerzo)
      let timeSlots = generateTimeSlots(
        "09:00", // Inicio
        "19:00", // Fin
        30, // Intervalos de 30 minutos
        { start: "13:00", end: "14:00" }, // Almuerzo
      )

      console.log("🕐 Generated base time slots:", timeSlots.length)

      // Filtrar horarios pasados si es hoy
      timeSlots = filterPastTimeSlots(formData.date, timeSlots)
      console.log("🕐 After filtering past times:", timeSlots.length)

      // Si hay un staff específico seleccionado, filtrar por sus citas
      if (formData.staff_id) {
        timeSlots = filterBookedTimeSlots(formData.date, timeSlots, allAppointments, formData.staff_id)
        console.log("👤 After filtering staff bookings:", timeSlots.length)
      } else {
        // Si no hay staff específico, mostrar horarios que al menos un staff puede cubrir
        const staffAppointments = allAppointments.filter(
          (apt) =>
            apt.date === formData.date &&
            apt.status !== "cancelled" &&
            availableStaff.some((staff) => staff.id === apt.staff_id),
        )

        // Filtrar horarios que están completamente ocupados por todo el staff disponible
        timeSlots = timeSlots.filter((slot) => {
          const conflictingAppointments = staffAppointments.filter((apt) => apt.time === slot)
          return conflictingAppointments.length < availableStaff.length
        })

        console.log("👥 After filtering for available staff:", timeSlots.length)
      }

      // Excluir la cita que se está editando
      if (editingAppointment) {
        console.log("✏️ Excluding current appointment from conflicts")
      }

      console.log("✅ Final available slots:", timeSlots)
      setAvailableTimeSlots(timeSlots)
    } catch (error) {
      console.error("❌ Error updating time slots:", error)
      setAvailableTimeSlots([])
    }
  }

  // ✅ Efecto para actualizar horarios cuando cambien las dependencias
  useEffect(() => {
    console.log("🔄 Dependencies changed, updating time slots...")
    updateAvailableTimeSlots()
  }, [formData.date, formData.staff_id, formData.service_ids, services, availableStaff, editingAppointment?.id])

  const handlePhoneValidation = (isValid: boolean, error?: string) => {
    setPhoneValidation({ isValid, error: error || "" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const currentTenant = getCurrentTenant();
      if (!currentTenant?.id) {
        alert('No se encontró el tenant actual.');
        setLoading(false);
        return;
      }
      let clientId = formData.client_id;
      // Si no hay client_id pero hay datos de nuevo cliente, crearlo primero
      if (!clientId && newClient.fullName && phoneValidation.isValid) {
        const client: Client = {
          id: '', // Será reemplazado por Supabase
          fullName: newClient.fullName,
          email: newClient.email,
          phone: newClient.phone,
          createdAt: new Date().toISOString(),
        };
        // Guardar cliente en Supabase
        const ok = await saveClientToSupabase(client, currentTenant.id);
        if (!ok) {
          alert('Error al guardar el cliente en Supabase. Intenta de nuevo.');
          setLoading(false);
          return;
        }
        // Recuperar el id generado
        const updatedClients = await getClientsFromSupabase(currentTenant.id);
        setClients(updatedClients);
        const savedClient = updatedClients.find(c => c.email === client.email && c.phone === client.phone);
        if (!savedClient) {
          alert('No se pudo recuperar el cliente guardado. Intenta de nuevo.');
          setLoading(false);
          return;
        }
        clientId = savedClient.id;
      }
      if (!clientId || !formData.staff_id || !currentTenant?.id) {
        alert("Debes seleccionar un cliente, un especialista y un negocio antes de guardar la cita.");
        setLoading(false);
        return;
      }
      const appointmentData = {
        tenant_id: currentTenant.id,
        client_id: clientId,
        staff_id: formData.staff_id,
        service_ids: formData.service_ids,
        date: formData.date,
        time: formData.time,
        status: formData.status,
        total_price: 0, // Puedes calcular el precio total según los servicios seleccionados
        notes: formData.notes,
      };
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, appointmentData);
      } else {
        await createAppointment(appointmentData);
      }
      setLoading(false);
      onSave(); // Esto recarga la lista en el panel administrativo
    } catch (error: any) {
      setLoading(false);
      alert('Error al guardar la cita: ' + (error?.message || JSON.stringify(error)));
    }
  }

  // Safe color access with fallbacks
  const safeColors = {
    surface: colors?.surface || "#ffffff",
    text: colors?.text || "#1f2937",
    textSecondary: colors?.textSecondary || "#6b7280",
    background: colors?.background || "#f8fafc",
    border: colors?.border || "#e5e7eb",
    primary: colors?.primary || "#0ea5e9",
  }

  // Función simple para validar UUID v4
  function isValidUUID(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: safeColors.surface }}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold" style={{ color: safeColors.text }}>
              {editingAppointment ? t('editar_cita') : t('nueva_cita')}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ color: safeColors.textSecondary }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: safeColors.text }}>
                {t('cliente')}
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  borderColor: safeColors.border,
                  backgroundColor: safeColors.surface,
                  color: safeColors.text,
                }}
              >
                <option value="">{t('seleccionar_cliente_existente')}</option>
                {clients.filter(client => isValidUUID(client.id)).map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName}
                  </option>
                ))}
              </select>

              {!formData.client_id && (
                <div className="mt-4 p-4 border rounded-lg" style={{ borderColor: safeColors.border }}>
                  <h4 className="font-medium mb-3" style={{ color: safeColors.text }}>
                    {t('o_crear_nuevo_cliente')}
                  </h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder={t('nombre_completo')}
                      value={newClient.fullName}
                      onChange={(e) => setNewClient({ ...newClient, fullName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: safeColors.background,
                        borderColor: safeColors.border,
                        color: safeColors.text,
                      }}
                      required
                    />

                    {/* Enhanced Phone Input */}
                    <PhoneInput
                      value={newClient.phone}
                      onChange={(value) => setNewClient({ ...newClient, phone: value })}
                      onValidation={handlePhoneValidation}
                      placeholder={t('numero_telefono')}
                      required
                      showFormatHint={true}
                    />

                    <input
                      type="email"
                      placeholder={t('email')}
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{
                        backgroundColor: safeColors.background,
                        borderColor: safeColors.border,
                        color: safeColors.text,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Servicios */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: safeColors.text }}>
                {t('servicios')}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.service_ids.includes(service.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            service_ids: [...formData.service_ids, service.id],
                            time: "", // Reset time when services change
                          })
                        } else {
                          setFormData({
                            ...formData,
                            service_ids: formData.service_ids.filter((id) => id !== service.id),
                            time: "", // Reset time when services change
                          })
                        }
                      }}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: safeColors.primary }}
                    />
                    <span className="ml-2 text-sm" style={{ color: safeColors.text }}>
                      {service.name} - ${service.price} ({service.duration}min)
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <h3 className="text-lg font-medium mb-4 theme-transition" style={{ color: safeColors.text }}>
                {t('seleccionar_especialista')}
              </h3>

              {formData.service_ids.length === 0 ? (
                <div
                  className="p-6 rounded-lg border-2 border-dashed text-center theme-transition"
                  style={{
                    borderColor: safeColors.border,
                    backgroundColor: safeColors.background,
                  }}
                >
                  <p className="theme-transition" style={{ color: safeColors.textSecondary }}>
                    {t('primero_selecciona_servicios')}
                  </p>
                </div>
              ) : availableStaff.length === 0 ? (
                <div
                  className="p-6 rounded-lg border-2 text-center theme-transition"
                  style={{
                    borderColor: "#ef4444",
                    backgroundColor: "#ef444410",
                  }}
                >
                  <p className="font-medium theme-transition" style={{ color: "#ef4444" }}>
                    {t('no_especialistas_disponibles')}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    onClick={() => setFormData((prev) => ({ ...prev, staff_id: "", time: "" }))}
                    className="p-4 rounded-lg border-2 cursor-pointer transition-all theme-transition"
                    style={{
                      borderColor: !formData.staff_id ? safeColors.primary : safeColors.border,
                      backgroundColor: !formData.staff_id ? `${safeColors.primary}0d` : safeColors.surface,
                    }}
                  >
                    <h4 className="font-medium theme-transition" style={{ color: safeColors.text }}>
                      {t('asignacion_automatica')}
                    </h4>
                    <p className="text-sm theme-transition" style={{ color: safeColors.textSecondary }}>
                      {t('asignacion_menos_carga')}
                    </p>
                  </div>

                  {availableStaff.map((staff) => {
                    const selectedServices = services.filter((s) => formData.service_ids.includes(s.id))
                    const canPerformAll = selectedServices.every((service) =>
                      staff.specialties.includes(service.category),
                    )

                    return (
                      <div
                        key={staff.id}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            staff_id: staff.id,
                            time: "", // Reset time when staff changes
                          }))
                        }}
                        className="p-4 rounded-lg border-2 cursor-pointer transition-all theme-transition"
                        style={{
                          borderColor: formData.staff_id === staff.id ? safeColors.primary : safeColors.border,
                          backgroundColor:
                            formData.staff_id === staff.id ? `${safeColors.primary}0d` : safeColors.surface,
                        }}
                      >
                        <div className="flex items-center mb-2">
                          <img
                            src={staff.image || "/placeholder.svg"}
                            alt={staff.name}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium theme-transition" style={{ color: safeColors.text }}>
                              {staff.name}
                            </h4>
                            <p className="text-sm theme-transition" style={{ color: safeColors.textSecondary }}>
                              {staff.role}
                            </p>
                          </div>
                          {canPerformAll && (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: "#10b981" }}
                            >
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeColors.text }}>
                  {t('fecha')}
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    const selectedDate = getDateFromInput(e.target.value)
                    setFormData({ ...formData, date: selectedDate, time: "" }) // Reset time when date changes
                  }}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: safeColors.background,
                    borderColor: safeColors.border,
                    color: safeColors.text,
                  }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: safeColors.text }}>
                  {t('hora')}
                </label>
                <select
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border"
                  style={{
                    backgroundColor: safeColors.background,
                    borderColor: safeColors.border,
                    color: safeColors.text,
                  }}
                  required
                  disabled={formData.service_ids.length === 0}
                >
                  <option value="">
                    {formData.service_ids.length === 0
                      ? t('primero_selecciona_servicios')
                      : availableTimeSlots.length === 0
                        ? t('no_horarios_disponibles')
                        : t('seleccionar_hora')}
                  </option>
                  {availableTimeSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>

                {/* Debug info */}
                {formData.service_ids.length > 0 && (
                  <p className="text-xs mt-1" style={{ color: safeColors.textSecondary }}>
                    {availableTimeSlots.length} {t('horarios_disponibles')}
                  </p>
                )}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: safeColors.text }}>
                {t('notas_opcional')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border"
                style={{
                  backgroundColor: safeColors.background,
                  borderColor: safeColors.border,
                  color: safeColors.text,
                }}
                rows={3}
                placeholder={t('notas_placeholder')}
              />
            </div>

            {/* Botones */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg transition-colors"
                style={{
                  color: safeColors.textSecondary,
                  borderColor: safeColors.border,
                  backgroundColor: safeColors.background,
                }}
                disabled={loading}
              >
                {t('cancelar')}
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: safeColors.primary }}
                disabled={
                  loading ||
                  (!formData.client_id && (!newClient.fullName || !phoneValidation.isValid)) ||
                  formData.service_ids.length === 0 ||
                  !formData.date ||
                  !formData.time
                }
              >
                {loading ? t('guardando') : editingAppointment ? t('actualizar_cita') : t('crear_cita')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AppointmentForm