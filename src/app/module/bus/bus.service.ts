import { includes } from "zod";
import { BusWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { IBusQuery } from "./bus.interface";
import { addBusPayload, updateBusPayload } from "./bus.validation";
import httpStatus from "http-status";

const addBusWithSeatLayout = async (
	payload: addBusPayload,
	user: RequestUser,
) => {
	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const busExists = await prisma.bus.findUnique({
		where: { registrationNo: payload.registrationNo },
	});

	if (busExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Bus with this registration number already exists",
		);
	}

	let seatPerRow = 4;

	if (
		payload.seatLayout === "TWO_BY_ONE" ||
		payload.seatLayout === "ONE_BY_TWO"
	) {
		seatPerRow = 3;
	}

	const totalSeats = payload.totalSeats;
	const totalRows = Math.ceil(totalSeats / seatPerRow);

	const rowsLetter = [
		"A",
		"B",
		"C",
		"D",
		"E",
		"F",
		"G",
		"H",
		"I",
		"J",
		"K",
		"L",
		"M",
	];

	const seatsData: {
		seatNumber: string;
		rowNumber: number;
		columnNumber: number;
	}[] = [];

	let seatCount = 0;

	for (let row = 0; row < totalRows; row++) {
		const rowLetter = rowsLetter[row];

		const rowNumber = row + 1;

		for (let col = 1; col <= seatPerRow; col++) {
			if (seatCount >= totalSeats) break;
			const seatNumberString = `${rowLetter}${col}`;

			seatsData.push({
				seatNumber: seatNumberString,
				rowNumber,
				columnNumber: col,
			});

			seatCount++;
		}
	}

	const busWithSeats = await prisma.bus.create({
		data: {
			name: payload.name,
			registrationNo: payload.registrationNo,
			busType: payload.busType,
			totalSeats: payload.totalSeats,
			operatorId: operator.id,
			seats: {
				createMany: {
					data: seatsData,
				},
			},
		},
		include: { seats: true },
	});

	return busWithSeats;
};

const updateBusWithSeatLayout = async (
	payload: updateBusPayload,
	busId: string,
	user: RequestUser,
) => {
	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const busExists = await prisma.bus.findUnique({
		where: { id: busId },
		include: {
			trips: true,
		},
	});

	if (!busExists) {
		throw new AppError(httpStatus.CONFLICT, "Bus with this ID does not exist");
	}

	const baseBusUpdateData: any = {
		name: payload.name ?? busExists.name,
		busType: payload.busType ?? busExists.busType,
		seatLayout: payload.seatLayout ?? busExists.seatLayout,
		totalSeats: payload.totalSeats ?? busExists.totalSeats,
		updatedAt: new Date(),
	};

	const isLayoutChanged =
		(payload.seatLayout && payload.seatLayout !== busExists.seatLayout) ||
		(payload.totalSeats && payload.totalSeats !== busExists.totalSeats);

	if (isLayoutChanged) {
		let seatPerRow = 4;
		const currentLayout = payload.seatLayout || busExists.seatLayout;
		const totalSeats = (payload.totalSeats || busExists.totalSeats) as number;

		if (
			payload.seatLayout === "TWO_BY_ONE" ||
			payload.seatLayout === "ONE_BY_TWO"
		) {
			seatPerRow = 3;
		}

		const totalRows = Math.ceil(totalSeats / seatPerRow);

		const rowsLetter = [
			"A",
			"B",
			"C",
			"D",
			"E",
			"F",
			"G",
			"H",
			"I",
			"J",
			"K",
			"L",
			"M",
		];

		const seatsData: {
			seatNumber: string;
			rowNumber: number;
			columnNumber: number;
		}[] = [];

		let seatCount = 0;

		for (let row = 0; row < totalRows; row++) {
			const rowLetter = rowsLetter[row];

			const rowNumber = row + 1;

			for (let col = 1; col <= seatPerRow; col++) {
				if (seatCount >= totalSeats) break;
				const seatNumberString = `${rowLetter}${col}`;

				seatsData.push({
					seatNumber: seatNumberString,
					rowNumber,
					columnNumber: col,
				});

				seatCount++;
			}
		}

		return await prisma.$transaction(async (tx) => {
			const activeSeats = await tx.seat.findMany({
				where: { busId: busId, isDeleted: false },
			});

			const timestamp = Date.now();
			for (const seat of activeSeats) {
				await tx.seat.update({
					where: { id: seat.id },
					data: {
						seatNumber: `${seat.seatNumber}${timestamp.toString().slice(-2)}`,
						isDeleted: true,
						deletedAt: new Date(),
					},
				});
			}

			return await tx.bus.update({
				where: { id: busId },
				data: {
					...baseBusUpdateData,
					totalSeats: totalSeats,
					seatLayout: currentLayout,
					seats: {
						create: seatsData,
					},
				},
				include: {
					seats: {
						where: { isDeleted: false },
					},
				},
			});
		});
	}

	return await prisma.bus.update({
		where: { id: busId },
		data: baseBusUpdateData,
		include: {
			seats: {
				where: { isDeleted: false },
			},
		},
	});
};

// public
const getBusById = async (busId: string) => {
	return await prisma.bus.findUnique({
		where: { id: busId },
		include: {
			operator: true,
			seats: {
				where: { isDeleted: false },
			},
			trips: {
				where: {
					arrivalTime: {
						gt: new Date(),
					},
				},
			},
		},
	});
};

const getAllBuses = async (query: IBusQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: BusWhereInput[] = [];

	// searching
	if (query.searchTerm) {
		andConditions.push({
			// searching
			OR: [
				{
					name: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					registrationNo: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	if (query.companyName) {
		andConditions.push({
			OR: [
				{
					operator: {
						companyName: {
							contains: query.companyName,
							mode: "insensitive",
						},
					},
				},
			],
		});
	}

	if (query.operatorEmail) {
		andConditions.push({
			OR: [
				{
					operator: {
						email: {
							contains: query.operatorEmail,
							mode: "insensitive",
						},
					},
				},
			],
		});
	}

	// filtering
	if (query.busType) {
		andConditions.push({
			busType: query.busType,
		});
	}

	if (query.companyName) {
		andConditions.push({
			operator: {
				companyName: query.companyName,
			},
		});
	}

	if (query.operatorEmail) {
		andConditions.push({
			operator: {
				email: query.operatorEmail,
			},
		});
	}

	if (query.totalSeats) {
		andConditions.push({
			totalSeats: Number(query.totalSeats),
		});
	}

	if (query.minSeats) {
		andConditions.push({
			totalSeats: {
				gte: Number(query.minSeats),
			},
		});
	}

	if (query.maxSeats) {
		andConditions.push({
			totalSeats: {
				lte: Number(query.maxSeats),
			},
		});
	}

	const buses = await prisma.bus.findMany({
		where: {
			AND: andConditions,
		},
		// pagination
		take: limit,
		skip: skip,
		//sorting
		orderBy: {
			[sortBy]: sortOrder,
		},

		include: {
			operator: true,
		},
	});

	const totalBusCount = await prisma.bus.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: buses,
		meta: {
			limit,
			page,
			total: totalBusCount,
			totalPages: Math.ceil(totalBusCount / limit),
		},
	};
};

export const BusService = {
	addBusWithSeatLayout,
	updateBusWithSeatLayout,
	getBusById,
	getAllBuses,
};
