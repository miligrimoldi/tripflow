import { z } from "zod";
import type { RawInput } from "../shared/validation";
import { daysInRange } from "../shared/date-only";
import { dateOnlySchema, optionalTextSchema, requiredTextSchema } from "../shared/schemas";
import { MAX_TRIP_DAYS } from "./trip";

export const tripDetailsSchema = z
  .object({
    name: requiredTextSchema("El nombre", 100),
    destination: requiredTextSchema("El destino", 100),
    description: optionalTextSchema(1000),
    startDate: dateOnlySchema("la fecha de inicio"),
    endDate: dateOnlySchema("la fecha de fin"),
  })
  .refine((trip) => trip.endDate >= trip.startDate, {
    path: ["endDate"],
    message: "La fecha de fin no puede ser anterior a la de inicio",
  })
  .refine((trip) => trip.endDate < trip.startDate || daysInRange(trip.startDate, trip.endDate) <= MAX_TRIP_DAYS, {
    path: ["endDate"],
    message: `Un viaje puede durar como máximo ${MAX_TRIP_DAYS} días`,
  });

export type TripDetailsInput = RawInput<typeof tripDetailsSchema>;
