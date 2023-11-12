import Page from "~src/script/page";
import OmeController from "~src/script/controller/omecontroller";
import OmegleController from "~src/script/controller/omeglecontroller";
import WorkerFrames from "~src/script/controller/workerframes";
import WorkerControllers from "~src/script/controller/workercontrollers";
import {ControllerSubPage} from "~src/script/controller/controllersubpage";
import {HTMLImageSource} from "~src/script/consts";

// @ts-ignore
import htmlController from "~src/script/controller/controller.html";
import DrawInterval from "~src/script/controller/intervals/draw";
import AudioMatchInterval from "~src/script/controller/intervals/audiomatch";
import MediaInputManager from "~src/script/controller/mediainput";
import {hookFunction} from "~src/script/hooking";
import {fetchIpData} from "~src/script/util";
import setupCustomTunaEffects from "~src/script/controller/effects/customtuna";

const SUBCONTROLLERS = [new OmeController(), new OmegleController()];

export default class Controller extends Page {
	subController: ControllerSubPage;

	audioCtx: AudioContext | null = null;
	unfilteredSpeakerDestination: GainNode | null = null;
	filteredSpeakerDestination: GainNode | null = null;
	mediaInput: MediaInputManager | null = null;

	tuna: Tuna | any | null = null;
	sinusFactor: number = 1;
	strengthFactor: number = 1;

	framesContainer: HTMLElement | null = null;
	frames: WorkerFrames | null = null;
	controllers: WorkerControllers | null = null;

	drawInterval: DrawInterval | null = null;
	audioMatchInterval: AudioMatchInterval | null = null;

	bodySegmenter: any | null = null;

	private hasStarted: boolean = false;

	constructor() {
		super(SUBCONTROLLERS);
		this.subController = this.subPage as ControllerSubPage;
	}

	protected async actualStart(): Promise<void> {
		await this.setUpHtml();
		await this.setUpSegmenter();

		unsafeWindow.start = this.onStartButton.bind(this);
		unsafeWindow.startMediaInput = this.startMediaInput.bind(this);
	}

	private async setUpHtml() {
		document.head.innerHTML = `<meta name="color-scheme" content="dark">`;
		document.body.innerHTML = htmlController;

		const sinusFactorController = document.querySelector(".g-sinus-control") as HTMLInputElement;
		const sinusFactorValue = document.querySelector(".g-sinus-value") as HTMLElement;
		sinusFactorController.oninput = () => {
			sinusFactorValue.textContent = sinusFactorController.value;
		};
		sinusFactorController.onchange = () => {
			this.sinusFactor = parseFloat(sinusFactorController.value);
		};

		const strengthFactorController = document.querySelector(".g-strength-control") as HTMLInputElement;
		const strengthFactorValue = document.querySelector(".g-strength-value") as HTMLElement;
		strengthFactorController.oninput = () => {
			strengthFactorValue.textContent = strengthFactorController.value;
			this.strengthFactor = parseFloat(strengthFactorController.value);
		};

		const hearUnfilteredInput = document.querySelector(".b-hear-unfiltered") as HTMLInputElement;
		hearUnfilteredInput.onchange = () => {
			this.toggleSpeaker(false, hearUnfilteredInput.checked);
		};
		const hearFilteredInput = document.querySelector(".b-hear-filtered") as HTMLInputElement;
		hearFilteredInput.onchange = () => {
			this.toggleSpeaker(true, hearFilteredInput.checked);
		};

		this.framesContainer = document.getElementById("oframes");
	}

	private async setUpSegmenter() {
		bodySegmentation.createSegmenter(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation, {
			runtime: "tfjs",
			modelType: "landscape",
			// solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation"
		}).then((segmenter: any) => {
			this.bodySegmenter = segmenter;
		});
	}

