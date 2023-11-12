import {MY_FPS} from "~src/script/consts";

export const IS_CANVAS_WORKER = unsafeWindow._B_MY_ID === -1 || !unsafeWindow._B_CANVAS;
export const CANVAS_STREAM = IS_CANVAS_WORKER ? null : unsafeWindow._B_CANVAS.captureStream(MY_FPS);
export const MY_WEBRTC_STREAM = IS_CANVAS_WORKER ? null : new MediaStream([...CANVAS_STREAM.getTracks(), ...unsafeWindow._B_AUDIO.getTracks()]);
export const MY_WORKER_INFO = {
	id: (window as any)._B_MY_ID
};
