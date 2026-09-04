import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import config from "../config";
import httpStatus from "http-status";
import { AppError } from "./AppError";

export const seedSuperAdmin = async () => {
	try {
		const ifSuperAdminExist = await prisma.user.findFirst({
			where: {
				role: "SUPER_ADMIN",
			},
		});

		if (ifSuperAdminExist) {
			console.log("Super Admin Already Exists");
			return;
		}

		const name = config.super_admin_name;
		const email = config.super_admin_email;
		const password = config.super_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Super Admin Name, Email , Password Missing in Env file",
			);
		}
		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const superAdmin = await prisma.user.create({
			data: {
				name,
				email,
				role: "SUPER_ADMIN",
				password: hashedPassword,
				emailVerified: true,
				needPasswordChange: false,
			},
		});

		console.log("Super Admin created", superAdmin);
	} catch (error) {
		await prisma.user.delete({
			where: { email: config.super_admin_email },
		});
		console.log("Error Seeding Super Admin", error);
	}
};

export const seedTesterAdmin = async () => {
	try {
		const ifTesterAdminExist = await prisma.user.findUnique({
			where: {
				email: config.tester_admin_email,
			},
		});

		if (ifTesterAdminExist) {
			console.log("Tester Admin Already Exists");
			return;
		}

		const name = config.tester_admin_name;
		const email = config.tester_admin_email;
		const password = config.tester_admin_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Admin Name, Email , Password Missing in Env file",
			);
		}
		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerAdmin = await prisma.user.create({
			data: {
				name,
				email,
				role: "ADMIN",
				password: hashedPassword,
				emailVerified: true,
				needPasswordChange: false,
			},
		});

		console.log("Tester Admin created", testerAdmin);
	} catch (error) {
		await prisma.user.delete({
			where: { email: config.tester_admin_email },
		});
		console.log("Error Seeding Testing Admin", error);
	}
};

export const seedTesterOperator = async () => {
	try {
		const ifTesterOperatorExist = await prisma.user.findUnique({
			where: {
				email: config.tester_operator_email,
			},
		});

		if (ifTesterOperatorExist) {
			console.log("Tester Operator Already Exists");
			return;
		}

		const name = config.tester_operator_name;
		const email = config.tester_operator_email;
		const password = config.tester_operator_password;

		if (!name || !email || !password) {
			throw new AppError(
				httpStatus.INTERNAL_SERVER_ERROR,
				"Tester Operator Name, Email , Password Missing in Env file",
			);
		}
		const hashedPassword = await bcrypt.hash(
			password,
			Number(config.bcrypt_salt_rounds),
		);

		const testerOperator = await prisma.user.create({
			data: {
				name,
				email,
				role: "OPERATOR",
				password: hashedPassword,
				emailVerified: true,
				needPasswordChange: false,
				operator: {
					create: {
						email,
						name,
						companyName: "Tester Operator Company",
						nidNumber: "1234567890",
						tradeLicenseNo: "123456789",
						businessRegistrationNo: "BRN123456",
						taxIdentificationNo: "123456789012",
						phone: "+8801234567890",
						verificationStatus: "APPROVED",
					},
				},
			},
		});

		console.log("Tester Operator created", testerOperator);
	} catch (error) {
		await prisma.user.delete({
			where: { email: config.tester_operator_email },
		});
		console.log("Error Seeding Testing Operator", error);
	}
};
