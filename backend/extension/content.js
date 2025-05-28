console.log("✅ Gmail Auto LLM Reply: Content script loaded");

const BUTTON_ID = "auto-reply-button";
const MODAL_ID = "auto-reply-modal";
const BACKEND_URL = "https://gmail-llm-based-auto-reply.vercel.app";
const FALLBACK_URL = "https://gmail-llm-based-auto-reply.onrender.com";
let checkInterval = null;
let currentUrl = window.location.href;
let userPreferences = null;

// Cache for API responses to avoid unnecessary calls
const responseCache = new Map();

// Helper function to generate cache key for current email thread
function generateCacheKey() {
  const emailSubject = document.querySelector('[data-thread-id]')?.getAttribute('data-thread-id') || 
                      document.querySelector('h2[data-legacy-thread-id]')?.getAttribute('data-legacy-thread-id') ||
                      document.querySelector('span[email]')?.getAttribute('email') ||
                      window.location.hash;
  
  // Fallback to URL hash if no thread ID found
  return emailSubject || window.location.hash || 'default';
}

// Helper function to get available storage (sync preferred, fallback to local)
const getStorage = () => {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.sync || chrome.storage.local;
  }
  return null;
};

// Function to load user preferences from Chrome storage
async function loadUserPreferences() {
  return new Promise((resolve) => {
    const storage = getStorage();
    if (!storage) {
      console.warn('Chrome storage not available, using default preferences');
      userPreferences = null;
      resolve(null);
      return;
    }
    
    storage.get(['userEmail', 'userInfo'], function(result) {
      if (chrome.runtime.lastError) {
        console.error('Error loading user preferences:', chrome.runtime.lastError);
        userPreferences = null;
        resolve(null);
        return;
      }
      
      console.log('📱 Loaded user preferences:', result);
      
      // Construct user preferences object
      if (result.userInfo || result.userEmail) {
        userPreferences = {
          email: result.userInfo?.email || result.userEmail || null,
          full_name: result.userInfo?.full_name || null,
          linkedin: result.userInfo?.linkedin || null,
          mobile: result.userInfo?.mobile || null
        };
        
        console.log('✅ User preferences loaded successfully:', userPreferences);
      } else {
        console.log('ℹ️ No user preferences found in storage');
        userPreferences = null;
      }
      
      resolve(userPreferences);
    });
  });
}



// Function to get user signature information
function getUserSignatureInfo() {
  if (!hasUserPreferences()) {
    return null;
  }
  
  const signatureInfo = {
    hasPreferences: true,
    email: userPreferences.email,
    full_name: userPreferences.full_name,
    linkedin: userPreferences.linkedin,
    mobile: userPreferences.mobile
  };
  
  console.log('📝 User signature info:', signatureInfo);
  return signatureInfo;
}

// Function to check if user has saved preferences
// Function to check if user has saved preferences
function hasUserPreferences() {
  return userPreferences !== null && (
    (userPreferences.email && userPreferences.email.trim() !== '') || 
    (userPreferences.full_name && userPreferences.full_name.trim() !== '') || 
    (userPreferences.linkedin && userPreferences.linkedin.trim() !== '') || 
    (userPreferences.mobile && userPreferences.mobile.trim() !== '')
  );
}

// Function to update user preferences status display in the modal
// Replace the existing updateUserPreferencesStatus function with this:
function updateUserPreferencesStatus() {
  const statusContainer = document.getElementById("user-preferences-status");
  const iconContainer = document.getElementById("preferences-icon");
  const titleElement = document.getElementById("preferences-title");
  const subtitleElement = document.getElementById("preferences-subtitle");
  const setupButton = document.getElementById("setup-preferences-btn");
  const settingsButton = document.getElementById("settings-toggle-btn");

  if (!statusContainer || !settingsButton) return;

  // Remove any existing badge to ensure clean state
  const existingBadge = settingsButton.querySelector(".exclamation-badge");
  if (existingBadge) {
    existingBadge.remove();
  }

  if (hasUserPreferences()) {
    // User has preferences - show success state
    statusContainer.style.background = "#e8f5e8";
    statusContainer.style.borderColor = "#c8e6c9";

    iconContainer.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853">
        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
      </svg>
    `;
    iconContainer.style.background = "#c8e6c9";

    titleElement.textContent = "✅ Preferences Configured";
    titleElement.style.color = "#137333";

    // Show which preferences are set
    const prefDetails = [];
    if (userPreferences.full_name && userPreferences.full_name.trim()) prefDetails.push("Name");
    if (userPreferences.email && userPreferences.email.trim()) prefDetails.push("Email");
    if (userPreferences.linkedin && userPreferences.linkedin.trim()) prefDetails.push("LinkedIn");
    if (userPreferences.mobile && userPreferences.mobile.trim()) prefDetails.push("Phone");

    subtitleElement.innerHTML = `Your signature includes: <strong>${prefDetails.join(", ")}</strong>. AI will personalize replies accordingly.`;

    setupButton.style.display = "none";
    
    // IMPORTANT: Remove the badge when preferences are set
    const badge = settingsButton.querySelector(".exclamation-badge");
    if (badge) {
      badge.remove();
    }
  } else {
    // User has no preferences - show setup prompt
    statusContainer.style.background = "#fff3e0";
    statusContainer.style.borderColor = "#ffcc80";

    iconContainer.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#f57c00">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    `;
    iconContainer.style.background = "#ffcc80";

    titleElement.textContent = "🔧 Setup Personal Signature";
    titleElement.style.color = "#e65100";

    subtitleElement.innerHTML = "Configure your name, email, and contact info for <strong>personalized AI replies</strong> with proper signatures.";

    setupButton.style.display = "inline-block";
    setupButton.textContent = "Setup Now";

    // Only add badge if preferences are not set
    if (!settingsButton.querySelector(".exclamation-badge")) {
      const badge = document.createElement("div");
      badge.className = "exclamation-badge";
      badge.style.cssText = `
        position: absolute;
        top: 0px;
        right: 0px;
        width: 12px;
        height: 12px;
        background: #ea4335;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        font-weight: bold;
        z-index: 2;
      `;
      badge.textContent = "!";
      settingsButton.appendChild(badge);
    }
  }
}

// Helper function to clear cache when navigating away from email
function clearCacheOnNavigation() {
  // Clear cache when URL changes (user opens different email)
  let currentUrl = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      responseCache.clear();
      currentUrl = window.location.href;
    }
  });
  
  observer.observe(document, { childList: true, subtree: true });
  
  // Also clear on page refresh
  window.addEventListener('beforeunload', () => {
    responseCache.clear();
  });
}

// Initialize cache clearing
clearCacheOnNavigation();

