// @ts-ignore
import htmlMediaInput from "~src/script/controller/mediainput.html";
import {MY_HEIGHT, MY_WIDTH} from "~src/script/consts";

export default class MediaInputManager {
	micStream: MediaStreamAudioSourceNode | null = null;
	mediaStream: HTMLVideoElement | null = null;

	private readonly boxElement: HTMLElement;
	private readonly audioCtx: AudioContext;

	constructor(audioCtx: AudioContext) {
		this.audioCtx = audioCtx;

		this.boxElement = document.createElement("div");
		document.body.appendChild(this.boxElement);
		this.boxElement.outerHTML = htmlMediaInput;
		this.boxElement = document.querySelector(".mediainput") as HTMLElement; // This is required

		this.addFunctionality();
		this.hide();
	}

	private addFunctionality() {
		const micGroup = this.boxElement.querySelector(".b-mic-group") as HTMLElement;
		const camGroup = this.boxElement.querySelector(".b-camera-group") as HTMLElement;

		const micBtn = this.boxElement.querySelector(".b-show-microphone") as HTMLButtonElement;
		micBtn.onclick = async () => {
			await this.addInputs(micGroup, true, this.startMicInput.bind(this));
			micBtn.style.display = "none";
		};

		const camBtn = this.boxElement.querySelector(".b-show-camera") as HTMLButtonElement;
		camBtn.onclick = async () => {
			await this.addInputs(camGroup, false, this.startCameraInput.bind(this));
			camBtn.style.display = "none";
		};

		const screenShareBtn = this.boxElement.querySelector(".b-start-screen") as HTMLButtonElement;
		screenShareBtn.onclick = async () => {
			await this.startScreenShareInput(false);
			this.hide();
		};

		const screenShareAudioBtn = this.boxElement.querySelector(".b-start-screen-audio") as HTMLButtonElement;
		screenShareAudioBtn.onclick = async () => {
			await this.startScreenShareInput(true);
			this.hide();
		};

		const closeBtn = this.boxElement.querySelector(".b-close") as HTMLButtonElement;
		closeBtn.onclick = () => {
			this.hide();
		};
	}

	private async addInputs(group: HTMLElement, audio: boolean, clickCallback: (deviceId: string) => void) {
		const tempStream = await navigator.mediaDevices.getUserMedia({
			video: !audio,
			audio: audio
		});
		for (const track of tempStream.getTracks()) {
			track.stop();
		}

		const devices = await navigator.mediaDevices.enumerateDevices();
		for (const device of devices) {
			if (device.kind !== (audio ? "audioinput" : "videoinput")) {
				continue;
			}

			const inputBtn = document.createElement("button");
			inputBtn.setAttribute("class", "ui button");
			inputBtn.textContent = device.label;
			inputBtn.onclick = () => {
				clickCallback(device.deviceId);
				this.hide();
			};
			group.appendChild(inputBtn);
		}
	}

	private async startMicInput(deviceId: string) {
		const requested = await navigator.mediaDevices.getUserMedia({
			video: false, audio: {
				echoCancellation: false,
				noiseSuppression: false,
				autoGainControl: false,
				deviceId: {exact: deviceId}
			}
		});

		if (requested) {
			this.micStream = this.audioCtx.createMediaStreamSource(requested);
		}
	}

	private createMediaVideo(stream: MediaStream) {
		const mediaVid = document.createElement("video");
		mediaVid.muted = true;
		mediaVid.srcObject = stream;
		mediaVid.play();
		this.mediaStream = mediaVid;
	}

	private async startCameraInput(deviceId: string) {
		const requested = await navigator.mediaDevices.getUserMedia({
			video: {
				width: {ideal: MY_WIDTH},
				height: {ideal: MY_HEIGHT},
				deviceId: {exact: deviceId}
			}, audio: false
		});

		if (requested) {
			this.createMediaVideo(requested);
		}
	}

	private async startScreenShareInput(withAudio: boolean) {
		const requested = await navigator.mediaDevices.getDisplayMedia({
			video: {
				width: {ideal: MY_WIDTH},
				height: {ideal: MY_HEIGHT}
			},
			audio: withAudio
		});

		if (requested) {
			this.createMediaVideo(requested);

			if (withAudio) {
				this.micStream = this.audioCtx.createMediaStreamSource(new MediaStream(requested.getAudioTracks()));
			}
		}
	}

	show() {
		this.boxElement.style.display = "";
	}

	hide() {
		this.boxElement.style.display = "none";
	}
}
