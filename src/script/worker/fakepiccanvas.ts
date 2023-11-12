import {getRandomArbitrary} from "~src/script/util";

export default class FakePictureCanvas {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;

	constructor(width: number, height: number) {
		this.canvas = document.createElement("canvas");
		this.canvas.width = width;
		this.canvas.height = height;
		this.ctx = this.canvas.getContext("2d")!;
	}

	generateImage(mimeType: string = "image/jpeg"): string {
		for (let i = 0; i < this.canvas.height; i++) {
			this.ctx.fillStyle = `rgb(${Math.round(getRandomArbitrary(1, 5))}, ${Math.round(getRandomArbitrary(1, 5))}, ${Math.round(getRandomArbitrary(1, 5))})`;
			this.ctx.fillRect(0, i, this.canvas.width, 1);
		}

		return this.canvas.toDataURL(mimeType).split(';base64,')[1];
	}
}
