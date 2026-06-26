(function () {
    'use strict';

    // הסקריפט מורץ רק כשה-popup מחליט להזריק — אין צורך בבדיקת storage
    const currentHost = location.hostname.replace(/^www\./, '');
    init();

    // ─── הגדרת כפתורים ───────────────────────────────────────────────────────

    const buttonsConfig = [
        { id: 'bold',       icon: 'fa-bold',        prefix: '**',    suffix: '**',    defaultText: 'מודגש',        title: 'מודגש' },
        { id: 'italic',     icon: 'fa-italic',      prefix: '*',     suffix: '*',     defaultText: 'נטוי',         title: 'נטוי' },
        { id: 'code_block', icon: 'fa-code',        prefix: '```\n', suffix: '\n```', defaultText: 'הכנס קוד כאן', title: 'בלוק קוד' },
        { id: 'link',       icon: 'fa-link',        prefix: '[',     suffix: ']',     defaultText: 'טקסט קישור',   title: 'קישור',  isLink: true },
        { id: 'image',      icon: 'fa-image',       prefix: '![',    suffix: ']',     defaultText: 'תיאור תמונה',  title: 'תמונה',  isLink: true },
        { id: 'list',       icon: 'fa-list',        prefix: '• ',    suffix: '',      defaultText: 'פריט רשימה',   title: 'רשימה',  isList: true },
        { id: 'quote',      icon: 'fa-quote-left',  prefix: '> ',    suffix: '',      defaultText: 'ציטוט',        title: 'ציטוט',  isQuote: true },
        { id: 'center',     icon: 'fa-align-center',prefix: '|-',    suffix: '-|',    defaultText: 'מרכוז',        title: 'מרכוז' },
        { id: 'spoiler',    icon: 'fa-eye-slash',   prefix: '||',    suffix: '||',    defaultText: 'ספויילר',      title: 'ספוילר' }
    ];

    const URL_PLACEHOLDER = 'כתובת_כאן';

    // ─── הכנסת פורמט ─────────────────────────────────────────────────────────

    function insertFormatting(input, config) {
        const start = input.selectionStart;
        const end   = input.selectionEnd;
        const selectedText = input.value.substring(start, end);

        let innerText     = selectedText || config.defaultText;
        let formattedText = '';
        let selectStart   = null;
        let selectEnd     = null;

        if (config.isLink) {
            formattedText = config.prefix + innerText + '](' + URL_PLACEHOLDER + ')';
            const urlOffset = config.prefix.length + innerText.length + 2;
            selectStart = start + urlOffset;
            selectEnd   = selectStart + URL_PLACEHOLDER.length;

        } else if (config.isList) {
            if (selectedText) {
                formattedText = selectedText.split('\n').map(l => '• ' + l).join('\n');
            } else {
                formattedText = '• ' + innerText;
                selectStart = start + 2;
                selectEnd   = selectStart + innerText.length;
            }

        } else if (config.isQuote) {
            if (selectedText) {
                formattedText = selectedText.split('\n').map(l => '> ' + l).join('\n');
            } else {
                formattedText = '> ' + innerText;
                selectStart = start + 2;
                selectEnd   = selectStart + innerText.length;
            }

        } else {
            formattedText = config.prefix + innerText + config.suffix;
            if (!selectedText) {
                selectStart = start + config.prefix.length;
                selectEnd   = selectStart + innerText.length;
            }
        }

        input.setRangeText(formattedText, start, end, 'end');
        if (selectStart !== null) input.setSelectionRange(selectStart, selectEnd);
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // ─── Floating quote button ────────────────────────────────────────────────

    function addQuoteButtonToSelection() {
        const selection    = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText || selectedText.length < 3) {
            document.getElementById('floating-quote-btn')?.remove();
            return;
        }

        const chatTextarea = document.querySelector('textarea[component="chat/input"]');
        if (!chatTextarea) {
            document.getElementById('floating-quote-btn')?.remove();
            return;
        }

        const range = selection.getRangeAt(0);
        if (range.commonAncestorContainer.parentElement.closest('textarea, .chat-input')) {
            document.getElementById('floating-quote-btn')?.remove();
            return;
        }

        let quoteBtn = document.getElementById('floating-quote-btn');
        if (!quoteBtn) {
            quoteBtn = document.createElement('button');
            quoteBtn.id = 'floating-quote-btn';
            quoteBtn.innerHTML = '<i class="fa fa-quote-left"></i> ציטוט';
            quoteBtn.style.cssText = `
                position:fixed; background:#007bff; color:white; border:none;
                padding:8px 12px; border-radius:4px; cursor:pointer; z-index:10000;
                font-size:12px; box-shadow:0 2px 8px rgba(0,0,0,0.2);
                transition:background 0.2s; font-family:Arial,sans-serif;
            `;
            quoteBtn.addEventListener('mouseover', () => { quoteBtn.style.background = '#0056b3'; });
            quoteBtn.addEventListener('mouseout',  () => { quoteBtn.style.background = '#007bff'; });
            quoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const ta = document.querySelector('textarea[component="chat/input"]');
                if (ta) {
                    const quoted = selectedText.split('\n').map(l => '> ' + l).join('\n');
                    ta.value += (ta.value ? '\n' : '') + quoted;
                    ta.focus();
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
                quoteBtn.remove();
                window.getSelection().removeAllRanges();
            });
            document.body.appendChild(quoteBtn);
        }

        const rect = range.getBoundingClientRect();
        quoteBtn.style.top  = (rect.bottom + 10) + 'px';
        quoteBtn.style.left = (rect.left + rect.width / 2 - 40) + 'px';
    }

    document.addEventListener('mouseup',  addQuoteButtonToSelection);
    document.addEventListener('touchend', addQuoteButtonToSelection);

    // ─── יצירת סרגל ──────────────────────────────────────────────────────────

    function createToolbar(textarea) {
        if (textarea.getAttribute('component') !== 'chat/input') return;
        const parent = textarea.parentNode;
        if (!parent || parent.querySelector('.chat-pro-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'chat-pro-toolbar';
        toolbar.style.cssText = `
            display:flex; gap:4px; padding:3px 4px; background:transparent;
            border-bottom:1px solid #eee; margin-bottom:3px;
            flex-wrap:wrap; direction:rtl;
        `;

        buttonsConfig.forEach(btnInfo => {
            const btn = document.createElement('button');
            btn.type      = 'button';
            btn.title     = btnInfo.title;
            btn.innerHTML = '<i class="fa ' + btnInfo.icon + '"></i>';
            btn.style.cssText = `
                background:white; border:1px solid #ddd; cursor:pointer; color:#444;
                font-size:13px; padding:3px 5px; border-radius:2px;
                transition:all 0.2s; min-width:26px; height:26px;
                display:flex; align-items:center; justify-content:center;
            `;
            btn.addEventListener('mouseover', () => { btn.style.background = '#007bff'; btn.style.color = 'white'; btn.style.borderColor = '#007bff'; });
            btn.addEventListener('mouseout',  () => { btn.style.background = 'white';   btn.style.color = '#444';  btn.style.borderColor = '#ddd'; });
            btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); insertFormatting(textarea, btnInfo); });
            toolbar.appendChild(btn);
        });

        parent.insertBefore(toolbar, textarea);
    }

    // ─── סריקה ───────────────────────────────────────────────────────────────

    function scanForTextareas() {
        document.querySelectorAll('textarea[component="chat/input"]').forEach(ta => {
            if (ta && ta.parentNode) createToolbar(ta);
        });
    }

    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', scanForTextareas);
        } else {
            scanForTextareas();
        }

        setInterval(scanForTextareas, 1000);

        new MutationObserver(scanForTextareas).observe(document.body, {
            childList: true, subtree: true, attributes: false
        });

        console.log('✅ NodeBB Chat Formatter (Extension) - מופעל על', currentHost);
    }

})();
