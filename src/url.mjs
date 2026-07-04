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
			songData = {
				mode,
				sampleRate,
				code
			};
			const sliderCount = view.getUint16(reader, 1);
			reader += 2;
			if(sliderCount>0) {
				const dec = new TextDecoder();
				songData.sliders = [];
				for(let i1 = 0; i1 < sliderCount; i1++) {
					const type = dec.decode(new Uint8Array(dataArr.buffer, reader++, 1));
					const nameLength = view.getUint16(reader, 1); reader += 2;
					const name = dec.decode(new Uint8Array(dataArr.buffer, reader, nameLength)); reader += nameLength;
					const varLength = view.getUint16(reader, 1); reader += 2;
					const varName = dec.decode(new Uint8Array(dataArr.buffer, reader, varLength)); reader += varLength;
					const sliderData = {
						type, name, var: varName, val: 50, low: 0, high: 100, step: 1, text: 'Add text'
					}
					switch(type) {
						case 'N': {
							sliderData.val = view.getFloat64(reader, 1);
							sliderData.low = view.getFloat64(reader+8,  1);
							sliderData.high = view.getFloat64(reader+16,  1);
							sliderData.step = view.getFloat64(reader+24,  1);
							reader += 32;
						} break;
						case 'S': {
							const dataLength = view.getFloat64(reader, 1);
							sliderData.text = inflateRaw(new Uint8Array(dataArr.buffer, reader+8, dataLength), { to: 'string' });
							reader += dataLength+8;
						} break;
						default: throw new Error('unknown slider type', type);
					}
					songData.sliders.push(sliderData);
				}
			}
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
	// window.location.hash = '4' + btoa(str).replaceAll('=', '');
	return 'https://dollchan.net/bytebeat/#4' + btoa(str).replaceAll('=', '');
}

export function getUrlFromCode(code, mode, sampleRate, sliders) {
	const chunk1 = deflateRaw(code);
	const sliderDataChunks = [];
	let sliderDataLength = 2;
	const enc = new TextEncoder();
	for(const slider of sliders) {
		const typeChunk = enc.encode(slider.type.slice(0,1));
		const nameChunk = enc.encode(slider.name);
		const varChunk = enc.encode(slider.var);

		let dataChunk;

		switch(slider.type) {
			case 'N': {
				dataChunk = new Uint8Array(32);
				const view = new DataView(dataChunk.buffer);
				view.setFloat64(0, slider.val, 1);
				view.setFloat64(8, slider.low, 1);
				view.setFloat64(16, slider.high, 1);
				view.setFloat64(24, slider.step, 1);
			} break;
			case 'S': {
				const textData = deflateRaw(slider.text);
				dataChunk = new Uint8Array(textData.length + 8);
				new DataView(dataChunk.buffer).setFloat64(0, textData.length, 1);
				dataChunk.set(textData,8);
			} break;
			default: throw new Error('unknown slider type', slider.type);
		}
		const len = typeChunk.length+2+nameChunk.length+2+varChunk.length+dataChunk.length;
		const sliderChunk = new Uint8Array(len);
		const view = new DataView(sliderChunk.buffer);
		if(nameChunk.length>65535) throw new RangeError(`Your slider name is too long. ${slider.name}`);
		if(varChunk.length>65535) throw new RangeError(`Your slider variable name is too long. ${slider.var}`);
		sliderChunk.set(typeChunk, 0);
		view.setUint16(1, nameChunk.length, 1);
		sliderChunk.set(nameChunk, 3);
		view.setUint16(nameChunk.length+3, varChunk.length, 1);
		sliderChunk.set(varChunk, nameChunk.length+5);
		sliderChunk.set(dataChunk, nameChunk.length+5+varChunk.length);
		sliderDataChunks.push(sliderChunk);
		sliderDataLength += len;
	}
	// First byte is mode, next 4 bytes is sampleRate, then the code
	const outputArr = new Uint8Array(13 + chunk1.length + 1 + sliderDataLength);
	const view = new DataView(outputArr.buffer);
	outputArr[0] = modes.indexOf(mode);
	// outputArr.set(new Uint8Array(new Float32Array([sampleRate]).buffer), 1);
	view.setFloat32(1, sampleRate, 1);
	view.setFloat64(5, chunk1.length, 1);
	outputArr.set(chunk1, 13);
	view.setUint16(13+chunk1.length, sliders.length, 1);
	let writer = 15+chunk1.length;
	for(const chunk of sliderDataChunks) {
		outputArr.set(chunk, writer);
		writer += chunk.length;
	}
	// since we're dealing with Uint8Array I should use the non-map method I think
	let str = "";
	for(let i = 0; i < outputArr.length; i++) {
		str += String.fromCharCode(outputArr[i]);
	}
	window.location.hash = 'EB3' + btoa(str).replaceAll('=', '');
}
