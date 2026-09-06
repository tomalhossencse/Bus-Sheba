import { z } from "zod";

export const addRouteStopSchema = z
	.object({
		stopName: z
			.string({ message: "Stop name is required" })
			.trim()
			.min(1, { message: "Stop name cannot be empty" }),

		arrivalMinutes: z
			.number({ message: "Arrival minutes must be a number" })
			.int({ message: "Arrival minutes must be an integer" })
			.min(0, { message: "Arrival minutes cannot be negative" }),

		departureMinutes: z
			.number({ message: "Departure minutes must be a number" })
			.int({ message: "Departure minutes must be an integer" })
			.min(0, { message: "Departure minutes cannot be negative" }),
	})
	.refine((data) => data.departureMinutes >= data.arrivalMinutes, {
		message: "Departure minutes cannot be earlier than arrival minutes",
		path: ["departureMinutes"],
	});

const addManyRouteStopSchema = z.array(addRouteStopSchema);

export const addRouteSchema = z
	.object({
		name: z
			.string({ message: "Route name is required" })
			.trim()
			.min(3, { message: "Route name must be at least 3 characters long" }),

		source: z
			.string({ message: "Source location is required" })
			.trim()
			.min(1, { message: "Source location cannot be empty" }),

		destination: z
			.string({ message: "Destination location is required" })
			.trim()
			.min(1, { message: "Destination location cannot be empty" }),

		distanceKm: z
			.number({ message: "Distance must be a number" })
			.positive({ message: "Distance must be greater than 0 km" }),

		estimatedMinutes: z
			.number({ message: "Estimated time must be a number" })
			.int({ message: "Estimated time must be a whole number" })
			.positive({ message: "Estimated time must be greater than 0 minutes" }),

		routeStops: addManyRouteStopSchema.optional(),
	})
	.refine(
		(data) => data.source.toLowerCase() !== data.destination.toLowerCase(),
		{
			message: "Source and destination cannot be the same location",
			path: ["destination"],
		},
	);

export type AddRoutePayload = z.infer<typeof addRouteSchema>;

export const updateRouteSchema = z
	.object({
		name: z
			.string({ message: "Route name is required" })
			.trim()
			.min(3, { message: "Route name must be at least 3 characters long" })
			.optional(),

		source: z
			.string({ message: "Source location is required" })
			.trim()
			.min(1, { message: "Source location cannot be empty" })
			.optional(),

		destination: z
			.string({ message: "Destination location is required" })
			.trim()
			.min(1, { message: "Destination location cannot be empty" })
			.optional(),

		distanceKm: z
			.number({ message: "Distance must be a number" })
			.positive({ message: "Distance must be greater than 0 km" })
			.optional(),

		estimatedMinutes: z
			.number({ message: "Estimated time must be a number" })
			.int({ message: "Estimated time must be a whole number" })
			.positive({ message: "Estimated time must be greater than 0 minutes" })
			.optional(),
	})
	.refine(
		(data) => {
			if (data.source && data.destination) {
				return data.source.toLowerCase() !== data.destination.toLowerCase();
			}
			return true;
		},
		{
			message: "Source and destination cannot be the same location",
			path: ["destination"],
		},
	);

export type UpdateRoutePayload = z.infer<typeof updateRouteSchema>;
