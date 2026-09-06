import app from "./app";
import config from "./app/config";
import { processRefunds, updateTripSeats } from "./app/lib/cron";
import { transporter } from "./app/lib/nodemailer";
import { prisma } from "./app/lib/prisma";
import { radisClient } from "./app/lib/redis";
import {
	seedSuperAdmin,
	seedTesterAdmin,
	seedTesterOperator,
} from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
	try {
		await prisma.$connect();
		console.log("✅ Connected to the database successfully.");

		await radisClient.connect();
		console.log("❤️  Radis connected successfully.");

		await transporter.verify();
		console.log("❤️ Nodemailer connected successfully");
		app.listen(PORT, () => {
			console.log(`🌐 Server is running on port ${PORT}`);
		});

		await seedSuperAdmin();
		await seedTesterAdmin();
		await seedTesterOperator();
		await updateTripSeats();
		await processRefunds();
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
