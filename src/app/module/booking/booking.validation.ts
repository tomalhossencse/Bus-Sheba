import { z } from "zod";

export const passengerSchema = z.object({
	name: z
		.string({ message: "Passenger name is required" })
		.trim()
		.min(3, { message: "Passenger name must be at least 3 characters long" }),

	phone: z
		.string({ message: "Phone number is required" })
		.trim()
		.regex(/^(?:\+88|88)?(01[3-9]\d{8})$/, {
			message: "Invalid BD phone number. Must be a valid 11-digit number.",
		}),

	email: z
		.string({ message: "Email address is required" })
		.trim()
		.email({ message: "Invalid email address format" }),
});

export const createBookingSchema = z
	.object({
		tripId: z
			.string({ message: "Trip ID is required" })
			.uuid({ message: "Invalid Trip ID format. Must be a valid UUID" }),

		fromStopId: z
			.string({ message: "From Stop ID is required" })
			.uuid({ message: "Invalid From Stop ID format. Must be a valid UUID" }),

		toStopId: z
			.string({ message: "To Stop ID is required" })
			.uuid({ message: "Invalid To Stop ID format. Must be a valid UUID" }),

		tripSeatIds: z
			.array(
				z.string().uuid({
					message: "Invalid Trip Seat ID format. Must be a valid UUID",
				}),
				{ message: "Trip seat IDs must be an array" },
			)
			.min(1, { message: "At least one seat must be selected" }),

		passengers: z
			.array(passengerSchema, { message: "Passengers list must be an array" })
			.min(1, { message: "At least one passenger information is required" }),
	})
	.refine((data) => data.fromStopId !== data.toStopId, {
		message: "Source stop and destination stop cannot be the same",
		path: ["toStopId"],
	})
	.refine((data) => data.tripSeatIds.length === data.passengers.length, {
		message: "Number of passengers must match the number of selected seats",
		path: ["passengers"],
	});

export type PassengerPayload = z.infer<typeof passengerSchema>;
export type CreateBookingPayload = z.infer<typeof createBookingSchema>;
