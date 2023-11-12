import Page from "~src/script/page";
import OmegleWorker from "~src/script/worker/omegleworker";
import OmeWorker from "~src/script/worker/omeworker";
import {randomHex} from "~src/script/util";
import {executeUnsafe, hookFunction} from "~src/script/hooking";
import {
	Action,
	ChangeIdAction,
	CountryAction,
	GenderAction,
	InterestsAction,
	SendChatAction
} from "~src/script/worker/actions";
import {WorkerSubPage} from "~src/script/worker/workersubpage";
import {IS_CANVAS_WORKER, MY_WEBRTC_STREAM, MY_WORKER_INFO} from "~src/script/worker/workerconsts";

const SUBWORKERS = [new OmeWorker(), new OmegleWorker()];

export default class WorkerPage extends Page {
	private subWorker: WorkerSubPage;
	private readonly webRtcDevices = [
		{
			"deviceId": "default",
			"kind": "audioinput",
			"label": `Standard - Integrated Microphone (${randomHex(4)}:${randomHex(4)})`,
			"groupId": randomHex(64)
		},
		{
			"deviceId": randomHex(64),
			"kind": "videoinput",
			"label": `Logitech HD Webcam C${randomHex(3)} (${randomHex(4)}:${randomHex(4)})`,
			"groupId": randomHex(64)
		},
		{
			"deviceId": "default",
			"kind": "audiooutput",
			"label": "Standard - Integrated Speakers (Realtek(R) Audio)",
			"groupId": randomHex(64)
		}
	];

	constructor() {
		super(SUBWORKERS);
		this.subWorker = this.subPage as WorkerSubPage;
	}

	protected async actualStart(): Promise<void> {
		const self = this; // Helper, because I cannot use arrow functions

		hookFunction(navigator.mediaDevices, "enumerateDevices", async function () {
			return IS_CANVAS_WORKER ? null : JSON.parse(JSON.stringify(self.webRtcDevices));
		});

		hookFunction(navigator.mediaDevices, "getUserMedia", async function (req: any) {
			return MY_WEBRTC_STREAM;
		});

		hookFunction(JSON, "stringify", function (blob: any) {
			if (blob !== undefined && blob !== null) {
				blob = self.subWorker.onStringify(blob);
			}

			// @ts-ignore
			return this.orig(blob);
		});

		// IP Logger
		let lastIceIp = "";
		hookFunction(RTCPeerConnection.prototype, "addIceCandidate", function (candidate: RTCIceCandidate) {
			if (candidate && candidate.candidate) {
				const candFields = candidate.candidate.split(" ");
				if (candFields[7] === "srflx") {
					const ip = candFields[4].trim();

					if (ip !== lastIceIp) {
						lastIceIp = ip;
						(window.top as any)._B_submitIp(MY_WORKER_INFO.id, ip);
					}
				}
			}

			// @ts-ignore
			return this.orig(...arguments);
		});

		// Own localStorage
		executeUnsafe(`
			const myLocalStorage = {};
			myLocalStorage.setItem = (key, val) => {myLocalStorage[key] = val;};
			myLocalStorage.getItem = (key, val) => {return myLocalStorage[key];};
		
			Object.defineProperty(window, 'localStorage', new (function() {
			  this.get = () => {
				return myLocalStorage;
			  };
			})());
    	`);

		const captureInterval = setInterval(() => {
			const videoEl = this.subWorker.getStrangerVideoEl();
			const noiseEl = this.subWorker.getNoiseEl();

			if (IS_CANVAS_WORKER && noiseEl) {
				clearInterval(captureInterval);
				// @ts-ignore
				window.top._B_submitNoiseStream(noiseEl);
				return;
			}

			if (videoEl) {
				clearInterval(captureInterval);

				videoEl.addEventListener("playing", () => {
					const videoSrcObj = videoEl.srcObject as MediaStream | null;
					if (!videoSrcObj) {
						return;
					}

					// @ts-ignore
					window.top._B_submitStrangerStream(MY_WORKER_INFO.id, videoEl);

					// @ts-ignore
					const audioCtx: AudioContext = window._B_AUDIO_CTX;
					const srcCtx = audioCtx.createMediaStreamSource(new MediaStream(videoSrcObj.getAudioTracks()));
					const gainCtx = audioCtx.createGain();
					srcCtx.connect(gainCtx);
					// @ts-ignore
					window._B_AUDIO_OUTPUT(gainCtx);

					// Mute here so the audio is not played twice at your speakers
					// It must not be 0 or be muted to make sure it renders
					videoEl.volume = 1.175494e-38;
				});

				this.subWorker.onCapture(videoEl);
			}
		}, 100);

		unsafeWindow._B_performAction = this.performAction.bind(this);
	}

	private performAction(action: Action) {
		switch (action.name) {
			case "next":
				this.subWorker.performNext();
				break;
			case "stop":
				this.subWorker.performStop();
				break;
			case "resetrid":
				this.subWorker.performResetRandomId();
				break;
			case "country":
				this.subWorker.performCountry((action as CountryAction).country);
				break;
			case "gender":
				this.subWorker.performGender((action as GenderAction).genderIndex);
				break;
			case "interests":
				this.subWorker.performInterests((action as InterestsAction).interests);
				break;
			case "changeid":
				MY_WORKER_INFO.id = (action as ChangeIdAction).newId;
				break;
			case "catch":
				this.subWorker.performCatch();
				break;
			case "chat":
				this.subWorker.performChatMessage((action as SendChatAction).message);
				break;
			default:
				break;
		}
	}
}