// Function to create the modal for auto-reply
// Function to create the modal for auto-reply
function createModal() {
  if (document.getElementById(MODAL_ID)) {
    return {
      modal: document.getElementById(MODAL_ID),
      backdrop: document.getElementById("modal-backdrop")
    };
  }
  
  const backdrop = document.createElement("div");
  backdrop.id = "modal-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
    z-index: 9999;
    display: none;
    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-radius: 24px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
    width: 720px;
    max-width: 92vw;
    max-height: 90vh;
    overflow: hidden;
    z-index: 10000;
    display: none;
    animation: modalPopIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    border: 1px solid rgba(255, 255, 255, 0.3);
  `;
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%);
      padding: 28px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 16px;
        z-index: 2;
      ">
        <div style="
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
        <div>
          <h2 style="
            margin: 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            color: white;
            font-size: 26px;
            font-weight: 500;
            letter-spacing: 0.5px;
          ">AI Email Assistant</h2>
          <p style="
            margin: 4px 0 0 0;
            font-family: Roboto, Arial, sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
          ">Crafted by 
            <a href="https://www.linkedin.com/in/pramodsbaviskar/" 
               target="_blank" 
               rel="noopener noreferrer"
               id="developer-link"
               style="
                 color: white;
                 text-decoration: none;
                 font-weight: 500;
                 border-bottom: 1px solid rgba(255, 255, 255, 0.4);
                 transition: border-color 0.3s ease;
               ">Pramod Baviskar</a>
          </p>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; gap: 12px; z-index: 2;">
        <div style="position: relative;">
          <button id="settings-toggle-btn" style="
            background: rgba(255, 255, 255, 0.2);
            border: none;
            padding: 10px;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </button>
        </div>
        
        <button id="summary-toggle-btn" style="
          background: rgba(255, 255, 255, 0.2);
          border: none;
          padding: 10px 16px;
          border-radius: 12px;
          color: white;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          Email Summary
        </button>
        
        <button id="close-modal" style="
          background: rgba(255, 255, 255, 0.15);
          border: none;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          cursor: pointer;
          color: white;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div style="
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.2), transparent 50%);
        pointer-events: none;
      "></div>
    </div>
    
    <div style="
      padding: 32px;
      max-height: calc(90vh - 200px);
      overflow-y: auto;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95), rgba(245, 245, 245, 0.95));
    " id="modal-scroll-container">
      
      <div id="settings-panel" style="
        position: absolute;
        top: 88px;
        right: 32px;
        width: 340px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        display: none;
        z-index: 10001;
        overflow: hidden;
      ">
        <div style="
          padding: 16px 20px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          background: rgba(248, 250, 252, 0.95);
        ">
          <h3 style="
            margin: 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 18px;
            font-weight: 500;
            color: #1f2937;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
            Settings
          </h3>
        </div>
        
        <div style="padding: 20px;">
          <div id="user-preferences-status" style="
            margin-bottom: 16px;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          ">
            <div id="preferences-icon" style="
              width: 32px;
              height: 32px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            "></div>
            <div style="flex: 1; min-width: 0;">
              <div id="preferences-title" style="
                font-family: 'Google Sans', Roboto, Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                margin-bottom: 4px;
                color: #1f2937;
              "></div>
              <div id="preferences-subtitle" style="
                font-size: 12px;
                color: #4b5563;
                line-height: 1.4;
              "></div>
            </div>
          </div>
          
          <button id="setup-preferences-btn" style="
            width: 100%;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          ">Setup Personal Signature</button>
        </div>
      </div>

      <div id="custom-prompt-toggle" style="
        margin-bottom: 20px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
        ">
          <div style="flex: 1;">
            <h3 style="
              margin: 0 0 4px 0;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 16px;
              font-weight: 500;
              color: #1f2937;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
              Custom Reply Mode
            </h3>
            <p style="
              margin: 0;
              font-size: 13px;
              color: #4b5563;
              line-height: 1.4;
            ">Tailor AI responses with custom instructions</p>
          </div>
          
          <label class="toggle-switch" style="
            position: relative;
            display: inline-block;
            width: 48px;
            height: 28px;
            margin-left: 16px;
            flex-shrink: 0;
          ">
            <input type="checkbox" id="custom-mode-switch" style="
              opacity: 0;
              width: 0;
              height: 0;
            ">
            <span class="slider round" style="
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #d1d5db;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              border-radius: 28px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            "></span>
          </label>
        </div>
        
        <div id="custom-prompt-section" style="display: none; margin-top: 16px;">
          <textarea id="custom-prompt-input" placeholder="E.g., 'Write a polite rejection for this interview invitation mentioning schedule conflicts'" style="
            width: 100%;
            min-height: 100px;
            padding: 12px;
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 12px;
            font-family: Roboto, sans-serif;
            font-size: 14px;
            resize: vertical;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-sizing: border-box;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          "></textarea>
          
          <div style="
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
            margin: 12px 0;
          ">
            <button class="preset-btn" data-prompt="Write a polite rejection for this interview invitation due to other commitments" style="
              padding: 6px 12px;
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 16px;
              color: #3b82f6;
              font-size: 12px;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            ">Reject Interview</button>
            
            <button class="preset-btn" data-prompt="Cancel this meeting professionally, apologizing for the inconvenience" style="
              padding: 6px 12px;
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 16px;
              color: #3b82f6;
              font-size: 12px;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            ">Cancel Meeting</button>
            
            <button class="preset-btn" data-prompt="Postpone this appointment to next week, suggesting alternative times" style="
              padding: 6px 12px;
              background: rgba(59, 130, 246, 0.1);
              border: 1px solid rgba(59, 130, 246, 0.3);
              border-radius: 16px;
              color: #3b82f6;
              font-size: 12px;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            ">Reschedule</button>
          </div>
          
          <button id="generate-custom-reply" style="
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Generate Reply
          </button>
        </div>
      </div>
      
      <div id="reply-content" style="
        min-height: 280px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 16px;
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #1f2937;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        position: relative;
        overflow: hidden;
      ">
        <div class="loading-state" style="
          text-align: center;
          padding: 48px 0;
        ">
          <div style="
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            position: relative;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border: 4px solid rgba(0, 0, 0, 0.05);
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border: 4px solid transparent;
              border-top: 4px solid #3b82f6;
              border-radius: 50%;
              animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            "></div>
          </div>
          <h3 style="
            margin: 0 0 8px 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 20px;
            font-weight: 500;
            color: #1f2937;
          ">Crafting your reply...</h3>
          <p style="
            margin: 0;
            color: #4b5563;
            font-size: 14px;
          ">AI is analyzing the email and generating a professional reply...</p>
        </div>
      </div>
      
      <div style="
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        padding-top: 12px;
        margin-bottom: 24px;
      ">
        <button id="copy-reply" style="
          padding: 12px 24px;
          border: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.95);
          color: #3b82f6;
          border-radius: 12px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
          Copy to Clipboard
        </button>
        <button id="insert-reply" style="
          padding: 12px 32px;
          border: none;
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border-radius: 12px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
          Insert into Reply
        </button>
        <button id="direct-reply" style="
          padding: 12px 32px;
          border: none;
          background: linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%);
          color: white;
          border-radius: 12px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
          Direct Reply
        </button>
      </div>
      
      <div id="thread-summary-section" style="
        display: none;
        margin-top: 12px;
        padding: 24px;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      ">
        <div style="
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
          </svg>
          <h4 style="
            margin: 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 16px;
            font-weight: 500;
            color: #1f2937;
          ">Email Thread Summary</h4>
        </div>
        
        <div id="summary-content" style="
          font-family: Roboto, Arial, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #1f2937;
          max-height: 320px;
          overflow-y: auto;
        "></div>
      </div>
      
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes modalPopIn {
          from {
            transform: translate(-50%, -50%) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes ripple {
          0% { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(4); opacity: 0; }
        }
        
        #close-modal:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        #copy-reply:hover {
          background: rgba(255, 255, 255, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }
        
        #insert-reply:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }
        
        #direct-reply:hover {
          background: linear-gradient(135deg, #1b5e20 0%, #14532d 100%);
          box-shadow: 0 4px 16px rgba(46, 125, 50, 0.3);
          transform: translateY(-2px);
        }
        
        #reply-content:not(.loading) .loading-state {
          display: none;
        }
        
        #setup-preferences-btn:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
          // Add these enhanced styles in the style section of createModal
#summary-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.25) !important;
  border-color: rgba(255, 255, 255, 0.5) !important;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

#summary-toggle-btn.active {
  background: rgba(255, 255, 255, 0.9) !important;
  color: #1a73e8 !important;
  border-color: rgba(255, 255, 255, 1) !important;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-1px);
}

#summary-toggle-btn.active svg {
  fill: #1a73e8 !important;
}
        
        .toggle-switch .slider:before {
          position: absolute;
          content: "";
          height: 22px;
          width: 22px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch input:checked + .slider {
          background-color: #2e7d32;
        }

        .toggle-switch input:focus + .slider {
          box-shadow: 0 0 4px rgba(46, 125, 50, 0.5);
        }

        .toggle-switch input:checked + .slider:before {
          transform: translateX(20px);
        }

        .toggle-switch .slider:hover {
          opacity: 0.9;
        }

        .toggle-switch input:checked + .slider:hover {
          background-color: #2a6b2f;
        }

        #summary-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        #summary-toggle-btn.active {
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.25);
          transform: translateY(-2px);
        }
        
        #settings-toggle-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.15);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .preset-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.5);
        }
        
        #generate-custom-reply:hover {
          background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
          box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
          transform: translateY(-2px);
        }
        
        #custom-prompt-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.3);
        }
        
        #developer-link:hover {
          border-bottom-color: rgba(255, 255, 255, 1);
        }

        button {
          position: relative;
          overflow: hidden;
        }

        button::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        button:hover::after {
          width: 200px;
          height: 200px;
          opacity: 0;
        }
      </style>
    `;
    
    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    
    const settingsToggleBtn = document.getElementById("settings-toggle-btn");
    const settingsPanel = document.getElementById("settings-panel");
    let settingsOpen = false;
  
    if (settingsToggleBtn) {
      settingsToggleBtn.addEventListener("click", () => {
        settingsOpen = !settingsOpen;
        const badge = settingsToggleBtn.querySelector(".exclamation-badge");
        if (settingsOpen) {
          settingsPanel.style.display = "block";
          settingsToggleBtn.style.background = "rgba(255, 255, 255, 0.4)";
          settingsToggleBtn.style.transform = "rotate(45deg)";
          if (badge) badge.style.transform = "rotate(-45deg)";
        } else {
          settingsPanel.style.display = "none";
          settingsToggleBtn.style.background = "rgba(255, 255, 255, 0.2)";
          settingsToggleBtn.style.transform = "rotate(0deg)";
          if (badge) badge.style.transform = "rotate(0deg)";
        }
      });
    }
    
    document.addEventListener("click", (e) => {
      if (!settingsPanel.contains(e.target) && !settingsToggleBtn.contains(e.target)) {
        settingsOpen = false;
        settingsPanel.style.display = "none";
        settingsToggleBtn.style.background = "rgba(255, 255, 255, 0.2)";
        settingsToggleBtn.style.transform = "rotate(0deg)";
      }
    });
    
    const toggleSwitch = document.getElementById("custom-mode-switch");
    const customPromptSection = document.getElementById("custom-prompt-section");
    const customPromptInput = document.getElementById("custom-prompt-input");
    const replyContent = document.getElementById("reply-content");
    
   // Replace the existing toggle switch event listener with this:
toggleSwitch.addEventListener("change", (e) => {
  const replyContent = document.getElementById("reply-content");
  const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
  const customPrompt = customPromptInput.value.trim();
  const autoCacheKey = `autoreply_${generateCacheKey()}`;
  const customCacheKey = `customreply_${generateCacheKey()}_${customPrompt}`;
  
  // Get receiver email
  const receiverEmail = extractReceiverEmail();
  console.log("📧 Receiver email in toggle:", receiverEmail);

  if (e.target.checked) {
    // Enable custom mode
    customPromptSection.style.display = "block";
    
    // Show the reply content area
    replyContent.style.display = "block";
    
    // Check if we have a cached custom reply with the current prompt
    if (customPrompt && responseCache.has(customCacheKey)) {
      console.log("📄 Showing cached custom reply");
      showCachedReply(responseCache.get(customCacheKey));
    } else if (responseCache.has(autoCacheKey)) {
      // Show the auto-reply if no custom reply is cached
      console.log("📄 No custom reply cached, showing auto-reply");
      showCachedReply(responseCache.get(autoCacheKey));
    } else {
      // Clear the reply content and show a message
      replyContent.innerHTML = `
        <div style="
          text-align: center;
          padding: 40px 20px;
          color: #5f6368;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
        ">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="#5f6368" style="margin-bottom: 16px;">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
          <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 400;">Custom Reply Mode</h3>
          <p style="margin: 0; font-size: 14px;">Enter your custom instructions above and click "Generate Reply"</p>
        </div>
      `;
    }
  } else {
    // Enable auto mode
    customPromptSection.style.display = "none";
    replyContent.style.display = "block";

    if (responseCache.has(autoCacheKey)) {
      console.log("📄 Showing cached auto-reply");
      showCachedReply(responseCache.get(autoCacheKey));
    } else if (emailContent) {
      console.log("🔄 Generating new auto-reply");
      generateReplyWithCache(emailContent.innerText, receiverEmail);
    }
  }
});
customPromptInput.addEventListener("input", (e) => {
  if (toggleSwitch.checked) {
    const customPrompt = e.target.value.trim();
    const customCacheKey = `customreply_${generateCacheKey()}_${customPrompt}`;
    
    if (customPrompt && responseCache.has(customCacheKey)) {
      console.log("📄 Found cached reply for this prompt");
      showCachedReply(responseCache.get(customCacheKey));
    }
  }
});
    
    const presetButtons = document.querySelectorAll(".preset-btn");
    presetButtons.forEach(button => {
      button.addEventListener("click", () => {
        customPromptInput.value = button.getAttribute("data-prompt");
        button.style.background = "rgba(46, 125, 50, 0.2)";
        button.style.borderColor = "rgba(46, 125, 50, 0.5)";
        setTimeout(() => {
          button.style.background = "rgba(59, 130, 246, 0.1)";
          button.style.borderColor = "rgba(59, 130, 246, 0.3)";
        }, 200);
      });
    });
    
    const generateButton = document.getElementById("generate-custom-reply");
    generateButton.addEventListener("click", () => {
      const customPrompt = customPromptInput.value.trim();
      if (!customPrompt) {
        alert("Please enter a custom prompt or select a preset option");
        return;
      }
      
      replyContent.classList.add("loading");
      const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
      if (emailContent) {
        const receiverEmail = extractReceiverEmail();
        generateReplyContent(emailContent.innerText, true, customPrompt, receiverEmail).then(() => {
          replyContent.classList.remove("loading");
        });
      } else {
        replyContent.innerHTML = `
          <div style="
            text-align: center;
            padding: 48px 0;
            color: #4b5563;
          ">
            <p style="margin: 0; font-size: 14px;">
              Unable to load email content. Please try again.
            </p>
          </div>
        `;
        replyContent.classList.remove("loading");
      }
    });
      
    const summaryToggleBtn = document.getElementById("summary-toggle-btn");
    const threadSummarySection = document.getElementById("thread-summary-section");
    const summaryContent = document.getElementById("summary-content");
    let summaryEnabled = false;
  
    summaryToggleBtn.addEventListener("click", async () => {
      summaryEnabled = !summaryEnabled;
      if (summaryEnabled) {
        summaryToggleBtn.classList.add("active");
        threadSummarySection.style.display = "block";
        const scrollContainer = document.getElementById("modal-scroll-container");
        setTimeout(() => {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          });
        }, 150);
        
        const cacheKey = `summary_${generateCacheKey()}`;
        if (responseCache.has(cacheKey)) {
          displayThreadSummary(summaryContent, responseCache.get(cacheKey));
          return;
        }
        
        summaryContent.innerHTML = `
          <div class="summary-loading" style="text-align: center; padding: 24px;">
            <div style="width: 36px; height: 36px; margin: 0 auto 12px; position: relative;">
              <div style="position: absolute; width: 100%; height: 100%; border: 3px solid rgba(0, 0, 0, 0.05); border-radius: 50%;"></div>
              <div style="position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;"></div>
            </div>
            <p style="margin: 0; color: #4b5563; font-size: 14px;">Analyzing conversation...</p>
          </div>
        `;
        
        try {
          const threadData = await extractEmailThread();
          const analysisResult = await analyzeEmailThread(threadData);
          const analysisData = analysisResult.analysis || analysisResult;
          if (analysisData && analysisData.summary) {
            responseCache.set(cacheKey, analysisData);
            displayThreadSummary(summaryContent, analysisData);
          } else {
            summaryContent.innerHTML = `
              <div style="text-align: center; padding: 20px;">
                <p style="margin: 0; color: #4b5563; font-size: 14px;">No analysis data found.</p>
              </div>
            `;
          }
        } catch (error) {
          summaryContent.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <p style="margin: 0; color: #ef4444; font-size: 14px;">Error: ${error.message}</p>
            </div>
          `;
        }
      } else {
        summaryToggleBtn.classList.remove("active");
        threadSummarySection.style.display = "none";
        const scrollContainer = document.getElementById("modal-scroll-container");
        scrollContainer.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    });

    backdrop.addEventListener("click", () => {
      backdrop.style.animation = "fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      modal.style.animation = "modalPopOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      setTimeout(() => {
        backdrop.style.display = "none";
        modal.style.display = "none";
      }, 400);
    });
    
    document.getElementById("close-modal").addEventListener("click", () => {
      backdrop.style.animation = "fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      modal.style.animation = "modalPopOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      setTimeout(() => {
        backdrop.style.display = "none";
        modal.style.display = "none";
      }, 400);
    });
    
    document.getElementById("copy-reply").addEventListener("click", () => {
      const replyTextElement = document.getElementById("cached-response-text") || 
                              document.querySelector("#reply-content div:not(.loading-state)") ||
                              document.getElementById("reply-content");
      const replyText = replyTextElement.innerText || replyTextElement.textContent;
      navigator.clipboard.writeText(replyText).then(() => {
        const button = document.getElementById("copy-reply");
        const originalContent = button.innerHTML;
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
          </svg>
          Copied!
        `;
        button.style.color = "#2563eb";
        button.style.background = "rgba(255, 255, 255, 0.2)";
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.style.color = "#3b82f6";
          button.style.background = "rgba(255, 255, 255, 0.95)";
        }, 2000);
      });
    });

    document.getElementById("insert-reply").addEventListener("click", () => {
  // Select only the reply text, excluding UI elements
  let replyText = "";
  const cachedResponse = document.getElementById("cached-response-text");
  if (cachedResponse) {
    replyText = cachedResponse.innerText || cachedResponse.textContent;
  } else {
    const replyContentDiv = document.querySelector("#reply-content div:not(.loading-state):not([id*='cached-response-buttons'])");
    replyText = replyContentDiv ? (replyContentDiv.innerText || replyContentDiv.textContent) : "";
  }

  if (replyText) {
    insertReplyIntoGmail(replyText.trim());
    backdrop.style.animation = "fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards";
    modal.style.animation = "modalPopOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
    setTimeout(() => {
      backdrop.style.display = "none";
      modal.style.display = "none";
    }, 400);
  } else {
    alert("No reply content available to insert.");
  }
});

    document.getElementById("direct-reply").addEventListener("click", () => {
      const replyTextElement = document.getElementById("cached-response-text") || 
                              document.querySelector("#reply-content div:not(.loading-state)") ||
                              document.getElementById("reply-content");
      const replyText = replyTextElement.innerText || replyTextElement.textContent;
      directReplyEmail(replyText);
      backdrop.style.animation = "fadeOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      modal.style.animation = "modalPopOut 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards";
      setTimeout(() => {
        backdrop.style.display = "none";
        modal.style.display = "none";
      }, 400);
    });
    
    const setupPreferencesBtn = document.getElementById("setup-preferences-btn");
    setupPreferencesBtn.addEventListener("click", () => {
      if (chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        alert("Please click the extension icon in your browser to setup your preferences.");
      }
    });
    
    updateUserPreferencesStatus();
    
    const style = document.createElement("style");
    style.textContent = `
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      
      @keyframes modalPopOut {
        from { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        to { transform: translate(-50%, -50%) scale(0.95); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    
    return { modal, backdrop };
}

// Enhanced function to expand all collapsed parts of the email thread
function expandEntireThread() {
  return new Promise(resolve => {
    console.log("Starting thread expansion...");
    
    // Find all "Show trimmed content" buttons and click them
    const trimmedContentButtons = document.querySelectorAll('.ajz');
    trimmedContentButtons.forEach(button => button.click());
    
    // Find all collapsed emails and expand them
    const collapsedEmails = document.querySelectorAll('.h7');
    collapsedEmails.forEach(email => {
      const expandButton = email.querySelector('.ajR');
      if (expandButton) {
        expandButton.click();
      }
    });
    
    // Find "Show quoted text" buttons and click them
    const quotedTextButtons = document.querySelectorAll('.ajU');
    quotedTextButtons.forEach(button => button.click());
    
    // Find any "Show details" links or expandable sections
    const detailsButtons = document.querySelectorAll('div[data-tooltip="Show details"], span.ajT');
    detailsButtons.forEach(button => button.click());
    
    // Find "Reply" expandable sections and expand them
    const replyButtons = document.querySelectorAll('.adF');
    replyButtons.forEach(button => button.click());
    
    console.log("Thread expansion initiated");
    
    // Give time for DOM to update after expansions
    setTimeout(resolve, 1000);
  });
}

// Format email content to preserve line breaks and paragraphs
function formatEmailContent(content) {
  if (!content) return "";
  
  // Add line breaks after common email patterns
  let formatted = content
    .replace(/(wrote:)([^\n])/g, '$1\n$2')
    .replace(/(Greetings,|Dear|Hello|Hi|Hey)([^\n])/g, '$1\n$2')
    .replace(/(Regards,|Sincerely,|Best,|Thanks,|Thank you,)([^\n])/g, '$1\n$2')
    .replace(/(.)(https?:\/\/)/g, '$1\n\n$2');
  
  // Remove excess line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted;
}

// Main function to extract email thread
async function extractEmailThread() {
  console.log("Starting improved email thread extraction...");
  
  // First expand the entire thread
  await expandEntireThread();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Get the subject
  const subject = document.querySelector('h2[data-thread-perm-id]')?.textContent.trim() || "No subject found";
  
  // Thread data container
  const threadData = {
    subject: subject,
    emails: [],
    completeThreadText: ""
  };
  
  // Get all message containers
  const containerSelectors = [
    'div[role="listitem"]',
    'div.adn.ads',
    'div.gs',
    'div[data-message-id]',
    'table.message'
  ];
  
  let allContainers = [];
  
  for (const selector of containerSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} with selector: ${selector}`);
      allContainers = [...allContainers, ...Array.from(elements)];
    }
  }
  
  // Filter out invisible containers and remove duplicates
  const visibleContainers = [];
  const processedIds = new Set();
  
  for (const container of allContainers) {
    if (!container.offsetHeight) continue;
    
    const containerId = container.getAttribute('data-message-id') || 
                        container.getAttribute('data-legacy-message-id') || 
                        `pos_${container.offsetTop}`;
    
    if (!processedIds.has(containerId)) {
      processedIds.add(containerId);
      visibleContainers.push(container);
    }
  }
  
  console.log(`Found ${visibleContainers.length} unique visible message containers`);
  
  // Process each container to extract messages
  for (let i = 0; i < visibleContainers.length; i++) {
    const container = visibleContainers[i];
    
    const senderInfo = extractSenderInfo(container);
    const visibleContent = extractVisibleContent(container);
    const quotedMessages = extractQuotedMessages(container);
    
    if (visibleContent && visibleContent.trim().length > 15) {
      threadData.emails.push({
        index: i * 10,
        sender: senderInfo.name,
        senderEmail: senderInfo.email,
        timestamp: senderInfo.timestamp,
        fullContent: formatEmailContent(visibleContent),
        isQuoted: false
      });
    }
    
    quotedMessages.forEach((message, j) => {
      const isDuplicate = threadData.emails.some(email => 
        email.fullContent && message.content && 
        (email.fullContent.includes(message.content.substring(0, 50)) || 
         message.content.includes(email.fullContent.substring(0, 50)))
      );
      
      if (!isDuplicate && message.content.trim().length > 15) {
        threadData.emails.push({
          index: (i * 10) + j + 1,
          sender: message.sender,
          senderEmail: message.email,
          timestamp: message.timestamp,
          fullContent: formatEmailContent(message.content),
          isQuoted: true
        });
      }
    });
  }
  
  // Remove duplicate emails
  threadData.emails = removeDuplicateEmails(threadData.emails);
  
  // Sort by index (older messages first)
  threadData.emails.sort((a, b) => a.index - b.index);
  
  // Renumber for display
  threadData.emails.forEach((email, idx) => {
    email.displayIndex = idx + 1;
  });
  
  // Build the complete thread text
  threadData.emails.forEach((email) => {
    threadData.completeThreadText += `\n----- Email ${email.displayIndex} from ${email.sender} ${email.senderEmail ? `<${email.senderEmail}>` : ''} (${email.timestamp}) -----\n\n${email.fullContent}\n\n`;
  });
  
  console.log("COMPLETE THREAD DATA:", threadData);
  
  return threadData;
}

