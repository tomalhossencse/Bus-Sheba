import httpStatus from "http-status";
import { startOfDay, subDays } from "date-fns";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";

const buildRevenueAggregate = (where: Record<string, unknown>) =>
	prisma.payment.aggregate({
		where,
		_sum: { amount: true },
		_count: true,
	});

export const getAdminAnalytics = async () => {
	const [
		userCount,
		operatorCount,
		busCount,
		routeCount,
		tripCount,
		bookingCount,
		activeBookings,
		revenue,
		bookingsByStatus,
		bookingsByDay,
		topRoutes,
		recentTrips,
	] = await Promise.all([
		prisma.user.count({ where: { isDeleted: false } }),
		prisma.operator.count({ where: { isDeleted: false } }),
		prisma.bus.count(),
		prisma.route.count({ where: { isActive: true } }),
		prisma.trip.count(),
		prisma.booking.count(),
		prisma.booking.count({
			where: { status: { in: ["PENDING", "CONFIRMED"] } },
		}),
		buildRevenueAggregate({ status: "PAID" }),
		prisma.booking.groupBy({
			by: ["status"],
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["createdAt"],
			where: {
				createdAt: {
					gte: startOfDay(subDays(new Date(), 7)),
				},
			},
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["tripId"],
			_count: { _all: true },
			orderBy: { _count: { tripId: "desc" } },
			take: 5,
		}),
		prisma.trip.findMany({
			orderBy: { departureTime: "desc" },
			take: 10,
			include: {
				bus: { select: { name: true, registrationNo: true } },
				route: {
					select: { source: true, destination: true, name: true },
				},
			},
		}),
	]);

	const topRouteIds = topRoutes.map((t) => t.tripId);
	const routes = topRouteIds.length
		? await prisma.trip.findMany({
				where: { id: { in: topRouteIds } },
				select: {
					id: true,
					routeId: true,
					route: {
						select: { name: true, source: true, destination: true },
					},
				},
			})
		: [];

	const topRoutesDetailed = topRoutes.map((item) => {
		const route = routes.find((r) => r.id === item.tripId);
		return {
			bookings: item._count._all,
			tripId: item.tripId,
			routeName: route?.route.name ?? "Unknown",
			source: route?.route.source ?? null,
			destination: route?.route.destination ?? null,
		};
	});

	return {
		summary: {
			totalUsers: userCount,
			totalOperators: operatorCount,
			totalBuses: busCount,
			totalRoutes: routeCount,
			totalTrips: tripCount,
			totalBookings: bookingCount,
			activeBookings,
			totalRevenue: revenue._sum.amount ?? 0,
			totalPaidPayments: revenue._count,
		},
		bookingsByStatus: bookingsByStatus.map((item) => ({
			status: item.status,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		bookingsByDay: bookingsByDay.map((item) => ({
			date: item.createdAt,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		topRoutes: topRoutesDetailed,
		recentTrips,
	};
};

export const getOperatorAnalytics = async (user: RequestUser) => {
	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const tripWhere = { bus: { operatorId: operator.id } };
	const bookingWhere = { trip: { bus: { operatorId: operator.id } } };
	const paymentWhere = {
		status: "PAID",
		booking: { trip: { bus: { operatorId: operator.id } } },
	};

	const [
		busCount,
		tripCount,
		bookingCount,
		activeBookings,
		revenue,
		totalSeats,
		bookedSeats,
		bookingsByStatus,
		tripsByDay,
		topRoutes,
		recentTrips,
	] = await Promise.all([
		prisma.bus.count({ where: { operatorId: operator.id } }),
		prisma.trip.count({ where: tripWhere }),
		prisma.booking.count({ where: bookingWhere }),
		prisma.booking.count({
			where: {
				...bookingWhere,
				status: { in: ["PENDING", "CONFIRMED"] },
			},
		}),
		buildRevenueAggregate(paymentWhere as Record<string, unknown>),
		prisma.tripSeat.aggregate({
			where: { trip: tripWhere },
			_count: true,
		}),
		prisma.tripSeat.aggregate({
			where: {
				trip: tripWhere,
				status: { in: ["BOOKED", "HELD"] },
			},
			_count: true,
		}),
		prisma.booking.groupBy({
			by: ["status"],
			where: bookingWhere,
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["createdAt"],
			where: {
				...bookingWhere,
				createdAt: {
					gte: startOfDay(subDays(new Date(), 7)),
				},
			},
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["tripId"],
			where: bookingWhere,
			_count: { _all: true },
			orderBy: { _count: { tripId: "desc" } },
			take: 5,
		}),
		prisma.trip.findMany({
			where: tripWhere,
			orderBy: { departureTime: "desc" },
			take: 10,
			include: {
				bus: { select: { name: true, registrationNo: true } },
				route: { select: { source: true, destination: true } },
			},
		}),
	]);

	const topRouteIds = topRoutes.map((t) => t.tripId);
	const routes = topRouteIds.length
		? await prisma.trip.findMany({
				where: { id: { in: topRouteIds } },
				select: {
					id: true,
					route: {
						select: { name: true, source: true, destination: true },
					},
				},
			})
		: [];

	const topRoutesDetailed = topRoutes.map((item) => {
		const route = routes.find((r) => r.id === item.tripId);
		return {
			bookings: item._count._all,
			tripId: item.tripId,
			routeName: route?.route.name ?? "Unknown",
			source: route?.route.source ?? null,
			destination: route?.route.destination ?? null,
		};
	});

	const totalSeatCount = totalSeats._count || 0;
	const bookedSeatCount = bookedSeats._count || 0;
	const occupancyRate = totalSeatCount
		? Math.round((bookedSeatCount / totalSeatCount) * 100)
		: 0;

	return {
		operator: {
			id: operator.id,
			name: operator.name,
			companyName: operator.companyName,
		},
		summary: {
			totalBuses: busCount,
			totalTrips: tripCount,
			totalBookings: bookingCount,
			activeBookings,
			totalRevenue: revenue._sum.amount ?? 0,
			totalPaidPayments: revenue._count,
			totalSeats: totalSeatCount,
			bookedSeats: bookedSeatCount,
			occupancyRate,
		},
		bookingsByStatus: bookingsByStatus.map((item) => ({
			status: item.status,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		bookingsByDay: tripsByDay.map((item) => ({
			date: item.createdAt,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		topRoutes: topRoutesDetailed,
		recentTrips,
	};
};

export const getPassengerAnalytics = async (user: RequestUser) => {
	const bookingWhere = { userId: user.id };

	const [
		bookingCount,
		activeBookings,
		totalSpent,
		bookingsByStatus,
		bookingsByDay,
		upcomingTrips,
		pastTrips,
	] = await Promise.all([
		prisma.booking.count({ where: bookingWhere }),
		prisma.booking.count({
			where: {
				userId: user.id,
				status: { in: ["PENDING", "CONFIRMED"] },
			},
		}),
		prisma.booking.aggregate({
			where: { userId: user.id, status: "CONFIRMED" },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["status"],
			where: bookingWhere,
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.groupBy({
			by: ["createdAt"],
			where: {
				...bookingWhere,
				createdAt: {
					gte: startOfDay(subDays(new Date(), 7)),
				},
			},
			_count: { _all: true },
			_sum: { totalAmount: true },
		}),
		prisma.booking.findMany({
			where: {
				userId: user.id,
				status: { in: ["PENDING", "CONFIRMED"] },
				trip: {
					departureTime: { gte: new Date() },
				},
			},
			orderBy: { trip: { departureTime: "asc" } },
			take: 10,
			include: {
				trip: {
					include: {
						bus: {
							select: {
								name: true,
								busType: true,
								operator: { select: { companyName: true } },
							},
						},
						route: {
							select: { source: true, destination: true },
						},
					},
				},
				fromStop: { select: { stopName: true } },
				toStop: { select: { stopName: true } },
				payment: true,
				_count: { select: { seats: true } },
			},
		}),
		prisma.booking.findMany({
			where: {
				userId: user.id,
				status: "COMPLETED",
			},
			orderBy: { trip: { departureTime: "desc" } },
			take: 10,
			include: {
				trip: {
					include: {
						route: { select: { source: true, destination: true } },
					},
				},
				payment: true,
			},
		}),
	]);

	return {
		summary: {
			totalBookings: bookingCount,
			activeBookings,
			totalSpent: totalSpent._sum.totalAmount ?? 0,
			totalTripsTaken: pastTrips.length,
		},
		bookingsByStatus: bookingsByStatus.map((item) => ({
			status: item.status,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		bookingsByDay: bookingsByDay.map((item) => ({
			date: item.createdAt,
			count: item._count._all,
			totalAmount: item._sum.totalAmount ?? 0,
		})),
		upcomingTrips,
		pastTrips: {
			count: pastTrips.length,
			items: pastTrips,
		},
	};
};
