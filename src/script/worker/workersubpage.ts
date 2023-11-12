import {SubPage} from "~src/script/page";

export abstract class WorkerSubPage extends SubPage {
	abstract onStringify(blob: any): any;

	abstract getNoiseEl(): Element | null;

	abstract getStrangerVideoEl(): HTMLVideoElement | null;

	abstract onCapture(videoEl: HTMLVideoElement): void;

	abstract performNext(): void;

	abstract performStop(): void;

	abstract performCountry(country: string): void;

	abstract performGender(genderIndex: number): void;

	abstract performInterests(interests: string[]): void;

	async performCatch() {
	}

	performResetRandomId() {
	}

	performChatMessage(message: string) {
	}
}