// Extract sender information from a message container
function extractSenderInfo(container) {
  let name = "Unknown sender";
  let email = "";
  let timestamp = "Unknown time";
  
  // Try to extract sender name and email
  const senderElements = [
    container.querySelector('span.gD'),
    container.querySelector('span[email]'),
    container.querySelector('h3.iw'),
    container.querySelector('*[data-hovercard-id]')
  ].filter(Boolean);
  
  for (const element of senderElements) {
    const emailAttr = element.getAttribute('email') || 
                      element.getAttribute('data-hovercard-id');
    
    if (emailAttr && emailAttr.includes('@')) {
      email = emailAttr;
      name = element.textContent.trim();
      break;
    } else if (element.textContent.includes('@')) {
      const emailMatch = element.textContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (emailMatch && emailMatch[1]) {
        email = emailMatch[1];
        name = element.textContent.trim();
        break;
      }
    } else if (element.textContent.trim()) {
      name = element.textContent.trim();
    }
  }
  
  // Try to extract timestamp
  const timestampElements = [
    container.querySelector('span.g3'),
    container.querySelector('time'),
    ...container.querySelectorAll('.ad, .date, .timestamp')
  ].filter(Boolean);
  
  for (const element of timestampElements) {
    const text = element.textContent.trim();
    if (text && !text.includes('@') && text.length < 30) {
      timestamp = text;
      break;
    }
  }
  
  return { name, email, timestamp };
}

