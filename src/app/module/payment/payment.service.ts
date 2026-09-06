import { getBkashIdToken } from "../../lib/bkash";
import { prisma } from "../../lib/prisma";
import { RequestUser } from "../../types/types";
import { CreatePaymentPayload } from "./payment.valudation";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import config from "../../config";
import { generateTicketNumber } from "../../utils/generateTicketNumber";
import path from "path";
import ejs from "ejs";
import { transporter } from "../../lib/nodemailer";
import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { generateTicketPdf } from "../../utils/generate-ticket-pdf";
import { IGetPaymentsQuery } from "./payment.interface";
import { PaymentWhereInput } from "../../../generated/prisma/models";

const createPayment = async (
	payload: CreatePaymentPayload,
	user: RequestUser,
) => {
	const isUserExist = await prisma.user.findFirst({
		where: { id: user.id },
	});

	if (!isUserExist) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const booking = await prisma.booking.findFirst({
		where: { id: payload.bookingId },
	});

	if (!booking) {
		throw new Error("Booking not found");
	}

	if (booking.userId !== user.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not authorized to make payment for this booking",
		);
	}

	if (booking.status !== "PENDING") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Payment can only be made for bookings with status 'PENDING'",
		);
	}

	// bkash bussiness logic
	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new AppError(httpStatus.BAD_GATEWAY, "Bkash access token not found");
	}

	const bkashCreatePaymentRes = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: bkashIdToken,
				"x-app-key": config.bkash_app_key,
			},
			body: JSON.stringify({
				agreementID: "TokenizedMerchant01L3IKB6H1565072174986",
				mode: "0011",
				payerReference: "01929918378",
				// payerReference: user.email,
				callbackURL: `${config.bkash_callback_url}/payment/callback`,
				merchantAssociationInfo: "MI05MID54RF09123456One",
				amount: booking.totalAmount.toString(),
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: `${booking.id}`,
			}),
		},
	);

	const bkashCreatePaymentResult = await bkashCreatePaymentRes.json();

	const transactionResult = await prisma.$transaction(async (tx) => {
		// payment model create
		await tx.payment.create({
			data: {
				merchantInvoiceNumber: bkashCreatePaymentResult.merchantInvoiceNumber,
				bookingId: booking.id,
				amount: bkashCreatePaymentResult.amount,
				currency: bkashCreatePaymentResult.currency,
				gatewayResponse: bkashCreatePaymentResult,
				paymentID: bkashCreatePaymentResult.paymentID,
				payerReference: user.email,
				provider: "BKASH",
			},
		});
		return { paymentUrl: bkashCreatePaymentResult.bkashURL };
	});
	return transactionResult;
};

