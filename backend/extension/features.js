// features.js — RespondX Extended Features
// Features: 2 (Follow-up Reminder), 3 (Sentiment Warning), 4 (Language Detection),
//           5 (Meeting Scheduler), 6 (Action Items), 7 (Inbox Badge),
//           12 (Bulk Reply), 14 (Attachment Warning)

console.log('🚀 RespondX Features: Loaded');

const RX = {
  BACKEND_URL: 'http://localhost:8000',
  settings: {},
  userInfo: null,
  userContext: '',

  async init() {
    await this.loadSettings();
    await this.loadUserData();
    FollowupReminder.init();
    SentimentWarning.init();
    AttachmentWarning.init();
    InboxSummarizer.init();
    BulkReply.init();
    console.log('✅ RespondX Features: All features initialized');
  },

  async loadSettings() {
    return new Promise(resolve => {
      const storage = (typeof chrome !== 'undefined' && chrome.storage)
        ? (chrome.storage.sync || chrome.storage.local) : null;
      if (!storage) return resolve();
      storage.get(['rxSettings', 'userInfo', 'userContext'], result => {
        this.settings = result.rxSettings || { followupDays: 3, sentimentWarning: true, inboxBadge: true };
        this.userInfo = result.userInfo || null;
        this.userContext = result.userContext || '';
        resolve();
      });
    });
  },

  async loadUserData() {
    return new Promise(resolve => {
      const storage = (typeof chrome !== 'undefined' && chrome.storage)
        ? (chrome.storage.sync || chrome.storage.local) : null;
      if (!storage) return resolve();
      storage.get(['userInfo', 'userContext'], result => {
        this.userInfo = result.userInfo || null;
        this.userContext = result.userContext || '';
        resolve();
      });
    });
  },

  async apiPost(endpoint, body) {
    const res = await fetch(`${this.BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }
};

// ─── Feature 2: Follow-up Reminder ──────────────────────────────────────────
const FollowupReminder = {
  processed: new Set(),

  init() {
    this.scan();
    const observer = new MutationObserver(() => this.scan());
    observer.observe(document.body, { childList: true, subtree: true });
  },

  scan() {
    const rows = document.querySelectorAll('tr.zA');
    rows.forEach(row => {
      const id = row.getAttribute('id') || row.dataset.legacyThreadId;
      if (!id || this.processed.has(id)) return;
      this.processed.add(id);
      this.processRow(row);
    });
  },

  processRow(row) {
    // Only process unread or non-replied emails
    const isRead = !row.classList.contains('zE');
    const dateEl = row.querySelector('.xW span[title]');
    if (!dateEl) return;

    const dateTitle = dateEl.getAttribute('title') || '';
    const emailDate = this.parseGmailDate(dateTitle);
    if (!emailDate) return;

    const daysDiff = (Date.now() - emailDate.getTime()) / (1000 * 60 * 60 * 24);
    const threshold = RX.settings.followupDays || 3;

    if (daysDiff >= threshold && isRead) {
      this.addBadge(row, Math.floor(daysDiff));
    }
  },

  parseGmailDate(title) {
    // Gmail title attr contains full date string
    try {
      const d = new Date(title);
      return isNaN(d.getTime()) ? null : d;
    } catch { return null; }
  },

  addBadge(row, days) {
    if (row.querySelector('.rx-followup-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'rx-followup-badge';
    badge.title = `No reply in ${days} days — follow-up needed`;
    badge.innerHTML = `⏰`;
    badge.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center;
      background: #fef3c7; border: 1px solid #f59e0b; color: #92400e;
      border-radius: 10px; font-size: 11px; padding: 1px 6px; margin-left: 6px;
      font-weight: 600; cursor: default; white-space: nowrap;
      vertical-align: middle;
    `;
    const subject = row.querySelector('.y6');
    if (subject) subject.appendChild(badge);
  }
};

// ─── Feature 3: Sentiment Warning ────────────────────────────────────────────
const SentimentWarning = {
  checking: false,
  approved: false,

  init() {
    if (!RX.settings.sentimentWarning) return;
    document.addEventListener('click', (e) => this.handleClick(e), true);
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.handleSendShortcut(e);
    }, true);
  },

  handleSendShortcut(e) {
    if (this.approved || this.checking || window.rxSendApproved) return;
    const composeBox = document.activeElement?.closest('[role="textbox"]');
    if (!composeBox) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const draft = composeBox.innerText || '';
    this.runCheck(draft, () => {
      this.approved = true;
      composeBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      this.approved = false;
    });
  },

  handleClick(e) {
    if (this.approved || this.checking || window.rxSendApproved) return;
    const sendBtn = e.target.closest('.T-I.J-J5-Ji.aoO.T-I-atl') ||
                    e.target.closest('[data-tooltip*="Send"]');
    if (!sendBtn) return;
    const draft = this.getDraftText();
    if (!draft || draft.split(' ').length < 8) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    this.runCheck(draft, () => {
      this.approved = true;
      sendBtn.click();
      this.approved = false;
    });
  },

  getDraftText() {
    const box = document.querySelector('.Am.Al.editable[contenteditable="true"]') ||
                document.querySelector('[role="textbox"][aria-label*="Message"]');
    return box ? box.innerText.trim() : '';
  },

  async runCheck(draft, onApprove) {
    this.checking = true;
    try {
      const result = await RX.apiPost('/check-draft-sentiment', { draft });
      if (result.needs_warning) {
        this.showWarning(result, onApprove);
      } else {
        onApprove();
      }
    } catch {
      onApprove(); // on error, let it send
    } finally {
      this.checking = false;
    }
  },

  showWarning(result, onApprove) {
    const existing = document.getElementById('rx-sentiment-warning');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'rx-sentiment-warning';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: 'Google Sans', Roboto, Arial, sans-serif;
    `;

    const sentimentColor = { aggressive: '#dc2626', negative: '#ea580c' }[result.sentiment] || '#d97706';

    overlay.innerHTML = `
      <div style="background: white; border-radius: 16px; padding: 28px; max-width: 440px;
                  width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 50%; background: #fef3c7;
                      display: flex; align-items: center; justify-content: center; font-size: 22px;">⚠️</div>
          <div>
            <div style="font-size: 16px; font-weight: 600; color: #111;">Tone Check</div>
            <div style="font-size: 12px; color: ${sentimentColor}; font-weight: 500; text-transform: capitalize;">
              ${result.sentiment} tone detected
            </div>
          </div>
        </div>
        ${result.reason ? `<p style="color: #374151; font-size: 14px; margin: 0 0 12px;">${result.reason}</p>` : ''}
        ${result.suggestion ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
                      padding: 12px; font-size: 13px; color: #166534; margin-bottom: 20px;">
            💡 ${result.suggestion}
          </div>` : '<div style="margin-bottom: 20px;"></div>'}
        <div style="display: flex; gap: 10px;">
          <button id="rx-revise-btn" style="flex:1; padding: 10px; border: 2px solid #e5e7eb;
              background: white; border-radius: 8px; cursor: pointer; font-size: 14px;
              font-weight: 600; color: #374151;">✏️ Let me revise</button>
          <button id="rx-send-anyway-btn" style="flex:1; padding: 10px; border: none;
              background: #dc2626; border-radius: 8px; cursor: pointer; font-size: 14px;
              font-weight: 600; color: white;">Send anyway</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.getElementById('rx-revise-btn').onclick = () => overlay.remove();
    document.getElementById('rx-send-anyway-btn').onclick = () => {
      overlay.remove();
      // Set global flag so AttachmentWarning also skips this click
      window.rxSendApproved = true;
      onApprove();
      setTimeout(() => { window.rxSendApproved = false; }, 3000);
    };
  }
};

// ─── Feature 14: Attachment Warning ──────────────────────────────────────────
const AttachmentWarning = {
  KEYWORDS: ['attached', 'find attached', 'i have attached', 'see attached',
             'please find', 'enclosed', 'attaching', 'in the attachment'],

  init() {
    document.addEventListener('click', (e) => this.handleClick(e), true);
  },

  handleClick(e) {
    if (window.rxSendApproved) return;
    const sendBtn = e.target.closest('.T-I.J-J5-Ji.aoO.T-I-atl') ||
                    e.target.closest('[data-tooltip*="Send"]');
    if (!sendBtn) return;

    const draft = this.getDraftText();
    if (!this.mentionsAttachment(draft)) return;
    if (this.hasAttachment()) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    this.showWarning(sendBtn);
  },

  getDraftText() {
    const box = document.querySelector('.Am.Al.editable') ||
                document.querySelector('[role="textbox"][aria-label*="Message"]');
    return (box ? box.innerText : '').toLowerCase();
  },

  hasAttachment() {
    return !!document.querySelector('.aZo') ||
           !!document.querySelector('[data-tooltip*="attachment"]') ||
           !!document.querySelector('.afn');
  },

  mentionsAttachment(text) {
    return this.KEYWORDS.some(kw => text.includes(kw));
  },

  openFilePicker(overlay) {
    // Close the warning first
    overlay.remove();
    // Find Gmail's native "Attach files" button and click it
    const attachSelectors = [
      '[data-tooltip="Attach files"]',
      '[aria-label="Attach files"]',
      'div[command="Files"]',
      '.a1.aaA.aMZ',
      '[data-tooltip*="Attach"]',
    ];
    for (const sel of attachSelectors) {
      const btn = document.querySelector(sel);
      if (btn) { btn.click(); return; }
    }
    // Fallback: create a hidden file input and trigger it
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    input.remove();
  },

  showWarning(sendBtn) {
    const existing = document.getElementById('rx-attach-warning');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'rx-attach-warning';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: 'Google Sans', Roboto, Arial, sans-serif;
    `;
    overlay.innerHTML = `
      <div style="background: white; border-radius: 16px; padding: 28px;
                  max-width: 400px; width: 90vw; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div style="font-size: 32px;">📎</div>
          <div>
            <div style="font-size: 16px; font-weight: 600; color: #111;">Attachment Missing?</div>
            <div style="font-size: 13px; color: #6b7280;">You mentioned an attachment but none is attached.</div>
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button id="rx-add-attach-btn" style="flex:1; padding: 10px; border: 2px solid #4285f4;
              background: white; border-radius: 8px; cursor: pointer; font-size: 14px;
              font-weight: 600; color: #4285f4;">📎 Add Attachment</button>
          <button id="rx-send-no-attach-btn" style="flex:1; padding: 10px; border: none;
              background: #6b7280; border-radius: 8px; cursor: pointer; font-size: 14px;
              font-weight: 600; color: white;">Send Anyway</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    document.getElementById('rx-add-attach-btn').onclick = () => this.openFilePicker(overlay);

    document.getElementById('rx-send-no-attach-btn').onclick = () => {
      overlay.remove();
      // Set global flag so BOTH AttachmentWarning and SentimentWarning skip this click
      window.rxSendApproved = true;
      sendBtn.click();
      setTimeout(() => { window.rxSendApproved = false; }, 3000);
    };
  }
};

// ─── Feature 7: Inbox Summarizer Badge ───────────────────────────────────────
const InboxSummarizer = {
  hoverTimers: new Map(),
  summaryCache: new Map(),

  init() {
    if (!RX.settings.inboxBadge) return;
    this.injectStyles();
    document.addEventListener('mouseover', (e) => this.handleHover(e));
    document.addEventListener('mouseout', (e) => this.handleMouseOut(e));
  },

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .rx-summary-tooltip {
        position: absolute; z-index: 9999;
        background: #1f2937; color: white;
        border-radius: 8px; padding: 8px 12px;
        font-size: 12px; max-width: 320px;
        line-height: 1.5; pointer-events: none;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        animation: rxFadeIn 0.2s ease;
      }
      @keyframes rxFadeIn { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: translateY(0); } }
    `;
    document.head.appendChild(style);
  },

  handleHover(e) {
    const row = e.target.closest('tr.zA');
    if (!row) return;
    const id = row.id || row.dataset.legacyThreadId;
    if (!id) return;

    const timer = setTimeout(async () => {
      const summary = await this.getSummary(row, id);
      if (summary) this.showTooltip(row, summary);
    }, 1200);
    this.hoverTimers.set(id, timer);
  },

  handleMouseOut(e) {
    const row = e.target.closest('tr.zA');
    if (!row) return;
    const id = row.id || row.dataset.legacyThreadId;
    if (id && this.hoverTimers.has(id)) {
      clearTimeout(this.hoverTimers.get(id));
      this.hoverTimers.delete(id);
    }
    document.querySelectorAll('.rx-summary-tooltip').forEach(t => t.remove());
  },

  async getSummary(row, id) {
    if (this.summaryCache.has(id)) return this.summaryCache.get(id);
    const snippet = row.querySelector('.y2')?.innerText || '';
    const subject = row.querySelector('.y6 span:not(.T3)')?.innerText || '';
    if (!snippet && !subject) return null;

    try {
      const res = await RX.apiPost('/analyze-email', {
        text: `Subject: ${subject}\n\n${snippet}`
      });
      const summary = res.result?.quick_summary || null;
      if (summary) this.summaryCache.set(id, summary);
      return summary;
    } catch { return null; }
  },

  showTooltip(row, summary) {
    document.querySelectorAll('.rx-summary-tooltip').forEach(t => t.remove());
    const tooltip = document.createElement('div');
    tooltip.className = 'rx-summary-tooltip';
    tooltip.textContent = `💡 ${summary}`;
    const rect = row.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY + 4}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(tooltip);
  }
};