// Extract visible content from a message container
function extractVisibleContent(container) {
  const contentSelectors = [
    '.a3s.aiL', '.a3s', '.ii.gt div[dir="ltr"]', 
    '.message-body', '.adP', '.Am.Al.editable'
  ];
  
  let content = "";
  
  for (const selector of contentSelectors) {
    const elements = container.querySelectorAll(selector);
    for (const element of elements) {
      const clone = element.cloneNode(true);
      
      // Remove quoted content from clone
      const quotedElements = clone.querySelectorAll('.gmail_quote, blockquote, .yahoo_quoted');
      quotedElements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      
      const text = clone.innerText.trim();
      if (text && text.length > 15) {
        content = text;
        break;
      }
    }
    if (content) break;
  }
  
  if (!content) {
    const clone = container.cloneNode(true);
    
    const removeSelectors = [
      '.gmail_quote', 'blockquote', '.yahoo_quoted', 
      'button', '.T-I', '.J-J5-Ji'
    ];
    
    for (const selector of removeSelectors) {
      const elements = clone.querySelectorAll(selector);
      for (const el of elements) {
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    }
    
    content = clone.innerText.trim();
  }
  
  return content;
}

// Extract quoted messages from a container
function extractQuotedMessages(container) {
  const quotedMessages = [];
  
  const quotedElements = container.querySelectorAll('.gmail_quote, blockquote, .yahoo_quoted');
  
  quotedElements.forEach(element => {
    const quoteText = element.innerText.trim();
    
    let sender = "Previous sender";
    let email = "";
    let timestamp = "Earlier";
    let content = quoteText;
    
    // Pattern 1: "On [date], [name] <[email]> wrote:"
    const onWroteMatch = quoteText.match(/On .+?, (.+?) <([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)> wrote:/);
    if (onWroteMatch) {
      sender = onWroteMatch[1].trim();
      email = onWroteMatch[2];
      
      const dateMatch = quoteText.match(/On (.+?),/);
      if (dateMatch) {
        timestamp = dateMatch[1].trim();
      }
      
      const headerEnd = quoteText.indexOf("wrote:") + 6;
      if (headerEnd > 6) {
        content = quoteText.substring(headerEnd).trim();
      }
    } else {
      // Pattern 2: "From: [name] <[email]>"
      const fromMatch = quoteText.match(/From: (.+?) <([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)>/);
      if (fromMatch) {
        sender = fromMatch[1].trim();
        email = fromMatch[2];
        
        const dateMatch = quoteText.match(/Date: (.+?)(?:\r|\n)/);
        if (dateMatch) {
          timestamp = dateMatch[1].trim();
        }
        
        const subjectIndex = quoteText.indexOf("Subject:");
        if (subjectIndex > 0) {
          const nextLine = quoteText.indexOf("\n", subjectIndex);
          if (nextLine > 0) {
            content = quoteText.substring(nextLine + 1).trim();
          }
        }
      }
    }
    
    if (sender === "Previous sender") {
      const emailMatch = quoteText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (emailMatch) {
        email = emailMatch[1];
      }
    }
    
    quotedMessages.push({
      sender,
      email,
      timestamp,
      content
    });
  });
  
  return quotedMessages;
}

// Helper function to remove duplicate emails
function removeDuplicateEmails(emails) {
  const uniqueEmails = [];
  const seenContents = new Set();
  
  emails.forEach(email => {
    const contentSignature = email.fullContent
      .substring(0, 100)
      .toLowerCase()
      .replace(/\s+/g, ' ');
    
    if (!seenContents.has(contentSignature) && contentSignature.length > 10) {
      seenContents.add(contentSignature);
      uniqueEmails.push(email);
    }
  });
  
  return uniqueEmails;
}

function extractSenderEmail() {
  // Method A: Look for sender span in the message header
  const senderSpan = document.querySelector('span.gD[email]');
  if (senderSpan) {
    return senderSpan.getAttribute('email');
  }

  // Method B: Check for other visible spans with email attribute
  const emailElements = document.querySelectorAll('span[email]');
  for (const el of emailElements) {
    if (el.classList.contains('gD') || el.classList.contains('go')) {
      const email = el.getAttribute('email');
      if (email) return email;
    }
  }

  // Method C: Look for mailto links not matching receiver (fallback)
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    const href = link.getAttribute('href');
    const emailMatch = href.match(/^mailto:([^?]+)/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  return null;
}

// Extract receiver email from Gmail interface
function extractReceiverEmail() {
  // Method A: Check Gmail's recipient span
  const recipientSpan = document.querySelector('span.g2[email]');
  if (recipientSpan) {
    return recipientSpan.getAttribute('email');
  }

  // Method B: Look through all span[email] elements
  const emailElements = document.querySelectorAll('span[email]');
  for (const el of emailElements) {
    const email = el.getAttribute('email');
    const name = el.getAttribute('name') || el.textContent.trim();
    if (email && name !== email) {
      return email;
    }
  }

  // Method C: Look for mailto links
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    const href = link.getAttribute('href');
    const emailMatch = href.match(/^mailto:([^?]+)/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  return null;
}

// Function to insert reply into Gmail compose box
function insertReplyIntoGmail(replyText) {
  const replyButton = document.querySelector('div[role="button"][aria-label*="Reply"]');
  if (replyButton) {
    replyButton.click();
    
    setTimeout(() => {
      const composeBox = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
      if (composeBox) {
        composeBox.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, replyText);
        console.log("✅ Reply inserted into compose box");
      } else {
        console.error("Could not find compose box");
        alert("Please click Reply manually and then try again.");
      }
    }, 1000);
  } else {
    alert("Please click Reply manually first.");
  }
}

// Function to directly send the reply
function directReplyEmail(replyText) {
  const replyButton = document.querySelector('div[role="button"][aria-label*="Reply"]');
  if (replyButton) {
    replyButton.click();
    
    setTimeout(() => {
      const composeBox = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
      if (composeBox) {
        composeBox.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, replyText);
        
        setTimeout(() => {
          const sendSelectors = [
            'div[role="button"][aria-label*="Send"][aria-label*="Ctrl+Enter"]',
            'div[role="button"][aria-label*="Send"]',
            'div[data-tooltip*="Send"]',
            'div.T-I.J-J5-Ji.aoO.T-I-atl.L3'
          ];
          
          let sendButton = null;
          for (const selector of sendSelectors) {
            sendButton = document.querySelector(selector);
            if (sendButton && sendButton.offsetHeight > 0) {
              break;
            }
          }
          
          if (sendButton) {
            sendButton.click();
            console.log("✅ Reply sent successfully");
            showSuccessNotification("Reply sent successfully!");
          } else {
            console.error("Could not find send button");
            alert("Could not find send button. Please send manually.");
          }
        }, 500);
      } else {
        console.error("Could not find compose box");
        alert("Please click Reply manually and then try again.");
      }
    }, 1000);
  } else {
    alert("Please click Reply manually first.");
  }
}

// Function to show success notification
function showSuccessNotification(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #34a853;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideUp 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
    </svg>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  // Add animations if not already present
  if (!document.head.querySelector('style[data-slideup]')) {
    const style = document.createElement("style");
    style.setAttribute('data-slideup', 'true');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100%); }
        to { transform: translateX(-50%) translateY(0); }
      }
      @keyframes slideDown {
        from { transform: translateX(-50%) translateY(0); }
        to { transform: translateX(-50%) translateY(150%); }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.style.animation = "slideDown 0.3s ease-out";
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Enhanced generateReply function with caching
async function generateReplyWithCache(emailContent, receiverEmail) {
  const cacheKey = `autoreply_${generateCacheKey()}`;
  
  // Check if we already have a cached response
  if (responseCache.has(cacheKey)) {
    console.log("📄 Using cached auto-reply response");
    const cachedResponse = responseCache.get(cacheKey);
    
    // Show modal and display cached response
    const modalElements = createModal();
    const modal = modalElements.modal;
    const backdrop = modalElements.backdrop;
    
    // Show modal with animation
    backdrop.style.display = "block";
    modal.style.display = "block";
    backdrop.style.animation = "fadeIn 0.3s ease-out";
    modal.style.animation = "modalSlideIn 0.4s ease-out forwards";
    
    // Display the cached response
    const replyContent = document.getElementById("reply-content");
    replyContent.innerHTML = `
      <div style="
        position: relative;
        background-color: #f8f9fa;
        border: 1px solid #e8eaed;
        border-radius: 8px;
        padding: 16px;
        margin: 12px 0;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
      ">
        <div style="
          position: absolute;
          top: 8px;
          right: 12px;
          background: #34a853;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        ">CACHED</div>
        
        <div style="
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853" style="margin-right: 8px;">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
          <span style="
            color: #137333;
            font-weight: 500;
            font-size: 14px;
          ">Auto-Reply Generated (Cached)</span>
        </div>
        
        <div id="cached-reply-text" style="
          background-color: white;
          border-radius: 6px;
          padding: 16px;
          border: 1px solid #e8eaed;
          white-space: pre-wrap;
          line-height: 1.5;
          font-family: Arial, sans-serif;
          font-size: 14px;
        ">${cachedResponse}</div>
        
        <div style="
          margin-top: 12px;
          display: flex;
          gap: 8px;
        ">
          <button id="copy-reply-cached" style="
            background-color: #1a73e8;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">Copy Reply</button>
          
          <button id="regenerate-reply-cached" style="
            background-color: #f8f9fa;
            color: #3c4043;
            border: 1px solid #dadce0;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
          ">Regenerate</button>
        </div>
      </div>
    `;
    
    // Add event listeners for cached response buttons
    setupCachedReplyButtons(cachedResponse, cacheKey, emailContent, receiverEmail);
    return;
  }

  // If not cached, proceed with normal generation
  console.log("🔄 Generating new auto-reply response");
  await generateReply(emailContent, receiverEmail);
}

// Helper function to setup button event listeners for cached replies
function setupCachedReplyButtons(replyText, cacheKey, emailContent, receiverEmail) {
  // Copy button
  const copyBtn = document.getElementById("copy-reply-cached");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(replyText).then(() => {
        copyBtn.textContent = "Copied!";
        copyBtn.style.backgroundColor = "#34a853";
        setTimeout(() => {
          copyBtn.textContent = "Copy Reply";
          copyBtn.style.backgroundColor = "#1a73e8";
        }, 2000);
      });
    });
  }
  
  // Regenerate button
  const regenerateBtn = document.getElementById("regenerate-reply-cached");
  if (regenerateBtn) {
    regenerateBtn.addEventListener("click", () => {
      // Clear cache for this thread and regenerate
      responseCache.delete(cacheKey);
      console.log("🗑️ Cleared cached auto-reply, regenerating...");
      
      // Call original generateReply to regenerate
      generateReply(emailContent, receiverEmail);
    });
  }
}

