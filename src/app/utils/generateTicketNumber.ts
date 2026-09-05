import crypto from "crypto";

export const generateTicketNumber = (id: string): string => {
	const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
	const ticketLength = 6;
	let result = "";

	const randomBytes = crypto.randomBytes(ticketLength);

	for (let i = 0; i < ticketLength; i++) {
		result += chars[randomBytes[i] % chars.length];
	}

	return `TC-${result}-${id}`;
};
