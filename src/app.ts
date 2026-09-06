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

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
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

// Basic route
app.get("/", async (req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to Bus Sheba System Backend",
	});
});

app.use(globalErrorHandler);
app.use(notFound);

export default app;