// Update generateReply to accept receiver email
async function generateReply(emailContent, receiverEmail) {
  const modalElements = createModal();
  const modal = modalElements.modal;
  const backdrop = modalElements.backdrop;
  
  // Get the custom mode settings
  const customModeSwitch = document.getElementById("custom-mode-switch");
  const replyContent = document.getElementById("reply-content");
  
  // Show modal with animation
  backdrop.style.display = "block";
  modal.style.display = "block";
  backdrop.style.animation = "fadeIn 0.3s ease-out";
  modal.style.animation = "modalSlideIn 0.4s ease-out forwards";
  
  // If custom mode is enabled, just show the UI and wait for user input
  if (customModeSwitch && customModeSwitch.checked) {
    replyContent.style.display = "none";
    return;
  }
  
  // Otherwise, generate reply automatically
  replyContent.style.display = "block";
  generateReplyContent(emailContent, false, null, receiverEmail);
}

// Main function to generate reply content
async function generateReplyContent(emailContent, useCustomPrompt, customPrompt, receiverEmail) {
  const replyContent = document.getElementById("reply-content");
  const senderEmail = extractSenderEmail() || "";
  console.log("📧 Extracted sender email:", senderEmail);
  const cacheKey = useCustomPrompt 
    ? `customreply_${generateCacheKey()}_${customPrompt}`
    : `autoreply_${generateCacheKey()}`;

  // Use cache if available
  if (responseCache.has(cacheKey)) {
    console.log("📄 Using cached reply");
    showCachedReply(responseCache.get(cacheKey));
    return;
  }

  // Show loading state
  replyContent.innerHTML = `
    <div class="loading-state" style="text-align: center; padding: 40px 0;">
      <div style="width: 60px; height: 60px; margin: 0 auto 24px; position: relative;">
        <div style="position: absolute; width: 100%; height: 100%; border: 3px solid #f3f3f3; border-radius: 50%;"></div>
        <div style="position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-top: 3px solid #1a73e8; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <h3 style="margin: 0 0 8px 0; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 18px; font-weight: 400; color: #5f6368;">Crafting your reply...</h3>
      <p style="margin: 0; color: #80868b; font-size: 14px;">AI is analyzing the email and generating a professional response</p>
      <p style="margin: 16px 0 0 0; color: #80868b; font-size: 12px;">This may take a few seconds...</p>
      ${senderEmail ? `<p style="margin: 8px 0 0 0; color: #1a73e8; font-size: 12px;">Replying to: ${senderEmail}</p>` : ''}
    </div>
  `;
  replyContent.classList.add("loading");

  const userSignatureInfo = getUserSignatureInfo();

  const requestBody = {
    prompt: emailContent,
    useCustomPrompt: Boolean(useCustomPrompt),
    customPrompt: customPrompt || "",
    receiverEmail: receiverEmail || "",
    userPreferences: userSignatureInfo
  };
  console.log("🔍 Current userPreferences state:", userPreferences);
  console.log("🔍 Has user preferences:", hasUserPreferences());
  console.log("🔍 User signature info:", getUserSignatureInfo());
  console.log("📤 Sending request to generate reply:", requestBody);

  const PRIMARY_API = `${BACKEND_URL}/generate`;
  const FALLBACK_API = `${FALLBACK_URL}/generate`;

  let response;
  let usingFallback = false;

  try {
    // Try primary API first
    try {
      response = await fetch(PRIMARY_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000)
      });
    } catch (primaryError) {
      console.warn("Primary API failed, switching to fallback:", primaryError.message);
      usingFallback = true;
      replyContent.querySelector(".loading-state p").innerText = "Primary API unavailable. Trying backup server...";

      response = await fetch(FALLBACK_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });
    }

    const raw = await response.text();
    if (!response.ok) {
      if (!usingFallback && [500, 503, 404].includes(response.status)) {
        usingFallback = true;
        replyContent.querySelector(".loading-state p").innerText = `Primary server returned ${response.status}. Trying backup server...`;

        const fallbackResponse = await fetch(FALLBACK_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody)
        });

        if (!fallbackResponse.ok) {
          throw new Error(`❌ Both APIs failed. Fallback API: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackText = await fallbackResponse.text();
        const fallbackData = JSON.parse(fallbackText);

        if (fallbackData.error) {
          throw new Error(fallbackData.error);
        }

        displayReplyContent(replyContent, fallbackData.reply, true);
        return;
      } else {
        throw new Error(`⚠️ Server error: ${response.status} ${response.statusText}`);
      }
    }

    const data = JSON.parse(raw);
    if (data.error) {
      throw new Error(data.error);
    }

    responseCache.set(cacheKey, data.reply);
    console.log(`💾 Cached ${useCustomPrompt ? "custom" : "auto"} reply response`);
    displayReplyContent(replyContent, data.reply, usingFallback);

  } catch (error) {
    console.error("❌ Error generating reply:", error);
    
    replyContent.classList.remove("loading");
    replyContent.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#ea4335" style="margin-bottom: 16px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <h3 style="margin: 0 0 12px 0; font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 18px; color: #202124; font-weight: 400;">
          Failed to generate reply
        </h3>
        <p style="margin: 0 0 8px 0; color: #5f6368; font-size: 14px;">
          ${error.message}
        </p>
        <p style="margin: 0; color: #80868b; font-size: 13px;">
          🕒 Our servers may be busy. Please try again shortly.
        </p>
      </div>
    `;
  }
}

