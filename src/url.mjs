import { deflateRaw, inflateRaw } from 'pako';

const modes = ['Bytebeat', 'Signed Bytebeat', 'Floatbeat', 'Funcbeat', 'Bitbeat', '2048', 'logmode', 'loghack', 'loghack2'];

export function getCodeFromUrl(hash) {
	let songData;
	if(hash.startsWith('#EB3')) {
		const dataArr = Uint8Array.from(atob(hash.substring(4)), el => el.charCodeAt());
		try {
			const view = new DataView(dataArr.buffer);
			const mode = modes[dataArr[0]];
			const sampleRate = view.getFloat32(1, 1);
			const codeLength = view.getFloat64(5, 1);
			const code = inflateRaw(new Uint8Array(dataArr.buffer, 13, codeLength), { to: 'string' });
			let reader = 13 + codeLength;
			console.log(reader, dataArr.length);
			songData = {
				mode,
				sampleRate,
				code
			};

		} catch(err) {
			console.error(`Couldn't load data from url: ${ err }`);
		}
	} else if(hash.startsWith('#4')) {
		const dataArr = Uint8Array.from(atob(hash.substring(2)), el => el.charCodeAt());
		try {
			songData = {
				mode: modes[dataArr[0]],
				sampleRate: new DataView(dataArr.buffer).getFloat32(1, 1),
				code: inflateRaw(new Uint8Array(dataArr.buffer, 5), { to: 'string' })
			};
		} catch(err) {
			console.error(`Couldn't load data from url: ${ err }`);
		}
	} else if(hash.startsWith('#v3b64') || hash.startsWith('#EnBeat2-')) {
		try {
			songData = inflateRaw(
				Uint8Array.from(atob(hash.substring(hash.startsWith('#EnBeat2-') ? 9 : 6)), el => el.charCodeAt()), { to: 'string' });
			if(songData.startsWith('{')) {
				songData = JSON.parse(songData);
				if(songData.formula) { // XXX: old format
					songData.code = songData.formula;
				}
			} else { // XXX: old format
				songData = { code: songData };
			}
		} catch(err) {
			console.error(`Couldn't load data from url: ${ err }`);
		}
	} else {
		console.error('Couldn\'t load data from url: unrecognized url data');
	}
	return songData;
}

export function getDollchanUrlFromCode(code, mode, sampleRate) {
	const codeArr = deflateRaw(code);
	// First byte is mode, next 4 bytes is sampleRate, then the code
	const outputArr = new Uint8Array(5 + codeArr.length);
	outputArr[0] = modes.indexOf(mode);
	outputArr.set(new Uint8Array(new Float32Array([sampleRate]).buffer), 1);
	outputArr.set(codeArr, 5);
	// since we're dealing with Uint8Array I should use the non-map method I think
	let str = "";
	for(let i = 0; i < outputArr.length; i++) {
		str += String.fromCharCode(outputArr[i]);
	}
	window.location.hash = '4' + btoa(str).replaceAll('=', '');
}

export function getUrlFromCode(code, mode, sampleRate) {
	const codeArr = deflateRaw(code);
	// First byte is mode, next 4 bytes is sampleRate, then the code
	const outputArr = new Uint8Array(13 + codeArr.length);
	const view = new DataView(outputArr.buffer);
	outputArr[0] = modes.indexOf(mode);
	// outputArr.set(new Uint8Array(new Float32Array([sampleRate]).buffer), 1);
	view.setFloat32(1, sampleRate, 1);
	view.setFloat64(5, codeArr.length, 1);
	outputArr.set(codeArr, 13);
	// since we're dealing with Uint8Array I should use the non-map method I think
	let str = "";
	for(let i = 0; i < outputArr.length; i++) {
		str += String.fromCharCode(outputArr[i]);
	}
	window.location.hash = 'EB3' + btoa(str).replaceAll('=', '');
}
