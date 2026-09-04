import crypto from "crypto";

export const generateBookingNumber = (): string => {
	const today = new Date();
	const yy = today.getFullYear().toString().slice(-2);
	const mm = String(today.getMonth() + 1).padStart(2, "0");
	const dd = String(today.getDate()).padStart(2, "0");
	const dateStr = `${yy}${mm}${dd}`;

	const randomStr = crypto
		.randomBytes(3)
		.toString("hex")
		.toUpperCase()
		.slice(0, 4);

	return `BS-${dateStr}-${randomStr}`;
};