// ─── Feature 12: Bulk Reply ───────────────────────────────────────────────────
const BulkReply = {
  bar: null,

  init() {
    this.injectBar();
    const observer = new MutationObserver(() => this.updateBar());
    observer.observe(document.body, { childList: true, subtree: true });
  },

  injectBar() {
    this.bar = document.createElement('div');
    this.bar.id = 'rx-bulk-bar';
    this.bar.style.cssText = `
      display: none; position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: #1e3a8a; color: white; border-radius: 40px;
      padding: 12px 24px; z-index: 99990;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 14px; font-weight: 500;
      align-items: center; gap: 16px;
    `;
    this.bar.innerHTML = `
      <span id="rx-bulk-count">0 emails selected</span>
      <button id="rx-bulk-btn" style="
        background: #4285f4; border: none; color: white; border-radius: 20px;
        padding: 8px 20px; cursor: pointer; font-size: 13px; font-weight: 600;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      ">⚡ Generate AI Replies</button>
      <button id="rx-bulk-close" style="
        background: transparent; border: none; color: rgba(255,255,255,0.7);
        cursor: pointer; font-size: 18px; line-height: 1; padding: 0;
      ">✕</button>
    `;
    document.body.appendChild(this.bar);
    document.getElementById('rx-bulk-btn').onclick = () => this.runBulkReply();
    document.getElementById('rx-bulk-close').onclick = () => { this.bar.style.display = 'none'; };
  },

  updateBar() {
    const checked = document.querySelectorAll('tr.zA .oZ-jd[aria-checked="true"]');
    if (checked.length >= 2) {
      this.bar.style.display = 'flex';
      document.getElementById('rx-bulk-count').textContent = `${checked.length} emails selected`;
    } else {
      this.bar.style.display = 'none';
    }
  },

  async runBulkReply() {
    const rows = Array.from(document.querySelectorAll('tr.zA'))
      .filter(r => r.querySelector('.oZ-jd[aria-checked="true"]'));
    if (!rows.length) return;

    const btn = document.getElementById('rx-bulk-btn');
    btn.textContent = 'Generating...';
    btn.disabled = true;

    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const subject = row.querySelector('.y6 span')?.innerText || '';
      const snippet = row.querySelector('.y2')?.innerText || '';
      btn.textContent = `Processing ${i + 1}/${rows.length}...`;
      try {
        const res = await RX.apiPost('/generate', {
          prompt: `Subject: ${subject}\n\n${snippet}`,
          useCustomPrompt: false,
          userPreferences: RX.userInfo ? { hasPreferences: true, ...RX.userInfo } : null
        });
        results.push({ subject, reply: res.reply });
      } catch {
        results.push({ subject, reply: 'Failed to generate reply.' });
      }
    }

    btn.textContent = '⚡ Generate AI Replies';
    btn.disabled = false;
    this.showBulkResults(results);
  },

  showBulkResults(results) {
    const existing = document.getElementById('rx-bulk-results');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'rx-bulk-results';
    panel.style.cssText = `
      position: fixed; right: 24px; bottom: 80px; width: 480px; max-height: 70vh;
      background: white; border-radius: 16px; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25); z-index: 99991;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    `;
    panel.innerHTML = `
      <div style="padding: 20px 24px; border-bottom: 1px solid #e5e7eb;
                  display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 16px; font-weight: 600; color: #111;">
          ⚡ Bulk Replies (${results.length})
        </div>
        <button onclick="this.closest('#rx-bulk-results').remove()"
          style="background: none; border: none; cursor: pointer; font-size: 20px; color: #9ca3af;">✕</button>
      </div>
      <div style="padding: 16px 24px;">
        ${results.map((r, i) => `
          <div style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
            <div style="background: #f9fafb; padding: 10px 14px; font-size: 13px;
                        font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">
              📧 ${r.subject || 'Email ' + (i + 1)}
            </div>
            <textarea id="rx-bulk-reply-${i}" style="
              width: 100%; padding: 12px 14px; border: none; resize: vertical;
              font-size: 13px; color: #374151; min-height: 100px;
              font-family: 'Google Sans', Roboto, Arial, sans-serif; box-sizing: border-box;
            ">${r.reply}</textarea>
            <div style="padding: 8px 14px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
              <button onclick="navigator.clipboard.writeText(document.getElementById('rx-bulk-reply-${i}').value)"
                style="background: #4285f4; border: none; color: white; border-radius: 6px;
                       padding: 6px 14px; cursor: pointer; font-size: 12px; font-weight: 600;">
                📋 Copy
              </button>
            </div>
          </div>`).join('')}
      </div>`;
    document.body.appendChild(panel);
  }
};
// ─── Boot ─────────────────────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => RX.init());
} else {
  RX.init();
}
