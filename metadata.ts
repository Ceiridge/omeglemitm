import { Metadata } from "userscript-metadata";
import {
	BuildConfig,
} from "userscripter/build";

import U from "./src/userscript";

export default function(_: BuildConfig): Metadata {
	return {
		name: U.name,
		version: U.version,
		description: U.description,
		author: U.author,
		match: U.match,
		namespace: U.namespace,
		run_at: U.runAt,
		grant: U.grant,
		connect: U.connect,
		require: U.require,
		resource: U.resource
	};
}
