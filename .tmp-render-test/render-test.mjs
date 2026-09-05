import ejs from "ejs";
import path from "path";

const templatePath = "E:/level_2/Misson-6/Bus-Sheba/src/app/templates/ticket.ejs";

const booking = {
  bookingNumber: "BS-260905-A1B2",
  totalAmount: 3200,
  trip: {
    route: { source: "Dhaka", destination: "Chattogram" },
    bus: { name: "Green Line", registrationNo: "DHA-11-2233", operator: { companyName: "Green Line Paribahan" } },
    travelDate: "2026-09-10",
    departureTime: "2026-09-10T08:30:00",
  },
  fromStop: { stopName: "Kamlapur (Dhaka)" },
  toStop: { stopName: "Chattogram Bus Terminal" },
  passengers: [
    { name: "Rahim Uddin", phone: "01712345678", email: "rahim@example.com" },
    { name: "Karim Uddin", phone: "01812345678", email: "karim@example.com" },
  ],
};

const bookingSeats = [
  { tripSeat: { seat: { seatNumber: "A1" } }, price: 1600 },
  { tripSeat: { seat: { seatNumber: "A2" } }, price: 1600 },
];

const payment = { provider: "BKASH", trxID: "ABC123456", status: "PAID", paidAt: "2026-09-05T10:00:00" };
const ticket = { ticketNumber: "TKT26090512", qrCode: "https://frontend/tickets/verify/TKT26090512" };
const ticketPdfUrl = "https://cloudinary.com/tickets/TKT260905.pdf";

try {
  const html = await ejs.renderFile(templatePath, { booking, bookingSeats, payment, ticket, ticketPdfUrl });
  console.log("RENDER OK. Length:", html.length);
} catch (err) {
  console.error("RENDER ERROR:");
  console.error(err);
  process.exit(1);
}

// Also test edge case: no bookingSeats, no payment, no ticket
try {
  const html2 = await ejs.renderFile(templatePath, { booking, bookingSeats: [], payment: null, ticket: null, ticketPdfUrl: null });
  console.log("RENDER EDGE OK. Length:", html2.length);
} catch (err) {
  console.error("EDGE RENDER ERROR:"); 2
  console.error(err);
  process.exit(1);
}
