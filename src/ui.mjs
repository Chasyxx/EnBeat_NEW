import { formatBytes } from './utils.mjs';

export class UI {
	constructor() {
		this.containerFixed = null;
		this.containerScroll = null;
		this.controlCodeSize = null;
		this.controlCodeStyle = null;
		this.controlColorDiagram = null;
		this.controlColorDiagramInfo = null;
		this.controlColorStereo = null;
		this.controlColorTimeCursor = null;
		this.controlColorWaveform = null;
		this.controlColorWaveformInfo = null;
		this.controlDrawMode = null;
		this.controlLag = null;
		this.controlPlaybackMode = null;
		this.controlPlayBackward = null;
		this.controlPlayForward = null;
		this.controlRecord = null;
		this.controlSampleRate = null;
		this.controlSampleRateSelect = null;
		this.controlScale = null;
		this.controlScaleDown = null;
		this.controlScaleUp = null;
		this.controlSRDivisor = null;
		this.controlSRDivisorUp = null;
		this.controlSRDivisorDown = null;
		this.controlThemeStyle = null;
		this.controlTime = null;
		this.controlTimeUnits = null;
		this.controlThemeStyle = null;
		this.controlVolume = null;
		this.controlVolumeDisplay = null;
		this.controlMic = null;
		this.actionAutoformat = null;
		this.controlMaxParens = null;
		this.actionMinibake = null;
		this.actionDeminibake = null;
		this.okDialog = null;
		this.okDialogText = null;
		this.okDialogButton = null;
		this.yesNoDialog = null;
		this.yesNoDialogText = null;
		this.yesNoDialogYesButton = null;
		this.yesNoDialogNoButton = null;
		this.favoritesNameInput = null;
		this.favoritesSaveButton = null;
		this.favoritesReloadButton = null;
		this.favoritesList = null;
		this.settingsAudioRate = null;
		this.settingsAudioRateApplyButton = null;
		this.settingsFFTSize = null;
		this.settingsMindB = null;
		this.settingsMaxdB = null;
		this.downloader = null;
		this.splashElem = null;
		this.mainElem = null;
	}
	copyLink() {
		navigator.clipboard.writeText(window.location);
	}
	expandEditor() {
		this.containerFixed.classList.toggle('container-expanded');
	}
	initElements() {
		this.containerFixed = document.getElementById('container-fixed');
		this.containerScroll = document.getElementById('container-scroll');
		this.controlCodeSize = document.getElementById('control-codesize');
		this.controlCodeStyle = document.getElementById('control-code-style');
		this.controlColorDiagram = document.getElementById('control-color-diagram');
		this.controlColorDiagramInfo = document.getElementById('control-color-diagram-info');
		this.controlColorStereo = document.getElementById('control-color-stereo');
		this.controlColorTimeCursor = document.getElementById('control-color-timecursor');
		this.controlColorWaveform = document.getElementById('control-color-waveform');
		this.controlColorWaveformInfo = document.getElementById('control-color-waveform-info');
		this.controlDrawMode = document.getElementById('control-drawmode');
		this.controlLag = document.getElementById('control-lag');
		this.controlPlaybackMode = document.getElementById('control-mode');
		this.controlPlayBackward = document.getElementById('control-play-backward');
		this.controlPlayForward = document.getElementById('control-play-forward');
		this.controlRecord = document.getElementById('control-rec');
		this.controlSampleRate = document.getElementById('control-samplerate');
		this.controlSampleRateSelect = document.getElementById('control-samplerate-select');
		this.controlScale = document.getElementById('control-scale');
		this.controlScaleDown = document.getElementById('control-scaledown');
		this.controlScaleUp = document.getElementById('control-scaleup');
		this.controlSRDivisor = document.getElementById('control-srdivisor');
		this.controlSRDivisorUp = document.getElementById('control-srdivisor-up');
		this.controlSRDivisorDown = document.getElementById('control-srdivisor-down');
		this.controlThemeStyle = document.getElementById('control-theme-style');
		this.controlTime = document.getElementById('control-counter');
		this.controlTimeUnits = document.getElementById('control-counter-units');
		this.controlVolume = document.getElementById('control-volume');
		this.controlVolumeDisplay = document.getElementById('control-volume-display');
		this.controlMic = document.getElementById('control-mic');
		this.actionAutoformat = document.getElementById('actions-format');
		this.controlMaxParens = document.getElementById('control-maxparens');
		this.actionMinibake = document.getElementById('actions-minibake');
		this.actionDeminibake = document.getElementById('actions-deminibake');
		this.okDialog = document.getElementById('ok-dialog');
		this.okDialogText = document.getElementById('ok-dialog-text');
		this.okDialogButton = document.getElementById('ok-dialog-ok');
		this.yesNoDialog = document.getElementById('yesno-dialog');
		this.yesNoDialogText = document.getElementById('yesno-dialog-text');
		this.yesNoDialogYesButton = document.getElementById('yesno-dialog-yes');
		this.yesNoDialogNoButton = document.getElementById('yesno-dialog-no');
		this.favoritesNameInput = document.getElementById('favorites-nameinput');
		this.favoritesSaveButton = document.getElementById('favorites-savefavorite');
		this.favoritesReloadButton = document.getElementById('favorites-reload');
		this.favoritesList = document.getElementById('favorites-content');
		this.settingsAudioRate = document.getElementById('settings-audiorate');
		this.settingsAudioRateApplyButton = document.getElementById('settings-audiorate-apply');
		this.settingsFFTSize = document.getElementById('settings-fftsize');
		this.settingsMindB = document.getElementById('settings-mindb');
		this.settingsMaxdB = document.getElementById('settings-maxdb');
		this.downloader = document.getElementById('downloader');
		this.splashElem = document.getElementById('splash');
		this.mainElem = document.getElementById('content');
	}
	setCodeSize(value) {
		this.controlCodeSize.textContent =
			`${ formatBytes(new Blob([value]).size, 1) } (${ window.location.href.length }c)`;
	}
	okAlert(message, callback){
		this.okDialogText.innerText = message;
		this.okDialogButton.addEventListener('click', () => {
			this.okDialog.close();
			if(callback) callback();
		}, { once: true });
		this.okDialog.showModal();
	}
	yesNoAlert(message, callbackYes, callbackNo) {
		this.yesNoDialogText.innerText = message;

		const onYesClick = () => {
			this.yesNoDialog.close();
			callbackYes();
			this.yesNoDialogNoButton.removeEventListener('click', onNoClick);
		};

		const onNoClick = () => {
			this.yesNoDialog.close();
			callbackNo();
			this.yesNoDialogYesButton.removeEventListener('click', onYesClick);
		};

		this.yesNoDialogYesButton.addEventListener('click', onYesClick, { once: true });
		this.yesNoDialogNoButton.addEventListener('click', onNoClick, { once: true });
		this.yesNoDialog.showModal();
	}
	setControlScale(isDisableDown, isDisableUp, value) {
		this.controlScale.innerHTML = value;
		if(isDisableDown) {
			this.controlScaleDown.setAttribute('disabled', true);
		} else {
			this.controlScaleDown.removeAttribute('disabled');
		}
		if(isDisableUp) {
			this.controlScaleUp.setAttribute('disabled', true);
		} else {
			this.controlScaleUp.removeAttribute('disabled');
		}
	}
	setPlayButton(buttonElem, speed) {
		const isFast = speed !== 1;
		buttonElem.classList.toggle('control-fast', isFast);
		buttonElem.classList.toggle('control-play', !isFast);
		if(speed) {
			buttonElem.firstElementChild.textContent = speed;
			buttonElem.removeAttribute('disabled');
		} else {
			buttonElem.setAttribute('disabled', true);
			buttonElem.removeAttribute('title');
			return;
		}
		const direction = buttonElem === this.controlPlayForward ? 'forward' : 'reverse';
		buttonElem.title = `Play ${ isFast ? `fast ${ direction } x${ speed } speed` : direction }`;
	}
}
