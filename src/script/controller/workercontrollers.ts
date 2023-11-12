import WorkerFrames, {WorkerFrame} from "~src/script/controller/workerframes";
// @ts-ignore
import htmlControl from "~src/script/controller/control.html";
import {
	CountryAction,
	InterestsAction,
	NextAction,
	ResetRandomIdAction,
	SendChatAction,
	StopAction
} from "~src/script/worker/actions";
import {AudioEffect, VideoEffect} from "~src/script/controller/effects/effect";
import {MY_FPS} from "~src/script/consts";
import Recorder from "~src/script/controller/recorder";

export default class WorkerControllers {
	readonly frames: WorkerFrames;
	readonly framesContainer: HTMLElement;
	readonly audioCtx: AudioContext;

	private readonly withCatching: boolean;

	constructor(frames: WorkerFrames, framesContainer: HTMLElement, audioCtx: AudioContext, withCatching: boolean) {
		this.frames = frames;
		this.framesContainer = framesContainer;
		this.audioCtx = audioCtx;
		this.withCatching = withCatching;
	}

	async addWorkerPair() {
		const container = document.createElement("div");
		container.setAttribute("class", "botpair");
		this.framesContainer.appendChild(container);

		const worker1 = await this.frames.addWorker(container);
		const worker2 = await this.frames.addWorker(container);

		const workers = document.createElement("div");
		workers.setAttribute("class", "bots");
		container.appendChild(workers);

		for (const workerId of [worker1, worker2]) {
			const worker = this.frames.workerFrames[workerId];

			const workerDiv = document.createElement("div");
			workerDiv.setAttribute("class", "bot");
			workers.appendChild(workerDiv);

			workerDiv.appendChild(worker.canvas);
			const controlsDiv = document.createElement("div");
			controlsDiv.setAttribute("class", "controls");
			workerDiv.appendChild(controlsDiv);

			await this.addControls(controlsDiv, worker);
		}
	}

	private async addControls(controlsDiv: Element, worker: WorkerFrame) {
		const ctrl = document.createElement("div");
		ctrl.setAttribute("class", "control");
		controlsDiv.appendChild(ctrl);

		ctrl.innerHTML = htmlControl.replace(/{{WORKERID}}/g, worker.id);

		this.setUpActions(ctrl, worker);
		this.setUpEffects(ctrl, worker);
		this.setUpInput(ctrl, worker);
		this.setUpChat(ctrl, worker);
	}

	private setUpActions(ctrl: HTMLElement, worker: WorkerFrame) {
		(ctrl.querySelector(".b-next-btn") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.performAction(new NextAction());
		};
		(ctrl.querySelector(".b-stop-btn") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.performAction(new StopAction());
		};
		(ctrl.querySelector(".b-reset-btn") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.reset();
		};
		(ctrl.querySelector(".b-rid-btn") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.performAction(new ResetRandomIdAction());
		};
		(ctrl.querySelector(".b-source-pip-btn") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.openSourceWithPip();
		};

		const showDebugFrameInput = ctrl.querySelector(".b-frame-debug") as HTMLInputElement;
		showDebugFrameInput.onchange = () => {
			const matched = this.frames.matchFrame(worker.id);

			if (matched) {
				matched.frame.style.display = showDebugFrameInput.checked ? "inherit" : "none";
			}
		};

		const countryCodeInput = ctrl.querySelector(".b-country-code") as HTMLInputElement;
		const interestsInput = ctrl.querySelector(".b-interests") as HTMLInputElement;

		countryCodeInput.oninput = () => {
			this.frames.matchFrame(worker.id)?.performAction(new CountryAction(countryCodeInput.value));
		};
		interestsInput.oninput = () => {
			this.frames.matchFrame(worker.id)?.performAction(new InterestsAction(interestsInput.value.split(",")
				.map(i => i.trim()).filter(i => i.length > 0)));
		};

		const recordInput = ctrl.querySelector(".b-record") as HTMLInputElement;
		let recorder: Recorder | null = null;
		recordInput.onchange = async () => {
			try {
				if (recordInput.checked) {
					const videoStream = worker.canvas.captureStream(MY_FPS);
					recorder = new Recorder(videoStream, this.audioCtx);

					await recorder.start();
					// worker.audioPreviousSource?.connect(recorder.getAudioDestination());
					// const audioDestSource = this.audioCtx.createMediaStreamSource(worker.audioDestination.stream);
					worker.audioDestinationAsSource.connect(recorder.getAudioDestination()); // TODO: Verify
				} else {
					if (recorder) {
						worker.audioDestinationAsSource.disconnect(recorder.getAudioDestination());
						await recorder.stop();
					}
					recorder = null;
				}
			} catch (err) {
				console.error(err);
			}
		};

		const catcheeInput = ctrl.querySelector(".b-catchee") as HTMLInputElement;
		if (!this.withCatching) {
			catcheeInput.parentElement!.style.display = "none";
		}

		catcheeInput.onchange = () => {
			this.frames.matchFrame(worker.id)!.catcher = catcheeInput.checked;
		};
	}

