import Interval from "~src/script/controller/intervals/interval";
import {HTMLImageSource, MY_FPS, MY_HEIGHT, MY_WIDTH} from "~src/script/consts";
import {WorkerFrame} from "~src/script/controller/workerframes";
import {InputEffect, VideoEffect} from "~src/script/controller/effects/effect";

export default class DrawInterval extends Interval {
	protected time: number = 1000 / MY_FPS;

	protected async tick(): Promise<void> {
		if (!this.controller.frames) {
			return;
		}

		for (const worker of Object.values(this.controller.frames.workerFrames)) {
			const destCtx = worker.canvasCtx;
			const matchedWorkerId = this.controller.frames.matchId(worker.id, false);
			const matchedWorker = matchedWorkerId === null ? null : this.controller.frames.workerFrames[matchedWorkerId];

			let sourceStreamQueue = this.findSourceStream(worker, matchedWorker);
			if (sourceStreamQueue.length === 0) {
				this.controller.subController.drawNoise(destCtx);
				continue;
			}

			const glfxEffects: (VideoEffect | InputEffect)[] = [];
			for (const effect of worker.effects) {
				if (!(effect.enabled && (effect instanceof VideoEffect || effect instanceof InputEffect) && effect.glfxEffect)) {
					continue;
				}

				glfxEffects.push(effect);
			}

			if (glfxEffects.length > 0) {
				worker.glfxTexture = DrawInterval.glfxPipeline(worker.glfxCanvas, worker.glfxTexture, sourceStreamQueue[0], () => {
					for (const glfxEffect of glfxEffects) {
						glfxEffect.stateController = this.controller;
						glfxEffect.modifyGlfx(worker, worker.glfxCanvas, worker.glfxTexture, sourceStreamQueue);
					}
				});
				sourceStreamQueue.shift();
				sourceStreamQueue.unshift(worker.glfxCanvas);
			}

			if (matchedWorker && matchedWorker.splitting.isSplitting()) {
				// Modifies the stream queue so that there is a split view on top
				DrawInterval.drawSplits(sourceStreamQueue, matchedWorker.splitting.splits, matchedWorker.splitting.intensity, matchedWorker.splitting.allowBlackscreens);
			}
			this.controller.subController.drawCameraImage(sourceStreamQueue[0], destCtx); // Draw first in queue

			for (const effect of worker.effects) {
				if (!(effect.enabled && effect instanceof InputEffect)) {
					continue;
				}

				effect.stateController = this.controller;
				await effect.modifyAfterDraw(worker, sourceStreamQueue, destCtx);
			}

			// Additionally, draw the original source of the current worker to pip windows
			if (worker.videoSourcePipMirrorCtx && worker.videoSource) {
				this.controller.subController.drawCameraImage(worker.videoSource, worker.videoSourcePipMirrorCtx);
			}
		}
	}

	private findSourceStream(worker: WorkerFrame, matchedWorker: WorkerFrame | null) {
		let streamQueue: HTMLImageSource[] = [];
		if (matchedWorker !== null && matchedWorker.videoSource !== null
			&& !((matchedWorker.videoSource as any).paused)) { // Do not use paused streams
			streamQueue.unshift(matchedWorker.videoSource);
		}

		for (const effect of worker.effects) {
			if (!(effect.enabled && (effect instanceof VideoEffect || effect instanceof InputEffect))) {
				continue;
			}

			effect.stateController = this.controller;
			const mod = effect.modifyStreamQueue(worker, streamQueue);
			streamQueue = mod.result;

			if (!mod.propagate) {
				break;
			}
		}

		return streamQueue;
	}

	private static glfxPipeline(glfxCanvas: HTMLCanvasElement | any, glfxTexture: any, stream: HTMLImageSource, glfxEffectsCallback: Function) {
		if (glfxTexture) {
			glfxTexture.loadContentsOf(stream);
		} else {
			glfxTexture = glfxCanvas.texture(stream);
		}

		glfxCanvas.stack_prepare();
		glfxCanvas.draw(glfxTexture);
		glfxEffectsCallback();
		glfxCanvas.update();

		return glfxTexture;
	}

	private static splittingCanvas: HTMLCanvasElement | null = null;
	private static splittingCanvasCtx: CanvasRenderingContext2D | null = null;

	private static drawSplits(streamQueue: HTMLImageSource[], splits: number, intensity: number, allowBlackscreens: boolean) {
		if (!DrawInterval.splittingCanvas || !DrawInterval.splittingCanvasCtx) {
			DrawInterval.splittingCanvas = document.createElement("canvas");
			DrawInterval.splittingCanvas.width = MY_WIDTH;
			DrawInterval.splittingCanvas.height = MY_HEIGHT;
			DrawInterval.splittingCanvasCtx = DrawInterval.splittingCanvas.getContext("2d")!;
		}

		if (!allowBlackscreens) {
			splits = Math.min(splits, streamQueue.length);
		}
		if (splits <= 1 || splits >= 5) {
			return;
		}

		const destCtx = DrawInterval.splittingCanvasCtx; // Alias
		const width = MY_WIDTH;
		const height = MY_HEIGHT;

		const rows = (splits >= 3) ? 2 : 1;
		const firstColumnWidth = width * (1 - intensity);
		const firstRowHeight = (rows === 1) ? height : (height * (1 - intensity));

		destCtx.fillStyle = "black";
		destCtx.fillRect(0, 0, width, height);

		for (let i = 0; i < splits && i < streamQueue.length; i++) {
			const isMain = i === 0;
			const isFirstRow = isMain || i === 1;
			const isFirstColumn = isMain || i === 2;

			const x = isFirstColumn ? 0 : firstColumnWidth;
			const y = isFirstRow ? 0 : firstRowHeight;

			const w = isFirstColumn ? firstColumnWidth : (width - firstColumnWidth);
			const h = isFirstRow ? firstRowHeight : (height - firstRowHeight);

			destCtx.drawImage(streamQueue[i], x, y, w, h);
		}

		streamQueue.unshift(DrawInterval.splittingCanvas);
	}
}
