import {SubPage} from "~src/script/page";
import {HTMLImageSource, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";

export abstract class ControllerSubPage extends SubPage {
	supportsCatching: boolean = false;
	abstract doesMatch(href: string): boolean;

	async onStart(): Promise<void> {
	}

	abstract needsNoiseWorker(): boolean;

	abstract submitNoise(noise: HTMLImageSource): void;

	abstract drawNoise(ctx: CanvasRenderingContext2D): void;

	drawCameraImage(img: HTMLImageSource, ctx: CanvasRenderingContext2D) {
		const imgWidth = img.width || (img as HTMLVideoElement).videoWidth;
		const imgHeight = img.height || (img as HTMLVideoElement).videoHeight;

		const scale = Math.max(MY_WIDTH / imgWidth, MY_HEIGHT / imgHeight);
		const x = (MY_WIDTH / 2) - (imgWidth / 2) * scale;
		const y = (MY_HEIGHT / 2) - (imgHeight / 2) * scale;
		ctx.drawImage(img, x, y, imgWidth * scale, imgHeight * scale);
	}
}
