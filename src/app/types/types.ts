import { Role } from "../../generated/prisma/enums";

export interface JwtPayload {
	id: string;
	name: string;
	email: string;
	role: Role;
}

export interface RequestUser extends JwtPayload {}
