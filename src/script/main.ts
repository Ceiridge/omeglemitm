import Page from "~src/script/page";
import Controller from "~src/script/controller/controller";
import WorkerPage from "~src/script/worker/worker";
import {IS_CONTROL} from "~src/script/consts";

let ACTIVE_PAGE: Page;

// Called once on document-start
export default function start() {
	const headHookInterval = setInterval(async () => {
		if (!(document && document.head)) {
			return;
		}
		clearInterval(headHookInterval);

		if (IS_CONTROL) {
			ACTIVE_PAGE = new Controller();
		} else {
			ACTIVE_PAGE = new WorkerPage();
		}

		await ACTIVE_PAGE.start();
	}, 1);
};