import {ControllerSubPage} from "~src/script/controller/controllersubpage";
import {HTMLImageSource, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";

export default class OmeController extends ControllerSubPage {
	private noiseStream: HTMLImageSource | null = null;

	doesMatch(href: string): boolean {
		return href.endsWith("ome.tv/robots.txt");
	}

	needsNoiseWorker(): boolean {
		return true;
	}

	submitNoise(noise: HTMLImageSource): void {
		this.noiseStream = noise;
	}

	drawNoise(ctx: CanvasRenderingContext2D): void {
		if (!this.noiseStream) {
			return;
		}

		let noiseGradient = (ctx as any).noiseGradient;

		if (!noiseGradient) { // radial-gradient(ellipse at center,rgba(0,0,0,.5) 0,rgba(0,0,0,.8) 100%) [Vignette]
			const w = MY_WIDTH;
			const h = MY_HEIGHT;
			const outerRadius = w * 0.5;
			const innerRadius = 0;

			noiseGradient = ctx.createRadialGradient(w / 2, h / 2, innerRadius, w / 2, h / 2, outerRadius);
			noiseGradient.addColorStop(0, "rgba(0,0,0,.5)");
			noiseGradient.addColorStop(1, "rgba(0,0,0,.8)");

			(ctx as any).noiseGradient = noiseGradient;
		}

		ctx.drawImage(this.noiseStream, 0, 0, MY_WIDTH, MY_HEIGHT);
		ctx.fillStyle = noiseGradient;
		ctx.fillRect(0, 0, MY_WIDTH, MY_HEIGHT);
	}
}
