import {randomHex} from "~src/script/util";
import {WorkerSubPage} from "~src/script/worker/workersubpage";
import FakePictureCanvas from "~src/script/worker/fakepiccanvas";

export default class OmeWorker extends WorkerSubPage {
	private fingerprints = [randomHex(39), randomHex(39)];
	private previewCanvas = new FakePictureCanvas(32, 24);

	doesMatch(href: string): boolean {
		return href.endsWith("ome.tv/");
	}

	async onStart(): Promise<void> {
	}

	onStringify(blob: any): any {
		if (blob.Fingerprint) {
			blob.Fingerprint = this.fingerprints[0];
			blob.Fingerprint2 = this.fingerprints[1];
		}

		if (blob.Pic) { // Ban Protection
			throw new TypeError("");
		}

		if (blob.preview) {
			blob.preview = this.previewCanvas.generateImage();
		}

		return blob;
	}

	getNoiseEl(): Element | null {
		return document.querySelector("#noise");
	}

	getStrangerVideoEl(): HTMLVideoElement | null {
		return document.querySelector("#remote-video");
	}

	onCapture(videoEl: HTMLVideoElement): void {
	}

	performNext(): void {
		const nextBtn = document.querySelector(".next-button.buttons__button") || document.querySelector(".start-button.buttons__button");

		if (nextBtn) (nextBtn as HTMLElement).click();
	}

	performStop(): void {
		const stopBtn = document.querySelector(".stop-button.buttons__button");

		if (stopBtn) (stopBtn as HTMLElement).click();
	}

	performCountry(country: string): void {
		const evt = document.createEvent("MouseEvents");
		evt.initMouseEvent("mousedown", true, true, unsafeWindow, 1, 0, 0, 0, 0, false, false, false, false, 0, null);

		const countryEl = document.querySelector(`.tr-country[data-tr="${country}"]`);
		if (countryEl) countryEl.dispatchEvent(evt);
	}

	performGender(genderIndex: number): void {
		const genderEl = document.querySelector(`.gender-selector__popup-item[data-value="${genderIndex}"]`);
		if (genderEl) (genderEl as HTMLElement).click();
	}

	performInterests(interests: string[]): void {
	}
}
