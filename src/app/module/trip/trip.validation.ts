import { z } from "zod";

export const createTripSchema = z
	.object({
		busId: z
			.string({ message: "Bus ID is required" })
			.uuid({ message: "Invalid Bus ID format. Must be a valid UUID" }),

		routeId: z
			.string({ message: "Route ID is required" })
			.uuid({ message: "Invalid Route ID format. Must be a valid UUID" }),

		travelDate: z.coerce.date({
			message: "Invalid travel date format",
		}),

		departureTime: z.coerce.date({
			message: "Invalid departure time format",
		}),

		arrivalTime: z.coerce.date({
			message: "Invalid arrival time format",
		}),

		fare: z
			.number({ message: "Fare must be a number" })
			.positive({ message: "Fare must be greater than 0" })
			.max(50000, { message: "Fare amount exceeds maximum limit" }),
	})
	.refine((data) => data.departureTime.getTime() > Date.now(), {
		message: "Departure time must be in the future",
		path: ["departureTime"],
	})
	.refine((data) => data.arrivalTime.getTime() > data.departureTime.getTime(), {
		message: "Arrival time must be after departure time",
		path: ["arrivalTime"],
	});

export type CreateTripPayload = z.infer<typeof createTripSchema>;