const paymentCallback = async (query: Record<string, any>) => {
	const paymentId = query.paymentID;

	if (!paymentId) {
		throw new AppError(httpStatus.BAD_REQUEST, "Payment ID is missing");
	}

	const status = query.status;

	if (!status) {
		throw new AppError(httpStatus.BAD_REQUEST, "Payment status is missing");
	}

	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new AppError(httpStatus.BAD_GATEWAY, "Bkash access token not found");
	}

	const bkashExecutedPaymentRes = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",

			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				authorization: bkashIdToken,
				"x-app-key": config.bkash_app_key,
			},

			body: JSON.stringify({
				paymentID: paymentId,
			}),
		},
	);

	const bkashExecutedPaymentResult = await bkashExecutedPaymentRes.json();

	if (
		status !== "success" ||
		bkashExecutedPaymentResult.statusCode !== "0000"
	) {
		if (status === "failure") {
			await prisma.payment.update({
				where: {
					paymentID: paymentId,
				},

				data: {
					status: "FAILED",
					gatewayResponse: bkashExecutedPaymentResult,
				},
			});

			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=failure`,
			};
		}

		if (status === "cancel") {
			await prisma.payment.update({
				where: {
					paymentID: paymentId,
				},

				data: {
					status: "CANCELLED",
					gatewayResponse: bkashExecutedPaymentResult,
				},
			});

			return {
				redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=cancel`,
			};
		}

		throw new AppError(
			httpStatus.PAYMENT_REQUIRED,
			"bKash Payment execution failed",
		);
	}

	const bookingId = bkashExecutedPaymentResult.merchantInvoiceNumber;

	const booking = await prisma.booking.findUnique({
		where: {
			id: bookingId,
		},

		include: {
			fromStop: true,
			toStop: true,

			passengers: true,

			user: true,

			trip: {
				include: {
					route: true,

					bus: {
						include: {
							operator: true,
						},
					},
				},
			},
		},
	});

	if (!booking) {
		throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
	}

	const transactionResult = await prisma.$transaction(
		async (tx) => {
			const bookingSeats = await tx.bookingSeat.findMany({
				where: {
					bookingId: booking.id,
				},

				include: {
					tripSeat: {
						include: {
							seat: true,
						},
					},
				},
			});

			if (bookingSeats.length === 0) {
				throw new AppError(
					httpStatus.BAD_REQUEST,
					"No seats found for this booking",
				);
			}

			const existingPayment = await tx.payment.findUnique({
				where: {
					paymentID: paymentId,
				},
			});

			if (!existingPayment) {
				throw new AppError(httpStatus.NOT_FOUND, "Payment record not found");
			}

			if (existingPayment.status === "PAID") {
				return {
					alreadyProcessed: true,
					bookingSeats,
				};
			}

			await tx.booking.update({
				where: {
					id: booking.id,
				},

				data: {
					status: "CONFIRMED",
					expiresAt: null,
					updatedAt: new Date(),
				},
			});

			const tripSeatIds = bookingSeats.map(
				(bookingSeat) => bookingSeat.tripSeatId,
			);

			await tx.tripSeat.updateMany({
				where: {
					id: {
						in: tripSeatIds,
					},

					tripId: booking.tripId,
				},

				data: {
					status: "BOOKED",
					updatedAt: new Date(),
				},
			});

			const payment = await tx.payment.update({
				where: {
					paymentID: paymentId,
				},

				data: {
					status: "PAID",
					gatewayResponse: bkashExecutedPaymentResult,
					trxID: bkashExecutedPaymentResult.trxID,
					paidAt: new Date(),
					updatedAt: new Date(),
				},
			});

			const ticketNumber = generateTicketNumber(booking.id);

			const qrCode = `${config.frontend_url}/tickets/verify/${ticketNumber}`;

			const ticket = await tx.ticket.create({
				data: {
					bookingId: booking.id,
					ticketNumber,
					qrCode,
					issuedAt: new Date(),
				},
			});

			return {
				alreadyProcessed: false,

				bookingSeats,

				payment,

				ticket,
			};
		},

		{
			maxWait: 5000,
			timeout: 10000,
		},
	);

	if (transactionResult.alreadyProcessed) {
		return {
			redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=success`,
		};
	}

	const { ticket, payment, bookingSeats } = transactionResult;

	if (!ticket?.qrCode) {
		throw new AppError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Ticket QR code is missing",
		);
	}

	const pdfBooking = {
		...booking,
		seats: bookingSeats,
		ticket,
		payment,
	};

	const pdfBuffer = await generateTicketPdf(pdfBooking);

	const ticketPdfResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "raw",
						format: "pdf",
						public_id: `tickets/${ticket.ticketNumber.slice(0, 8)}`,
					},

					async (error, result) => {
						if (error) {
							console.error("Error uploading ticket PDF:", error);

							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"Failed to upload ticket PDF document",
								),
							);
						}

						if (!result) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result returned from Cloudinary",
								),
							);
						}

						resolve(result);
					},
				)
				.end(pdfBuffer);
		},
	);

	const updatedTicket = await prisma.ticket.update({
		where: {
			id: ticket.id,
		},

		data: {
			ticketPdfUrl: ticketPdfResult.secure_url,
		},
	});

	const templatePath = path.join(process.cwd(), "src/app/templates/ticket.ejs");

	const templateData = {
		booking,

		bookingSeats,

		payment,

		ticket: updatedTicket,

		ticketPdfUrl: ticketPdfResult.secure_url,
	};

	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,

		to: booking.user.email,

		subject: "Your Ticket - Bus Sheba System",

		html,

		attachments: [
			{
				filename: `BUS-SHEBA-${ticket.ticketNumber}.pdf`,

				content: pdfBuffer,

				contentType: "application/pdf",
			},
		],
	});

	return {
		redirectUrl: `${config.frontend_url}/dashboard/my-bookings?status=success`,
	};
};

// admin or super admin
const getAllPayments = async (query: IGetPaymentsQuery) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: PaymentWhereInput[] = [];

	// filtering
	if (query.bookingId) {
		andConditions.push({
			bookingId: query.bookingId,
		});
	}

	if (query.amount) {
		andConditions.push({
			amount: Number(query.amount),
		});
	}

	if (query.minAmount) {
		andConditions.push({
			amount: {
				gte: query.minAmount,
			},
		});
	}

	if (query.maxAmount) {
		andConditions.push({
			amount: {
				lte: query.maxAmount,
			},
		});
	}

	if (query.bookingId) {
		andConditions.push({
			bookingId: query.bookingId,
		});
	}

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	const buses = await prisma.payment.findMany({
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
			booking: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
						},
					},
					trip: {
						include: {
							bus: {
								select: {
									name: true,
									registrationNo: true,
									operator: { select: { companyName: true } },
								},
							},
							route: { select: { source: true, destination: true } },
						},
					},
					fromStop: { select: { stopName: true } },
					toStop: { select: { stopName: true } },
					passengers: true,
					seats: {
						include: {
							tripSeat: {
								include: {
									seat: { select: { seatNumber: true } },
								},
							},
						},
					},
					ticket: true,
				},
			},
		},
	});

	const totalPaymentCount = await prisma.payment.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: buses,
		meta: {
			limit,
			page,
			total: totalPaymentCount,
			totalPages: Math.ceil(totalPaymentCount / limit),
		},
	};
};

//passenger
const getMyPayments = async (query: IGetPaymentsQuery, user: RequestUser) => {
	const limit = query.limit ? Number(query.limit) : 5;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const userExists = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!userExists) {
		throw new Error("User not found");
	}

	const andConditions: PaymentWhereInput[] = [{ booking: { userId: user.id } }];

	// filtering
	if (query.bookingId) {
		andConditions.push({
			bookingId: query.bookingId,
		});
	}

	if (query.amount) {
		andConditions.push({
			amount: Number(query.amount),
		});
	}

	if (query.minAmount) {
		andConditions.push({
			amount: {
				gte: query.minAmount,
			},
		});
	}

	if (query.maxAmount) {
		andConditions.push({
			amount: {
				lte: query.maxAmount,
			},
		});
	}

	if (query.bookingId) {
		andConditions.push({
			bookingId: query.bookingId,
		});
	}

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	const buses = await prisma.payment.findMany({
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
			booking: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
						},
					},
					trip: {
						include: {
							bus: {
								select: {
									name: true,
									registrationNo: true,
									operator: { select: { companyName: true } },
								},
							},
							route: { select: { source: true, destination: true } },
						},
					},
					fromStop: { select: { stopName: true } },
					toStop: { select: { stopName: true } },
					passengers: true,
					seats: {
						include: {
							tripSeat: {
								include: {
									seat: { select: { seatNumber: true } },
								},
							},
						},
					},
					ticket: true,
				},
			},
		},
	});

	const totalPaymentCount = await prisma.payment.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: buses,
		meta: {
			limit,
			page,
			total: totalPaymentCount,
			totalPages: Math.ceil(totalPaymentCount / limit),
		},
	};
};

//admin and passenger
const getPaymentById = async (paymentId: string, user: RequestUser) => {
	const userExists = await prisma.user.findUnique({
		where: { id: user.id },
	});

	if (!userExists) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const payment = await prisma.payment.findUnique({
		where: {
			id: paymentId,
			// passengers can only view payments of their own bookings
			...(user.role === "PASSENGER" ? { booking: { userId: user.id } } : {}),
		},
		include: {
			booking: {
				include: {
					user: {
						select: {
							id: true,
							name: true,
							email: true,
							phone: true,
						},
					},
					trip: {
						include: {
							bus: {
								select: {
									name: true,
									registrationNo: true,
									operator: { select: { companyName: true } },
								},
							},
							route: { select: { source: true, destination: true } },
						},
					},
					fromStop: { select: { stopName: true } },
					toStop: { select: { stopName: true } },
					passengers: true,
					seats: {
						include: {
							tripSeat: {
								include: {
									seat: { select: { seatNumber: true } },
								},
							},
						},
					},
					ticket: true,
				},
			},
		},
	});

	if (!payment) {
		if (user.role === "PASSENGER") {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You don't have permission to access this payment.",
			);
		}
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
	}

	return payment;
};

export const PaymentService = {
	createPayment,
	paymentCallback,
	getMyPayments,
	getAllPayments,
	getPaymentById,
};
