import { z } from "zod";
import { BusType, SeatLayout } from "../../../generated/prisma/enums";

export const addBusSchema = z.object({
	name: z
		.string({ message: "Bus name is required" })
		.trim()
		.min(1, { message: "Bus name cannot be empty" }),

	registrationNo: z
		.string({ message: "Registration number is required" })
		.trim()
		.min(1, { message: "Registration number cannot be empty" })
		.regex(/^[A-Z\s-]+-[A-Z]{1,2}-\d{2}-\d{4}$/i, {
			message:
				"Invalid bus registration number format. Expected format: DHAKA-METRO-HA-11-2233 or CHATTOGRAM-BA-12-3456",
		}),

	busType: z.enum(BusType, {
		message: `Invalid bus type. Must be one of: ${Object.values(BusType).join(", ")}`,
	}),

	seatLayout: z
		.enum(SeatLayout, {
			message: "Invalid seat layout type",
		})
		.optional(),

	totalSeats: z
		.number({ message: "Total seats must be a number" })
		.int({ message: "Total seats must be a whole number" })
		.min(10, { message: "Bus capacity must be at least 10 seats" })
		.max(100, { message: "Bus capacity cannot exceed 100 seats" }),
});

export type addBusPayload = z.infer<typeof addBusSchema>;
