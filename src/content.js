(function () {
    'use strict';

    const INJECTED_CLASS = 'fb-restored-count';
    const TOOLBAR_SELECTOR = 'span[role="toolbar"]';
    const BUTTON_SELECTOR = 'div[role="button"][aria-label]';
    const SCAN_SELECTOR = `${TOOLBAR_SELECTOR}, ${BUTTON_SELECTOR}`;
    const ACTION_BUTTON_EXCLUDE_SELECTOR = '[data-ad-rendering-role], i[data-visualcompletion="css-img"]';

    if (window.__fbLikesRestorer?.observer) {
        try { window.__fbLikesRestorer.observer.disconnect(); } catch (_) { }
    }

    function parseCount(label) {
        if (!label) return null;
        const match = label.match(/(\d[\d.,\s\u00A0]*\d|\d)\s*(\p{L}{1,4}\.?)?/u);
        if (!match) return null;

        const numStr = match[1].replace(/[\s\u00A0]/g, '');
        const suffix = (match[2] || '').toLowerCase().replace(/\.$/, '');

        const multMap = {
            k: 1e3, tys: 1e3, tis: 1e3,
            m: 1e6, mln: 1e6, mil: 1e6,
            b: 1e9, mld: 1e9, bn: 1e9
        };
        const mult = multMap[suffix] || 1;

        if (mult === 1) return parseInt(numStr.replace(/\D/g, ''), 10) || null;

        const lastSep = Math.max(numStr.lastIndexOf(','), numStr.lastIndexOf('.'));
        if (lastSep === -1) return Math.round(parseInt(numStr, 10) * mult);

        const intPart = numStr.slice(0, lastSep).replace(/[.,]/g, '');
        const fracPart = numStr.slice(lastSep + 1);
        return Math.round(parseFloat(`${intPart}.${fracPart}`) * mult);
    }

    function formatCount(n) {
        if (n < 1000) return String(n);
        const format = (val, suffix) => (Math.round(val * 10) / 10).toFixed(1).replace(/\.0$/, '') + suffix;
        if (n < 999950) return format(n / 1000, 'k');
        if (n < 999950000) return format(n / 1e6, 'm');
        return format(n / 1e9, 'b');
    }

    function makeSpan(text) {
        const span = document.createElement('span');
        span.className = INJECTED_CLASS;
        span.style.cssText = 'color:var(--secondary-text,#65676b);font-size:.8125rem;font-weight:600;margin-left:6px;display:inline-flex;align-items:center;pointer-events:none;user-select:none;white-space:nowrap;line-height:1;';
        span.textContent = text;
        return span;
    }

    function attachCount(el, total) {
        el.style.display = el.style.display || 'inline-flex';
        el.style.alignItems = el.style.alignItems || 'center';
        el.appendChild(makeSpan(formatCount(total)));
    }

    const isActionButton = (el) => !!el.querySelector(ACTION_BUTTON_EXCLUDE_SELECTOR) || !!el.closest('[data-ad-rendering-role]');
    const isMenuButton = (el) => el.hasAttribute('aria-haspopup') || el.hasAttribute('aria-expanded');

    function isInsideChat(el) {
        if (location.hostname.includes('messenger.com') || location.pathname.includes('/messages')) {
            return true;
        }
        return !!el.closest('[role="grid"], [data-pagelet*="Chat"], [data-testid="chat-tab"], [aria-label="Messenger"], [aria-label="Czat"]');
    }

    function isValidCommentReaction(el) {
        const label = el.getAttribute('aria-label');
        if (!label || !/\d/.test(label)) return false;

        if (isInsideChat(el)) return false;
        if (isMenuButton(el)) return false;
        if (isActionButton(el)) return false;

        // Structural Punctuation Check:
        // Standalone comment reaction buttons use a colon or semicolon (standard or full-width) 
        // to isolate counts/summaries from descriptions/actions.
        return /[:;\uFF1A\uFF1B]/.test(label);
    }

    // detect already-visible numbers inside an element
    function hasVisibleCountInside(el) {
        const candidates = el.querySelectorAll('[role="none"], span, div');
        for (let i = 0; i < candidates.length; i++) {
            const node = candidates[i];
            if (node.classList.contains(INJECTED_CLASS)) continue;

            let ownText = '';
            for (let j = 0; j < node.childNodes.length; j++) {
                const child = node.childNodes[j];
                if (child.nodeType === 3) ownText += child.nodeValue;
            }
            ownText = ownText.trim();
            if (ownText && /^\d[\d.,\u00A0]*$/.test(ownText)) {
                return true;
            }
        }
        return false;
    }

    // detect if Facebook natively renders the count nearby
    function hasVisibleCountNearby(toolbar) {
        const container = toolbar.parentElement;
        if (!container) return false;

        const candidates = container.querySelectorAll('span');
        for (let i = 0; i < candidates.length; i++) {
            const el = candidates[i];
            if (toolbar.contains(el) || el.contains(toolbar)) continue;
            if (el.querySelector('span[role="toolbar"], div[role="button"]')) continue;
            const text = el.textContent || '';
            if (/\d/.test(text) && text.trim().length < 80) {
                return true;
            }
        }
        return false;
    }

    // Shape 1: Post Reaction Bar
    function processToolbar(toolbar) {
        const existingSpan = toolbar.querySelector(`.${INJECTED_CLASS}`);

        if (isInsideChat(toolbar) || isActionButton(toolbar) || hasVisibleCountNearby(toolbar) || hasVisibleCountInside(toolbar)) {
            if (existingSpan) existingSpan.remove();
            return;
        }

        const buttons = toolbar.querySelectorAll(BUTTON_SELECTOR);
        let total = 0, found = false;

        for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            if (isActionButton(btn) || isMenuButton(btn)) continue;
            const raw = parseCount(btn.getAttribute('aria-label'));
            if (raw !== null) {
                total += raw;
                found = true;
            }
        }

        if (!found) {
            if (existingSpan) existingSpan.remove();
            return;
        }

        const formatted = formatCount(total);
        if (existingSpan) {
            if (existingSpan.textContent !== formatted) {
                existingSpan.textContent = formatted;
            }
        } else {
            attachCount(toolbar, total);
        }
    }

    // Shape 2: Standalone Comment Summary Button
    function processStandaloneButton(btn) {
        const existingSpan = btn.querySelector(`.${INJECTED_CLASS}`);

        if (btn.closest(TOOLBAR_SELECTOR) || !isValidCommentReaction(btn) || hasVisibleCountInside(btn)) {
            if (existingSpan) existingSpan.remove();
            return;
        }

        const raw = parseCount(btn.getAttribute('aria-label'));
        if (raw === null) {
            if (existingSpan) existingSpan.remove();
            return;
        }

        const formatted = formatCount(raw);
        if (existingSpan) {
            if (existingSpan.textContent !== formatted) {
                existingSpan.textContent = formatted;
            }
        } else {
            attachCount(btn, raw);
        }
    }

    function processNode(el) {
        try {
            if (el.matches(TOOLBAR_SELECTOR)) {
                processToolbar(el);
            } else if (el.matches(BUTTON_SELECTOR)) {
                processStandaloneButton(el);
            }
        } catch (_) { }
    }


    const pendingRoots = new Set();
    let flushTimer = null;

    function flush() {
        flushTimer = null;
        if (!pendingRoots.size) return;

        const roots = Array.from(pendingRoots).filter(node => node.isConnected);
        pendingRoots.clear();

        const topRoots = roots.filter(node => !roots.some(other => other !== node && other.contains(node)));
        const targets = new Set();

        topRoots.forEach(root => {
            if (root.matches(SCAN_SELECTOR)) targets.add(root);
            root.querySelectorAll(SCAN_SELECTOR).forEach(el => targets.add(el));
        });

        targets.forEach(processNode);
    }

    const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
            const added = mutations[i].addedNodes;
            for (let j = 0; j < added.length; j++) {
                const node = added[j];
                if (node.nodeType === 1 && !node.classList.contains(INJECTED_CLASS)) {
                    pendingRoots.add(node);
                }
            }
        }
        if (pendingRoots.size && !flushTimer) {
            flushTimer = setTimeout(() => requestAnimationFrame(flush), 150);
        }
    });

    function startObserving() {
        if (!document.body) {
            requestAnimationFrame(startObserving);
            return;
        }
        observer.observe(document.body, { childList: true, subtree: true });
        window.__fbLikesRestorer = { observer };

        pendingRoots.add(document.body);
        flush();
    }

    startObserving();
})();