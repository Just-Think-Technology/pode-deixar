export type ServiceScheduleInput = {
  date: Date | undefined;
  startTime: string;
  endTime?: string;
};

export function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function validateServiceSchedule(
  input: ServiceScheduleInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.date) {
    errors.scheduleDate = "Selecione a data do serviço";
  }

  if (!input.startTime || !/^\d{2}:\d{2}$/.test(input.startTime)) {
    errors.scheduleStartTime = "Informe o horário de início";
  }

  if (input.date && input.startTime && /^\d{2}:\d{2}$/.test(input.startTime)) {
    const start = combineDateAndTime(input.date, input.startTime);
    if (start.getTime() <= Date.now()) {
      errors.scheduleDate = "A data e hora devem ser futuras";
    }

    if (input.endTime && /^\d{2}:\d{2}$/.test(input.endTime)) {
      const end = combineDateAndTime(input.date, input.endTime);
      if (end <= start) {
        errors.scheduleEndTime =
          "O horário de término deve ser posterior ao início";
      }
    }
  }

  return errors;
}

export function buildScheduledAtIso(input: ServiceScheduleInput): {
  scheduledAt: string;
  scheduledEndAt?: string;
} {
  if (!input.date) {
    throw new Error("Data do serviço é obrigatória");
  }

  const scheduledAt = combineDateAndTime(input.date, input.startTime).toISOString();

  if (input.endTime && /^\d{2}:\d{2}$/.test(input.endTime)) {
    return {
      scheduledAt,
      scheduledEndAt: combineDateAndTime(input.date, input.endTime).toISOString(),
    };
  }

  return { scheduledAt };
}