	private async onStartButton() {
		document.getElementById("startbtn")!.textContent = "Add pair";

		if (this.hasStarted) {
			await this.addPairButton();
			return;
		}
		this.hasStarted = true;

		this.audioCtx = new AudioContext();
		this.unfilteredSpeakerDestination = this.audioCtx.createGain();
		this.unfilteredSpeakerDestination.connect(this.audioCtx.destination);
		this.unfilteredSpeakerDestination.gain.value = 0;
		this.filteredSpeakerDestination = this.audioCtx.createGain();
		this.filteredSpeakerDestination.connect(this.audioCtx.destination);

		this.tuna = new Tuna(this.audioCtx);
		hookFunction(AudioNode.prototype, "disconnect", function (stream?: AudioNode | any) { // Tuna disconnect fix
			if (stream && stream.input) { // Is a tuna node
				stream = stream.input;
			}

			// @ts-ignore
			return this.orig(stream);
		}, false);
		setupCustomTunaEffects();

		this.mediaInput = new MediaInputManager(this.audioCtx);
		this.frames = new WorkerFrames(this.audioCtx, this.filteredSpeakerDestination, this.unfilteredSpeakerDestination);
		this.controllers = new WorkerControllers(this.frames, this.framesContainer!, this.audioCtx!, this.subController.supportsCatching);

		this.placeSubmitters();

		if (this.subController.needsNoiseWorker()) {
			await this.frames!.addNoiseWorker(this.framesContainer!);
		}

		this.drawInterval = new DrawInterval(this);
		this.drawInterval.start();
		this.audioMatchInterval = new AudioMatchInterval(this);
		this.audioMatchInterval.start();

		await this.addPairButton();
	}

	private async addPairButton() {
		await this.controllers!.addWorkerPair();
	}

	private startMediaInput() {
		if (!this.audioCtx) {
			alert("You need to click on start first.");
			return;
		}

		this.mediaInput!.show();
	}

	private placeSubmitters() {
		unsafeWindow._B_submitStrangerStream = (id: number, stream: HTMLImageSource | null) => {
			this.frames!.workerFrames[id].videoSource = stream;
		};
		unsafeWindow._B_submitNoiseStream = (stream: HTMLImageSource) => {
			this.subController.submitNoise(stream);
		};
		unsafeWindow._B_submitIp = async (id: number, ip: string) => {
			id = this.frames!.matchId(id)!;
			const ipDataDiv = document.querySelector("#workerIpData_" + id);
			if (!ipDataDiv) {
				return;
			}

			const data = await fetchIpData(ip) as any;

			if (data.status === "success") {
				// Ugly newline hack
				ipDataDiv.textContent = `IP: ${data.query} (${data.country}, ${data.regionName}, ${data.zip} ${data.city})$NEWLINE$
                    Loc: ${data.lat},${data.lon}$NEWLINE$
                    ISP: ${data.isp}, ${data.org}, ${data.as}$NEWLINE$
                    Proxy: ${data.proxy ? "Yes" : "No"}, Datacenter: ${data.hosting ? "Yes" : "No"}`;
				ipDataDiv.innerHTML = ipDataDiv.innerHTML.replace(/\$NEWLINE\$/g, "<br>");
			} else {
				ipDataDiv.textContent = `IP: ${data.query}, Geolocation failed: ${data.message}`;
			}
		};
		unsafeWindow._B_submitChatLog = (id: number, messages: string[]) => {
			id = this.frames!.matchId(id)!;
			const chatMessages = document.getElementById("b-chat-" + id);
			if (!chatMessages) {
				return;
			}

			chatMessages.innerHTML = "";
			for (const message of messages.reverse()) {
				const spanElement = document.createElement("span");
				spanElement.textContent = message;
				chatMessages.appendChild(spanElement);
			}
		};
	}

	private toggleSpeaker(filtered: boolean, enable: boolean) {
		const gainNode = filtered ? this.filteredSpeakerDestination : this.unfilteredSpeakerDestination;

		if (gainNode) {
			gainNode.gain.value = enable ? 1 : 0;
		}
	}
}
