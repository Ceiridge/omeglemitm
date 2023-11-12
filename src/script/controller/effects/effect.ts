import {WorkerFrame} from "~src/script/controller/workerframes";
import {HTMLImageSource} from "~src/script/consts";
import Controller from "~src/script/controller/controller";

export abstract class Effect {
	abstract name: string;
	visuallyHighlight: boolean = false;
	enabled: boolean = false;
	hidden: boolean = false;

	stateController: Controller | null = null; // Hacky way to expose the controller
	private lastTimeForSinusFactor: number = 0;

	onToggle() {
	}

	onAddHtml(checkboxDiv: HTMLElement) {
	}

	getTimeWithSinusFactor() {
		const now = Date.now();

		if (!this.stateController) {
			return now;
		}

		const sinFactor = this.stateController.sinusFactor;
		if (sinFactor === 0) {
			return this.lastTimeForSinusFactor; // Return the last time if the sinus factor is 0 to allow locking states
		}

		return (this.lastTimeForSinusFactor = now * sinFactor);
	}

	getStrength() {
		if (!this.stateController) {
			return 1;
		}

		return this.stateController.strengthFactor;
	}
}

export class Modification<T> {
	result: T;
	propagate: boolean;

	constructor(result: T, propagate: boolean = true) {
		this.result = result;
		this.propagate = propagate;
	}
}

export abstract class VideoEffect extends Effect {
	glfxEffect: boolean = false;

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		return new Modification(stream);
	}

	modifyGlfx(worker: WorkerFrame, glfxCanvas: HTMLCanvasElement | any, glfxTexture: any, stream: HTMLImageSource[]) {
	}
}

// Everything is called here, even if it is disabled!
export abstract class AudioEffect extends Effect {
	modifyGainSource(worker: WorkerFrame, source: GainNode, destination: AudioNode) {
	}
}

// Every modification is called here, even if it is disabled!
export abstract class TunaAudioEffect extends AudioEffect {
	protected tunaEffect: AudioNode | null = null;
	private effectConnectedTo: AudioNode | null = null;

	protected abstract initTunaEffect(tuna: Tuna | any): AudioNode;

	modifyAudioDestination(worker: WorkerFrame, destination: AudioNode) {
		if (!this.stateController?.tuna) {
			return destination;
		}

		if (!this.enabled) {
			if (this.tunaEffect && this.effectConnectedTo) {
				this.tunaEffect.disconnect(this.effectConnectedTo);
				this.effectConnectedTo = null;
			}

			return destination;
		}

		if (!this.tunaEffect) {
			this.tunaEffect = this.initTunaEffect(this.stateController.tuna);
		}

		if (!this.effectConnectedTo) {
			this.tunaEffect.connect(destination);
			this.effectConnectedTo = destination;
		}

		return this.tunaEffect || destination;
	}
}

export abstract class InputEffect extends Effect {
	glfxEffect: boolean = false;
	wantsUnfilteredDestination: boolean = false;

	modifyGainSource(worker: WorkerFrame, source: GainNode, destination: AudioNode) {
	}

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		return new Modification(stream);
	}

	modifyGlfx(worker: WorkerFrame, glfxCanvas: HTMLCanvasElement | any, glfxTexture: any, stream: HTMLImageSource[]) {
	}

	async modifyAfterDraw(worker: WorkerFrame, stream: HTMLImageSource[], destCtx: CanvasRenderingContext2D) {
	}
}
