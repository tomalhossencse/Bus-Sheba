export interface ILoginUserPayload {
	email: string;
	password: string;
}

export interface IRegisterPassengerPayload {
	name: string;
	email: string;
	password: string;
}

export interface IVerifyPassengerPayload {
	otp: string;
	email: string;
}

export interface IGoogleLoginPayload {
	idToken: string;
}
