// @ts-ignore
import Jungle from "~src/script/controller/effects/jungle.js";

// Effects inspired by https://voicechanger.io/

export default function setupCustomTunaEffects() {
	for (const effectType of [AutoWahEffect, PitchEffect, AnonymousEffect, TimeWobbleEffect]) {
		addTunaEffect(effectType);
	}
}

abstract class CustomTunaEffect {
	protected readonly ctx: AudioContext;

	constructor(ctx: AudioContext) {
		this.ctx = ctx;
	}

	abstract initializeEffect(input: AudioNode, output: AudioNode, properties: any, self: any): void;

	abstract getName(): string;

	getDefaultOptions() {
		return {};
	}

	addOptionProperties(proto: any) {
	}
}

function addTunaEffect(effect: (typeof CustomTunaEffect)) {
	const tunaProto = Tuna.prototype as any;
	// @ts-ignore
	const staticEffectInstance = new effect(null);
	const name = staticEffectInstance.getName();

	tunaProto[name] = function (properties?: any) {
		if (!properties) {
			properties = this.getDefaults() as any;
		}

		this.input = TunaUserContext.createGain();
		this.activateNode = TunaUserContext.createGain();
		this.output = TunaUserContext.createGain();

		// @ts-ignore
		const effectInstance = new effect(TunaUserContext);
		effectInstance.initializeEffect(this.activateNode, this.output, properties, this);

		// Custom options
		this.bypass = properties.bypass || this.defaults.bypass.value;
	};

	const defaultOptions = staticEffectInstance.getDefaultOptions();
	defaultOptions.bypass = {
		value: false,
		automatable: false,
		type: "boolean"
	};

	const protoProperties = {
		name: {
			value: name
		},
		defaults: {
			writable: true,
			value: defaultOptions
		}
	};

	staticEffectInstance.addOptionProperties(protoProperties);
	tunaProto[name].prototype = Object.create(TunaSuper, protoProperties);
}

function initValue(userVal: any, defaultVal: any) {
	return userVal === undefined ? defaultVal : userVal;
}


class AutoWahEffect extends CustomTunaEffect {
	getName() {
		return "AutoWah";
	}

	initializeEffect(input: AudioNode, output: AudioNode, properties: any, self: any) {
		const ctx = this.ctx;

		let waveshaper = ctx.createWaveShaper();
		let awFollower = ctx.createBiquadFilter();
		awFollower.type = "lowpass";
		awFollower.frequency.value = 10.0;

		let curve = new Float32Array(65536);
		for (let i = -32768; i < 32768; i++) {
			curve[i + 32768] = ((i > 0) ? i : -i) / 32768;
		}
		waveshaper.curve = curve;
		waveshaper.connect(awFollower);

		let wetGain = ctx.createGain();
		wetGain.gain.value = 1;

		let compressor = ctx.createDynamicsCompressor();
		compressor.threshold.value = -20;
		compressor.ratio.value = 16;

		let awDepth = ctx.createGain();
		awDepth.gain.value = 11585;
		awFollower.connect(awDepth);

		let awFilter = ctx.createBiquadFilter();
		awFilter.type = "lowpass";
		awFilter.Q.value = 15;
		awFilter.frequency.value = 50;
		awDepth.connect(awFilter.frequency);
		awFilter.connect(wetGain);

		input.connect(waveshaper);
		input.connect(awFilter);

		waveshaper.connect(compressor);
		wetGain.connect(compressor);
		compressor.connect(output);
	}
}

class PitchEffect extends CustomTunaEffect {
	private static DEFAULTS = {
		pitch: {
			value: 0,
			automatable: false,
			type: "float"
		}
	};

	getName() {
		return "Pitch";
	}

	initializeEffect(input: AudioNode, output: AudioNode, properties: any, self: any) {
		let pitchChangeEffect = new Jungle(this.ctx);
		let compressor = this.ctx.createDynamicsCompressor();

		input.connect(pitchChangeEffect.input)
		pitchChangeEffect.output.connect(compressor)
		pitchChangeEffect.setPitchOffset(properties.pitch || PitchEffect.DEFAULTS.pitch.value);

		compressor.connect(output);

		self.pitchChangeEffect = pitchChangeEffect;
	}

	getDefaultOptions() {
		return PitchEffect.DEFAULTS;
	}

	addOptionProperties(proto: any) {
		proto.pitch = {
			enumerable: true,
			get: function () {
				return 0; // Cannot be retrieved
			},
			set: function (value: number) {
				this.pitchChangeEffect.setPitchOffset(value);
			}
		};
	}
}

class AnonymousEffect extends CustomTunaEffect {
	getName() {
		return "Anonymous";
	}

	initializeEffect(input: AudioNode, output: AudioNode, properties: any, self: any) {
		const ctx = this.ctx;

		// Wave shaper
		let waveShaper = ctx.createWaveShaper();
		waveShaper.curve = makeDistortionCurve(100);

		function makeDistortionCurve(amount: number) {
			let k = amount;
			let n_samples = 44100;
			let curve = new Float32Array(n_samples);
			let deg = Math.PI / 180;
			let x;
			for (let i = 0; i < n_samples; ++i) {
				x = i * 2 / n_samples - 1;
				curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
			}
			return curve;
		}

		// Wobble
		let oscillator = ctx.createOscillator();
		oscillator.frequency.value = 50;
		oscillator.type = 'sawtooth';
		// ---
		let oscillatorGain = ctx.createGain();
		oscillatorGain.gain.value = 0.005;
		// ---
		let delay = ctx.createDelay();
		delay.delayTime.value = 0.01;

		// White noise
		let noise = ctx.createBufferSource();
		let noiseBuffer = ctx.createBuffer(1, 32768, ctx.sampleRate)
		let noiseData = noiseBuffer.getChannelData(0);
		for (var i = 0; i < 32768; i++) {
			noiseData[i] = Math.random() * Math.random() * Math.random() * Math.random() * Math.random() * Math.random() * 0.6;
		}
		noise.buffer = noiseBuffer;
		noise.loop = true;

		// Create graph
		oscillator.connect(oscillatorGain);
		oscillatorGain.connect(delay.delayTime);
		// ---
		input.connect(delay)
		delay.connect(waveShaper);
		//delay.connect(convolver);

		waveShaper.connect(output);
		// ---
		noise.connect(output);

		oscillator.start(0);
		noise.start(0);
	}
}

class TimeWobbleEffect extends CustomTunaEffect {
	getName() {
		return "TimeWobble";
	}

	initializeEffect(input: AudioNode, output: AudioNode, properties: any, self: any) {
		const ctx = this.ctx;

		let oscillator = ctx.createOscillator();
		oscillator.frequency.value = 1;
		oscillator.type = 'sine';

		let oscillatorGain = ctx.createGain();
		oscillatorGain.gain.value = 0.05;

		let delay = ctx.createDelay();
		delay.delayTime.value = 0.05;

		// source --> delay --> ctx.destination
		// oscillator --> oscillatorGain --> delay.delayTime --> ctx.destination

		input.connect(delay);
		delay.connect(output);

		oscillator.connect(oscillatorGain);
		oscillatorGain.connect(delay.delayTime);

		oscillator.start();
	}
}
