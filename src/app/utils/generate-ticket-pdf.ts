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
		margin: 36,
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

	// Refined Professional Color Palette
	const PRIMARY_COLOR = "#0F766E"; // Deep Teal
	const PRIMARY_LIGHT = "#CCFBF1"; // Light Teal Accent
	const SECONDARY_COLOR = "#0F172A"; // Slate 900
	const TEXT_BODY = "#334155"; // Slate 700
	const MUTED_TEXT = "#64748B"; // Slate 500
	const BORDER_COLOR = "#E2E8F0"; // Slate 200
	const CARD_BG = "#F8FAFC"; // Slate 50
	const RED_ACCENT = "#DC2626"; // Crimson Red
	const GREEN_ACCENT = "#15803D"; // Emerald Green

	const pageWidth = 595.28;
	const margin = 36;
	const contentWidth = pageWidth - margin * 2;

	// Helper: Section Title Header
	const drawSectionHeader = (title: string, yPos: number) => {
		pdfDocument.rect(margin, yPos, contentWidth, 20).fill(PRIMARY_COLOR);

		pdfDocument
			.fillColor("#FFFFFF")
			.fontSize(9)
			.font("Helvetica-Bold")
			.text(title.toUpperCase(), margin + 10, yPos + 5, {
				characterSpacing: 0.8,
			});

		return yPos + 20;
	};

	// Helper: Label & Value Pair Container
	const drawFieldPair = (
		label: string,
		value: string,
		x: number,
		y: number,
		width: number,
		valueColor = SECONDARY_COLOR,
		isBold = false,
	) => {
		pdfDocument
			.fillColor(MUTED_TEXT)
			.fontSize(7.5)
			.font("Helvetica")
			.text(label, x, y);

		pdfDocument
			.fillColor(valueColor)
			.fontSize(9.5)
			.font(isBold ? "Helvetica-Bold" : "Helvetica")
			.text(value || "N/A", x, y + 10, { width, ellipsis: true });
	};

	// ==================== 1. BRAND HEADER ====================
	pdfDocument.rect(margin, margin, contentWidth, 56).fill(PRIMARY_COLOR);

	pdfDocument
		.fillColor("#FFFFFF")
		.fontSize(20)
		.font("Helvetica-Bold")
		.text("BUS SHEBA", margin + 16, margin + 12);

	pdfDocument
		.fontSize(8.5)
		.font("Helvetica")
		.text("INTERCITY E-TICKET / RESERVATION SLIP", margin + 16, margin + 36, {
			characterSpacing: 0.5,
		});

	// Status Badge
	const isPaid =
		booking.payment?.status?.toUpperCase() === "PAID" ||
		booking.payment?.status?.toUpperCase() === "COMPLETED";
	const badgeColor = isPaid ? GREEN_ACCENT : RED_ACCENT;
	const statusText = isPaid ? "CONFIRMED / PAID" : "PENDING PAYMENT";

	pdfDocument
		.roundedRect(margin + contentWidth - 146, margin + 14, 130, 26, 4)
		.fill("#FFFFFF");

	pdfDocument
		.fillColor(badgeColor)
		.fontSize(8.5)
		.font("Helvetica-Bold")
		.text(statusText, margin + contentWidth - 146, margin + 22, {
			width: 130,
			align: "center",
		});

	let currentY = margin + 64;

	// ==================== 2. TICKET & BOOKING SUMMARY BAR ====================
	pdfDocument
		.roundedRect(margin, currentY, contentWidth, 40, 4)
		.fillAndStroke(PRIMARY_LIGHT, PRIMARY_COLOR);

	const summaryColWidth = contentWidth / 3;

	drawFieldPair(
		"TICKET NUMBER",
		booking.ticket?.ticketNumber
			? booking.ticket.ticketNumber.slice(0, 8).toUpperCase()
			: "N/A",
		margin + 12,
		currentY + 7,
		summaryColWidth - 12,
		PRIMARY_COLOR,
		true,
	);

	drawFieldPair(
		"BOOKING REF / PIN",
		booking.bookingNumber,
		margin + summaryColWidth + 12,
		currentY + 7,
		summaryColWidth - 12,
		SECONDARY_COLOR,
		true,
	);

	drawFieldPair(
		"ISSUED DATE",
		new Date(booking.createdAt).toLocaleDateString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		}),
		margin + summaryColWidth * 2 + 12,
		currentY + 7,
		summaryColWidth - 12,
	);

	currentY += 48;

	// ==================== 3. JOURNEY DETAILS ====================
	currentY = drawSectionHeader("Journey & Operator Details", currentY);

	const journeyCardHeight = 135;
	pdfDocument
		.rect(margin, currentY, contentWidth, journeyCardHeight)
		.fillAndStroke(CARD_BG, BORDER_COLOR);

	const colWidth = (contentWidth - 24) / 2;
	const leftX = margin + 12;
	const rightX = margin + colWidth + 24;

	// Route Highlight Banner
	pdfDocument
		.roundedRect(leftX, currentY + 8, contentWidth - 24, 26, 4)
		.fill("#FFFFFF")
		.stroke(BORDER_COLOR);

	const sourceStr = booking.trip?.route?.source
		? booking.trip.route.source.toUpperCase()
		: "N/A";
	const destStr = booking.trip?.route?.destination
		? booking.trip.route.destination.toUpperCase()
		: "N/A";

	pdfDocument
		.fillColor(PRIMARY_COLOR)
		.fontSize(11)
		.font("Helvetica-Bold")
		.text(`${sourceStr}   -->   ${destStr}`, leftX, currentY + 15, {
			width: contentWidth - 24,
			align: "center",
		});

	// Grid Row 1
	drawFieldPair(
		"OPERATOR",
		booking.trip?.bus?.operator?.companyName || "N/A",
		leftX,
		currentY + 42,
		colWidth,
		SECONDARY_COLOR,
		true,
	);
	drawFieldPair(
		"BUS / REG NO",
		`${booking.trip?.bus?.name || "Bus"} (${booking.trip?.bus?.registrationNo || "N/A"})`,
		rightX,
		currentY + 42,
		colWidth,
	);

	// Grid Row 2
	drawFieldPair(
		"BOARDING POINT",
		booking.fromStop?.stopName || "N/A",
		leftX,
		currentY + 72,
		colWidth,
		SECONDARY_COLOR,
		true,
	);
	drawFieldPair(
		"DROPPING POINT",
		booking.toStop?.stopName || "N/A",
		rightX,
		currentY + 72,
		colWidth,
	);

	// Grid Row 3
	drawFieldPair(
		"TRAVEL DATE",
		booking.trip?.travelDate
			? new Date(booking.trip.travelDate).toDateString()
			: "N/A",
		leftX,
		currentY + 102,
		colWidth,
		PRIMARY_COLOR,
		true,
	);

	drawFieldPair(
		"DEPARTURE TIME",
		booking.trip?.departureTime
			? new Date(booking.trip.departureTime).toLocaleTimeString([], {
					hour: "2-digit",
					minute: "2-digit",
				})
			: "N/A",
		rightX,
		currentY + 102,
		colWidth,
		PRIMARY_COLOR,
		true,
	);

	currentY += journeyCardHeight + 12;

	// ==================== 4. PASSENGER & SEAT INFORMATION ====================
	currentY = drawSectionHeader("Passenger & Seat Allocation", currentY);

	// Table Header
	const tableY = currentY;
	pdfDocument.rect(margin, tableY, contentWidth, 18).fill("#F1F5F9");

	pdfDocument.fillColor(SECONDARY_COLOR).fontSize(8).font("Helvetica-Bold");
	pdfDocument.text("#", margin + 10, tableY + 5, { width: 20 });
	pdfDocument.text("PASSENGER NAME", margin + 35, tableY + 5, { width: 160 });
	pdfDocument.text("PHONE / CONTACT", margin + 200, tableY + 5, { width: 110 });
	pdfDocument.text("SEAT NO", margin + 315, tableY + 5, { width: 80 });
	pdfDocument.text("FARE", margin + 400, tableY + 5, {
		width: 110,
		align: "right",
	});

	currentY += 18;

	if (booking.passengers && Array.isArray(booking.passengers)) {
		booking.passengers.forEach((passenger, index) => {
			const bookingSeat =
				booking.seats && booking.seats[index] ? booking.seats[index] : null;
			const rowBg = index % 2 === 0 ? "#FFFFFF" : CARD_BG;

			pdfDocument
				.rect(margin, currentY, contentWidth, 20)
				.fillAndStroke(rowBg, BORDER_COLOR);

			pdfDocument.fillColor(TEXT_BODY).fontSize(8.5).font("Helvetica");
			pdfDocument.text((index + 1).toString(), margin + 10, currentY + 5, {
				width: 20,
			});
			pdfDocument
				.font("Helvetica-Bold")
				.text(passenger.name || "N/A", margin + 35, currentY + 5, {
					width: 160,
					ellipsis: true,
				});
			pdfDocument
				.font("Helvetica")
				.text(passenger.phone || "N/A", margin + 200, currentY + 5, {
					width: 110,
				});

			pdfDocument
				.fillColor(PRIMARY_COLOR)
				.font("Helvetica-Bold")
				.text(
					bookingSeat?.tripSeat?.seat?.seatNumber || "N/A",
					margin + 315,
					currentY + 5,
					{ width: 80 },
				);

			pdfDocument
				.fillColor(SECONDARY_COLOR)
				.font("Helvetica")
				.text(
					bookingSeat ? `${bookingSeat.price} BDT` : "0 BDT",
					margin + 400,
					currentY + 5,
					{ width: 110, align: "right" },
				);

			currentY += 20;
		});
	}

	currentY += 12;

	// ==================== 5. PAYMENT SUMMARY & VERIFICATION ====================
	const bottomSectionHeight = 110;

	// Left: Payment Box
	const paymentBoxWidth = contentWidth * 0.6;
	pdfDocument
		.rect(margin, currentY, paymentBoxWidth, bottomSectionHeight)
		.fillAndStroke(CARD_BG, BORDER_COLOR);

	pdfDocument
		.fillColor(PRIMARY_COLOR)
		.fontSize(8.5)
		.font("Helvetica-Bold")
		.text("PAYMENT SUMMARY", margin + 10, currentY + 8);

	drawFieldPair(
		"PAYMENT METHOD",
		booking.payment?.provider ?? "N/A",
		margin + 10,
		currentY + 24,
		paymentBoxWidth / 2 - 15,
	);
	drawFieldPair(
		"TRANSACTION ID",
		booking.payment?.trxID ?? "N/A",
		margin + paymentBoxWidth / 2,
		currentY + 24,
		paymentBoxWidth / 2 - 15,
	);

	drawFieldPair(
		"PAYMENT STATUS",
		booking.payment?.status ?? "UNPAID",
		margin + 10,
		currentY + 52,
		paymentBoxWidth / 2 - 15,
		isPaid ? GREEN_ACCENT : RED_ACCENT,
		true,
	);

	const paidAtText = booking.payment?.paidAt
		? new Date(booking.payment.paidAt).toLocaleDateString("en-GB")
		: "N/A";
	drawFieldPair(
		"PAID DATE",
		paidAtText,
		margin + paymentBoxWidth / 2,
		currentY + 52,
		paymentBoxWidth / 2 - 15,
	);

	// Total Amount Accent Line
	pdfDocument
		.rect(margin + 10, currentY + 80, paymentBoxWidth - 20, 22)
		.fill(PRIMARY_LIGHT);

	pdfDocument
		.fillColor(SECONDARY_COLOR)
		.fontSize(9)
		.font("Helvetica-Bold")
		.text("TOTAL AMOUNT PAID:", margin + 16, currentY + 86);

	pdfDocument
		.fillColor(PRIMARY_COLOR)
		.fontSize(10)
		.font("Helvetica-Bold")
		.text(`${booking.totalAmount} BDT`, margin + 10, currentY + 86, {
			width: paymentBoxWidth - 30,
			align: "right",
		});

	// Right: QR Code Container
	const qrBoxX = margin + paymentBoxWidth + 12;
	const qrBoxWidth = contentWidth - paymentBoxWidth - 12;

	pdfDocument
		.rect(qrBoxX, currentY, qrBoxWidth, bottomSectionHeight)
		.fillAndStroke("#FFFFFF", BORDER_COLOR);

	if (booking.ticket?.qrCode) {
		const qrCodeBuffer = await QRCode.toBuffer(booking.ticket.qrCode, {
			type: "png",
			width: 180,
			margin: 1,
			color: {
				dark: "#0F172A",
				light: "#FFFFFF",
			},
		});

		pdfDocument.image(
			qrCodeBuffer,
			qrBoxX + (qrBoxWidth - 65) / 2,
			currentY + 8,
			{ fit: [65, 65] },
		);

		pdfDocument
			.fillColor(MUTED_TEXT)
			.fontSize(6.5)
			.font("Helvetica")
			.text("SCAN FOR VALIDATION", qrBoxX, currentY + 78, {
				width: qrBoxWidth,
				align: "center",
			});

		const ticketNumDisplay = booking.ticket.ticketNumber
			? booking.ticket.ticketNumber.substring(0, 12).toUpperCase()
			: "N/A";

		pdfDocument
			.fillColor(SECONDARY_COLOR)
			.fontSize(7.5)
			.font("Helvetica-Bold")
			.text(ticketNumDisplay, qrBoxX, currentY + 88, {
				width: qrBoxWidth,
				align: "center",
			});
	}

	currentY += bottomSectionHeight + 12;

	// ==================== 6. STUB PERFORATION LINE ====================
	pdfDocument
		.strokeColor("#94A3B8")
		.lineWidth(0.8)
		.dash(4, { space: 4 })
		.moveTo(margin, currentY)
		.lineTo(margin + contentWidth, currentY)
		.stroke();

	pdfDocument.undash();

	currentY += 10;

	// ==================== 7. INSTRUCTIONS & FOOTER ====================
	pdfDocument
		.fillColor(SECONDARY_COLOR)
		.fontSize(8)
		.font("Helvetica-Bold")
		.text("IMPORTANT TERMS & CONDITIONS:", margin, currentY);

	pdfDocument
		.fillColor(MUTED_TEXT)
		.fontSize(7)
		.font("Helvetica")
		.text(
			"1. Please arrive at the boarding counter at least 20 minutes prior to scheduled departure.\n" +
				"2. Passengers must present this printed ticket or e-ticket PDF along with a valid photo ID upon boarding.\n" +
				"3. Luggage allowance is up to 15kg per passenger. The operator accepts no liability for lost personal valuables.",
			margin,
			currentY + 10,
			{ width: contentWidth - 20, lineGap: 2 },
		);

	pdfDocument
		.fillColor(PRIMARY_COLOR)
		.fontSize(8)
		.font("Helvetica-Bold")
		.text("THANK YOU FOR CHOOSING BUS SHEBA", margin, currentY + 42, {
			width: contentWidth,
			align: "center",
		});

	pdfDocument.end();

	return await pdfReadyPromise;
};
