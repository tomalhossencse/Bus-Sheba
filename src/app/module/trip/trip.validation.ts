import { z } from "zod";
import { TripStatus } from "../../../generated/prisma/enums";

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

export const updateTripSchema = z
	.object({
		busId: z
			.string({ message: "Bus ID is required" })
			.uuid({ message: "Invalid Bus ID format. Must be a valid UUID" })
			.optional(),

		routeId: z
			.string({ message: "Route ID is required" })
			.uuid({ message: "Invalid Route ID format. Must be a valid UUID" })
			.optional(),

		travelDate: z.coerce
			.date({ message: "Invalid travel date format" })
			.optional(),

		departureTime: z.coerce
			.date({ message: "Invalid departure time format" })
			.optional(),

		arrivalTime: z.coerce
			.date({ message: "Invalid arrival time format" })
			.optional(),

		fare: z
			.number({ message: "Fare must be a number" })
			.positive({ message: "Fare must be greater than 0" })
			.max(50000, { message: "Fare amount exceeds maximum limit" })
			.optional(),
	})
	.refine(
		(data) => !data.departureTime || data.departureTime.getTime() > Date.now(),
		{
			message: "Departure time must be in the future",
			path: ["departureTime"],
		},
	)
	.refine(
		(data) =>
			!data.arrivalTime ||
			!data.departureTime ||
			data.arrivalTime.getTime() > (data.departureTime as Date).getTime(),
		{
			message: "Arrival time must be after departure time",
			path: ["arrivalTime"],
		},
	);

export const changeTripStatusSchema = z.object({
	status: z.enum(TripStatus, {
		message: "Invalid trip status",
	}),
});

export const tripIdParamSchema = z.object({
	tripId: z.string().uuid({ message: "Invalid Trip ID format" }),
});

export const tripQuerySchema = z.object({
	searchTerm: z.string().optional(),
	page: z
		.string()
		.regex(/^\d+$/, { message: "Page must be a valid number" })
		.optional(),
	limit: z
		.string()
		.regex(/^\d+$/, { message: "Limit must be a valid number" })
		.optional(),
	sortBy: z.string().optional(),
	sortOrder: z.enum(["asc", "desc"]).optional(),
	source: z.string().optional(),
	destination: z.string().optional(),
	travelDate: z.coerce.date().optional(),
	busType: z.string().optional(),
	status: z.enum(TripStatus).optional(),
	minFare: z.coerce.number().optional(),
	maxFare: z.coerce.number().optional(),
});

export const tripSeatQuerySchema = z.object({
	status: z.enum(["AVAILABLE", "HELD", "BOOKED", "BLOCKED"]).optional(),
});

export type CreateTripPayload = z.infer<typeof createTripSchema>;
export type UpdateTripPayload = z.infer<typeof updateTripSchema>;
export type ChangeTripStatusPayload = z.infer<typeof changeTripStatusSchema>;
export type TripQueryParams = z.infer<typeof tripQuerySchema>;
