// Helper declarations that are missing in my IDE

declare const unsafeWindow: (typeof window | any);
declare const GM_xmlhttpRequest: (details: object) => void;
declare const GM_getResourceURL: (name: string) => string;
declare const fx: any;
declare const bodySegmentation: any;
declare const documentPictureInPicture: any;

declare class Tuna {
	constructor(audioCtx: AudioContext);
}
declare const TunaSuper: any;
declare const TunaUserContext: AudioContext;

declare	interface Crypto {
	randomUUID: () => string;
}

declare interface HTMLCanvasElement {
	captureStream: (frameRate?: number) => MediaStream;
}

declare interface MediaDevices {
	getDisplayMedia: (constraints?: any) => Promise<MediaStream>;
}

declare const showSaveFilePicker: (details?: object) => Promise<any>;
declare class MediaRecorder {
	constructor(stream: MediaStream, details?: object);

	onstop: any;
	ondataavailable: any;
	state: string;

	start(durationMs?: number): void;
	stop(): void;
}