	private setUpEffects(ctrl: HTMLElement, worker: WorkerFrame) {
		const videoEffects = ctrl.querySelector(".b-video-effects");
		const audioEffects = ctrl.querySelector(".b-audio-effects");
		const inputEffects = ctrl.querySelector(".b-input-effects");

		for (const effect of worker.effects) {
			if (effect.hidden) {
				continue;
			}

			const effectInput = document.createElement("input") as HTMLInputElement;
			effectInput.type = "checkbox";
			effectInput.id = crypto.randomUUID();

			if (effect.visuallyHighlight) {
				effectInput.classList.add("supercheckbox");
			}
			if (effect.enabled) {
				effectInput.checked = true;
			}
			effectInput.onchange = () => {
				effect.enabled = effectInput.checked;
				effect.onToggle();
			};

			const effectLabel = document.createElement("label") as HTMLLabelElement;
			effectLabel.htmlFor = effectInput.id;
			effectLabel.textContent = effect.name;

			let regionGroup;
			if (effect instanceof VideoEffect) {
				regionGroup = videoEffects;
			} else if (effect instanceof AudioEffect) {
				regionGroup = audioEffects;
			} else {
				regionGroup = inputEffects;
			}

			const effectContainer = document.createElement("div");
			effectContainer.setAttribute("class", "ui checkbox");
			effectContainer.appendChild(effectInput);
			effectContainer.appendChild(effectLabel);
			effect.onAddHtml(effectContainer);
			regionGroup!.appendChild(effectContainer);
		}

		this.setUpSplitting(ctrl, worker);
	}

	private setUpInput(ctrl: HTMLElement, worker: WorkerFrame) {
		const fileInput = ctrl.querySelector(".b-file-input") as HTMLInputElement;
		const fileVideo = ctrl.querySelector(".b-input-video") as HTMLVideoElement;
		const fileImageCanvas = document.createElement("canvas");
		const fileImageCanvasCtx = fileImageCanvas.getContext("2d")!;

		fileInput.onchange = () => {
			if (!fileInput.files || fileInput.files.length == 0) {
				return;
			}

			const file = fileInput.files[0];
			const fileURL = URL.createObjectURL(file);

			fileVideo.pause();

			if (file.type.startsWith("video/")) {
				fileVideo.srcObject = null;
				fileVideo.src = fileURL;
			} else if (file.type.startsWith("image/")) {
				const helperImg = new Image();
				helperImg.src = fileURL;

				helperImg.onload = () => {
					fileImageCanvas.width = helperImg.width;
					fileImageCanvas.height = helperImg.height;
					fileImageCanvasCtx.drawImage(helperImg, 0, 0);

					fileVideo.srcObject = fileImageCanvas.captureStream();
				};
			} // TODO: Maybe support audio one day
		};

		const fileVideoAudioSource = this.audioCtx.createMediaElementSource(fileVideo);
		const fileVideoAudioSourceGain = this.audioCtx.createGain();
		fileVideoAudioSource.connect(fileVideoAudioSourceGain);

		const gainInput = ctrl.querySelector(".b-gain-control") as HTMLInputElement;
		const gainText = ctrl.querySelector(".b-gain-value")!;
		const speedInput = ctrl.querySelector(".b-speed-control") as HTMLInputElement;
		const speedText = ctrl.querySelector(".b-speed-value")!;

		gainInput.oninput = () => {
			gainText.textContent = gainInput.value;
			fileVideoAudioSourceGain.gain.value = parseInt(gainInput.value);
		};

		speedInput.oninput = () => {
			speedText.textContent = speedInput.value;
			fileVideo.playbackRate = parseFloat(speedInput.value);
		};

		fileVideo.onplaying = () => {
			worker.audioInputEffect.audioSource = fileVideoAudioSourceGain;
			worker.videoInputEffect.videoSource = fileVideo;
		};
		fileVideo.onpause = () => {
			worker.audioInputEffect.audioSource = null;
			worker.videoInputEffect.videoSource = null;
		};
	}

