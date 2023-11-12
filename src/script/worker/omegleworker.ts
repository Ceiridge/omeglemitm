import {hookFunction} from "~src/script/hooking";
import {con, pressWindowKey, sleep} from "~src/script/util";
import {WorkerSubPage} from "~src/script/worker/workersubpage";
import {MY_WORKER_INFO} from "~src/script/worker/workerconsts";
import {CATCHER_COUNT, SPOOF_IP} from "~src/script/consts";

export default class OmegleWorker extends WorkerSubPage {
	private lastDigests: string | null = "";
	private lastWasRtcCaller: boolean = false;
	private currentMetaBackend: any | null = null;

	doesMatch(href: string): boolean {
		return href.endsWith("www.omegle.com/");
	}

	async onStart(): Promise<void> {
		let scriptHooked = false;
		const self = this;

		hookFunction(document, "write", function (html: string) {
			if (!scriptHooked && html && html.includes("/static/omegle.js")) {
				scriptHooked = true;

				const req = new XMLHttpRequest(); // Synchronous javascript request
				req.open("GET", "/static/omegle.js", false);
				req.withCredentials = false;
				req.send();

				// Before Script Hooks
				Object.defineProperty(document, "domain", {
					get: () => {
						return "";
					}
				});
				hookFunction(unsafeWindow.Cookie, "read", function (name: string) {
					return null; // Return empty cookie
				});

				const jsText = self.modifyOmegleScript(req.responseText);
				const scriptTag = document.createElement("script");
				scriptTag.innerHTML = jsText;
				// @ts-ignore
				this.orig(scriptTag.outerHTML);

				con.log("Hooked Omegle script successfully");
				return;
			}

			// @ts-ignore
			return this.orig(html);
		});

		const hookInterval = setInterval(() => {
			if (unsafeWindow.Cookie) {
				clearInterval(hookInterval);

				// Disable screenshot uploading
				Object.defineProperty(unsafeWindow, "antinudeServers", {value: [], writable: false}); // Prevent spy images from being sent
				Object.defineProperty(unsafeWindow, "termsLevel", {value: 100, writable: false});
				Object.defineProperty(unsafeWindow, "_gaq", {value: [], writable: false});
			}
		}, 1);

		let wasConnected = false;
		setInterval(() => {
			const videoEl = document.querySelector("#othervideo") as HTMLVideoElement;

			if (videoEl) {
				let connected = false;
				if (videoEl.srcObject) {
					connected = true;
				}

				if (wasConnected && !connected) { // If newly disconnected
					unsafeWindow._B_ON_DISCONNECT();
				}
				wasConnected = connected;
			}
		}, 1);

		this.startChatLogInterval();
	}

	// Hook into the Omegle internals by modifying their script
	private modifyOmegleScript(script: string) {
		script = script.replace("top.location!=document.location", "false"); // Stop top level redirects

		unsafeWindow._O_HOOK_METABACKEND = (backend: any) => {
			this.currentMetaBackend = backend;

			backend.addEvent("identDigests", (digest: string) => {
				this.lastDigests = digest;
				this.lastWasRtcCaller = false;
			});

			backend.addEvent("rtccall", () => {
				this.lastWasRtcCaller = true;
			});

			backend.addEvent("strangerDisconnected", () => {
				// I don't remember
			});

			// Trick IP sniffers in control of the strangers
			hookFunction(backend, "sendICECandidates", function (candidates: any[]) {
				if (candidates && candidates.length > 0) {
					const fakeIp = SPOOF_IP;
					const fakeCandidate = {"candidate": `    ${fakeIp}   srflx`, sdpMid: 123};
					const isFinalSpoof = candidates[0] === null;

					candidates = isFinalSpoof ? [fakeCandidate] : [fakeCandidate, ...candidates, fakeCandidate];

					const now = Date.now();
					if (!isFinalSpoof && (!backend.finalIceSpoof || now - backend.finalIceSpoof > 5000)) {
						backend.finalIceSpoof = now;

						setTimeout(() => {
							try {
								backend.sendICECandidates([null]);
							} catch {
							}
						}, 2500);
					}
				}

				// @ts-ignore
				return this.orig(candidates);
			}, false);
		};

		script = script.replace("var Ma=new MetaBackend;", "var Ma=new MetaBackend;window._O_HOOK_METABACKEND(Ma);window._O_SET_METABACKEND = (backend) => {Ma = backend;};");

		// Hook randID
		script = script.replace(`+"&randid="+randID+`, `+"&randid="+(this.hookedRandId || randID)+`);
		script = script.replace(/=new COMETBackend,/g, `=new COMETBackend,(()=>{ (this.backend || b.backend).hookedRandId = ((self || this).hookedRandId || this.hookedRandId) })(),`);
		return script;
	}

	private startChatLogInterval() {
		setInterval(() => {
			const logBox = document.querySelector(".chatbox div.logbox");
			if (!logBox) {
				return;
			}

			let messages = [];
			// @ts-ignore
			for (const logItem of [...logBox.querySelectorAll("div.logitem")]) {
				messages.push(logItem.textContent);
			}

			// @ts-ignore
			window.top._B_submitChatLog(MY_WORKER_INFO.id, messages);
		}, 3000);
	}

