import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Prisma } from "../../generated/prisma/client";

export type TicketBooking = Prisma.BookingGetPayload<{
	include: {
		passengers: true;

		fromStop: true;
		toStop: true;

		trip: {
			include: {
				route: true;
				bus: {
					include: {
						operator: true;
					};
				};
			};
		};

		seats: {
			include: {
				tripSeat: {
					include: {
						seat: true;
					};
				};
			};
		};

		payment: true;
		ticket: true;
	};
}>;

export const generateTicketPdf = async (
	booking: TicketBooking,
): Promise<Buffer> => {
	const pdfDocument = new PDFDocument({
		margin: 50,
		size: "A4",
	});

	const pdfChunks: Buffer[] = [];

	pdfDocument.on("data", (chunk: Buffer) => {
		pdfChunks.push(chunk);
	});

	const pdfReadyPromise = new Promise<Buffer>((resolve) => {
		pdfDocument.on("end", () => {
			resolve(Buffer.concat(pdfChunks));
		});
	});

	pdfDocument.fontSize(24).font("Helvetica-Bold").text("BUS SHEBA", {
		align: "center",
	});

	pdfDocument.fontSize(14).font("Helvetica").text("Bus Ticket", {
		align: "center",
	});

	pdfDocument.moveDown(2);

	pdfDocument
		.fontSize(12)
		.font("Helvetica-Bold")
		.text(`Ticket Number: ${booking.ticket?.ticketNumber.slice(0, 8)}`);

	pdfDocument
		.font("Helvetica")
		.text(`Booking Number: ${booking.bookingNumber}`);

	pdfDocument.moveDown(1);

	pdfDocument.fontSize(14).font("Helvetica-Bold").text("Passenger Information");

	pdfDocument.moveDown(0.5);

	booking.passengers.forEach(
		(passenger: TicketBooking["passengers"][0], index: number) => {
			pdfDocument
				.fontSize(11)
				.font("Helvetica-Bold")
				.text(`Passenger ${index + 1}`);

			pdfDocument.font("Helvetica").text(`Name: ${passenger.name}`);

			pdfDocument.text(`Phone: ${passenger.phone}`);

			if (passenger.email) {
				pdfDocument.text(`Email: ${passenger.email}`);
			}

			const bookingSeat = booking.seats[index];

			if (bookingSeat) {
				pdfDocument.text(`Seat: ${bookingSeat.tripSeat.seat.seatNumber}`);

				pdfDocument.text(`Seat Price: ${bookingSeat.price} BDT`);
			}

			pdfDocument.moveDown(0.8);
		},
	);

	pdfDocument.fontSize(14).font("Helvetica-Bold").text("Journey Information");

	pdfDocument.moveDown(0.5);

	pdfDocument
		.fontSize(11)
		.font("Helvetica")
		.text(`Bus: ${booking.trip.bus.name}`);

	pdfDocument.text(`Registration No: ${booking.trip.bus.registrationNo}`);

	pdfDocument.text(`Operator: ${booking.trip.bus.operator.companyName}`);

	pdfDocument.text(
		`Route: ${booking.trip.route.source} → ${booking.trip.route.destination}`,
	);

	pdfDocument.text(`Boarding Point: ${booking.fromStop.stopName}`);

	pdfDocument.text(`Destination: ${booking.toStop.stopName}`);

	pdfDocument.text(
		`Travel Date: ${new Date(booking.trip.travelDate).toDateString()}`,
	);

	pdfDocument.text(
		`Departure Time: ${new Date(
			booking.trip.departureTime,
		).toLocaleTimeString()}`,
	);

	pdfDocument.moveDown(1.5);

	pdfDocument.fontSize(14).font("Helvetica-Bold").text("Seat Information");

	pdfDocument.moveDown(0.5);

	booking.seats.forEach(
		(bookingSeat: TicketBooking["seats"][0], index: number) => {
			pdfDocument
				.fontSize(11)
				.font("Helvetica")
				.text(`Seat ${index + 1}: ${bookingSeat.tripSeat.seat.seatNumber}`);

			pdfDocument.text(`Price: ${bookingSeat.price} BDT`);

			pdfDocument.moveDown(0.3);
		},
	);

	pdfDocument.moveDown(1);

	pdfDocument.fontSize(14).font("Helvetica-Bold").text("Payment Information");

	pdfDocument.moveDown(0.5);

	pdfDocument
		.fontSize(11)
		.font("Helvetica")
		.text(`Total Amount: ${booking.totalAmount} BDT`);

	if (booking.payment) {
		pdfDocument.text(`Payment Method: ${booking.payment.provider}`);

		pdfDocument.text(`Transaction ID: ${booking.payment.trxID ?? "N/A"}`);

		pdfDocument.text(`Payment Status: ${booking.payment.status}`);

		if (booking.payment.paidAt) {
			pdfDocument.text(
				`Paid At: ${new Date(booking.payment.paidAt).toLocaleString()}`,
			);
		}
	}

	pdfDocument.moveDown(2);

	if (booking.ticket?.qrCode) {
		const qrCodeBuffer = await QRCode.toBuffer(booking.ticket.qrCode, {
			type: "png",
			width: 250,
			margin: 2,
		});

		pdfDocument
			.fontSize(14)
			.font("Helvetica-Bold")
			.text("Ticket Verification", {
				align: "center",
			});

		pdfDocument.moveDown(0.5);

		pdfDocument.image(qrCodeBuffer, {
			fit: [120, 120],
			align: "center",
		});

		pdfDocument.moveDown(0.5);

		pdfDocument
			.fontSize(9)
			.font("Helvetica")
			.text(`Ticket: ${booking.ticket.ticketNumber.slice(0, 8)}`, {
				align: "center",
			});
	}

	pdfDocument.moveDown(1);

	pdfDocument
		.fontSize(10)
		.font("Helvetica")
		.text("Please show this ticket or QR code when boarding.", {
			align: "center",
		});

	pdfDocument.moveDown(0.5);

	pdfDocument.text("Thank you for choosing BUS SHEBA.", {
		align: "center",
	});

	pdfDocument.end();

	return await pdfReadyPromise;
};
