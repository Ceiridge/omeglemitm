export const con = { // Saved console unaffected by overrides
	log: console.log
};

export const randomHex = (len: number) => {
	let result = "";

	while (result.length < len) {
		result += Math.floor(Math.random() * 16777215).toString(16).toLowerCase();
	}

	return result.substring(0, len);
};

export function getRandomArbitrary(min: number, max: number) {
	return Math.random() * (max - min) + min;
}

export const hexToRgb = (hex: string) => {
	if (!hex) {
		return [0, 0, 0];
	}

	const matched = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
		, (m, r, g, b) => '#' + r + r + g + g + b + b)
		.substring(1).match(/.{2}/g);

	if (!matched) {
		return [0, 0, 0];
	}

	return matched.map(x => parseInt(x, 16));
};

export function fetchIpData(ip: string) {
	return new Promise((fulfill) => {
		GM_xmlhttpRequest({
			method: "GET",
			url: `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting,query`,
			timeout: 10000,
			responseType: "json",
			anonymous: true,
			// @ts-ignore
			onload: ({response}) => {
				fulfill(response);
			}
		});
	});
}

export function pressWindowKey(keyCode: number) {
	document.dispatchEvent(new KeyboardEvent("keyup", {
		key: keyCode,
		keyCode: keyCode,
		code: keyCode,
		which: keyCode,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false
	} as any));
}

export function sleep(time: number) {
	return new Promise(resolve => setTimeout(resolve, time));
}