	onStringify(blob: any): any {
		return blob;
	}

	getNoiseEl(): Element | null {
		return document.querySelector("#selfvideo");
	}

	getStrangerVideoEl(): HTMLVideoElement | null {
		return document.querySelector("#othervideo");
	}

	onCapture(videoEl: HTMLVideoElement): void {
		videoEl.addEventListener("pause", () => {
			// Never actually, practically being called
			// @ts-ignore
			window.top._B_submitStrangerStream(MY_WORKER_INFO.id, null);
		});
	}

	performNext(): void {
		if (unsafeWindow._confirmTerms) { // A hack to disable automatic next calls
			unsafeWindow.confirmTerms = unsafeWindow._confirmTerms;
			delete unsafeWindow._confirmTerms;
		}

		if (document.querySelector(".chatmsgcell")) {
			pressWindowKey(27); // ESC
			pressWindowKey(27); // ESC
			pressWindowKey(27); // ESC
		} else {
			const videoBtn = document.querySelector("#videobtn");
			if (videoBtn) (videoBtn as HTMLElement).click();
		}
	}

	performStop(): void {
		if (!unsafeWindow._confirmTerms) {
			unsafeWindow._confirmTerms = unsafeWindow.confirmTerms;
			unsafeWindow.confirmTerms = () => {
			};
		}

		pressWindowKey(27); // ESC
		pressWindowKey(27); // ESC
	}

	performCountry(country: string): void { // TODO: Proper country action
	}

	performGender(genderIndex: number): void {
	}

	performInterests(interests: string[]): void {
		for (const topic of [...unsafeWindow.topicManager.list()]) {
			unsafeWindow.topicManager.remove(topic);
		}

		for (let topic of interests) {
			if (topic && (topic = topic.trim()) && topic.length > 0) {
				unsafeWindow.topicManager.add(topic);
			}
		}

		unsafeWindow.setShouldUseLikes(true);
	}

	performResetRandomId() {
		unsafeWindow.randID = OmegleWorker.randomRandId();
	}

	performChatMessage(message: string) {
		if (this.currentMetaBackend) {
			this.currentMetaBackend.sendMessage(message);

			try {
				const logBox = document.querySelector(".chatbox div.logbox > div") as HTMLElement;
				const myChatElement = document.createElement("div");
				myChatElement.textContent = "You: " + message;
				myChatElement.classList.add("logitem");
				logBox.appendChild(myChatElement);
			} catch {
			}
		}
	}

	async performCatch() {
		if (!this.lastDigests) {
			alert("No identifying digests found! Catching impossible.");
			return;
		}

		const digests = this.lastDigests.split(",");
		const strangerIdentifier = this.lastWasRtcCaller ? (digests[2] + "," + digests[3]) : (digests[0] + "," + digests[1]);

		const backends: any[] = [];

		for (let i = 0; i < CATCHER_COUNT; i++) {
			const backend = new unsafeWindow.MetaBackend();
			backends.push(backend);

			backend.addEvent("identDigests", (digest: string) => {
				con.log(digest);

				if (digest.includes(strangerIdentifier)) {
					con.log("CAUGHT!");

					for (const foundBackend of backends) {
						if (!backend._disconnected) {
							foundBackend.disconnect();
						}
					}

					this.replaceBackend(backend);
				} else {
					// backend._disconnected = true;
					// backend.disconnect();
				}
			});

			backend.addEvent("recaptchaRequired", () => {
				backend._disconnected = true;
				backend.disconnect();
			});

			backend.hookedRandId = OmegleWorker.randomRandId();
			backend.connect(null, null, false, false, null, unsafeWindow.topicManager.list(), null, OmegleWorker.findLanguage(), unsafeWindow.cameraName, true, null, null, false);

			if (i > 0 && i % 5 === 0) {
				await sleep(100);
			}
		}
	}

	private replaceBackend(backend: any) {
		backend.$events = this.currentMetaBackend.$events;
		backend.options = this.currentMetaBackend.options;

		this.currentMetaBackend.$events = {};

		this.currentMetaBackend = backend;
		unsafeWindow._O_SET_METABACKEND(backend);
	}


	// From Omegle Script

	// If performCountry should be used, this needs to be changed probably
	private static findLanguage() {
		let startStrat = "";

		"undefined" != typeof unsafeWindow.googTr && unsafeWindow.googTr.V && "string" == typeof unsafeWindow.googTr.V && unsafeWindow.googTr.V.length >= 2 ? startStrat = unsafeWindow.googTr.V.substr(0, 2) : "undefined" != typeof navigator && "string" == typeof navigator.language && (startStrat = navigator.language.substr(0, 2));

		return startStrat;
	}

	private static randomRandId() {
		/** @type {string} */
		var fullpayload = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
		/** @type {string} */
		var segmentedId = "";
		/** @type {number} */
		var c = 0;
		for (; 8 > c; c++) {
			/** @type {number} */
			var i = Math.floor(Math.random() * fullpayload.length);
			/** @type {string} */
			segmentedId = segmentedId + fullpayload.charAt(i);
		}
		return segmentedId;
	}
}
