import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { addBusPayload } from "./bus.validation";
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

export const BusService = {
	addBusWithSeatLayout,
};
