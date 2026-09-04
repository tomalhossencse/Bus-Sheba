import cron from "node-cron";
import { prisma } from "./prisma";

export const updateTripSeats = async () => {
	cron.schedule("*/5 * * * *", async () => {
		try {
			const currentTime = new Date();

			const expiredBookings = await prisma.booking.findMany({
				where: {
					status: "PENDING",
					expiresAt: {
						lte: currentTime,
					},
				},
				select: { id: true },
			});

			if (expiredBookings.length === 0) return;

			const expiredBookingIds = expiredBookings.map((booking) => booking.id);
			console.log(
				`[CRON] Info: Found ${expiredBookingIds.length} expired booking(s) to release.`,
			);

			await prisma.$transaction(async (tx) => {
				const updatedTripSeats = await tx.tripSeat.updateMany({
					where: {
						status: "HELD",
						bookingSeat: {
							bookingId: { in: expiredBookingIds },
						},
					},
					data: {
						status: "AVAILABLE",
					},
				});

				await tx.bookingSeat.deleteMany({
					where: { bookingId: { in: expiredBookingIds } },
				});

				await tx.booking.updateMany({
					where: { id: { in: expiredBookingIds } },
					data: { status: "EXPIRED", cancelledAt: new Date() },
				});

				if (updatedTripSeats.count > 0) {
					console.log(`Cron : Updated ${updatedTripSeats.count} trip seats`);
				}
			});

			console.log(
				`[CRON] Success: Expired ${expiredBookingIds.length} expired bookings and released seats.`,
			);
		} catch (error) {
			console.error("[CRON] Error: Failed to release expired bookings", error);
		}

		console.log(
			"[CRON] Info: Running update trip seats and booking task every 5 minutes",
		);
	});
};
