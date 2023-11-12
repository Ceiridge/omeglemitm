import {Modification, VideoEffect} from "~src/script/controller/effects/effect";
import {WorkerFrame} from "~src/script/controller/workerframes";
import {HTMLImageSource, MY_FPS, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";
import {getRandomArbitrary} from "~src/script/util";

export class ShowNoiseVideoEffect extends VideoEffect {
	name = "Show Noise";

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		return new Modification([], false);
	}
}

export class ShowThemselvesVideoEffect extends VideoEffect {
	name = "Mirror other";

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		if (worker.videoSource) {
			stream.unshift(worker.videoSource);
		}

		return new Modification(stream);
	}
}

export class BulgeVideoEffect extends VideoEffect {
	name = "Sphere";
	glfxEffect = true;

	modifyGlfx(worker: WorkerFrame, glfxCanvas: HTMLCanvasElement | any, glfxTexture: any, stream: HTMLImageSource[]) {
		glfxCanvas.bulgePinch(glfxCanvas.effectX || (MY_WIDTH / 2), glfxCanvas.effectY || (MY_HEIGHT / 2), 200 * this.getStrength(), Math.min(1, 0.75 * this.getStrength()));
	}
}

export class SinusSwirlVideoEffect extends VideoEffect {
	name = "Sinus Swirl";
	glfxEffect = true;

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		glfxCanvas.swirl(glfxCanvas.effectX || (MY_WIDTH / 2), glfxCanvas.effectY || (MY_HEIGHT / 2), 200, (2 * this.getStrength()) * Math.sin(this.getTimeWithSinusFactor() / 500));
	}
}

export class LsdVideoEffect extends VideoEffect {
	name = "LSD";
	glfxEffect = true;

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		glfxCanvas.hueSaturation(Math.sin(this.getTimeWithSinusFactor() / 500), 0);
	}
}

class SwitchingOscillator {
	private readonly switchSignInterval: number;
	private readonly incrementAmount: number;

	private value: number = 0;
	private lastSwitch: number = 0;
	private switchDirection: number = 1;

	constructor(switchSignInterval: number, switchDuration: number) {
		this.switchSignInterval = switchSignInterval;
		this.incrementAmount = 1000 / (MY_FPS * switchDuration);
	}

	calculateValue(msNow: number = Date.now()): number {
		const needsSwitch = msNow - this.lastSwitch > this.switchSignInterval;
		const isSwitching = this.value !== 1 && this.value !== -1;

		if (isSwitching) {
			this.value += this.switchDirection * this.incrementAmount;

			if (this.value > 1 || this.value < -1) { // Clamp
				this.value = this.switchDirection;
			}
		} else if (needsSwitch) {
			this.switchDirection = -this.switchDirection;
			this.lastSwitch = msNow;

			this.value += this.switchDirection * this.incrementAmount;
		}

		return this.value;
	}
}

export class MeshDisplacementVideoEffect extends VideoEffect {
	name = "Scary Faces";
	glfxEffect = true;

	private oscillator = new SwitchingOscillator(5000, 1000);

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		glfxCanvas.stack_push();
		glfxCanvas.mesh_displacement(0, this.oscillator.calculateValue(this.getTimeWithSinusFactor()) * (0.15 * this.getStrength()), 0, 0, 0, 0);
	}
}

export class TimeShiftVideoEffect extends VideoEffect {
	name = "Nervous";
	glfxEffect = true;

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		const sinFactor = Math.max(1, this.stateController?.sinusFactor || 1);
		glfxCanvas.timeshift(getRandomArbitrary(1, Math.max(2, Math.round(10 / sinFactor))));
	}
}

export class DisplacementVideoEffect extends VideoEffect {
	name = "Displacement";
	glfxEffect = true;

	private oscillator = new SwitchingOscillator(5000, 250);

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		glfxCanvas.displacement(this.oscillator.calculateValue(this.getTimeWithSinusFactor()) * (0.25 * this.getStrength()));
	}
}
