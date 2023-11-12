import {con} from "~src/script/util";

export const executeUnsafe = (code: string) => {
	const scr = document.createElement("script");
	scr.innerHTML = code;
	document.head.appendChild(scr);
};

export function hookFunction(obj: any, funcName: string, handler: Function, log: boolean = true) {
	const orig = obj[funcName];

	obj[funcName] = function () {
		if (log) {
			con.log("Called hooked function %c" + funcName, "color: orange");
		}

		const myThis = this;
		return handler.apply({
			orig: function () {
				return orig.apply(myThis, arguments);
			}
		}, arguments);
	};
}