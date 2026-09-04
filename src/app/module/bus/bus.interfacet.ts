import { BusType } from "../../../generated/prisma/enums";

export interface addBusPayload {
	name: string;
	registrationNo: string;
	busType: BusType;
	totalSeats: number;
}
