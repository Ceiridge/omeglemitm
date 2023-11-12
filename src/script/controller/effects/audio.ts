import {AudioEffect, TunaAudioEffect} from "~src/script/controller/effects/effect";
import {WorkerFrame} from "~src/script/controller/workerframes";

export class MuteAudioEffect extends AudioEffect {
	name = "Mute";

	modifyGainSource(worker: WorkerFrame, source: GainNode, destination: AudioNode) {
		source.gain.value = this.enabled ? 0 : 1;
	}
}

export class WahWahAudioEffect extends TunaAudioEffect {
	name = "Underwater";

	protected initTunaEffect(tuna: Tuna | any): AudioNode {
		return new tuna.WahWah({
			automode: false,
			baseFrequency: 0.04,
			excursionOctaves: 1.07,
			sweep: 0.17,
			resonance: 7.11,
			sensitivity: -0.5,
			bypass: 0
		});
	}
}

export class BitcrusherAudioEffect extends TunaAudioEffect {
	name = "Bitcrusher";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Bitcrusher({
			bits: 4,          //1 to 16
			normfreq: 0.1,    //0 to 1
			bufferSize: 4096  //256 to 16384
		});
	}
}

export class PingPongAudioEffect extends TunaAudioEffect {
	name = "Stereo Ping Pong";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.PingPongDelay({
			wetLevel: 0.5,         //0 to 1
			feedback: 0.3,       //0 to 1
			delayTimeLeft: 700,  //1 to 10000 (milliseconds)
			delayTimeRight: 200,  //1 to 10000 (milliseconds)
			bypass: 0
		});
	}
}

export class ChorusAudioEffect extends TunaAudioEffect {
	name = "Chorus";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Chorus({
			rate: 7.57,         //0.01 to 8+
			feedback: 0.96,     //0 to 1+
			depth: 0.47,        //0 to 1
			delay: 0.06,       //0 to 1
			bypass: 0          //the value 1 starts the effect as bypassed, 0 or 1
		});
	}
}

export class PhaserAudioEffect extends TunaAudioEffect {
	name = "Phaser";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Phaser({
			rate: 6.77,                     //0.01 to 8 is a decent range, but higher values are possible
			depth: 0.59,                    //0 to 1
			feedback: 0.66,                 //0 to 1+
			stereoPhase: 12,               //0 to 180
			baseModulationFrequency: 719,  //500 to 1500
			bypass: 0
		});
	}
}

export class OverdriveAudioEffect extends TunaAudioEffect {
	name = "Overdrive";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Overdrive({
			outputGain: 1.11,           //-42 to 0 in dB
			drive: 0.98,                 //0 to 1
			curveAmount: 0.81,           //0 to 1
			algorithmIndex: 1,            //0 to 5, selects one of the drive algorithms
			bypass: 0
		});
	}
}

export class AutoWahAudioEffect extends TunaAudioEffect {
	name = "WahWah";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.AutoWah({});
	}
}

export class HighPitchAudioEffect extends TunaAudioEffect {
	name = "High Pitch";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Pitch({
			pitch: this.getStrength()
		});
	}
}

export class LowPitchAudioEffect extends TunaAudioEffect {
	name = "Low Pitch";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Pitch({
			pitch: -1 * this.getStrength()
		});
	}
}

export class AnonymousAudioEffect extends TunaAudioEffect {
	name = "Anonymous";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Anonymous({});
	}
}

export class TimeWobbleAudioEffect extends TunaAudioEffect {
	name = "Time Wobble";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.TimeWobble({});
	}
}

export class ConvolverAudioEffect extends TunaAudioEffect {
	name = "Reverb";

	protected initTunaEffect(tuna: any): AudioNode {
		return new tuna.Convolver({
			highCut: 22050,                         //20 to 22050
			lowCut: 20,                             //20 to 22050
			dryLevel: 1,                            //0 to 1+
			wetLevel: 0.2,                            //0 to 1+
			level: 1,                               //0 to 1+, adjusts total output of both wet and dry
			impulse: GM_getResourceURL("reverbWav"),    //the path to your impulse response
			bypass: 0
		});
	}
}
