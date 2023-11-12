import Interval from "~src/script/controller/intervals/interval";
import {AudioEffect, InputEffect, TunaAudioEffect} from "~src/script/controller/effects/effect";

export default class AudioMatchInterval extends Interval {
	protected time: number = 100;

	// matchedSource + modifyGainSource Hooks -> audioDestinationBegin -> destAudio/(Tuna Filters) -> audioDestination
	protected async tick(): Promise<void> {
		if (!this.controller.frames) {
			return;
		}

		for (const worker of Object.values(this.controller.frames.workerFrames)) {
			let destAudio: AudioNode = worker.audioDestination;

			const matchedWorkerId = this.controller.frames.matchId(worker.id, false);
			const matchedWorker = matchedWorkerId === null ? null : this.controller.frames.workerFrames[matchedWorkerId];
			const matchedSource = matchedWorker === null ? null : matchedWorker.audioSource;

			if (matchedWorker && matchedSource) {
				if (worker.audioPreviousSource && worker.audioPreviousDestination) {
					try {
						worker.audioPreviousSource.disconnect(worker.audioDestinationBegin);
					} catch { // Ignore if it is already disconnected
					}

					try {
						worker.audioDestinationBegin.disconnect(worker.audioPreviousDestination);
					} catch { // Ignore if it is already disconnected
					}
				}
				worker.audioPreviousSource = matchedSource;

				for (const effect of worker.effects) {
					if (!(effect instanceof AudioEffect || effect instanceof InputEffect)) {
						continue;
					}

					effect.stateController = this.controller;
					const wantsUnfiltered = effect instanceof InputEffect && effect.wantsUnfilteredDestination;
					effect.modifyGainSource(worker, matchedSource,
						wantsUnfiltered ? worker.audioDestination : worker.audioDestinationBegin);

					if (effect instanceof TunaAudioEffect) {
						destAudio = effect.modifyAudioDestination(worker, destAudio);
					}
				}

				matchedSource.connect(worker.audioDestinationBegin);
				worker.audioDestinationBegin.connect(destAudio);
				worker.audioPreviousDestination = destAudio;
			}
		}
	}
}
