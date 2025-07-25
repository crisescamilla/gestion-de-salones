"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Calendar, Clock, User, Mail, CheckCircle, MessageSquare, Send, AlertCircle, Users, Info } from "lucide-react"
import type { Client, Service } from "../types"
import { saveClientToSupabase, getClientsFromSupabase } from '../utils/clientsSupabase';
import { createAppointment } from '../utils/appointmentsSupabase';
import { getCurrentTenant } from '../utils/tenantManager';
import { formatDateTime, generateDateRange, getTodayString } from "../utils/dateUtils"
import { sendAppointmentConfirmation } from "../utils/notifications"
import { useStaffById } from "../hooks/useStaffData"
import { useSalonName, useSalonMotto, useSalonHours } from "../hooks/useSalonSettings"
import { useTheme } from "../hooks/useTheme"
import { validatePhoneServerSide } from "../utils/phoneValidation"
import ServiceSelector from "./ServiceSelector"
import StaffSelector from "./StaffSelector"
import PhoneInput from "./PhoneInput"
import { useTranslation } from 'react-i18next';

const ClientBooking: React.FC = () => {
  const [step, setStep] = useState(1)
  const [clientData, setClientData] = useState<Partial<Client>>({})
  const [selectedServices, setSelectedServices] = useState<Service[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedTime, setSelectedTime] = useState("")
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [phoneValidation, setPhoneValidation] = useState({ isValid: true, error: "" })
  const [notificationStatus, setNotificationStatus] = useState<{
    sms: { success: boolean; message: string } | null
    email: { success: boolean; message: string } | null
    loading: boolean
  }>({
    sms: null,
    email: null,
    loading: false,
  })

  const salonName = useSalonName() || "Salón de Belleza"
  const salonMotto = useSalonMotto() || "Tu belleza es nuestra pasión"
  const salonHours = useSalonHours()
  const { colors } = useTheme()
  const { t } = useTranslation();

  const staffResult = useStaffById(selectedStaffId)
  const selectedStaff = staffResult?.staff || null

  // Generar fechas disponibles basadas en los horarios del salón
  useEffect(() => {
    try {
      console.log("🏢 Generating available dates with salon hours:", salonHours)
      const dates = generateDateRange(new Date(), 14, salonHours)
      setAvailableDates(dates)

      // Si la fecha seleccionada ya no está disponible, limpiarla
      if (selectedDate && !dates.includes(selectedDate)) {
        setSelectedDate("")
        setSelectedTime("")
        setAvailableSlots([])
      }
    } catch (error) {
      console.error("Error generating available dates:", error)
      // Fallback: generar fechas sin filtrar
      setAvailableDates(generateDateRange(new Date(), 14))
    }
  }, [salonHours, selectedDate])

  useEffect(() => {
    try {
      if (selectedDate) {
        console.log("📅 Getting available slots for date:", selectedDate)
        console.log("🕐 Using salon hours:", salonHours)

        if (!selectedDate || selectedDate.length !== 10) {
          console.warn("⚠️ Invalid date format:", selectedDate)
          setAvailableSlots([])
          return
        }

        const slots = getAvailableTimeSlotsWithConfig(selectedDate, salonHours)
        console.log("🎯 Generated slots:", slots)

        if (selectedDate === getTodayString()) {
          const now = new Date()
          const currentHour = now.getHours()
          const currentMinute = now.getMinutes()

          const filteredSlots = slots.filter((timeSlot) => {
            try {
              const [hours, minutes] = timeSlot.split(":").map(Number)
              const slotMinutes = hours * 60 + minutes
              const currentMinutes = currentHour * 60 + currentMinute + 30

              return slotMinutes > currentMinutes
            } catch (error) {
              console.error("Error processing time slot:", timeSlot, error)
              return false
            }
          })

          setAvailableSlots(filteredSlots)
          console.log(`⏰ Filtrando slots pasados: ${slots.length} → ${filteredSlots.length} disponibles`)
        } else {
          setAvailableSlots(slots)
        }
      }
    } catch (error) {
      console.error("Error updating available time slots:", error)
      setAvailableSlots([])
    }
  }, [selectedDate, salonHours])

  const handlePhoneValidation = (isValid: boolean, error?: string) => {
    setPhoneValidation({ isValid, error: error || "" })
  }

  const handleClientSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (clientData.fullName && clientData.phone && clientData.email && phoneValidation.isValid) {
        setStep(2)
      }
    } catch (error) {
      console.error("Error in handleClientSubmit:", error)
    }
  }

  const handleServiceSelection = (services: Service[]) => {
    try {
      setSelectedServices(services)
      if (services.length > 0) {
        setStep(3)
      }
    } catch (error) {
      console.error("Error in handleServiceSelection:", error)
    }
  }

  const handleStaffSelection = (staffId: string) => {
    try {
      setSelectedStaffId(staffId)
      if (staffId) {
        setStep(4)
      }
    } catch (error) {
      console.error("Error in handleStaffSelection:", error)
    }
  }

  const handleDateTimeSubmit = () => {
    try {
      if (selectedDate && selectedTime) {
        setStep(5)
      }
    } catch (error) {
      console.error("Error in handleDateTimeSubmit:", error)
    }
  }

  const handleBookingConfirm = async () => {
    try {
      setNotificationStatus({ sms: null, email: null, loading: true })

      // Server-side phone validation
      const phoneValidationResult = validatePhoneServerSide(clientData.phone!)

      if (!phoneValidationResult.isValid) {
        alert(`Error en el teléfono: ${phoneValidationResult.error}`)
        setNotificationStatus({ sms: null, email: null, loading: false })
        return
      }

      const currentTenant = getCurrentTenant();
      if (!currentTenant?.id) {
        alert('No se encontró el negocio actual.');
        setNotificationStatus({ sms: null, email: null, loading: false })
        return;
      }

      // Guardar cliente en Supabase
      const client: Client = {
        id: '', // Será reemplazado por Supabase
        fullName: clientData.fullName!,
        phone: clientData.phone!,
        email: clientData.email!,
        createdAt: new Date().toISOString(),
      };
      const ok = await saveClientToSupabase(client, currentTenant.id);
      if (!ok) {
        alert('Error al guardar el cliente en Supabase. Intenta de nuevo.');
        setNotificationStatus({ sms: null, email: null, loading: false })
        return;
      }
      // Recuperar el id generado
      const updatedClients = await getClientsFromSupabase(currentTenant.id);
      const savedClient = updatedClients.find(c => c.email === client.email && c.phone === client.phone);
      if (!savedClient) {
        alert('No se pudo recuperar el cliente guardado. Intenta de nuevo.');
        setNotificationStatus({ sms: null, email: null, loading: false })
        return;
      }
      // Guardar cita en Supabase
      const appointmentData = {
        tenant_id: currentTenant.id,
        client_id: savedClient.id,
        staff_id: selectedStaffId,
        service_ids: selectedServices.map((s) => s.id),
        date: selectedDate,
        time: selectedTime,
        status: 'confirmed',
        total_price: selectedServices.reduce((sum, service) => sum + service.price, 0),
        notes: '',
      };
      const createdAppointment = await createAppointment(appointmentData);

      // Send notifications
      try {
        const notificationResult = await sendAppointmentConfirmation(savedClient, createdAppointment, selectedServices)

        setNotificationStatus({
          sms: notificationResult.sms,
          email: notificationResult.email,
          loading: false,
        })
      } catch (notificationError) {
        setNotificationStatus({ sms: null, email: null, loading: false })
      }
      setStep(6) // Avanzar a paso de confirmación
    } catch (error) {
      alert('Error al guardar la cita: ' + (error as any)?.message || JSON.stringify(error))
      setNotificationStatus({ sms: null, email: null, loading: false })
    }
  }

  const totalDuration = selectedServices.reduce((sum, service) => {
    try {
      return sum + (service.duration || 0)
    } catch (error) {
      console.error("Error calculating duration:", error)
      return sum
    }
  }, 0)

  const totalPrice = selectedServices.reduce((sum, service) => {
    try {
      return sum + (service.price || 0)
    } catch (error) {
      console.error("Error calculating price:", error)
      return sum
    }
  }, 0)

  const safeColors = {
    background: colors?.background || "#f8fafc",
    surface: colors?.surface || "#ffffff",
    primary: colors?.primary || "#0ea5e9",
    secondary: colors?.secondary || "#06b6d4",
    text: colors?.text || "#1f2937",
    textSecondary: colors?.textSecondary || "#6b7280",
    border: colors?.border || "#e5e7eb",
    success: colors?.success || "#10b981",
    error: colors?.error || "#ef4444",
    warning: colors?.warning || "#f59e0b",
    info: colors?.info || "#3b82f6",
  }

  return (
    <div
      className="min-h-screen p-4 theme-transition"
      style={{
        background: `linear-gradient(135deg, ${safeColors.background}, ${safeColors.surface})`,
      }}
    >
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-3xl shadow-xl overflow-hidden border theme-transition"
          style={{
            backgroundColor: `${safeColors.surface}e6`,
            backdropFilter: "blur(10px)",
            borderColor: `${safeColors.border}33`,
          }}
        >
          <div
            className="p-8 text-white theme-transition"
            style={{
              background: `linear-gradient(135deg, ${safeColors.primary}, ${safeColors.secondary})`,
            }}
          >
            <h1 className="text-3xl font-bold mb-2">{t('booking.title')}</h1>
            <p className="opacity-90">{salonMotto}</p>

            {/* Progress Bar */}
            <div className="mt-6 flex items-center space-x-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      step >= num ? "bg-white text-blue-600" : "bg-white bg-opacity-30 text-white"
                    }`}
                  >
                    {num}
                  </div>
                  {num < 5 && (
                    <div className={`w-12 h-1 transition-all ${step > num ? "bg-white" : "bg-white bg-opacity-30"}`} />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between text-xs opacity-80">
              <span>{t('booking.data')}</span>
              <span>{t('booking.services')}</span>
              <span>{t('booking.specialist')}</span>
              <span>{t('booking.date')}</span>
              <span>{t('booking.confirm')}</span>
            </div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 theme-transition" style={{ color: safeColors.text }}>
                  {t('booking.clientInfo')}
                </h2>

                <form onSubmit={handleClientSubmit} className="space-y-6">
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                      style={{ color: safeColors.textSecondary }}
                    />
                    <input
                      type="text"
                      placeholder={t('booking.fullName')}
                      className="w-full pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:border-transparent transition-all theme-transition"
                      style={{
                        border: `1px solid ${safeColors.border}`,
                        backgroundColor: safeColors.surface,
                        color: safeColors.text,
                      }}
                      value={clientData.fullName || ""}
                      onChange={(e) => setClientData({ ...clientData, fullName: e.target.value })}
                      required
                    />
                  </div>

                  {/* Enhanced Phone Input */}
                  <PhoneInput
                    value={clientData.phone || ""}
                    onChange={(value) => setClientData({ ...clientData, phone: value })}
                    onValidation={handlePhoneValidation}
                    placeholder={t('booking.phone')}
                    required
                    showFormatHint={true}
                  />

                  <div className="relative">
                    <Mail
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5"
                      style={{ color: safeColors.textSecondary }}
                    />
                    <input
                      type="email"
                      placeholder={t('booking.email')}
                      className="w-full pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:border-transparent transition-all theme-transition"
                      style={{
                        border: `1px solid ${safeColors.border}`,
                        backgroundColor: safeColors.surface,
                        color: safeColors.text,
                      }}
                      value={clientData.email || ""}
                      onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                      required
                      pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!phoneValidation.isValid}
                    className="w-full text-white py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed theme-transition"
                    style={{
                      background: `linear-gradient(135deg, ${safeColors.primary}, ${safeColors.secondary})`,
                    }}
                  >
                    {t('booking.continue')}
                  </button>
                </form>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 theme-transition" style={{ color: safeColors.text }}>
                  Selecciona tus Servicios
                </h2>
                <ServiceSelector onServiceSelect={handleServiceSelection} />
              </div>
            )}

            {step === 3 && (
              <div>
                <h2
                  className="text-2xl font-semibold mb-6 flex items-center theme-transition"
                  style={{ color: safeColors.text }}
                >
                  <Users className="w-8 h-8 mr-3" style={{ color: safeColors.primary }} />
                  Elige tu Especialista
                </h2>
                <StaffSelector
                  selectedServices={selectedServices}
                  onStaffSelect={handleStaffSelection}
                  selectedStaffId={selectedStaffId}
                />

                {selectedStaffId && (
                  <div className="mt-8 text-center">
                    <button
                      onClick={() => setStep(4)}
                      className="text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 theme-transition"
                      style={{
                        background: `linear-gradient(135deg, ${safeColors.primary}, ${safeColors.secondary})`,
                      }}
                    >
                      Continuar con Fecha y Hora
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 theme-transition" style={{ color: safeColors.text }}>
                  Fecha y Hora
                </h2>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3
                      className="text-lg font-medium mb-4 flex items-center theme-transition"
                      style={{ color: safeColors.text }}
                    >
                      <Calendar className="w-5 h-5 mr-2" style={{ color: safeColors.primary }} />
                      Seleccionar Fecha
                    </h3>
                    {availableDates.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {availableDates.map((date) => (
                          <button
                            key={date}
                            onClick={() => {
                              setSelectedDate(date)
                              setSelectedTime("")
                            }}
                            className="p-3 rounded-lg border text-sm font-medium transition-all theme-transition"
                            style={{
                              backgroundColor: selectedDate === date ? safeColors.primary : safeColors.surface,
                              color: selectedDate === date ? "white" : safeColors.text,
                              borderColor: selectedDate === date ? safeColors.primary : safeColors.border,
                            }}
                          >
                            {(() => {
                              try {
                                const [year, month, day] = date.split("-").map(Number)
                                const safeDate = new Date(year, month - 1, day)
                                return safeDate.toLocaleDateString("es-ES", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })
                              } catch (error) {
                                console.error("Error formatting date:", date, error)
                                return date
                              }
                            })()}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p style={{ color: safeColors.textSecondary }}>
                          No hay fechas disponibles. El salón podría estar cerrado temporalmente.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3
                      className="text-lg font-medium mb-4 flex items-center theme-transition"
                      style={{ color: safeColors.text }}
                    >
                      <Clock className="w-5 h-5 mr-2" style={{ color: safeColors.primary }} />
                      Horarios Disponibles
                    </h3>
                    {selectedDate ? (
                      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                        {availableSlots.length > 0 ? (
                          availableSlots.map((time) => (
                            <button
                              key={time}
                              onClick={() => setSelectedTime(time)}
                              className="p-2 rounded-lg border text-sm font-medium transition-all theme-transition"
                              style={{
                                backgroundColor: selectedTime === time ? safeColors.primary : safeColors.surface,
                                color: selectedTime === time ? "white" : safeColors.text,
                                borderColor: selectedTime === time ? safeColors.primary : safeColors.border,
                              }}
                            >
                              {time}
                            </button>
                          ))
                        ) : (
                          <div className="col-span-3 text-center py-4">
                            <p style={{ color: safeColors.textSecondary }}>
                              No hay horarios disponibles para esta fecha
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center py-8 theme-transition" style={{ color: safeColors.textSecondary }}>
                        Primero selecciona una fecha
                      </p>
                    )}

                    {selectedDate === getTodayString() && (
                      <div
                        className="mt-4 p-3 rounded-lg text-sm"
                        style={{
                          backgroundColor: `${safeColors.info}10`,
                          color: safeColors.info,
                        }}
                      >
                        <div className="flex items-center">
                          <Info className="w-4 h-4 mr-2" />
                          <span>Los horarios que ya han pasado no se muestran</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDate && selectedTime && (
                  <div
                    className="mt-8 p-6 rounded-xl border theme-transition"
                    style={{
                      backgroundColor: `${safeColors.primary}0d`,
                      borderColor: `${safeColors.primary}33`,
                    }}
                  >
                    <h4 className="font-semibold mb-4 theme-transition" style={{ color: safeColors.primary }}>
                      Resumen de la Cita
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p className="theme-transition" style={{ color: safeColors.text }}>
                        <strong>Especialista:</strong> {selectedStaff?.name || "Se asignará automáticamente"}{" "}
                        {selectedStaff?.role && `- ${selectedStaff.role}`}
                      </p>
                      <p className="theme-transition" style={{ color: safeColors.text }}>
                        <strong>Fecha y Hora:</strong> {formatDateTime(selectedDate, selectedTime)}
                      </p>
                      <p className="theme-transition" style={{ color: safeColors.text }}>
                        <strong>Duración:</strong> {totalDuration} minutos
                      </p>
                      <p className="theme-transition" style={{ color: safeColors.text }}>
                        <strong>Total:</strong> ${totalPrice}
                      </p>
                    </div>

                    <button
                      onClick={handleDateTimeSubmit}
                      className="w-full mt-4 text-white py-2 rounded-lg transition-colors theme-transition"
                      style={{ backgroundColor: safeColors.primary }}
                    >
                      Confirmar Horario
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-2xl font-semibold mb-6 theme-transition" style={{ color: safeColors.text }}>
                  Confirmación de Cita
                </h2>

                <div
                  className="rounded-xl p-6 mb-6 theme-transition"
                  style={{ backgroundColor: safeColors.background }}
                >
                  <h3 className="font-semibold mb-4 theme-transition" style={{ color: safeColors.text }}>
                    Detalles de la Cita
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="theme-transition" style={{ color: safeColors.textSecondary }}>
                        Cliente:
                      </span>
                      <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                        {clientData.fullName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="theme-transition" style={{ color: safeColors.textSecondary }}>
                        Teléfono:
                      </span>
                      <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                        {clientData.phone}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="theme-transition" style={{ color: safeColors.textSecondary }}>
                        Especialista:
                      </span>
                      <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                        {selectedStaff?.name || "Se asignará automáticamente"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="theme-transition" style={{ color: safeColors.textSecondary }}>
                        Fecha y Hora:
                      </span>
                      <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                        {formatDateTime(selectedDate, selectedTime)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="theme-transition" style={{ color: safeColors.textSecondary }}>
                        Duración:
                      </span>
                      <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                        {totalDuration} minutos
                      </span>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3 theme-transition" style={{ color: safeColors.text }}>
                      Servicios Seleccionados:
                    </h4>
                    <div className="space-y-2">
                      {selectedServices.map((service) => (
                        <div key={service.id} className="flex justify-between text-sm">
                          <span className="theme-transition" style={{ color: safeColors.text }}>
                            {service.name}
                          </span>
                          <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                            ${service.price}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 mt-2 theme-transition" style={{ borderColor: safeColors.border }}>
                      <div className="flex justify-between font-semibold">
                        <span className="theme-transition" style={{ color: safeColors.text }}>
                          Total:
                        </span>
                        <span className="theme-transition" style={{ color: safeColors.primary }}>
                          ${totalPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep(4)}
                    className="flex-1 py-3 rounded-xl font-semibold transition-colors theme-transition"
                    style={{
                      backgroundColor: safeColors.background,
                      color: safeColors.textSecondary,
                    }}
                  >
                    Volver
                  </button>
                  <button
                    onClick={handleBookingConfirm}
                    disabled={notificationStatus.loading}
                    className="flex-1 text-white py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center theme-transition"
                    style={{
                      background: `linear-gradient(135deg, ${safeColors.primary}, ${safeColors.secondary})`,
                    }}
                  >
                    {notificationStatus.loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Enviando confirmación...
                      </>
                    ) : (
                      "Confirmar Cita"
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-6" style={{ color: safeColors.success }} />
                <h2 className="text-2xl font-semibold mb-4 theme-transition" style={{ color: safeColors.text }}>
                  ¡Cita Confirmada!
                </h2>
                <p className="mb-6 theme-transition" style={{ color: safeColors.textSecondary }}>
                  Tu cita en <strong>{salonName}</strong> ha sido reservada exitosamente.
                </p>

                <div
                  className="rounded-xl p-6 mb-6 theme-transition"
                  style={{
                    backgroundColor: `${safeColors.success}0d`,
                    borderColor: `${safeColors.success}33`,
                  }}
                >
                  <h3 className="font-semibold mb-3 theme-transition" style={{ color: safeColors.success }}>
                    Detalles de tu Cita
                  </h3>
                  <div className="text-sm space-y-1 theme-transition" style={{ color: safeColors.text }}>
                    <p>
                      <strong>Especialista:</strong> {selectedStaff?.name || "Se asignará automáticamente"}
                    </p>
                    <p>
                      <strong>Fecha:</strong> {formatDateTime(selectedDate, selectedTime)}
                    </p>
                    <p>
                      <strong>Servicios:</strong> {selectedServices.map((s) => s.name).join(", ")}
                    </p>
                    <p>
                      <strong>Total:</strong> ${totalPrice}
                    </p>
                  </div>
                </div>

                {/* Notification Status */}
                <div
                  className="rounded-xl p-6 mb-6 theme-transition"
                  style={{
                    backgroundColor: `${safeColors.primary}0d`,
                    borderColor: `${safeColors.primary}33`,
                  }}
                >
                  <h3
                    className="font-semibold mb-4 flex items-center justify-center theme-transition"
                    style={{ color: safeColors.primary }}
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Estado de Notificaciones
                  </h3>

                  <div className="space-y-3">
                    {/* SMS Status */}
                    <div
                      className="flex items-center justify-between p-3 rounded-lg theme-transition"
                      style={{ backgroundColor: safeColors.surface }}
                    >
                      <div className="flex items-center">
                        <MessageSquare className="w-5 h-5 mr-3" style={{ color: safeColors.primary }} />
                        <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                          SMS
                        </span>
                      </div>
                      <div className="flex items-center">
                        {notificationStatus.loading ? (
                          <div
                            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: safeColors.primary }}
                          />
                        ) : notificationStatus.sms?.success ? (
                          <div className="flex items-center" style={{ color: safeColors.success }}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Enviado</span>
                          </div>
                        ) : (
                          <div className="flex items-center" style={{ color: safeColors.error }}>
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Error</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Email Status */}
                    <div
                      className="flex items-center justify-between p-3 rounded-lg theme-transition"
                      style={{ backgroundColor: safeColors.surface }}
                    >
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 mr-3" style={{ color: safeColors.primary }} />
                        <span className="font-medium theme-transition" style={{ color: safeColors.text }}>
                          Email
                        </span>
                      </div>
                      <div className="flex items-center">
                        {notificationStatus.loading ? (
                          <div
                            className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                            style={{ borderColor: safeColors.primary }}
                          />
                        ) : notificationStatus.email?.success ? (
                          <div className="flex items-center" style={{ color: safeColors.success }}>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Enviado</span>
                          </div>
                        ) : (
                          <div className="flex items-center" style={{ color: safeColors.error }}>
                            <AlertCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">Error</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(notificationStatus.sms?.success || notificationStatus.email?.success) && (
                    <div
                      className="mt-4 p-3 rounded-lg theme-transition"
                      style={{
                        backgroundColor: `${safeColors.success}1a`,
                        color: safeColors.success,
                      }}
                    >
                      <p className="text-sm">✅ Confirmación enviada exitosamente. Revisa tu teléfono y email.</p>
                    </div>
                  )}
                </div>

                {/* Contact Info */}
                <div
                  className="rounded-xl p-6 mb-6 theme-transition"
                  style={{
                    backgroundColor: `${safeColors.primary}0d`,
                    borderColor: `${safeColors.primary}33`,
                  }}
                >
                  <h3 className="font-semibold mb-3 theme-transition" style={{ color: safeColors.primary }}>
                    📞 Información de Contacto
                  </h3>
                  <div className="text-sm space-y-1 theme-transition" style={{ color: safeColors.text }}>
                    <p>
                      <strong>Para cambios o cancelaciones:</strong>
                    </p>
                    <p>
                      
                    </p>
                    <p>⚠️ Mínimo 24 horas de anticipación</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStep(1)
                    setClientData({})
                    setSelectedServices([])
                    setSelectedStaffId("")
                    setSelectedDate("")
                    setSelectedTime("")
                    setPhoneValidation({ isValid: true, error: "" })
                    setNotificationStatus({ sms: null, email: null, loading: false })
                  }}
                  className="text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 theme-transition"
                  style={{
                    background: `linear-gradient(135deg, ${safeColors.primary}, ${safeColors.secondary})`,
                  }}
                >
                  Agendar Nueva Cita
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Función para generar horarios basados en la configuración
const getAvailableTimeSlotsWithConfig = (date: string, hours: any): string[] => {
  if (!hours || Object.keys(hours).length === 0) {
    // Fallback a horarios por defecto si no hay configuración
    return generateTimeSlots("09:00", "19:00", 30)
  }

  // Mapear días en inglés a la estructura de datos
  const dayMap: { [key: string]: string } = {
    sunday: "sunday",
    monday: "monday",
    tuesday: "tuesday",
    wednesday: "wednesday",
    thursday: "thursday",
    friday: "friday",
    saturday: "saturday",
  }

  const dateObj = new Date(date + "T00:00:00")
  const dayOfWeek = dateObj.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  const dayKey = dayMap[dayOfWeek]

  const daySchedule = hours[dayKey]

  if (!daySchedule || !daySchedule.isOpen) {
    console.log(`📅 Day ${dayOfWeek} is closed according to schedule:`, daySchedule)
    return [] // Día cerrado
  }

  const slots: string[] = []
  const startTime = daySchedule.open
  const endTime = daySchedule.close

  // Convertir horarios a minutos para facilitar el cálculo
  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)

  // Generar slots cada 30 minutos
  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    slots.push(minutesToTime(minutes))
  }

  return slots
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

const generateTimeSlots = (startTime: string, endTime: string, interval: number): string[] => {
  const slots: string[] = []
  let current = startTime

  while (current < endTime) {
    slots.push(current)
    current = addMinutes(current, interval)
  }

  return slots
}

const addMinutes = (time: string, minsToAdd: number): string => {
  const [hours, minutes] = time.split(":").map(Number)
  const totalMinutes = hours * 60 + minutes + minsToAdd
  const newHours = Math.floor(totalMinutes / 60) % 24
  const newMinutes = totalMinutes % 60
  return `${newHours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`
}

export default ClientBooking