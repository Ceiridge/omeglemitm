import {MEDIA_RECORDER_BITRATE, MEDIA_RECORDER_MIME} from "~src/script/consts";

export default class Recorder {
	private readonly videoStream: MediaStream;
	private readonly audioStreamDestination: MediaStreamAudioDestinationNode;

	private fileStream: any | null = null;
	private recorder: MediaRecorder | null = null;

	constructor(videoStream: MediaStream, audioCtx: AudioContext) {
		this.videoStream = videoStream;
		this.audioStreamDestination = audioCtx.createMediaStreamDestination();
	}

	async start(fileName: string = "recording.webm") {
		if (!showSaveFilePicker) {
			throw new Error("Incompatible browser");
		}

		if (this.recorder) {
			await this.stop();
		}

		const fileHandle = await unsafeWindow.showSaveFilePicker({
			suggestedName: fileName
		});
		this.fileStream = await fileHandle.createWritable();

		const stream = new MediaStream([...this.videoStream.getVideoTracks(), ...this.audioStreamDestination.stream.getAudioTracks()]);
		this.recorder = new MediaRecorder(stream, {
			mimeType: MEDIA_RECORDER_MIME,
			videoBitsPerSecond: MEDIA_RECORDER_BITRATE
		});

		this.recorder.onstop = this.stop.bind(this);
		this.recorder.ondataavailable = this.writeData.bind(this);
		this.recorder.start(5000);
	}

	private async writeData(event: any) {
		if (!(this.fileStream && event && event.data && event.data.size > 0)) {
			return;
		}

		await this.fileStream.write(event.data);
	}

	async stop() {
		if (!this.recorder) {
			return;
		}

		if (this.recorder.state !== "inactive") {
			this.recorder.stop();
		}
		this.recorder = null;

		await this.fileStream?.close();
		this.fileStream = null;
	}

	getAudioDestination() {
		return this.audioStreamDestination;
	}
}
