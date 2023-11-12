import Controller from "~src/script/controller/controller";

export default abstract class Interval {
	protected abstract time: number;
	protected readonly controller: Controller;

	private intervalId: any = null;

	constructor(controller: Controller) {
		this.controller = controller;
	}

	protected abstract async tick(): Promise<void>;

	start() {
		if (this.intervalId !== null) {
			this.stop();
		}

		this.intervalId = setInterval(this.tick.bind(this), this.time);
	}

	stop() {
		if (this.intervalId === null) {
			return;
		}

		clearInterval(this.intervalId);
	}
}