import {Operation, operation} from "userscripter/lib/operations";
import start from "~src/script/main";
import {ALWAYS} from "userscripter/lib/environment";

const OPERATIONS: ReadonlyArray<Operation<any>> = [
	operation({
		description: "Default operation",
		condition: ALWAYS,
		action: start
	})
];

export default OPERATIONS;
