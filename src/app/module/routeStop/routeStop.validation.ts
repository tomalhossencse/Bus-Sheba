import { z } from "zod";

export const addRouteStopSchema = z
	.object({
		routeId: z
			.string({ message: "Route ID is required" })
			.uuid({ message: "Invalid Route ID format. Must be a valid UUID" }),

		stopName: z
			.string({ message: "Stop name is required" })
			.trim()
			.min(1, { message: "Stop name cannot be empty" }),

		stopOrder: z
			.number({ message: "Stop order must be a number" })
			.int({ message: "Stop order must be an integer" })
			.min(1, { message: "Stop order must be 1 or greater" }),

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
		message: "Departure time cannot be earlier than arrival time",
		path: ["departureMinutes"],
	});

export type AddRouteStopPayload = z.infer<typeof addRouteStopSchema>;

export const addManyRouteStopSchema = z.array(addRouteStopSchema);

export type AddManyRouteStopPayload = z.infer<typeof addManyRouteStopSchema>;

export const updateRouteStopSchema = z
	.object({
		stopName: z
			.string({ message: "Stop name is required" })
			.trim()
			.min(1, { message: "Stop name cannot be empty" })
			.optional(),

		stopOrder: z
			.number({ message: "Stop order must be a number" })
			.int({ message: "Stop order must be an integer" })
			.min(1, { message: "Stop order must be 1 or greater" })
			.optional(),

		arrivalMinutes: z
			.number({ message: "Arrival minutes must be a number" })
			.int({ message: "Arrival minutes must be an integer" })
			.min(0, { message: "Arrival minutes cannot be negative" })
			.optional(),

		departureMinutes: z
			.number({ message: "Departure minutes must be a number" })
			.int({ message: "Departure minutes must be an integer" })
			.min(0, { message: "Departure minutes cannot be negative" })
			.optional(),
	})
	.refine(
		(data) => {
			if (data.arrivalMinutes && data.departureMinutes) {
				return data.departureMinutes >= data.arrivalMinutes;
			}
			return true;
		},
		{
			message: "Departure time cannot be earlier than arrival time",
			path: ["departureMinutes"],
		},
	);

export type UpdateRouteStopPayload = z.infer<typeof updateRouteStopSchema>;
