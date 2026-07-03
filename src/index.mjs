import { Editor } from './editor.mjs';
import { Library } from './library.mjs';
import { Scope } from './scope.mjs';
import { UI } from './ui.mjs';
import { getCodeFromUrl, getUrlFromCode } from './url.mjs';
import { Actions } from './actions.mjs';
import { Splashes } from './splashes.mjs';

import { FavoriteGenerator } from './generator.mjs';
import { Prec } from '@codemirror/state';

const editor = new Editor();
const library = new Library();
const scope = new Scope();
const ui = new UI();
const actions = new Actions();

globalThis.bytebeat = new class {
	constructor() {
		this.audioCtx = null;
		this.micMedia = null;
		this.audioGain = null;
		this.audioRecordChunks = [];
		this.audioRecorder = null;
		this.audioWorkletNode = null;
		this.mediaInputSourceNode = null;
		this.analyserNode = null;
		this.byteSample = 0;
		this.defaultSettings = {
			codeStyle: 'Atom Dark',
			colorDiagram: '#0080ff',
			colorStereo: 1,
			colorTimeCursor: '#80bbff',
			colorWaveform: '#ffffff',
			drawMode: scope.drawMode,
			drawScale: scope.drawScale,
			fftSize: scope.fftSize,
			isSeconds: false,
			showAllSongs: library.showAllSongs,
			srDivisor: 1,
			themeStyle: 'Default Dark',
			volume: .5
		};
		this.isCompilationError = false;
		this.isNeedClear = false;
		this.isLagging = false;
		this.isPlaying = false;
		this.isRecording = false;
		this.lastUpdateTime = 0;
		this.mode = 'Bytebeat';
		this.playbackSpeed = 1;
		this.sampleRate = 8000;
		this.settings = this.defaultSettings;
		this.updateCounter = 0;
		this.expectedDomain = 'chasyxx';
		this.startError = null;
		this.sliders = [];
		this.init();
	}
	handleEvent(event) {
		let elem = event.target;
		const { classList } = elem;
		switch(event.type) {
		case 'change':
			switch(elem.id) {
			case 'control-code-style': this.setCodeStyle(elem.value); break;
			case 'control-color-diagram': this.setColorDiagram(elem.value); break;
			case 'control-color-stereo':
				this.setColorStereo(+elem.value);
				ui.controlColorDiagramInfo.innerHTML = scope.getColorTest('colorDiagram');
				ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform');
				break;
			case 'control-color-timecursor': this.setColorTimeCursor(elem.value); break;
			case 'control-color-waveform': this.setColorWaveform(elem.value); break;
			case 'control-drawmode': this.setDrawMode(elem.value); break;
			case 'control-mode': this.setPlaybackMode(elem.value); break;
			case 'control-samplerate':
			case 'control-samplerate-select': this.setSampleRate(+elem.value); break;
			case 'control-theme-style': this.setThemeStyle(elem.value); break;
			case 'sliders-mode': ui.setSlidersMode(elem.value); break;
			case 'library-show-all':
				library.toggleAll(elem, elem.checked);
				this.saveSettings();
				break;
			}
			return;
		case 'click':
			switch(elem.tagName) {
			case 'svg': elem = elem.parentNode; break;
			case 'use': elem = elem.parentNode.parentNode; break;
			default:
				if(classList.contains('control-fast-multiplier')) {
					elem = elem.parentNode;
				}
			}
			switch(elem.id) {
			case 'canvas-container':
			case 'canvas-main':
			case 'canvas-play':
			case 'canvas-timecursor': this.playbackToggle(!this.isPlaying); break;
			case 'control-counter':
			case 'control-pause': this.playbackToggle(false); break;
			case 'control-expand': ui.expandEditor(); break;
			case 'control-link': ui.copyLink(); break;
			case 'control-dollchan-link': ui.copyDollchanLink(editor.value, this.mode, this.sampleRate); break;
			case 'control-play-backward': this.playbackToggle(true, true, -1); break;
			case 'control-play-forward': this.playbackToggle(true, true, 1); break;
			case 'control-rec': this.toggleRecording(); break;
			case 'control-reset': this.resetTime(); break;
			case 'control-scale': this.resetScopeAdjustment(); break;
			case 'control-scaledown': this.setScopeAdjustment(-1, elem); break;
			case 'control-scaleup': this.setScopeAdjustment(1); break;
			case 'control-srdivisor-down': this.setSRDivisor(-1); break;
			case 'control-srdivisor-up': this.setSRDivisor(1); break;
			case 'control-stop': this.playbackStop(); break;
			case 'control-counter-units': this.toggleCounterUnits(); break;
			case 'sliders-add': this.addSlider(); break;
			case 'actions-format': this.formatCode(); break;
			case 'actions-minibake': this.bake(); break;
			case 'actions-deminibake': this.debake(); break;
			case 'favorites-savefavorite': this.saveFavorite(); break;
			case 'favorites-reload': this.loadFavoriteList(); break;
			case 'settings-audiorate-apply':
				this.setAudioSampleRate(ui.settingsAudioRate.value ?? 48000); break;
			// case 'actions-activate-mic': this.activateMic(); break;
			case 'control-mic': this.toggleMic(); break;
			// case 'actions-deactivate-mic': this.deactivateMic(); break;
			// case 'actions-mic-test': this.micTest(); break;
			case 'splash': this.setSplashtext(); break;
			default:
				switch(true) {
				case classList.contains('code-text'):
					this.loadCode(Object.assign({ code: elem.innerText },
						elem.hasAttribute('data-songdata') ? JSON.parse(elem.dataset.songdata) : {}));
					break;
				case classList.contains('code-load'): library.onclickCodeLoadButton(elem); break;
				case classList.contains('code-remix-load'): library.onclickRemixLoadButton(elem); break;
				case classList.contains('library-header'): library.onclickLibraryHeader(elem); break;
				case elem.parentNode.classList.contains('library-header'):
					library.onclickLibraryHeader(elem.parentNode);
					break;
				case classList.contains('song-hash'):
					navigator.clipboard.writeText(elem.dataset.hash);
					event.preventDefault();
					break;
				}
			}
			return;
		case 'input':
			switch(elem.id) {
			case 'control-counter': this.oninputCounter(event); break;
			case 'control-volume': this.setVolume(false); break;
			}
			return;
		case 'keydown':
			if(elem.id === 'control-counter') {
				this.oninputCounter(event);
			}
			return;
		case 'mouseover':
			switch(true) {
			case classList.contains('code-load'):
				elem.title = `Click to play the ${ elem.dataset.type } code`;
				break;
			case classList.contains('code-text'): elem.title = 'Click to play this code'; break;
			case classList.contains('songs-header'): elem.title = 'Click to show/hide the songs'; break;
			case classList.contains('song-hash'):
				elem.title = 'Click to copy the song hash into clipboard';
				break;
			case classList.contains('tag-c'): elem.title = 'C-compatible code'; break;
			case classList.contains('tag-console'):
				elem.title = 'Outputs messages in the error console';
				break;
			case classList.contains('tag-drawing'):
				elem.title = 'Generates art in the visualiser\'s scope';
				break;
			case classList.contains('tag-sample'):
				elem.title = 'Uses encoded audio samples (PCM, for example)';
				break;
			case classList.contains('tag-slow'):
				elem.title = 'May be performance issues. Try switching Chrome/Firefox.';
				break;
			}
			return;
		}
	}
	async init() {
		try {
			this.settings = JSON.parse(localStorage.settings);
			scope.drawMode = this.settings.drawMode;
			scope.drawScale = this.settings.drawScale;
			scope.setFFTSize(+this.settings.fftSize || 10);
			library.showAllSongs = this.settings.showAllSongs;
		} catch(err) {
			this.saveSettings();
		}
		this.setThemeStyle();
		this.setAudioSampleRate();
		this.setMindB();
		this.setMaxdB();
		this.setFFTSize()
;		try {
			await this.initAudio();
		} catch(e) {
			console.error(e);
			this.startError = [ 'audioRate', e ];
			this.settings.audioSampleRate = 48000;
			this.saveSettings();
			try {
				await this.initAudio();
			} catch(e) {
				this.startError = [ 'audioInit', e ];
			}
		}
		if(document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', () => this.initAfterDom());
			return;
		}
		this.initAfterDom();
	}
	handleError(z) {
		const M = z ? $ => {
			window.alert(
				$ +
				'\n\n(This is an emergency error handler as the regular error handler failed. ' +
				'It means either it, or the code editor & UI setup broke. '+
				'I recommend you refresh the page.)'
			);
		} : $ => {
			ui.okAlert($);
		};
		if(this.startError) {
			switch(this.startError[0]) {
			case 'audioRate': M(
				`${ this.startError[1].message }\n\nWe've reset your samplerate to 48000!`); break;
			case 'audioInit': M(
				`We encountered a CRITICAL ERROR starting audio!\n\n${ this.startError[1].stack }`); break;
			default: M(this.startError[1].stack); break;
			}
		}
	}
	initAfterDom() {
		try {
			editor.init();
			ui.initElements();
			this.handleError(0);
		} catch(e) {
			this.handleError(1);
			window.alert('The emergency handler was triggered by:\n\n' + (e.stack ?? e));
		}
		scope.initElements();
		library.initElements();
		this.setVolume(true);
		this.setCounterUnits();
		this.setCodeStyle();
		this.setColorStereo();
		this.setColorDiagram();
		this.setColorWaveform();
		this.setColorTimeCursor();
		this.setScopeAdjustment(0);
		ui.settingsAudioRate.value = this.settings.audioSampleRate;
		this.parseUrl();
		this.sendData({ drawMode: scope.drawMode });
		ui.controlDrawMode.value = scope.drawMode;
		ui.controlThemeStyle.value = this.settings.themeStyle;
		ui.controlCodeStyle.value = this.settings.codeStyle;
		ui.mainElem.addEventListener('click', this);
		ui.mainElem.addEventListener('change', this);
		ui.containerFixed.addEventListener('input', this);
		ui.containerFixed.addEventListener('keydown', this);
		ui.containerScroll.addEventListener('mouseover', this);
		this.loadFavoriteList();
		this.setSplashtext();
		if(!window.location.hostname.includes(this.expectedDomain) &&
		!window.location.hostname.startsWith('127.') &&
		!window.location.hostname.includes('::1') &&
		!window.location.hostname.includes('local')) {
			ui.okAlert(
				`The expected domain "${this.expectedDomain}" wasn't found.\n`+
				`This can mean three things: whoever's modifying this just forgot to change it, `+
				`it can't really be changed (for example if the changes here will be brought back to the original page), `+
				`or this is some random kid trying to modify this page when they have no idea what they're actually doing.\n`+
				`I don't think anybody likes somebody else randomly taking your work when `+
				`they don't even know what to do with it, which is why I put this here, but `+
				`I also still want to be nice considering that is definetly not the only thing that could've happened, `+
				`so you can still use this page just fine.\n`+
				`Try searching for the "${this.expectedDomain} bytebeat player", and remember always have hope!`
			);
		}
	}
	async initAudio() {
		this.audioCtx = new AudioContext({
			latencyHint: 'balanced',
			sampleRate: this.settings.audioSampleRate
		});
		this.audioGain = new GainNode(this.audioCtx);
		this.audioGain.connect(this.audioCtx.destination);
		// Analyser for FFT mode
		scope.analyser = [this.audioCtx.createAnalyser(), this.audioCtx.createAnalyser()];
		scope.analyser[0].minDecibels = scope.analyser[1].minDecibels = scope.minDecibels;
		scope.analyser[0].maxDecibels = scope.analyser[1].maxDecibels = scope.maxDecibels;
		scope.setFFTAnalyzer();
		const splitter = this.audioCtx.createChannelSplitter(2);
		splitter.connect(scope.analyser[0], 0);
		splitter.connect(scope.analyser[1], 1);
		const analyserGain = new GainNode(this.audioCtx);
		analyserGain.connect(splitter);
		// AudioWorklet for main calculations processing
		await this.audioCtx.audioWorklet.addModule('./build/audio-processor.mjs');
		this.audioWorkletNode = new AudioWorkletNode(this.audioCtx, 'audioProcessor',
			{ outputChannelCount: [2] });
		this.audioWorkletNode.port.addEventListener('message', event => this.receiveData(event.data));
		this.audioWorkletNode.port.start();
		this.audioWorkletNode.connect(this.audioGain);
		this.audioWorkletNode.connect(analyserGain);
		// Recorder for recording audio files
		const mediaDest = this.audioCtx.createMediaStreamDestination();
		const audioRecorder = this.audioRecorder = new MediaRecorder(mediaDest.stream);
		audioRecorder.addEventListener('dataavailable', event => this.audioRecordChunks.push(event.data));
		audioRecorder.addEventListener('stop', () => {
			let fileName, type;
			const types = ['audio/webm', 'audio/ogg'];
			const files = ['track.webm', 'track.ogg'];
			while((fileName = files.pop()) && !MediaRecorder.isTypeSupported(type = types.pop())) {
				if(types.length === 0) {
					console.error('Recording is not supported in this browser!');
					break;
				}
			}
			const url = URL.createObjectURL(new Blob(this.audioRecordChunks, { type }));
			ui.downloader.href = url;
			ui.downloader.download = fileName;
			ui.downloader.click();
			setTimeout(() => window.URL.revokeObjectURL(url));
		});
		this.audioGain.connect(mediaDest);
	}
	async micTest() {
		const testContext = new AudioContext({
			numberOfChannels: 1,
			length: 1
		});
		try {
			this.micMedia = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
			const tempSource = testContext.createMediaStreamSource(this.micMedia);
			const detectedSampleRate = tempSource.context.sampleRate;
			if(typeof detectedSampleRate == 'number') {
				ui.yesNoAlert('The samplerate is ' + detectedSampleRate + 'Hz.' +
					'\n\nApply this samplerate now?', ()=>{ this.setAudioSampleRate(detectedSampleRate) }, () => { });
			} else {
				ui.okAlert('I couldn\'t figure out the samplerate.');
			}
		} catch(e) {
			ui.okAlert('I got an error trying to figure out the samplerate.');
			console.error(e);
		} finally {
			testContext.close();
		}
	}
	async toggleMic() {
		if(this.mediaInputSourceNode == null) {
			try {
				this.micMedia ??= await navigator.mediaDevices.getUserMedia({
					audio: {
						echoCancellation: false,
						noiseSuppression: false,
						autoGainControl: false,
						sampleRate: this.settings.audioSampleRate
					},
					video: false
				});
				this.mediaInputSourceNode = this.audioCtx.createMediaStreamSource(this.micMedia);
				this.mediaInputSourceNode.connect(this.audioWorkletNode);
				ui.controlMic.innerHTML = "Mic Down";
				ui.controlMic.title = "Mic is activated. Click to deactivate."
			} catch(e) {
				ui.yesNoAlert('Failed to activate mic. See error?', () => {
					ui.yesNoAlert(e + '\n\nWant the correct samplerate to use?', () => { this.micTest() }, () => { });
				}, () => { });
			}
		} else {
			this.mediaInputSourceNode.disconnect();
			this.mediaInputSourceNode = null;
			this.micMedia = null;
			ui.controlMic.innerHTML = "Mic Up";
			ui.controlMic.title = "Mic is deactivated. Click to activate."
		}
	}
	setSplashtext() {
		if(!window.location.hostname.includes(this.expectedDomain) &&
		!window.location.hostname.startsWith('127.') &&
		!window.location.hostname.startsWith('[::1]') &&
		!window.location.hostname.includes('local'))
			ui.splashElem.innerHTML = 'Featuring the Disturbance in the Force!';
		else ui.splashElem.innerHTML = Splashes[Math.random()*Splashes.length|0];
	}
	loadCode({ code, sampleRate, mode, drawMode, scale }, isPlay = true) {
		this.mode = ui.controlPlaybackMode.value = mode = mode || 'Bytebeat';
		editor.setValue(code);
		this.setSampleRate(ui.controlSampleRate.value = +sampleRate || 8000, false);
		this.setSRDivisor(0);
		const data = {
			mode,
			sampleRate: this.sampleRate,
			sampleRatio: this.sampleRate / this.audioCtx.sampleRate
		};
		if(isPlay) {
			data.playbackSpeed = this.playbackSpeed = 1;
			this.playbackToggle(true, false);
			data.resetTime = true;
			data.isPlaying = isPlay;
		}
		data.setFunction = code;
		if(drawMode) {
			ui.controlDrawMode.value = scope.drawMode = drawMode;
			scope.toggleTimeCursor();
			scope.clearCanvas();
			this.saveSettings();
		}
		if(scale !== undefined) {
			this.setScale(scale - scope.drawScale);
		}
		this.sendData(data);
	}
	oninputCounter(event) {
		if(event.key === 'Enter') {
			ui.controlTime.blur();
			this.playbackToggle(true);
			return;
		}
		const byteSample = this.settings.isSeconds ? Math.round(ui.controlTime.value * this.sampleRate) :
			ui.controlTime.value;
		this.setByteSample(byteSample);
		this.sendData({ byteSample });
	}
	parseUrl() {
		let urlHash = window.location.hash;
		if(!urlHash) {
			this.updateUrl();
			urlHash = window.location.hash;
		}
		this.loadCode(getCodeFromUrl(urlHash) || { code: editor.value }, false);
	}
	playbackStop() {
		this.playbackToggle(false, false);
		this.sendData({ isPlaying: false, resetTime: true });
	}
	playbackToggle(isPlaying, isSendData = true, speedIncrement = 0) {
		const isReverse = speedIncrement ? speedIncrement < 0 : this.playbackSpeed < 0;
		const buttonElem = isReverse ? ui.controlPlayBackward : ui.controlPlayForward;
		if(speedIncrement && buttonElem.getAttribute('disabled')) {
			return;
		}
		const multiplierElem = buttonElem.firstElementChild;
		const speed = speedIncrement ? +multiplierElem.textContent : 1;
		multiplierElem.classList.toggle('control-fast-multiplier-large', speed >= 8);
		const nextSpeed = speed === 64 ? 0 : speed * 2;
		ui.setPlayButton(ui.controlPlayBackward, isPlaying && isReverse ? nextSpeed : 1);
		ui.setPlayButton(ui.controlPlayForward, isPlaying && !isReverse ? nextSpeed : 1);
		if(speedIncrement || !isPlaying) {
			this.playbackSpeed = isPlaying ? speedIncrement * speed : Math.sign(this.playbackSpeed);
		}
		scope.canvasContainer.title = isPlaying ? `Click to ${
			this.isRecording ? 'pause and stop recording' : 'pause' }` :
			`Click to play${ isReverse ? ' in reverse' : '' }`;
		scope.canvasPlayButton.classList.toggle('canvas-play-backward', isReverse);
		scope.canvasPlayButton.classList.toggle('canvas-play', !isPlaying);
		scope.canvasPlayButton.classList.toggle('canvas-pause', isPlaying);
		if(isPlaying) {
			scope.canvasPlayButton.classList.remove('canvas-initial');
			if(this.audioCtx.resume) {
				this.audioCtx.resume();
				scope.requestAnimationFrame(); // Main call for drawing in the scope
			}
		} else {
			this.lastUpdateTime = 0;
			this.updateCounter = 0;
			this.isLagging = false;
			ui.controlLag.innerText = '---';
			ui.controlLag.classList.remove('control-lag-red');
			if(this.isRecording) {
				this.isRecording = false;
				ui.controlRecord.classList.remove('control-recording');
				ui.controlRecord.title = 'Record to file';
				this.audioRecorder.stop();
			}
		}
		this.isPlaying = isPlaying;
		if(isSendData) {
			this.sendData({ isPlaying, playbackSpeed: this.playbackSpeed });
		} else {
			this.isNeedClear = true;
		}
	}
	receiveData(data) {
		const { byteSample, drawBuffer, error } = data;
		if(typeof byteSample === 'number') {
			this.setCounterValue(byteSample);
			this.setByteSample(byteSample);
		}
		if(Array.isArray(drawBuffer)) {
			scope.drawBuffer = scope.drawBuffer.concat(drawBuffer);
			const limit = scope.canvasWidth * (1 << scope.drawScale) - 1;
			if(scope.drawBuffer.length > limit) {
				scope.drawBuffer = scope.drawBuffer.slice(-limit);
			}
		}
		if(error !== undefined) {
			let isUpdate = false;
			if(error.isCompiled === false) {
				isUpdate = true;
				this.isCompilationError = true;
			} else if(error.isCompiled === true) {
				isUpdate = true;
				this.isCompilationError = false;
			} else if(error.isRuntime === true && !this.isCompilationError) {
				isUpdate = true;
			}
			if(isUpdate) {
				editor.errorElem.innerText = error.message;
				this.sendData({ errorDisplayed: true });
			}
			if(data.updateUrl !== true) {
				ui.setCodeSize(editor.value);
			}
		}
		if(data.updateUrl === true) {
			this.updateUrl();
		}
	}
	resetScopeAdjustment() {
		if(scope.drawMode === 'FFT') {
			this.setFFTBins(-scope.fftSize + 10);
		} else {
			this.setScale(-scope.drawScale);
		}
	}
	resetTime() {
		this.isNeedClear = true;
		this.sendData({ resetTime: true, playbackSpeed: this.playbackSpeed });
	}
	saveSettings() {
		this.settings.drawMode = scope.drawMode;
		this.settings.drawScale = scope.drawScale;
		this.settings.fftSize = scope.fftSize;
		this.settings.showAllSongs = library.showAllSongs;
		localStorage.settings = JSON.stringify(this.settings);
	}
	sendData(data) {
		this.audioWorkletNode.port.postMessage(data);
	}
	setByteSample(value) {
		this.byteSample = +value || 0;
		if(this.isNeedClear && value === 0) {
			this.isNeedClear = false;
			scope.drawBuffer = [];
			scope.canvasTimeCursor.style.left = 0;
			scope.clearCanvas();
			if(!this.isPlaying) {
				scope.canvasPlayButton.classList.add('canvas-initial');
			}
		}
	}
	setCodeStyle(value) {
		if(value !== undefined) {
			this.settings.codeStyle = value;
			this.saveSettings();
		} else if((value = this.settings.codeStyle) === undefined) {
			value = this.settings.codeStyle = this.defaultSettings.codeStyle;
			this.saveSettings();
		}
		document.documentElement.dataset.syntax = value;
		document.documentElement.dataset.syntaxType = value.endsWith('Light') ? 'light' : 'dark';
	}
	setColorDiagram(value) {
		if(value !== undefined) {
			this.settings.colorDiagram = value;
			this.saveSettings();
		} else if((value = this.settings.colorDiagram) === undefined) {
			value = this.settings.colorDiagram = this.defaultSettings.colorDiagram;
			this.saveSettings();
		}
		ui.controlColorDiagram.value = value;
		ui.controlColorDiagramInfo.innerHTML = scope.getColorTest('colorDiagram', value);
	}
	setColorStereo(value) {
		// value: Red=0, Green=1, Blue=2
		if(value !== undefined) {
			this.settings.colorStereo = value;
			this.saveSettings();
		} else if((value = this.settings.colorStereo) === undefined) {
			value = this.settings.colorStereo = this.defaultSettings.colorStereo;
			this.saveSettings();
		}
		ui.controlColorStereo.value = value;
		switch(value) {
		// [Left, Right1, Right2]
		case 0: scope.colorChannels = [0, 1, 2]; break;
		case 2: scope.colorChannels = [2, 0, 1]; break;
		default: scope.colorChannels = [1, 0, 2];
		}
		if(scope.colorWaveform) {
			scope.setStereoColors();
		}
	}
	setColorTimeCursor(value) {
		if(value !== undefined) {
			this.settings.colorTimeCursor = value;
			this.saveSettings();
		} else if((value = this.settings.colorTimeCursor) === undefined) {
			value = this.settings.colorTimeCursor = this.defaultSettings.colorTimeCursor;
			this.saveSettings();
		}
		ui.controlColorTimeCursor.value = value;
		scope.canvasTimeCursor.style.borderLeft = '2px solid ' + value;
	}
	setColorWaveform(value) {
		if(value !== undefined) {
			this.settings.colorWaveform = value;
			this.saveSettings();
		} else if((value = this.settings.colorWaveform) === undefined) {
			value = this.settings.colorWaveform = this.defaultSettings.colorWaveform;
			this.saveSettings();
		}
		ui.controlColorWaveform.value = value;
		ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform', value);
		scope.setStereoColors();
	}
	setAudioSampleRate(value) {
		if(value !== undefined) {
			this.settings.audioSampleRate = value;
			this.saveSettings();
			window.location.reload();
		} else if((value = this.settings.audioSampleRate) === undefined) {
			value = this.settings.audioSampleRate = this.defaultSettings.audioSampleRate;
			this.saveSettings();
		}
	}
	setCounterUnits() {
		ui.controlTimeUnits.textContent = this.settings.isSeconds ? 'sec' : 't';
		this.setCounterValue(this.byteSample);
	}
	setCounterValue(value) {
		ui.controlTime.value = this.settings.isSeconds ? (value / this.sampleRate).toFixed(2) : value;
		// Lag detection
		this.updateCounter++;
		const maxUpdates = Math.ceil(400 * this.settings.audioSampleRate / 48000);
		if(this.updateCounter >= maxUpdates) {
			const time = Date.now();
			if(this.lastUpdateTime) {
				const lag =
					Math.round(Math.max(0,Math.min(999,(time-this.lastUpdateTime)/this.updateCounter*this.settings.audioSampleRate/1280-100)));
				ui.controlLag.innerText = lag + '%';
				if(lag > 3) {
					if(!this.isLagging) {
						this.isLagging = true;
						ui.controlLag.classList.add('control-lag-red');
					}
				} else if(this.isLagging) {
					this.isLagging = false;
					ui.controlLag.classList.remove('control-lag-red');
				}
			}
			this.lastUpdateTime = time;
			this.updateCounter = 0;
		}
	}
	setDrawMode(drawMode) {
		scope.drawMode = drawMode;
		this.setScopeAdjustment(0);
		scope.toggleTimeCursor();
		scope.clearCanvas();
		this.saveSettings();
		this.sendData({ drawMode });
	}
	setFFTBins(amount, buttonElem) {
		if(buttonElem?.getAttribute('disabled')) {
			return;
		}
		scope.setFFTSize(scope.fftSize + amount);
		scope.setFFTAnalyzer();
		scope.clearCanvas();
		this.saveSettings();
		ui.setControlScale(scope.fftSize >= 15, scope.fftSize <= 5,
			scope.fftSize < 10 ? 2 ** scope.fftSize : `<sub>2</sub>${ scope.fftSize }`);
	}
	setPlaybackMode(mode) {
		this.mode = mode;
		this.updateUrl();
		this.sendData({ mode, setFunction: editor.value });
	}
	setSampleRate(sampleRate, isSendData = true) {
		if(!sampleRate || !isFinite(sampleRate) ||
			// Float32 limit
			(sampleRate = Number(parseFloat(Math.abs(sampleRate)).toFixed(4))) > 3.4028234663852886E+38
		) {
			sampleRate = 8000;
		}
		sampleRate = Math.max(0.1, sampleRate);
		switch(sampleRate) {
		case 8000:
		case 11025:
		case 16000:
		case 22050:
		case 32000:
		case 44100:
		case 48000: ui.controlSampleRateSelect.value = sampleRate; break;
		default: ui.controlSampleRateSelect.selectedIndex = -1;
		}
		const oldSampleRate = this.sampleRate;
		ui.controlSampleRate.value = this.sampleRate = sampleRate;
		ui.controlSampleRate.blur();
		ui.controlSampleRateSelect.blur();
		scope.toggleTimeCursor();
		if(isSendData) {
			const data = {
				sampleRate: this.sampleRate,
				sampleRatio: this.sampleRate / this.audioCtx.sampleRate
			};
			if(this.mode === 'Funcbeat') {
				data.byteSample = Math.round(ui.controlTime.value * sampleRate /
					(this.settings.isSeconds ? 1 : oldSampleRate));
				this.setCounterValue(data.byteSample);
				this.setByteSample(data.byteSample);
			}
			this.updateUrl();
			this.sendData(data);
		}
	}
	setMindB(dB) {
		if(dB !== undefined) {
			if(dB>0||dB<-150) dB = this.defaultSettings.minDecibels;
			else dB = Math.min(this.settings.maxDecibels-10,dB);
			ui.settingsMindB.value = this.settings.minDecibels = this.analyserNode.minDecibels = dB;
			ui.settingsMindB.blur();
			this.saveSettings();
		} else if((dB = this.settings.minDecibels) === undefined) {
			dB = this.settings.minDecibels = this.defaultSettings.minDecibels;
			this.saveSettings();
		}
	}
	setMaxdB(dB) {
		if(dB !== undefined) {
			if(dB>0||dB<-150) dB = this.defaultSettings.maxDecibels;
			else dB = Math.max(this.settings.minDecibels+10,dB);
			ui.settingsMaxdB.value = this.settings.maxDecibels = this.analyserNode.maxDecibels = dB;
			ui.settingsMaxdB.blur();
			this.saveSettings();
		} else if((dB = this.settings.maxDecibels) === undefined) {
			dB = this.settings.maxDecibels = this.defaultSettings.maxDecibels;
			this.saveSettings();
		}
	}
	setFFTSize(size) {
		if(size !== undefined) {
			if(size>32768||size<32) size = this.defaultSettings.fftSize;
			ui.settingsFFTSize.value = this.settings.fftSize = this.analyserNode.fftSize = size;
			ui.settingsFFTSize.blur();
			this.saveSettings();
		} else if((size = this.settings.fftSize) === undefined) {
			size = this.settings.fftSize = this.defaultSettings.fftSize;
			this.saveSettings();
		}
	}
	setScale(amount, buttonElem) {
		if(buttonElem?.getAttribute('disabled')) {
			return;
		}
		scope.drawScale = Math.min(Math.max(scope.drawScale + amount, 0), 20);
		scope.toggleTimeCursor();
		scope.clearCanvas();
		this.saveSettings();
		ui.setControlScale(scope.drawScale <= 0, scope.drawScale >= 20,
			!scope.drawScale ? '1x' :
			scope.drawScale < 7 ? `1/${ 2 ** scope.drawScale }${ scope.drawScale < 4 ? 'x' : '' }` :
			`<sub>2</sub>-${ scope.drawScale }`);
	}
	setScopeAdjustment(amount, buttonElem) {
		if(scope.drawMode === 'FFT') {
			ui.controlScaleDown.title = 'Use more FFT bins';
			ui.controlScaleUp.title = 'Use less FFT bins';
			ui.controlScale.title = 'FFT bins. Click to reset to 1024';
			this.setFFTBins(-amount, buttonElem);
		} else {
			ui.controlScaleDown.title = 'Zoom in the scope';
			ui.controlScaleUp.title = 'Zoom out the scope';
			ui.controlScale.title = 'Scope zoom factor. Click to reset to 1.';
			this.setScale(amount, buttonElem);
		}
	}
	setSRDivisor(increment) {
		const value = (this.settings.srDivisor || 1) + increment;
		if(value === 0) {
			return;
		}
		ui.controlSRDivisor.textContent = this.settings.srDivisor = value;
		this.saveSettings();
		this.sendData({ srDivisor: value });
	}
	setThemeStyle(value) {
		if(value === undefined) {
			if((value = this.settings.themeStyle) === undefined) {
				value = this.settings.themeStyle = this.defaultSettings.themeStyle;
				this.saveSettings();
			}
			document.documentElement.dataset.theme = value;
			document.documentElement.dataset.themeType = value.endsWith('Light') ? 'light' : 'dark';
			return;
		}
		document.documentElement.dataset.theme = this.settings.themeStyle = value;
		document.documentElement.dataset.themeType = value.endsWith('Light') ? 'light' : 'dark';
		let colorCursor, colorDiagram;
		let colorStereo = 1; // Red=0, Green=1, Blue=2
		switch(value) {
		case 'Cake Dark':
			colorCursor = '#40ffff';
			colorDiagram = '#c000c0';
			colorStereo = 0;
			break;
		case 'Green Dark':
			colorCursor = '#00ffa8';
			colorDiagram = '#00a080';
			break;
		case 'Orange Dark':
			colorCursor = '#ffff80';
			colorDiagram = '#8000ff';
			colorStereo = 0;
			break;
		case 'Purple Dark':
			colorCursor = '#ff50ff';
			colorDiagram = '#a040ff';
			colorStereo = 0;
			break;
		case 'Teal Dark':
			colorCursor = '#80c0ff';
			colorDiagram = '#00a0c0';
			break;
		default:
			colorCursor = '#00ff00';
			colorDiagram = '#00c080';
		}
		this.setColorTimeCursor(colorCursor);
		this.setColorStereo(colorStereo);
		ui.controlColorWaveformInfo.innerHTML = scope.getColorTest('colorWaveform');
		this.setColorDiagram(ui.controlColorDiagram.value = colorDiagram); // Contains this.saveSettings();
	}
	setVolume(isInit) {
		let volumeValue = NaN;
		if(isInit) {
			volumeValue = parseFloat(this.settings.volume);
		}
		if(isNaN(volumeValue)) {
			volumeValue = ui.controlVolume.value / ui.controlVolume.max;
		}
		ui.controlVolume.value = this.settings.volume = volumeValue;
		ui.controlVolume.title = `Volume: ${ (volumeValue * 100).toFixed(0) }%`;
		this.saveSettings();
		this.audioGain.gain.value = volumeValue * volumeValue;
	}
	toggleCounterUnits() {
		this.settings.isSeconds = !this.settings.isSeconds;
		this.saveSettings();
		this.setCounterUnits();
	}
	toggleRecording() {
		if(!this.audioCtx) {
			return;
		}
		if(this.isRecording) {
			this.playbackToggle(false);
			return;
		}
		this.isRecording = true;
		ui.controlRecord.classList.add('control-recording');
		ui.controlRecord.title = 'Pause and stop recording';
		this.audioRecorder.start();
		this.audioRecordChunks = [];
		this.playbackToggle(true);
	}
	formatCode() {
		const code1 = editor.value;
		const data = actions.commaFormat(code1, ui.controlMaxParens.value);
		if(data.error) {
			ui.okAlert(`Format failed: ${ data.error }!`);
			return;
		}
		editor.setValue(data.code);
	}
	bake() {
		const toEncode = editor.value;

		if(actions.unminibakeCode(toEncode)!==toEncode) {
			ui.okAlert('Code is already minibaked.');
			return;
		}

		const l = actions.minibakeCode(toEncode);
		if(actions.unminibakeCode(l) !== l) {
			editor.setValue(l);
		} else {
			ui.okAlert('Minibaking reverted: the player will lag!');
		}
		return;
	}
	debake() {
		editor.setValue(actions.unminibakeCode(editor.value));
	}
	updateUrl() {
		const code = editor.value;
		ui.setCodeSize(code);
		getUrlFromCode(code, this.mode, this.sampleRate);
	}
	favoriteErrorBox(error) {
		ui.yesNoAlert(`${ error.message }\n\n${ error.stack }\n\n` +
			'This may indicate your favorites are corrupted.\nDo you want to erase them?', () => {
			localStorage.favorites = '{}';
			this.loadFavoriteList();
		}, () => { });
	}
	saveFavorite() {
		this.updateUrl();
		try {
			const favorites = JSON.parse(localStorage.favorites??'[]');
			favorites.push({
				name: ui.favoritesNameInput.value,
				info: {
					mode: this.mode,
					samplerate: this.sampleRate,
					size: new Blob([editor.value]).size
				},
				url: window.location.hash
			});
			localStorage.favorites = JSON.stringify(favorites);
		} catch(e) {
			this.favoriteErrorBox(e);
		} finally {
			this.loadFavoriteList();
		}
	}
	loadFavoriteList() {
		try {
			const favorites = JSON.parse(localStorage.favorites??'[]');
			if(!Array.isArray(favorites)) {
				const newFavorites = [];
				for(const i in favorites) {
					const newFavorite = {};
					newFavorite.name = decodeURIComponent(i).split(': ').slice(1).join(': ');
					newFavorite.info = decodeURIComponent(i).split(': ')[0];
					newFavorite.url = decodeURIComponent(favorites[i]);
					newFavorites.push(newFavorite);
				}
				localStorage.favorites = JSON.stringify(newFavorites);
				ui.okAlert('Your favorites have been converted!', () => this.loadFavoriteList());
				return;
			}
			while(ui.favoritesList.children.length > 0)
				ui.favoritesList.removeChild(ui.favoritesList.children[0]); // sacrifice to Armok
			for(let i in favorites) {
				i=+i; // It saves your sanity.
				const favorite = favorites[i];
				const li = FavoriteGenerator.buildFavoriteEntry(i, favorite, favorites.length, () => {
					ui.yesNoAlert(
						'Are you sure you want to delete this favorite?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								favorites.splice(i, 1);
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				}, () => {
					ui.yesNoAlert(
						'Are you sure you want to overwrite this favorite?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								this.updateUrl();
								favorites[i] = {
									name: favorites[i].name,
									info: {
										mode: this.mode,
										samplerate: this.sampleRate,
										size: new Blob([editor.value]).size
									},
									url: window.location.hash
								};
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				}, () => {
					ui.yesNoAlert(
						'Are you sure you want to rename this favorite to what\'s in the "New favorite" bar?',
						() => {
							try {
								const favorites = JSON.parse(localStorage.favorites ?? '[]');
								this.updateUrl();
								favorites[i].name = ui.favoritesNameInput.value;
								localStorage.favorites = JSON.stringify(favorites);
							} catch(e) {
								this.favoriteErrorBox(e);
							} finally {
								this.loadFavoriteList();
							}
						},
						() => {}
					);
				});
				ui.favoritesList.appendChild(li);
				ui.favoritesList.appendChild(document.createElement('hr'));
			}
			// Remove the last <hr> element
			if(ui.favoritesList.children.length > 0)
				ui.favoritesList.removeChild(ui.favoritesList.children[ui.favoritesList.children.length-1]);
		} catch(e) {
			this.favoriteErrorBox(e);
		}
	}
	addSlider(data = { type: 'N', name: 'Unlabelled', var: 'slider', val: 50, low: 0, high: 100, step: 1, text: 'Add text' }) {
		let index = this.sliders.indexOf(data);
		if(index===-1) {
			index=this.sliders.length;
			this.sliders.push(data);
		}
		const root = document.createElement('div');
		root.classList.add('slider-panel'/*, 'slider-'+type+'-panel'*/);
			const viewName = document.createElement('div');
			viewName.classList.add('control-label', 'slider-view-name');
			viewName.innerText = data.name;
			root.appendChild(viewName);

			let group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow');
			const select = document.createElement('select');
			const top = document.createElement('div');
			select.classList.add('slider-type', 'control-select', 'controls-grow');
			top.classList.add('slider-top');
			select.innerHTML = '<option value="N" selected>Number</option><option value="S">Text</option>';
			const handleSelectChange=(val)=>{
				top.innerHTML="";
				data.type = val;
				switch(val) {
					case 'N': {
						// <div class="controls-group controls-grow">
						// 		<div class="control-label slider-value">value</div>
						// 		<input type="range" min="0" max="1" step="0.1" class="control-slider slider-slider" tabindex="0">
						// 		<button class="control-button control-text-button slider-remove" tabindex="0">Remove</button>
						// 	</div>
						let group2 = document.createElement('div'); group2.classList.add('controls-group');
						const valueElem = document.createElement('div');
						valueElem.classList.add('control-label', 'slider-value', 'controls-grow');
						valueElem.innerText = data.val;
						group2.appendChild(valueElem);

						let group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow');

						const sliderElem = document.createElement('input');
						sliderElem.type = 'range';
						sliderElem.classList.add('control-slider', 'slider-slider');
						sliderElem.value = data.val;
						sliderElem.min = data.low;
						sliderElem.max = data.high;
						sliderElem.step = data.step === 0 ? 'any' : Math.abs(data.step);
						sliderElem.addEventListener('input', ()=>{
							valueElem.innerText = data.val = parseFloat(sliderElem.value);
							this.updateSliderVariable(data);
						});
						sliderElem.addEventListener('change', ()=>getUrlFromCode(editor.value, this.mode, this.sampleRate));
						sliderElem.tabIndex = 0;
						group.appendChild(sliderElem);
						top.appendChild(group);
						top.appendChild(group2);

						// 	<div class="controls-group controls-grow slider-params">
						// 		<input type="number" class="control-text slider-bound slider-low" value="0" title="Slider low" tabindex="0">
						// 		<span class="control-label">to</span>
						// 		<input type="number" class="control-text slider-bound slider-high" value="1" title="Slider high" tabindex="0">
						// 		<span class="control-label">step</span>
						// 		<input type="number" class="control-text slider-bound slider-step" value="0.1" title="Slider step" tabindex="0">
						// 	</div>

						group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow', 'slider-params');
						const minElem = document.createElement('input');
						const maxElem = document.createElement('input');
						const stepElem = document.createElement('input');
						minElem.type = maxElem.type = stepElem.type = 'number';
						minElem.classList.add('control-text', 'slider-bound', 'slider-low');
						maxElem.classList.add('control-text', 'slider-bound', 'slider-high');
						stepElem.classList.add('control-text', 'slider-bound', 'slider-step');
						minElem.value = data.low; maxElem.value = data.high; stepElem.value = data.step;
						minElem.title = "Slider low"; maxElem.title = "Slider high"; stepElem.title = "Slider step";
						minElem.tabIndex = maxElem.tabIndex = stepElem.tabIndex = 0;
						minElem.addEventListener('change', function() { sliderElem.min = data.low = parseFloat(minElem.value); });
						maxElem.addEventListener('change', function() { sliderElem.max = data.high = parseFloat(maxElem.value); });
						stepElem.addEventListener('change', function() { const h = parseFloat(stepElem.value); sliderElem.step = data.step = h === 0 ? 'any' : Math.abs(h); });
						const toLabel = document.createElement('span');
						const stepLabel = document.createElement('span');
						toLabel.classList.add('control-label');
						stepLabel.classList.add('control-label');
						toLabel.innerText = 'to';
						stepLabel.innerText = 'step';
						group.appendChild(minElem);
						group.appendChild(toLabel);
						group.appendChild(maxElem);
						group.appendChild(stepLabel);
						group.appendChild(stepElem);
						top.appendChild(group);
					} break;
					case 'S': {
						// <textarea class="slider-text" tabindex="0">value</textarea>
						const area = document.createElement('textarea');
						area.classList.add('slider-text');
						area.tabIndex = 0;
						area.value = data.text;
						area.addEventListener('change', ()=>{
							data.text = area.value;
							this.updateSliderVariable(data);
							getUrlFromCode(editor.value, this.mode, this.sampleRate);
						});
						top.appendChild(area);
					} break;
					default: top.innerHTML = 'error!'; break;
				}
			}
			handleSelectChange(select.value='N');
			select.addEventListener('change',()=>{
				handleSelectChange(select.value);
				this.updateSliderVariable(data);
				getUrlFromCode(editor.value, this.mode, this.sampleRate);
			});
			group.appendChild(select); root.appendChild(group);

			group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow');
			// <input type="text" class="control-text slider-edit-name" value="name" title="Slider name" tabindex="0">
			const nameElem = document.createElement('input');
			nameElem.type = 'text';
			nameElem.classList.add('control-text', 'slider-edit-name');
			nameElem.value = data.name;
			nameElem.title = "Slider name";
			nameElem.tabIndex = 0;
			nameElem.addEventListener('change', function() {
				viewName.innerText = data.name = nameElem.value;
				getUrlFromCode(editor.value, this.mode, this.sampleRate);
			});
			group.appendChild(nameElem);
			root.appendChild(group);

			group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow');
			// <input type="text" class="control-text slider-edit-name" value="name" title="Slider name" tabindex="0">
			const varElem = document.createElement('input');
			varElem.type = 'text';
			varElem.classList.add('control-text', 'slider-variable');
			varElem.value = data.var;
			varElem.title = "Slider variable name";
			varElem.tabIndex = 0;
			varElem.addEventListener('change', ()=>{
				data.var = varElem.value;
				this.setSliderVariables();
				getUrlFromCode(editor.value, this.mode, this.sampleRate);
			});
			group.appendChild(varElem);
			root.appendChild(group);

			root.appendChild(top);

			group = document.createElement('div'); group.classList.add('controls-group', 'controls-grow');
			// <input type="text" class="control-text slider-edit-name" value="name" title="Slider name" tabindex="0">
			const removeElem = document.createElement('button');
			removeElem.classList.add('control-button', 'control-text-button', 'slider-remove', 'controls-grow');
			removeElem.innerText = "Remove";
			removeElem.tabIndex = 0;
			removeElem.addEventListener('click', ()=>{
				ui.sliders.removeChild(root);
				const index = this.sliders.indexOf(data);
				if(index!==-1) {
					this.sliders.splice(index, 1);
					this.setSliderVariables();
					getUrlFromCode(editor.value, this.mode, this.sampleRate);
				}
			});
			group.appendChild(removeElem);
			root.appendChild(group);
		ui.sliders.appendChild(root);
		this.setSliderVariables();
	}
	setSliderVariables() {
		let setVariables = new Map();
		for(const slider of this.sliders) {
			switch(slider.type) {
				case 'N': setVariables.set(slider.var, +slider.val); break;
				case 'S': setVariables.set(slider.var, slider.text); break;
				default: console.warn('unknown type', slider.type); break;
			}
		}
		this.sendData({ setVariables, setFunction: editor.value });
	}
	updateSliderVariable(data) {
		switch(data.type) {
			case 'N': this.sendData({ updateVariable: [ data.var, +data.val ] }); break;
			case 'S': this.sendData({ updateVariable: [ data.var, data.text ] }); break;
			default: console.warn('unknown type', data.type); break;
		}
	}
}();
