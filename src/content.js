(function () {
    'use strict';

    const INJECTED_CLASS = 'fb-restored-count';
    let scannedFibers = new WeakMap();

    let currentSettings = {
        restoreCommentCounts: true,
        useExactNumbers: false,
        commentFontSize: '0.81',
        commentFontWeight: '600'
    };

    let readyInterval = setInterval(() => {
        window.postMessage({ type: 'FB_LIKES_CONTENT_READY' }, '*');
    }, 250);

    window.addEventListener('message', (event) => {
        if (event.data?.type === 'FB_LIKES_SETTINGS_UPDATE') {
            clearInterval(readyInterval);

            const prevRestore = currentSettings.restoreCommentCounts;
            currentSettings = { ...currentSettings, ...event.data.settings };

            scannedFibers = new WeakMap();

            if (prevRestore && !currentSettings.restoreCommentCounts) {
                document.querySelectorAll(`.${INJECTED_CLASS}`).forEach(el => el.remove());
            } else if (currentSettings.restoreCommentCounts) {
                scanFullTree();
            }
        }
    });

    if (window.__fbLikesRestorer?.observer) {
        try { window.__fbLikesRestorer.observer.disconnect(); } catch (_) { }
    }

    function formatCount(n) {
        if (currentSettings.useExactNumbers) return n.toLocaleString();
        if (n < 1000) return String(n);
        const format = (val, suffix) => (Math.round(val * 10) / 10).toFixed(1).replace(/\.0$/, '') + suffix;
        if (n < 999950) return format(n / 1000, 'K');
        if (n < 999950000) return format(n / 1e6, 'M');
        return format(n / 1e9, 'B');
    }

    function getDOMNodeFromFiber(fiber) {
        if (!fiber) return null;
        if (fiber.tag === 5 && fiber.stateNode instanceof Element) {
            return fiber.stateNode;
        }
        let child = fiber.child;
        while (child) {
            const node = getDOMNodeFromFiber(child);
            if (node) return node;
            child = child.sibling;
        }
        return null;
    }

    let cachedReactSuffix = null;

    function getReactSuffix() {
        const rootEl = document.querySelector('[id^="mount_"]');
        if (!rootEl) return null;

        if (cachedReactSuffix && rootEl['__reactContainer' + cachedReactSuffix]) {
            return cachedReactSuffix;
        }

        const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
        if (containerKey) {
            cachedReactSuffix = containerKey.split('__reactContainer')[1];
            return cachedReactSuffix;
        }
        return null;
    }

    function getFiberFromDOM(domNode) {
        const suffix = getReactSuffix();
        if (!suffix) return null;

        const fiberKey = '__reactFiber' + suffix;
        const containerKey = '__reactContainer' + suffix;

        let curr = domNode;
        let depth = 0;

        while (curr && depth < 12) {
            if (curr[fiberKey]) return curr[fiberKey];
            if (curr[containerKey]) return curr[containerKey];
            curr = curr.parentElement;
            depth++;
        }
        return null;
    }

    function attachCountToDOM(domNode, total) {
        const btn = domNode.closest('div[role="button"]') || domNode.querySelector('div[role="button"]') || domNode;
        let span = btn.querySelector(`.${INJECTED_CLASS}`);

        if (!currentSettings.restoreCommentCounts) {
            if (span) span.remove();
            return;
        }

        const formatted = formatCount(total);

        if (span) {
            if (span.textContent !== formatted) span.textContent = formatted;
            span.style.fontSize = `${currentSettings.commentFontSize}rem`;
            span.style.fontWeight = currentSettings.commentFontWeight;
        } else {
            span = document.createElement('span');
            span.className = INJECTED_CLASS;
            span.style.cssText = `display:inline-flex;align-items:center;pointer-events:none;user-select:none;white-space:nowrap;-webkit-font-smoothing:antialiased;font-family:inherit;color:var(--secondary-text,#b0b3b8);font-size:${currentSettings.commentFontSize}rem;font-weight:${currentSettings.commentFontWeight};line-height:1;margin-left:4px;`;
            span.textContent = formatted;

            btn.style.display = btn.style.display || 'inline-flex';
            btn.style.alignItems = btn.style.alignItems || 'center';
            btn.appendChild(span);
        }
    }

    function scanSubtree(startFiber) {
        if (!currentSettings.restoreCommentCounts || !startFiber) return;

        let curr = startFiber;

        while (curr) {
            let skipChild = false;
            let totalReactions = 0;

            try {
                const props = curr.memoizedProps;
                if (props) {
                    const topReactions = props.topReactions || props.commentData?.top_reactions?.edges;
                    const feedback = props.feedback || props.commentData?.feedback;

                    if (topReactions && Array.isArray(topReactions)) {
                        totalReactions = topReactions.reduce((sum, r) => sum + (r.reactionCount || r.node?.reaction_count || 0), 0);
                    } else if (feedback && feedback.reaction_count) {
                        totalReactions = feedback.reaction_count.count || feedback.reaction_count || 0;
                    }
                }
            } catch (err) {
                console.debug('[FB Likes] Data schema extraction failed:', err.message);
            }

            if (totalReactions > 0) {
                skipChild = true;

                if (scannedFibers.get(curr) !== totalReactions) {
                    try {
                        const domNode = getDOMNodeFromFiber(curr);
                        if (domNode && document.body.contains(domNode)) {
                            attachCountToDOM(domNode, totalReactions);
                            scannedFibers.set(curr, totalReactions);
                        }
                    } catch (err) {
                        console.debug('[FB Likes] DOM attach failed:', err.message);
                    }
                }
            }

            if (!skipChild && curr.child) {
                curr = curr.child;
            } else {
                if (curr === startFiber) break;
                while (curr && !curr.sibling) {
                    curr = curr.return;
                    if (curr === startFiber || !curr) return;
                }
                if (curr) curr = curr.sibling;
            }
        }
    }

    function scanFullTree() {
        const rootEl = document.querySelector('[id^="mount_"]');
        if (rootEl) {
            const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
            if (containerKey) scanSubtree(rootEl[containerKey]);
        }
    }

    let scanTimeout = null;

    const observer = new MutationObserver((mutations) => {
        if (!currentSettings.restoreCommentCounts) return;

        let fibersToScan = new Set();
        let needsRootFallback = false;

        for (let i = 0; i < mutations.length; i++) {
            const added = mutations[i].addedNodes;
            for (let j = 0; j < added.length; j++) {
                const node = added[j];
                if (node.nodeType === 1) {
                    const fiber = getFiberFromDOM(node);
                    if (fiber) {
                        fibersToScan.add(fiber);
                    } else {
                        if (node.matches('div[role="button"]') || node.querySelector('div[role="button"]')) {
                            needsRootFallback = true;
                        }
                    }
                }
            }
        }

        if (needsRootFallback) {
            const rootEl = document.querySelector('[id^="mount_"]');
            if (rootEl) {
                const containerKey = Object.keys(rootEl).find(k => k.startsWith('__reactContainer'));
                if (containerKey && rootEl[containerKey]) {
                    fibersToScan.add(rootEl[containerKey]);
                }
            }
        }

        if (fibersToScan.size > 0) {
            if (scanTimeout) clearTimeout(scanTimeout);
            scanTimeout = setTimeout(() => {
                requestAnimationFrame(() => {
                    fibersToScan.forEach(f => scanSubtree(f));
                });
            }, 150);
        }
    });

    function init() {
        if (!document.body) {
            requestAnimationFrame(init);
            return;
        }
        observer.observe(document.body, { childList: true, subtree: true });
        window.__fbLikesRestorer = { observer };
        scanFullTree();
    }

    init();
})();
