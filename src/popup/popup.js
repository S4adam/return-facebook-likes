document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // i18n translations
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const message = chrome.i18n.getMessage(elem.getAttribute('data-i18n'));
        if (message) {
            if (elem.tagName === 'TITLE') {
                document.title = message;
            } else {
                elem.textContent = message;
            }
        }
    });

    const DEFAULT_SETTINGS = {
        restoreCommentCounts: true,
        useExactNumbers: false,
        commentFontSize: '0.81',
        commentFontWeight: '600'
    };

    let initialState = { ...DEFAULT_SETTINGS };
    let toastTimeout = null;

    const saveBtn = document.getElementById('saveBtn');
    const revertBtn = document.getElementById('revertBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMsg = document.getElementById('statusMsg');

    const resetLabel = chrome.i18n.getMessage('btnReset') || 'Reset to defaults';
    resetBtn.title = resetLabel;
    resetBtn.setAttribute('aria-label', resetLabel);

    const inputs = {
        restoreCommentCounts: document.getElementById('restoreCommentCounts'),
        useExactNumbers: document.getElementById('useExactNumbers'),
        commentFontSize: document.getElementById('commentFontSize'),
        commentFontWeight: document.getElementById('commentFontWeight')
    };

    const displays = {
        fontSizeVal: document.getElementById('fontSizeVal'),
        fontWeightVal: document.getElementById('fontWeightVal')
    };

    function getUIState() {
        return {
            restoreCommentCounts: inputs.restoreCommentCounts.checked,
            useExactNumbers: inputs.useExactNumbers.checked,
            commentFontSize: inputs.commentFontSize.value,
            commentFontWeight: inputs.commentFontWeight.value
        };
    }

    function setUIState(state) {
        inputs.restoreCommentCounts.checked = state.restoreCommentCounts;
        inputs.useExactNumbers.checked = state.useExactNumbers;
        inputs.commentFontSize.value = state.commentFontSize;
        inputs.commentFontWeight.value = state.commentFontWeight;
        updateSliderDisplays();
    }

    function updateSliderDisplays() {
        displays.fontSizeVal.textContent = `${inputs.commentFontSize.value}rem`;
        displays.fontWeightVal.textContent = inputs.commentFontWeight.value;
    }

    function checkStateChange() {
        updateSliderDisplays();
        const currentState = getUIState();

        const hasChanged = Object.keys(initialState).some(key =>
            String(initialState[key]) !== String(currentState[key])
        );

        saveBtn.disabled = !hasChanged;
        revertBtn.disabled = !hasChanged;
    }

    function showStatus(text) {
        statusMsg.textContent = text;
        statusMsg.classList.add('show');

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toastTimeout = setTimeout(() => {
            statusMsg.classList.remove('show');
        }, 2000);
    }

    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
        initialState = { ...items };
        setUIState(initialState);

        saveBtn.disabled = true;
        revertBtn.disabled = true;

        Object.values(inputs).forEach(input => {
            input.addEventListener('change', checkStateChange);
            input.addEventListener('input', checkStateChange);
        });
    });

    saveBtn.addEventListener('click', () => {
        const currentState = getUIState();
        chrome.storage.sync.set(currentState, () => {
            initialState = { ...currentState };
            checkStateChange();
            showStatus(chrome.i18n.getMessage('msgSaved') || 'Settings saved!');
        });
    });

    revertBtn.addEventListener('click', () => {
        setUIState(initialState);
        checkStateChange();
        showStatus(chrome.i18n.getMessage('msgReverted') || 'Reverted to saved state.');
    });

    resetBtn.addEventListener('click', () => {
        setUIState(DEFAULT_SETTINGS);
        checkStateChange();
        showStatus(chrome.i18n.getMessage('msgResetDefaults') || 'Reset to defaults.');
    });
});
