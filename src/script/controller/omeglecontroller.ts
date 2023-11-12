import {ControllerSubPage} from "~src/script/controller/controllersubpage";
import {HTMLImageSource, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";

export default class OmegleController extends ControllerSubPage {
	supportsCatching = false; // :( - This used to be a planned, but impossible, feature
	private noiseStream: HTMLImageSource | null = null;

	doesMatch(href: string): boolean {
		return href.endsWith("www.omegle.com/robots.txt");
	}

	needsNoiseWorker(): boolean {
		return false;
	}

	async onStart(): Promise<void> {
		const noiseUrl = GM_getResourceURL("loadingAnim").replace("data:application;base64", "data:video/mp4;base64");
		const noiseImg = document.createElement("video");
		noiseImg.src = noiseUrl;
		noiseImg.loop = true;
		noiseImg.play();

		document.body.appendChild(noiseImg); // This fixes a GPU issue
		noiseImg.setAttribute("style", "position: fixed; top: 50%; width: 5px; height: 5px;");

		this.noiseStream = noiseImg;
	}

	drawNoise(ctx: CanvasRenderingContext2D): void {
		if (!this.noiseStream) {
			return;
		}

		ctx.fillStyle = "rgb(85, 85, 85)"; // Gray
		ctx.fillRect(0, 0, MY_WIDTH, MY_HEIGHT);

		// Abuse the ctx object to add a 1-second delay for the noise video to appear
		const ctxAny = ctx as any;
		const msNow = Date.now();
		let paintDiff = msNow - (ctxAny.lastNoiseStreamPaint || 0);

		if (paintDiff >= 2000) {
			ctxAny.lastNoiseStreamPaint = msNow;
		} else if (paintDiff >= 1000) {
			// const wh = Math.floor(MY_HEIGHT * 0.25);
			// ctx.drawImage(this.noiseStream, (MY_WIDTH / 2) - (wh / 2), (MY_HEIGHT / 2) - (wh / 2), wh, wh);

			ctxAny.lastNoiseStreamPaint = msNow - 1000;
		}
	}

	submitNoise(noise: HTMLImageSource): void {
	}
}
