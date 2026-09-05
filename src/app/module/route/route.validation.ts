import { z } from "zod";

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