	private setUpChat(ctrl: HTMLElement, worker: WorkerFrame) {
		const chatMessageInput = ctrl.querySelector(".b-chat-message") as HTMLInputElement;
		(ctrl.querySelector(".b-chat-send") as HTMLButtonElement).onclick = () => {
			this.frames.matchFrame(worker.id)?.performAction(new SendChatAction(chatMessageInput.value));
			chatMessageInput.value = "";
		};
		ctrl.querySelector(".b-chat")!.id = "b-chat-" + worker.id;
	}

	private setUpSplitting(ctrl: HTMLElement, worker: WorkerFrame) {
		const splittingControls = ctrl.querySelector(".b-splitting-effects") as HTMLElement;
		const splitsControl = splittingControls.querySelector(".b-splitting-splits") as HTMLInputElement;
		const splitsValue = splittingControls.querySelector(".b-splitting-splits-value") as HTMLElement;
		const splitIntensityControl = splittingControls.querySelector(".b-splitting-intensity") as HTMLInputElement;
		const splitIntensityValue = splittingControls.querySelector(".b-splitting-intensity-value") as HTMLElement;
		const splitIntensitySyncControl = splittingControls.querySelector(".b-splitting-intensity-sync") as HTMLInputElement;
		const splitAllowBlackscreensControl = splittingControls.querySelector(".b-splitting-blackscreens") as HTMLInputElement;

		splitsControl.oninput = () => {
			splitsValue.textContent = splitsControl.value;

			const matched = this.frames.matchFrame(worker.id);
			if (matched) {
				matched.splitting.splits = parseInt(splitsControl.value);
			}
		};

		splitIntensityControl.oninput = () => {
			splitIntensityValue.textContent = splitIntensityControl.value;

			const matched = this.frames.matchFrame(worker.id);
			if (matched) {
				matched.splitting.intensity = parseFloat(splitIntensityControl.value);
			}
		};

		let syncIntervalNum: any = null;
		splitIntensitySyncControl.onchange = () => {
			if (syncIntervalNum !== null) {
				clearInterval(syncIntervalNum);
				syncIntervalNum = null;
			}

			if (!splitIntensitySyncControl.checked) {
				return;
			}

			const inputVideo = ctrl.querySelector(".b-input-video") as HTMLVideoElement;
			syncIntervalNum = setInterval(() => {
				if (!inputVideo) {
					return;
				}

				inputVideo.volume = 1 - parseFloat(splitIntensityControl.value);
			}, 10);
		};

		splitAllowBlackscreensControl.onchange = () => {
			const matched = this.frames.matchFrame(worker.id);

			if (matched) {
				matched.splitting.allowBlackscreens = splitAllowBlackscreensControl.checked;
			}
		};
	}
}