// Helper function to show cached reply content
function showCachedReply(replyText) {
  const replyContent = document.getElementById("reply-content");
  
  // Use the same structure as cached replies to ensure clean text extraction
  replyContent.innerHTML = `
    <div style="
      position: relative;
      background-color: #f8f9fa;
      border: 1px solid #e8eaed;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
    ">
      <div style="
        position: absolute;
        top: 8px;
        right: 12px;
        background: #34a853;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      ">CACHED</div>
      
      <div style="
        display: flex;
        align-items: center;
        margin-bottom: 12px;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#34a853" style="margin-right: 8px;">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span style="
          color: #137333;
          font-weight: 500;
          font-size: 14px;
        ">Reply Ready</span>
      </div>
      
      <div id="cached-reply-text" style="
        background-color: white;
        border-radius: 6px;
        padding: 16px;
        border: 1px solid #e8eaed;
        white-space: pre-wrap;
        line-height: 1.5;
        font-family: Arial, sans-serif;
        font-size: 14px;
      ">${replyText}</div>
    </div>
  `;
  
  replyContent.style.display = "block";
}

// Function to analyze email thread
async function analyzeEmailThread(threadData) {
  console.log("📊 Sending thread data to analyze-thread endpoint...");

  const requestBody = { thread: threadData };
  const PRIMARY_API = `${BACKEND_URL}/analyze-thread`;
  const FALLBACK_API = `${FALLBACK_URL}/analyze-thread`;

  let usingFallback = false;

  try {
    let response;

    try {
      // Try primary API
      response = await fetch(PRIMARY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000)
      });
    } catch (primaryError) {
      console.warn("Primary analyze-thread API failed, trying fallback:", primaryError.message);
      usingFallback = true;

      // Try fallback API
      response = await fetch(FALLBACK_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
    }

    console.log(`Analyze-thread response from ${usingFallback ? "fallback" : "primary"} API:`, response.status);

    // Handle errors
    if (response.status >= 400) {
      const isClientError = response.status >= 400 && response.status < 500;
      const type = isClientError ? "Client Error" : "Server Error";
      const emoji = isClientError ? "⚠️" : "❌";
      const fallbackMessage = `${emoji} ${type}: ${response.status} ${response.statusText}`;

      // Try fallback if it's a server error and not already on fallback
      if (!usingFallback && response.status >= 500) {
        const fallbackResponse = await fetch(FALLBACK_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!fallbackResponse.ok) {
          throw new Error(`❌ Both APIs failed. Fallback status: ${fallbackResponse.status} ${fallbackResponse.statusText}`);
        }

        const fallbackData = await fallbackResponse.json();
        console.log("✅ Thread analysis completed via fallback API:", fallbackData);
        return fallbackData;
      }

      throw new Error(fallbackMessage);
    }

    // Success
    const data = await response.json();
    console.log("✅ Thread analysis completed:", data);
    return data;

  } catch (error) {
    console.error("❌ Error analyzing thread:", error.message);
    return {
      error: `🚫 Analysis failed: ${error.message}. Please try again later.`
    };
  }
}

