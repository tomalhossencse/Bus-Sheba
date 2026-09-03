import { Role } from "../../generated/prisma/enums";

export interface JwtPayload {
	userId: string;
	name: string;
	email: string;
	role: Role;
}
