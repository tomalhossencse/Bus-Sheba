import z from "zod";
export const PassengerRegistrationZodSchema = z.object({
	name: z
		.string("Name must be a string")
		.min(3, { message: "Name must be at least 3 characters long" })
		.max(50, { message: "Name must be at most 50 characters long" }),
	email: z.email("Invalid email address"),
	password: z
		.string("Password must be a string")
		.min(8, { message: "Password must be at least 8 characters long" })
		.regex(/[A-Z]/, { message: "Contain at least one uppercase letter" })
		.regex(/[a-z]/, { message: "Contain at least one lowercase letter" })
		.regex(/[0-9]/, { message: "Contain at least one number" })
		.regex(/[^A-Za-z0-9]/, {
			message: "Contain at least one special character",
		}),
});
