import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../types/types";
import { BookingService } from "./booking.service";
import { IBookingQuery } from "./booking.interface";

const createBooking = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.createBooking(
		req.body,
		req.user as RequestUser,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "New booking created successfully",
		data: result,
	});
});

const getAllBookings = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.getAllBookings(
		req.query as IBookingQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All bookings fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

const getBookingById = catchAsync(async (req: Request, res: Response) => {
	const { bookingId } = req.params;

	if (!bookingId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Booking ID is required in the request parameters",
		);
	}

	const result = await BookingService.getBookingById(
		bookingId as string,
		req.user as RequestUser,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Booking details fetched successfully",
		data: result,
	});
});

const getMyBookings = catchAsync(async (req: Request, res: Response) => {
	const result = await BookingService.getMyBookings(
		req.user as RequestUser,
		req.query as IBookingQuery,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My bookings fetched successfully",
		meta: result.meta,
		data: result.data,
	});
});

export const BookingController = {
	createBooking,
	getAllBookings,
	getBookingById,
	getMyBookings,
};
