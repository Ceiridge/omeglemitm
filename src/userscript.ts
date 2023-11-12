export default {
	id: "omeglemitm",
	name: "Omegle MITM",
	version: "1.0.0",
	description: "Online stranger video chat MITM",
	author: "Ceiridge",
	match: [
		"https://ome.tv/*",
		"https://www.omegle.com/*"
	],
	namespace: "Ceiridge",
	runAt: "document-start",
	grant: [
		"GM_getResourceURL",
		"GM_xmlhttpRequest",
		"unsafeWindow"
	],
	connect: [
		"ip-api.com"
	],
	require: [
		"https://raw.githubusercontent.com/Ceiridge/omeglemitm/master/static/custom-glfx.js",
		"https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core",
		"https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter",
		"https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl",
		"https://cdn.jsdelivr.net/npm/@tensorflow-models/body-segmentation",
		"https://raw.githubusercontent.com/Ceiridge/omeglemitm/master/static/custom-tuna.js"
	],
	resource: [
		"loadingAnim https://raw.githubusercontent.com/Ceiridge/omeglemitm/master/static/omegle_loading.mp4",
		"reverbWav https://raw.githubusercontent.com/Ceiridge/omeglemitm/master/static/reverbwave.wav"
	]
} as const;
