import { sendResponse } from "../../utils/sendResponse";
import { TicketService } from "./ticket.service";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { Request, Response } from "express";

const checkTicket = catchAsync(async (req: Request, res: Response) => {
	const ticketNumber = req.params.ticketNumber;
	if (!ticketNumber) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Ticket number is required in the request parameters",
		);
	}
	const result = await TicketService.checkTicketCallback(
		ticketNumber as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Ticket checked successfully",
		data: result,
	});
});

const verifyTicket = catchAsync(async (req: Request, res: Response) => {
	const ticketNumber = req.params.ticketNumber;
	const user = req.user;

	if (!ticketNumber) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Ticket number is required in the request parameters",
		);
	}

	const result = await TicketService.verifyTicket(ticketNumber as string, user);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Ticket is Valid",
		data: result,
	});
});

const previewOperatorTicket = catchAsync(async (req: Request, res: Response) => {
	const ticketNumber = req.params.ticketNumber;
	if (!ticketNumber) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Ticket number is required in the request parameters",
		);
	}

	const result = await TicketService.previewOperatorTicket(
		ticketNumber,
		req.user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ticket details loaded successfully",
		data: result,
	});
});

export const TicketController = {
	checkTicket,
	verifyTicket,
	previewOperatorTicket,
};
