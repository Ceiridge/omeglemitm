export interface Action {
	name: string;
	replayOnReset: boolean;
}

export class NextAction implements Action {
	name = "next";
	replayOnReset = false;
}

export class StopAction implements Action {
	name = "stop";
	replayOnReset = false;
}

export class ResetRandomIdAction implements Action {
	name = "resetrid";
	replayOnReset = false;
}

export class CountryAction implements Action {
	name = "country";
	replayOnReset = true;
	country: string;

	constructor(country: string) {
		this.country = country;
	}
}

export class GenderAction implements Action {
	name = "gender";
	replayOnReset = true;
	genderIndex: number;

	constructor(genderIndex: number) {
		this.genderIndex = genderIndex;
	}
}

export class InterestsAction implements Action {
	name = "interests";
	replayOnReset = true;
	interests: string[];

	constructor(interests: string[]) {
		this.interests = interests;
	}
}

export class ChangeIdAction implements Action {
	name = "changeid";
	replayOnReset = true;
	newId: number;

	constructor(newId: number) {
		this.newId = newId;
	}
}

export class CatchAction implements Action {
	name = "catch";
	replayOnReset = false;
}

export class SendChatAction implements Action {
	name = "chat";
	replayOnReset = false;
	message: string;

	constructor(message: string) {
		this.message = message;
	}
}