// Helper function to display reply content with fade effect
function displayReplyContent(replyContent, replyText, usedFallback) {
  replyContent.style.opacity = "0";
  setTimeout(() => {
    replyContent.classList.remove("loading");
    
    let replyHtml = `<div style="white-space: pre-wrap;">${replyText}</div>`;
    
    // Add fallback notice if applicable
    if (usedFallback) {
      replyHtml += `
        <div style="
          margin-top: 20px;
          padding: 8px 12px;
          background: #f8f9fa;
          border-left: 3px solid #fbbc04;
          color: #5f6368;
          font-size: 12px;
          border-radius: 4px;
        ">
          <span style="font-weight: 500;">Note:</span> Using backup server due to main server unavailability.
        </div>
      `;
    }
    
    replyContent.innerHTML = replyHtml;
    replyContent.style.transition = "opacity 0.3s ease-in";
    replyContent.style.opacity = "1";
    
    // Scroll to top of the reply content
    replyContent.scrollTop = 0;
  }, 300);
}

// Function to display thread summary
function displayThreadSummary(summaryContainer, analysisResult) {
  summaryContainer.style.opacity = "0";

  setTimeout(() => {
    let summaryHTML = '';

    // Add summary from API
    if (analysisResult.summary) {
      summaryHTML += `
        <div>
          <h4 style="
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 15px;
            color: #202124;
            margin: 0 0 8px 0;
            font-weight: 500;
          ">Summary</h4>
          <p style="margin: 0 0 16px 0;">${analysisResult.summary}</p>
        </div>
      `;
    }

    // Add topics
    if (analysisResult.topics && analysisResult.topics.main && analysisResult.topics.main.length > 0) {
      summaryHTML += `
        <div>
          <h4 style="
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 15px;
            color: #202124;
            margin: 16px 0 8px 0;
            font-weight: 500;
          ">Key Topics</h4>
          <ul style="margin: 0; padding-left: 20px;">
            ${analysisResult.topics.main.map(topic => `
              <li>
                <strong>${topic.label}</strong>
                ${topic.subtopics && topic.subtopics.length > 0 ? 
                  `: ${topic.subtopics.join(', ')}` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    // Sentiment analysis
    if (analysisResult.sentiment_analysis) {
      const sentiment = analysisResult.sentiment_analysis;
      summaryHTML += `
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8eaed;">
          <h4 style="
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 15px;
            color: #202124;
            margin: 0 0 8px 0;
            font-weight: 500;
          ">Sentiment Analysis</h4>
          ${sentiment.overall ? `
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #5f6368;">
              Overall Sentiment: <span style="color: #202124; font-weight: 500; text-transform: capitalize;">${sentiment.overall}</span>
            </p>` : ''}
          ${sentiment.tone_shifts && sentiment.tone_shifts.length > 0 ? `
            <p style="margin: 0; font-size: 13px; color: #5f6368;">
              Tone Changes: <span style="color: #202124; font-weight: 500;">${sentiment.tone_shifts.join(', ')}</span>
            </p>` : `
            <p style="margin: 0; font-size: 13px; color: #5f6368;">
              Tone: <span style="color: #202124; font-weight: 500;">Consistent throughout</span>
            </p>`}
        </div>
      `;
    }

    // Named entities
    if (analysisResult.named_entities) {
      const entities = analysisResult.named_entities;
      let entitiesHTML = '';

      if (entities.people?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">People</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.people.map(person => `<li>${person}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entities.companies?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">Companies</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.companies.map(company => `<li>${company}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entities.dates?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">Important Dates</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.dates.map(date => `<li>${date}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entities.email_addresses?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">Email Addresses</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.email_addresses.map(email => `<li>${email}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entities.mobile_numbers?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">Phone Numbers</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.mobile_numbers.map(number => `<li>${number}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entities.locations?.length) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 14px; color: #202124; margin: 0 0 4px 0; font-weight: 500;">Locations</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.locations.map(location => `<li>${location}</li>`).join('')}
            </ul>
          </div>`;
      }

      if (entitiesHTML) {
        summaryHTML += `
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e8eaed;">
            <h4 style="font-family: 'Google Sans', Roboto, Arial, sans-serif; font-size: 15px; color: #202124; margin: 0 0 12px 0; font-weight: 500;">Key Information</h4>
            ${entitiesHTML}
          </div>`;
      }
    }

    // If nothing was added, show friendly fallback
    if (summaryHTML === '') {
      summaryHTML = `
        <div style="text-align: center; padding: 24px; color: #5f6368;">
          <p style="font-size: 16px;">🤷‍♂️ No analysis available</p>
          <p style="font-size: 13px;">We couldn't extract any meaningful summary from this thread. It may be too short, incomplete, or unsupported.</p>
        </div>
      `;
    }

    summaryContainer.innerHTML = summaryHTML;
    summaryContainer.style.transition = "opacity 0.3s ease-in";
    summaryContainer.style.opacity = "1";
  }, 300);
}

// Function to clear modal content when navigating between emails
function clearModalContent() {
  const replyContent = document.getElementById("reply-content");
  if (replyContent) {
    replyContent.innerHTML = '';
    replyContent.classList.remove("loading");
  }
  
  // Reset custom prompt toggle
  const customModeSwitch = document.getElementById("custom-mode-switch");
  const customPromptSection = document.getElementById("custom-prompt-section");
  const customPromptInput = document.getElementById("custom-prompt-input");
  
  if (customModeSwitch) {
    customModeSwitch.checked = false;
  }
  if (customPromptSection) {
    customPromptSection.style.display = "none";
  }
  if (customPromptInput) {
    customPromptInput.value = "";
  }
  
  // Reset summary toggle and content
  const summaryToggleBtn = document.getElementById("summary-toggle-btn");
  const threadSummarySection = document.getElementById("thread-summary-section");
  const summaryContent = document.getElementById("summary-content");
  
  if (summaryToggleBtn) {
    summaryToggleBtn.classList.remove("active");
  }
  if (threadSummarySection) {
    threadSummarySection.style.display = "none";
  }
  if (summaryContent) {
    summaryContent.innerHTML = '';
  }
}

// Function to inject the button
function injectButton() {
  if (!window.location.href.includes('#inbox/')) {
    return;
  }
  
  const selectors = [
    'div[gh="tm"]',
    'div[role="toolbar"]',
    'div.ams',
    'div.btC',
    'div.Cr.aqJ',
    'td.gU div',
    'div.G-atb',
    'div.nH.qY div'
  ];
  
  let toolbar = null;
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el.offsetHeight > 0 && (el.querySelector('div[role="button"]') || el.querySelector('div[data-tooltip]'))) {
        toolbar = el;
        break;
      }
    }
    if (toolbar) break;
  }
  
  if (!toolbar) {
    return;
  }
  
  if (document.getElementById(BUTTON_ID)) {
    return;
  }
  
  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.display = "inline-block";
  buttonWrapper.style.position = "relative";
  buttonWrapper.style.marginLeft = "12px";
  
  const button = document.createElement("div");
  button.id = BUTTON_ID;
  button.setAttribute("role", "button");
  button.setAttribute("tabindex", "0");
  button.innerHTML = `
    <div style="
      padding: 8px 14px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(91, 33, 182, 0.6));
      color: white;
      border-radius: 10px;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
      overflow: hidden;
      letter-spacing: 0.3px;
    ">
      <span style="
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: sparkle 2s ease-in-out infinite;">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.05l-6.18 3.25L7.85 14.14 2 9.08l6.91-1.01L12 2z"/>
        </svg>
        Auto-Reply
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: sparkle 2s ease-in-out infinite;">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 18.05l-6.18 3.25L7.85 14.14 2 9.08l6.91-1.01L12 2z"/>
        </svg>
      </span>
      <div style="
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      "></div>
    </div>
  `;
  
  button.onmouseenter = (e) => {
    const innerDiv = e.currentTarget.firstElementChild;
    innerDiv.style.transform = "scale(1.05)";
    innerDiv.style.boxShadow = "0 4px 10px rgba(139, 92, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15)";
    innerDiv.style.background = "linear-gradient(135deg, rgba(167, 139, 250, 0.8), rgba(124, 58, 237, 0.6))";
    const shineEffect = innerDiv.querySelector('div[style*="left"]');
    if (shineEffect) shineEffect.style.left = "100%";
  };
  
  button.onmouseleave = (e) => {
    const innerDiv = e.currentTarget.firstElementChild;
    innerDiv.style.transform = "scale(1)";
    innerDiv.style.boxShadow = "0 2px 6px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)";
    innerDiv.style.background = "linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(91, 33, 182, 0.6))";
    const shineEffect = innerDiv.querySelector('div[style*="left"]');
    if (shineEffect) {
      setTimeout(() => {
        shineEffect.style.left = "-100%";
      }, 600);
    }
  };
  
  if (!document.head.querySelector('style[data-sparkle]')) {
    const sparkleStyle = document.createElement("style");
    sparkleStyle.setAttribute('data-sparkle', 'true');
    sparkleStyle.textContent = `
      @keyframes sparkle {
        0% { transform: rotate(0deg) scale(1); opacity: 1; }
        50% { transform: rotate(180deg) scale(1.2); opacity: 0.8; }
        100% { transform: rotate(360deg) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(sparkleStyle);
  }
  
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const receiverEmail = extractReceiverEmail();
    if (userPreferences === null) {
      await loadUserPreferences();
    }
    
    const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
    if (emailContent) {
      const emailText = emailContent.innerText;
      try {
        const cacheKey = `summary_${generateCacheKey()}`;
        if (!responseCache.has(cacheKey)) {
          const threadData = await extractEmailThread();
          analyzeEmailThread(threadData).then(result => {
            if (result && result.analysis) {
              responseCache.set(cacheKey, result.analysis);
            }
          }).catch(error => {
            console.error("Background thread analysis failed:", error);
          });
        }
        await generateReplyWithCache(emailText, receiverEmail);
      } catch (error) {
        console.error("Error extracting thread:", error);
        const replyContent = document.getElementById("reply-content");
        replyContent.innerHTML = `
          <div style="
            text-align: center;
            padding: 48px 0;
            color: #ef4444;
          ">
            <p style="margin: 0; font-size: 14px;">
              Error loading email content. Please try again.
            </p>
          </div>
        `;
        replyContent.classList.remove("loading");
      }
    } else {
      const replyContent = document.getElementById("reply-content");
      replyContent.innerHTML = `
        <div style="
          text-align: center;
          padding: 48px 0;
          color: #ef4444;
        ">
          <p style="margin: 0; font-size: 14px;">
            Could not find email content. Please ensure you're viewing an email.
          </p>
        </div>
      `;
      replyContent.classList.remove("loading");
    }
  }, true);

  button.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      button.click();
    }
  });
  
  buttonWrapper.appendChild(button);
  toolbar.appendChild(buttonWrapper);
}

// Function to check and inject button
function checkAndInjectButton() {
  // Check if URL has changed (navigation in Gmail)
  if (currentUrl !== window.location.href) {
    currentUrl = window.location.href;
    console.log("🔄 URL changed, checking for button injection...");
    
    // Clear modal content when navigating between emails
    clearModalContent();
    
    // Remove existing button if any
    const existingButton = document.getElementById(BUTTON_ID);
    if (existingButton) {
      existingButton.parentElement.remove();
    }
    
    // Reset user preferences on navigation
    userPreferences = null;
    console.log("🔄 Initializing user preferences...");
    loadUserPreferences().then(() => {
      console.log("✅ User preferences initialization completed");
    });
  }

  injectButton();
}

// Start checking
checkInterval = setInterval(checkAndInjectButton, 500);

// Listen for hash changes (Gmail navigation)
if (window.addEventListener) {
  window.addEventListener('hashchange', () => {
    console.log("🔄 Hash changed, checking for button injection...");
    // Reset user preferences on navigation
    userPreferences = null;
    loadUserPreferences();
    setTimeout(checkAndInjectButton, 100);
  });
}

// Mutation observer for Gmail's dynamic content
const observer = new MutationObserver((mutations) => {
  // Only check if we're in an email view
  if (window.location.href.includes('#inbox/') && !document.getElementById(BUTTON_ID)) {
    console.log("🔍 DOM mutation detected, checking for button injection...");
    checkAndInjectButton();
  }
});

// Listen for storage changes to update preferences in real-time
if (chrome && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log("🔄 Storage changed, reloading user preferences...", changes);
    loadUserPreferences().then(() => {
      // Update modal if it's open
      updateUserPreferencesStatus();
    });
  });
}

// Start observing the document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log("✅ Gmail Auto-Reply monitoring started");