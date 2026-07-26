(function () {
    'use strict';

    const DEFAULT_SETTINGS = {
        restoreCommentCounts: true,
        useExactNumbers: false,
        commentFontSize: '0.81',
        commentFontWeight: '600'
    };

    function broadcastSettings() {
        chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
            window.postMessage({
                type: 'FB_LIKES_SETTINGS_UPDATE',
                settings: items
            }, '*');
        });
    }

    broadcastSettings();

    window.addEventListener('message', (event) => {
        if (event.data?.type === 'FB_LIKES_CONTENT_READY') {
            broadcastSettings();
        }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            broadcastSettings();
        }
    });
})();
