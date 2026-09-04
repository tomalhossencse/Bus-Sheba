import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { AppError } from "../../utils/AppError";
import { addBusPayload } from "./bus.validation";
import httpStatus from "http-status";

const addBus = async (payload: addBusPayload, user: RequestUser) => {
	const operator = await prisma.operator.findUnique({
		where: { userId: user.id },
	});

	if (!operator) {
		throw new AppError(httpStatus.NOT_FOUND, "Operator not found");
	}

	const bus = await prisma.bus.create({
		data: {
			name: payload.name,
			registrationNo: payload.registrationNo,
			busType: payload.busType,
			totalSeats: payload.totalSeats,
			operatorId: operator.id,
		},
	});

	return bus;
};

export const BusService = {
	addBus,
};
