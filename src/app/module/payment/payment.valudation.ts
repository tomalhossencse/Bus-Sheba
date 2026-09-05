import { z } from "zod";
import { Prisma } from "../../../generated/prisma/client";

export const createPaymentSchema = z.object({
	bookingId: z
		.string({ message: "Booking ID is required" })
		.uuid({ message: "Invalid Booking ID format. Must be a valid UUID" }),
});

export type CreatePaymentPayload = z.infer<typeof createPaymentSchema>;
