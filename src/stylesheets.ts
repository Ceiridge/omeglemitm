import {Stylesheets, stylesheet} from "userscripter/lib/stylesheets";
import styleSheetControl from "~src/script/controller/control.scss";
import styleSheetWorker from "~src/script/worker/worker.scss";
import {IS_CONTROL} from "~src/script/consts";

const STYLESHEETS = {
	main: stylesheet({
		condition: () => IS_CONTROL,
		css: styleSheetControl,
	}),
	workerSheet: stylesheet({
		condition: () => !IS_CONTROL,
		css: styleSheetWorker
	})
} as const;

// This trick uncovers type errors in STYLESHEETS while retaining the static knowledge of its properties (so we can still write e.g. STYLESHEETS.foo):
const _: Stylesheets = STYLESHEETS;
void _;

export default STYLESHEETS;
