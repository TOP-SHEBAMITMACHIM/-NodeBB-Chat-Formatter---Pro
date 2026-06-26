const DEFAULT_SITES = [
    { name: 'מתמחים',  host: 'mitmachim.top' },
    { name: 'בני ברק', host: 'bnebrak.com'    },
    { name: 'אוצריא',  host: 'otzaria.org'    }
];

let currentHost = null;
let allSites = [];      // DEFAULT_SITES + custom
let enabledMap = {};    // host -> true/false

function getCurrentHost(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        try {
            const url = new URL(tabs[0].url);
            callback(url.hostname.replace(/^www\./, ''), tabs[0].id);
        } catch {
            callback(null, null);
        }
    });
}

function injectIfNeeded(tabId, host) {
    if (enabledMap[host] === false) return;
    chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
    }).catch(() => {}); // שגיאה שקטה אם הדף לא נתמך
}

function saveSites() {
    const customHosts = allSites
        .filter(s => !DEFAULT_SITES.find(d => d.host === s.host))
        .map(s => s.host);
    chrome.storage.sync.set({ enabledMap, customHosts });
}

function normalizeHost(input) {
    try {
        // אם הכניסו URL מלא
        const url = new URL(input.includes('://') ? input : 'https://' + input);
        return url.hostname.replace(/^www\./, '');
    } catch {
        return input.trim().replace(/^www\./, '').replace(/\/$/, '');
    }
}

function render() {
    const list = document.getElementById('sites-list');
    list.innerHTML = '';

    allSites.forEach(site => {
        const isEnabled = enabledMap[site.host] !== false;
        const isCurrent = site.host === currentHost;
        const isCustom  = !DEFAULT_SITES.find(d => d.host === site.host);

        const displayName = site.name || site.host;
        const firstLetter = displayName.charAt(0);

        const row = document.createElement('div');
        row.className = 'site-row';
        row.innerHTML = `
            <div class="site-favicon-wrap">
                <img
                    class="site-favicon"
                    src="https://${site.host}/favicon.ico"
                    alt=""
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
                >
                <div class="site-letter" style="display:none">${firstLetter}</div>
            </div>
            <div class="site-info">
                <span class="site-name">
                    ${displayName}
                    ${isCurrent ? '<span class="here-badge">פעיל כאן</span>' : ''}
                </span>
                <span class="site-url">${site.host}</span>
            </div>
            <div class="row-right">
                ${isCustom ? `<button class="remove-btn" data-host="${site.host}" title="הסר">✕</button>` : ''}
                <label class="toggle">
                    <input type="checkbox" data-host="${site.host}" ${isEnabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
            </div>
        `;
        list.appendChild(row);
    });

    // טוגלים
    list.querySelectorAll('input[type=checkbox]').forEach(cb => {
        cb.addEventListener('change', () => {
            enabledMap[cb.dataset.host] = cb.checked;
            saveSites();
        });
    });

    // כפתורי הסרה
    list.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const host = btn.dataset.host;
            allSites = allSites.filter(s => s.host !== host);
            delete enabledMap[host];
            saveSites();
            render();
        });
    });
}

// הוספת אתר חדש
document.getElementById('add-btn').addEventListener('click', () => {
    const input = document.getElementById('new-site').value.trim();
    if (!input) return;

    const host = normalizeHost(input);
    if (!host || allSites.find(s => s.host === host)) {
        document.getElementById('new-site').value = '';
        return;
    }

    allSites.push({ host });
    enabledMap[host] = true;
    saveSites();
    document.getElementById('new-site').value = '';
    render();

    // נסה להזריק לטאב הפעיל אם זה אותו אתר
    if (host === currentHost) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            injectIfNeeded(tabs[0].id, host);
        });
    }
});

// Enter בשדה
document.getElementById('new-site').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('add-btn').click();
});

// אתחול
chrome.storage.sync.get(['enabledMap', 'customHosts'], (result) => {
    enabledMap  = result.enabledMap  || {};
    const customHosts = result.customHosts || [];

    allSites = [...DEFAULT_SITES];
    customHosts.forEach(host => {
        if (!allSites.find(s => s.host === host)) {
            allSites.push({ host });
        }
    });

    getCurrentHost((host, tabId) => {
        currentHost = host;
        if (tabId && host) injectIfNeeded(tabId, host);
        render();
    });
});
