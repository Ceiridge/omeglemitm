import {InputEffect, Modification} from "~src/script/controller/effects/effect";
import {WorkerFrame} from "~src/script/controller/workerframes";
import {HTMLImageSource, MY_AI_HEIGHT, MY_AI_WIDTH, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";
import {hexToRgb} from "~src/script/util";

export class AudioInputEffect extends InputEffect {
	name = "Audio Input";
	hidden = true;
	enabled = true;

	audioSource: AudioNode | null = null;
	private actualAudioSource: AudioNode | null = null;

	modifyGainSource(worker: WorkerFrame, source: GainNode, destination: AudioNode) {
		if (this.audioSource !== this.actualAudioSource) {
			if (this.actualAudioSource) {
				this.actualAudioSource.disconnect(destination);
			}

			if (this.audioSource) {
				this.audioSource.connect(destination);
			}

			this.actualAudioSource = this.audioSource;
		}
	}
}

export class CustomAudioInputEffect extends InputEffect {
	name = "Your Mic Input";
	visuallyHighlight = true;
	wantsUnfilteredDestination = false;

	private wasConnected = false;

	modifyGainSource(worker: WorkerFrame, source: GainNode, destination: AudioNode) {
		if (!this.stateController?.mediaInput?.micStream) {
			return;
		}

		try {
			if (this.enabled && !this.wasConnected) {
				this.wasConnected = true;
				this.stateController.mediaInput.micStream.connect(destination);
			} else if (!this.enabled && this.wasConnected) {
				this.wasConnected = false;
				this.stateController.mediaInput.micStream.disconnect(destination);
			}
		} catch {
		}
	}
}

export class VideoInputEffect extends InputEffect {
	name = "Video Input";
	hidden = true;
	enabled = true;

	videoSource: HTMLImageSource | null = null;

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		if (worker.relayVideoEffect.enabled && this.videoSource) {
			stream.unshift(this.videoSource);
		}

		return new Modification(stream);
	}
}

export class CustomVideoInputEffect extends InputEffect {
	name = "Your Media Input";
	visuallyHighlight = true;

	modifyStreamQueue(worker: WorkerFrame, stream: HTMLImageSource[]) {
		if (this.stateController?.mediaInput?.mediaStream) {
			stream.unshift(this.stateController.mediaInput.mediaStream);
		}

		return new Modification(stream);
	}
}

export class RelayVideoInputEffect extends InputEffect {
	name = "Relay Image";
	enabled = true;
}

export class ChromaKeyInputEffect extends InputEffect {
	name = "Chroma Key";
	glfxEffect = true;

	private chromaColor = [0, 1, 0];

	onAddHtml(checkboxDiv: HTMLElement) {
		super.onAddHtml(checkboxDiv);

		const colorPicker = document.createElement("input");
		colorPicker.type = "color";
		colorPicker.value = "#00ff00";

		colorPicker.oninput = () => {
			this.chromaColor = hexToRgb(colorPicker.value).map(col => col / 255);
		};
		checkboxDiv.prepend(colorPicker);
	}

	modifyGlfx(worker: WorkerFrame, glfxCanvas: any, glfxTexture: any, stream: HTMLImageSource[]) {
		if (stream.length < 2) {
			return;
		}

		// Draw original stream and push to stack (this is a bit inefficient)
		glfxTexture.loadContentsOf(stream[1]);
		glfxCanvas.draw(glfxTexture).stack_push();

		// Now use the upmost stream as green-screen
		glfxTexture.loadContentsOf(stream[0]);
		glfxCanvas.draw(glfxTexture).colorkeyv2(this.chromaColor[0], this.chromaColor[1], this.chromaColor[2] /*, 0.4, 0.1*/); // Pops the stack
	}
}

export class OverlayHumansInputEffect extends InputEffect {
	name = "Overlay Humans";

	private helperCanvas: HTMLCanvasElement | null = null;
	private helperCanvasCtx: CanvasRenderingContext2D | null = null;

	async modifyAfterDraw(worker: WorkerFrame, stream: HTMLImageSource[], destCtx: CanvasRenderingContext2D) {
		if (stream.length < 2 || !this.stateController?.bodySegmenter) {
			return;
		}

		if (this.helperCanvas === null || this.helperCanvasCtx === null) {
			this.helperCanvas = document.createElement("canvas");
			this.helperCanvas.width = MY_AI_WIDTH;
			this.helperCanvas.height = MY_AI_HEIGHT;
			this.helperCanvasCtx = this.helperCanvas.getContext("2d")!;
		} else {
			destCtx.drawImage(this.helperCanvas, 0, 0, MY_WIDTH, MY_HEIGHT); // Draw old frame to reduce strobo
		}
		// TODO: Fix strobo

		// Draw original stream to temporary canvas
		this.helperCanvasCtx.drawImage(stream[1], 0, 0, MY_AI_WIDTH, MY_AI_HEIGHT);

		const people = await this.stateController.bodySegmenter.segmentPeople(this.helperCanvas, {
			flipHorizontal: false,
			multiSegmentation: false,
			segmentBodyParts: true,
			segmentationThreshold: 0.6
		});
		const binMask = await bodySegmentation.toBinaryMask(people, {r: 255, g: 255, b: 255, a: 255}, {
			r: 0,
			g: 0,
			b: 0,
			a: 0
		}, false, 0.6);

		await bodySegmentation.drawMask(this.helperCanvas, this.helperCanvas, binMask, 1, 0, false);
		this.helperCanvasCtx.globalCompositeOperation = "source-in";
		this.helperCanvasCtx.drawImage(stream[1], 0, 0, MY_AI_WIDTH, MY_AI_HEIGHT); // Draw original stream on mask
		this.helperCanvasCtx.globalCompositeOperation = "source-over";

		// Now draw the half-transparent canvas to the destination
		destCtx.drawImage(this.helperCanvas, 0, 0, MY_WIDTH, MY_HEIGHT);
	}
}
