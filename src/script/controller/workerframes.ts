import {HTMLImageSource, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";
import {Action, CatchAction, StopAction} from "~src/script/worker/actions";
import {Effect} from "~src/script/controller/effects/effect";
import {
	BulgeVideoEffect,
	DisplacementVideoEffect,
	LsdVideoEffect,
	MeshDisplacementVideoEffect,
	ShowNoiseVideoEffect,
	ShowThemselvesVideoEffect,
	SinusSwirlVideoEffect,
	TimeShiftVideoEffect
} from "~src/script/controller/effects/video";
import {
	AnonymousAudioEffect,
	AutoWahAudioEffect,
	BitcrusherAudioEffect,
	ChorusAudioEffect, ConvolverAudioEffect,
	HighPitchAudioEffect,
	LowPitchAudioEffect,
	MuteAudioEffect,
	OverdriveAudioEffect,
	PhaserAudioEffect,
	PingPongAudioEffect,
	TimeWobbleAudioEffect,
	WahWahAudioEffect
} from "~src/script/controller/effects/audio";
import {
	AudioInputEffect,
	ChromaKeyInputEffect,
	CustomAudioInputEffect,
	CustomVideoInputEffect,
	OverlayHumansInputEffect,
	RelayVideoInputEffect,
	VideoInputEffect
} from "~src/script/controller/effects/input";
import {sleep} from "~src/script/util";

export default class WorkerFrames {
	audioCtx: AudioContext;
	private readonly filteredSpeakerDestination: AudioNode;
	private readonly unfilteredSpeakerDestination: AudioNode;

	workerCounter = 0;
	workerFrames: { [botId: number]: WorkerFrame } = {};

	constructor(audioCtx: AudioContext, filteredSpeakerDestination: AudioNode, unfilteredSpeakerDestination: AudioNode) {
		this.audioCtx = audioCtx;
		this.filteredSpeakerDestination = filteredSpeakerDestination;
		this.unfilteredSpeakerDestination = unfilteredSpeakerDestination;
	}

	addWorker(container: HTMLElement): Promise<number> {
		return new Promise((fulfill) => {
			const botId = this.workerCounter++;
			this.workerFrames[botId] = new WorkerFrame(botId, this.audioCtx, this.filteredSpeakerDestination, this.unfilteredSpeakerDestination, container, this, fulfill);
		});
	}

	addNoiseWorker(container: HTMLElement) {
		return new Promise((fulfill) => {
			const frame = document.createElement("iframe");
			frame.src = "/";
			frame.style.display = "none";
			container.appendChild(frame);

			const frameWindow = frame.contentWindow as any;
			frameWindow._B_MY_ID = -1;
			frame.onload = fulfill;
		});
	}

	matchId(botId: number, forceMatch: boolean = true) {
		const neighbor = (botId % 2 == 0 ? (botId + 1) : (botId - 1)) % this.workerCounter;
		if (this.workerFrames[neighbor]) return neighbor;

		// This actually should never be reached and should always match
		if (forceMatch) {
			return 0;
		}

		return null;
	}

	matchFrame(botId: number) {
		const id = this.matchId(botId, false);
		return id === null ? null : this.workerFrames[id];
	}
}

export class WorkerFrame {
	private readonly frames: WorkerFrames;
	readonly id: number;

	frame!: HTMLIFrameElement;
	readonly appendContainer: HTMLElement;
	replayActions = new Map();
	catcher: boolean = false;

	readonly canvas: HTMLCanvasElement; // Destination canvas
	readonly canvasCtx: CanvasRenderingContext2D;
	readonly glfxCanvas: HTMLCanvasElement;
	glfxTexture: any | null = null;
	splitting = new SplittingInformation();

	videoSource: HTMLImageSource | null = null;
	videoSourcePipMirrorCtx: CanvasRenderingContext2D | null = null;

	private readonly audioCtx: AudioContext;
	readonly audioDestination: MediaStreamAudioDestinationNode; // My final destination. No more filters
	readonly audioDestinationAsSource: MediaStreamAudioSourceNode; // Final destination as a source to relay to speakers
	readonly audioDestinationBegin: GainNode; // The first destination. This goes through all filters

	audioSource: GainNode | null = null; // My source
	audioPreviousSource: GainNode | null = null; // Previous matched source
	audioPreviousDestination: AudioNode | null = null; // Previous destination (can differ from audioDestination sometimes)

	readonly audioInputEffect = new AudioInputEffect();
	readonly videoInputEffect = new VideoInputEffect();
	readonly relayVideoEffect = new RelayVideoInputEffect();
	readonly effects: Effect[] = [ // This order is intentional and is required to work "bug-free"
		new ShowThemselvesVideoEffect(),
		new CustomVideoInputEffect(),
		this.relayVideoEffect,
		this.videoInputEffect,
		new CustomAudioInputEffect(),

		new ShowNoiseVideoEffect(),

		new ChromaKeyInputEffect(),
		new OverlayHumansInputEffect(),

		new BulgeVideoEffect(),
		new SinusSwirlVideoEffect(),
		new LsdVideoEffect(),
		new MeshDisplacementVideoEffect(),
		new TimeShiftVideoEffect(),
		new DisplacementVideoEffect(),

		this.audioInputEffect,
		new MuteAudioEffect(),
		new WahWahAudioEffect(),
		new PingPongAudioEffect(),
		new BitcrusherAudioEffect(),
		new ChorusAudioEffect(),
		new PhaserAudioEffect(),
		new OverdriveAudioEffect(),
		new AutoWahAudioEffect(),
		new HighPitchAudioEffect(),
		new LowPitchAudioEffect(),
		new AnonymousAudioEffect(),
		new TimeWobbleAudioEffect(),
		new ConvolverAudioEffect()
	];

	constructor(id: number, audioCtx: AudioContext, filteredSpeakerDestination: AudioNode, unfilteredSpeakerDestination: AudioNode, container: HTMLElement, frames: WorkerFrames, onLoad?: Function) {
		this.id = id;
		this.frames = frames;
		this.audioCtx = audioCtx;

		this.canvas = document.createElement("canvas");
		this.canvas.width = MY_WIDTH;
		this.canvas.height = MY_HEIGHT;
		this.canvasCtx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
		this.glfxCanvas = fx.canvas();
		this.canvas.addEventListener("click", (event) => {
			const posX = event.offsetX;
			const posY = event.offsetY;
			const rect = this.canvas.getBoundingClientRect();

			// This can be read out by the video effects
			(this.glfxCanvas as any).effectX = (posX / rect.width) * this.glfxCanvas.width;
			(this.glfxCanvas as any).effectY = (posY / rect.height) * this.glfxCanvas.height;
		});

		this.audioDestination = audioCtx.createMediaStreamDestination();
		this.audioDestinationAsSource = audioCtx.createMediaStreamSource(this.audioDestination.stream);
		this.audioDestinationAsSource.connect(filteredSpeakerDestination); // Relay to my speakers
		this.audioDestinationBegin = audioCtx.createGain();
		this.audioDestinationBegin.connect(unfilteredSpeakerDestination); // Relay to my speakers

		this.appendContainer = container;
		this.setUpIFrame(onLoad);
	}

	private setUpIFrame(onLoad?: Function) {
		this.frame = document.createElement("iframe");
		this.frame.src = "/";
		this.frame.width = String(MY_WIDTH);
		this.frame.height = String(MY_HEIGHT);
		this.frame.style.display = "none";
		this.frame.setAttribute("sandbox", "allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-scripts");
		this.appendContainer.appendChild(this.frame);

		const frameWindow = this.frame.contentWindow as any;
		frameWindow._B_MY_ID = this.id;
		frameWindow._B_CANVAS = this.canvas;
		frameWindow._B_AUDIO = this.audioDestination.stream;
		frameWindow._B_AUDIO_OUTPUT = (audioSource: GainNode) => {
			this.audioSource = audioSource;
		};
		frameWindow._B_AUDIO_CTX = this.audioCtx;
		frameWindow._B_ON_DISCONNECT = this.onDisconnectCatchee.bind(this);

		if (onLoad) {
			this.frame.onload = () => {
				onLoad(this.id);
			};
		}
	}

	performAction(action: Action, doNotAddToReplayList: boolean = false) {
		if (!doNotAddToReplayList && action.replayOnReset) {
			this.replayActions.set(action.name, action);
		}

		(this.frame.contentWindow as any)._B_performAction(action);
	}

	reset() {
		this.frame.remove();
		this.setUpIFrame(async () => {
			// On load, replay actions that have to be replayed after a delay
			await sleep(1000);

			for (const act of this.replayActions.values()) {
				this.performAction(act as Action, true);
			}
		});
	}

	async openSourceWithPip() {
		if (this.videoSourcePipMirrorCtx) { // Only allow one
			return;
		}

		const pipWindow = await documentPictureInPicture.requestWindow({
			width: MY_WIDTH,
			height: MY_HEIGHT,
			initialAspectRatio: MY_WIDTH / MY_HEIGHT
		});

		const pipCanvas = document.createElement("canvas");
		pipCanvas.setAttribute("style", "position: absolute; top: 0; left: 0; width: 100%; height: 100%;");
		pipCanvas.width = MY_WIDTH;
		pipCanvas.height = MY_HEIGHT;
		pipWindow.document.body.appendChild(pipCanvas);
		this.videoSourcePipMirrorCtx = pipCanvas.getContext("2d");

		pipWindow.addEventListener("unload", () => {
			this.videoSourcePipMirrorCtx = null;
		});
	}


	// Is probably only called by catcher-capable workers
	private onDisconnectCatchee() {
		if (!this.catcher) {
			return;
		}

		this.performAction(new StopAction());
		setTimeout(() => {
			this.performAction(new CatchAction());
		}, 500);
	}
}

export class SplittingInformation {
	splits = 1;
	intensity = 0.5;
	allowBlackscreens = false;

	isSplitting() {
		return this.splits > 1;
	}
}
