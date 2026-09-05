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

export const GoogleLoginZodSchema = z.object({
	idToken: z.string().min(1, { message: "Invalid ID token" }),
});

export const PassengerVerifyZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, { message: "OTP must be exactly 6 characters" }),
});

export const LoginZodSchema = z.object({
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

export const ForgetPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
});

export const ChangePasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
	oldPassword: z
		.string("Old password must be a string")
		.min(8, { message: "Old password must be at least 8 characters long" })
		.regex(/[A-Z]/, { message: "Contain at least one uppercase letter" })
		.regex(/[a-z]/, { message: "Contain at least one lowercase letter" })
		.regex(/[0-9]/, { message: "Contain at least one number" })
		.regex(/[^A-Za-z0-9]/, {
			message: "Contain at least one special character",
		}),
	newPassword: z
		.string("New password must be a string")
		.min(8, { message: "New password must be at least 8 characters long" })
		.regex(/[A-Z]/, { message: "Contain at least one uppercase letter" })
		.regex(/[a-z]/, { message: "Contain at least one lowercase letter" })
		.regex(/[0-9]/, { message: "Contain at least one number" })
		.regex(/[^A-Za-z0-9]/, {
			message: "Contain at least one special character",
		}),
});

export const ResetPasswordZodSchema = z.object({
	email: z.email("Invalid email address"),
	otp: z.string().length(6, { message: "OTP must be exactly 6 characters" }),
	newPassword: z
		.string("New password must be a string")
		.min(8, { message: "New password must be at least 8 characters long" })
		.regex(/[A-Z]/, { message: "Contain at least one uppercase letter" })
		.regex(/[a-z]/, { message: "Contain at least one lowercase letter" })
		.regex(/[0-9]/, { message: "Contain at least one number" })
		.regex(/[^A-Za-z0-9]/, {
			message: "Contain at least one special character",
		}),
});

export const ImageFileSchema = z.object({
	buffer: z.instanceof(Buffer, { message: "Invalid file data" }),
	mimetype: z
		.string()
		.refine(
			(type) => ["image/jpeg", "image/png", "image/webp"].includes(type),
			{ message: "Only JPEG, PNG, and WebP images are allowed" },
		),
	size: z.number().max(5 * 1024 * 1024, {
		message: "Image size must be less than 5MB",
	}),
});

export const UpdateProfileZodSchema = z.object({
	name: z
		.string("Name must be a string")
		.min(3, { message: "Name must be at least 3 characters long" })
		.max(50, { message: "Name must be at most 50 characters long" })
		.optional(),
	phone: z
		.string("Phone number must be a string")
		.trim()
		.regex(/^(?:\+88|88)?(01[3-9]\d{8})$/, {
			message: "Invalid BD phone number. Must be a valid 11-digit number.",
		})
		.optional(),
});

export type ILoginUserPayload = z.infer<typeof LoginZodSchema>;

export type IRegisterPassengerPayload = z.infer<
	typeof PassengerRegistrationZodSchema
>;

export type IVerifyPassengerPayload = z.infer<typeof PassengerVerifyZodSchema>;

export type IGoogleLoginPayload = z.infer<typeof GoogleLoginZodSchema>;

export type IForgetPasswordPayload = z.infer<typeof ForgetPasswordZodSchema>;

export type IResetPasswordPayload = z.infer<typeof ResetPasswordZodSchema>;

export type IChangePasswordPayload = z.infer<typeof ChangePasswordZodSchema>;

export type IUpdateProfilePayload = z.infer<typeof UpdateProfileZodSchema>;
export type IImageFile = z.infer<typeof ImageFileSchema>;
