export const formatDateTime = (date: string, time: string): string => {
  try {
    const [year, month, day] = date.split("-").map(Number)
    const dateObj = new Date(year, month - 1, day)

    const formattedDate = dateObj.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })

    const [hours, minutes] = time.split(":").map(Number)
    const timeObj = new Date()
    timeObj.setHours(hours, minutes)

    const formattedTime = timeObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })

    return `${formattedDate} a las ${formattedTime}`
  } catch (error) {
    console.error("Error formatting date/time:", error)
    return `${date} ${time}`
  }
}

export const generateDateRange = (startDate: Date, days: number, salonHours?: any): string[] => {
  const dates: string[] = []
  const current = new Date(startDate)

  // Mapear días en inglés a español para logging
  const dayNames = {
    sunday: "domingo",
    monday: "lunes",
    tuesday: "martes",
    wednesday: "miércoles",
    thursday: "jueves",
    friday: "viernes",
    saturday: "sábado",
  }

  let addedDays = 0
  let attempts = 0
  const maxAttempts = days * 2 // Evitar bucle infinito

  while (addedDays < days && attempts < maxAttempts) {
    const dateString = current.toISOString().split("T")[0]

    // Si no hay configuración de horarios, incluir todos los días
    if (!salonHours) {
      dates.push(dateString)
      addedDays++
    } else {
      // Verificar si el día está abierto
      const dayOfWeek = current.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
      const daySchedule = salonHours[dayOfWeek]

      if (daySchedule && daySchedule.isOpen) {
        dates.push(dateString)
        addedDays++
        console.log(`✅ ${dayNames[dayOfWeek as keyof typeof dayNames]} (${dateString}) - ABIERTO`)
      } else {
        console.log(`❌ ${dayNames[dayOfWeek as keyof typeof dayNames]} (${dateString}) - CERRADO`)
      }
    }

    current.setDate(current.getDate() + 1)
    attempts++
  }

  console.log(`📅 Generated ${dates.length} available dates from ${attempts} total days`)
  return dates
}

export const getTodayString = (): string => {
  const today = new Date()
  return today.toISOString().split("T")[0]
}

export const isToday = (dateString: string): boolean => {
  return dateString === getTodayString()
}

export const formatDateForDisplay = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day)

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  } catch (error) {
    console.error("Error formatting date for display:", error)
    return dateString
  }
}

export const getDayOfWeek = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.split("-").map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase()
  } catch (error) {
    console.error("Error getting day of week:", error)
    return ""
  }
}

export const generateTimeSlots = (
  startTime: string,
  endTime: string,
  interval: number,
  breakTime?: { start: string; end: string }
): string[] => {
  const slots: string[] = []
  
  try {
    const [startHour, startMinute] = startTime.split(":").map(Number)
    const [endHour, endMinute] = endTime.split(":").map(Number)
    
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute
    
    // If there's a break time, we need to handle it
    let breakStartMinutes = -1
    let breakEndMinutes = -1
    
    if (breakTime) {
      const [breakStartHour, breakStartMinute] = breakTime.start.split(":").map(Number)
      const [breakEndHour, breakEndMinute] = breakTime.end.split(":").map(Number)
      
      breakStartMinutes = breakStartHour * 60 + breakStartMinute
      breakEndMinutes = breakEndHour * 60 + breakEndMinute
    }
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += interval) {
      // Skip slots during break time
      if (breakTime && minutes >= breakStartMinutes && minutes < breakEndMinutes) {
        continue
      }
      
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeSlot = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
      
      slots.push(timeSlot)
    }
  } catch (error) {
    console.error("Error generating time slots:", error)
  }
  
  return slots
}

// Función para filtrar horarios pasados del día actual
export const filterPastTimeSlots = (date: string, timeSlots: string[]): string[] => {
  const today = new Date()
  const todayString = formatDate(today)

  // Si la fecha no es hoy, devolver todos los horarios
  if (date !== todayString) {
    return timeSlots
  }

  // Si es hoy, filtrar horarios que ya pasaron
  const currentTime = today.getHours() * 60 + today.getMinutes()

  return timeSlots.filter((timeSlot) => {
    const [hours, minutes] = timeSlot.split(":").map(Number)
    const slotTime = hours * 60 + minutes
    return slotTime > currentTime + 30 // Agregar 30 minutos de buffer
  })
}

// Función para verificar si un horario específico ya está reservado
export const isTimeSlotBooked = (date: string, time: string, appointments: any[], staffId?: string): boolean => {
  return appointments.some(
    (apt) =>
      apt.date === date && apt.time === time && apt.status !== "cancelled" && (!staffId || apt.staffId === staffId),
  )
}

// Función para filtrar horarios ya reservados
export const filterBookedTimeSlots = (
  date: string,
  timeSlots: string[],
  appointments: any[],
  staffId?: string,
): string[] => {
  return timeSlots.filter((timeSlot) => !isTimeSlotBooked(date, timeSlot, appointments, staffId))
}

export const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0]
}

export const formatTime = (date: Date): string => {
  return date.toTimeString().slice(0, 5)
}