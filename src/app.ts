import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { OperatorRoutes } from "./app/module/operator/operator.route";
import { BusRoutes } from "./app/module/bus/bus.route";
import { RouteRoutes } from "./app/module/route/route.route";
import { RouteStopRoutes } from "./app/module/routeStop/routeStop.route";
import { TripRoutes } from "./app/module/trip/trip.route";
import { BookingRoutes } from "./app/module/booking/booking.route";
import { PaymentRoutes } from "./app/module/payment/payment.route";
import { AnalyticsRoutes } from "./app/module/analytics/analytics.route";
import { TicketRoutes } from "./app/module/ticket/ticket.route";

const app: Application = express();

const allowedOrigins = [
    config.frontend_url,
    "http://localhost:3000",
    "https://bus-sheba-bd.vercel.app",
    "https://bus-sheba.vercel.app",
].filter((origin): origin is string => Boolean(origin));

app.use(
	cors({
		origin: (origin, callback) => {
			if (!origin || allowedOrigins.includes(origin)) {
				return callback(null, true);
			}

			return callback(new Error(`Origin ${origin} is not allowed by CORS`));
		},
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/operator", OperatorRoutes);
app.use("/api/v1/bus", BusRoutes);
app.use("/api/v1/route", RouteRoutes);
app.use("/api/v1/route-stop", RouteStopRoutes);
app.use("/api/v1/trip", TripRoutes);
app.use("/api/v1/booking", BookingRoutes);
app.use("/api/v1/payment", PaymentRoutes);
app.use("/api/v1/analytics", AnalyticsRoutes);
app.use("/api/v1/tickets", TicketRoutes);

// Basic route
app.get("/health", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Bus Sheba System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
