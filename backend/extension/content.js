console.log("✅ Gmail Auto LLM Reply: Content script loaded");

const BUTTON_ID = "auto-reply-button";
const MODAL_ID = "auto-reply-modal";
const BACKEND_URL = "https://gmail-llm-based-auto-reply.vercel.app";
const FALLBACK_URL = "https://gmail-llm-based-auto-reply.onrender.com";
let checkInterval = null;
let currentUrl = window.location.href;

// ADD THIS CACHING CODE HERE:
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
function createModal() {
  // Check if modal already exists
  if (document.getElementById(MODAL_ID)) {
    return {
      modal: document.getElementById(MODAL_ID),
      backdrop: document.getElementById("modal-backdrop")
    };
  }
  
  // Create backdrop for modal
  const backdrop = document.createElement("div");
  backdrop.id = "modal-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: none;
    animation: fadeIn 0.3s ease-out;
  `;
  
  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 24px 48px -12px rgba(0, 0, 0, 0.18);
    width: 680px;
    max-width: 90vw;
    max-height: 85vh;
    overflow: hidden;
    z-index: 10000;
    display: none;
    animation: modalSlideIn 0.4s ease-out forwards;
  `;
  
  modal.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
      padding: 24px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        </div>
        <div>
          <h2 style="
            margin: 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            color: white;
            font-size: 24px;
            font-weight: 400;
          ">AI Powered Email Assistant</h2>
          <p style="
            margin: 0;
            font-family: Roboto, Arial, sans-serif;
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
          ">Developed and crafted by 
            <a href="https://www.linkedin.com/in/pramodsbaviskar/" 
               target="_blank" 
               rel="noopener noreferrer"
               id="developer-link"
               style="
                 color: white;
                 text-decoration: none;
                 font-weight: 500;
                 border-bottom: 1px solid rgba(255, 255, 255, 0.5);
                 transition: border-color 0.2s ease;
               ">Pramod Baviskar</a>
          </p>
        </div>
      </div>
      <button id="close-modal" style="
        background: rgba(255, 255, 255, 0.1);
        border: none;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        cursor: pointer;
        color: white;
        font-size: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>
    
    <div style="
      padding: 32px;
      max-height: calc(85vh - 180px);
      overflow-y: auto;
    ">
    <!-- Thread Summary Section - Properly Aligned -->
<div id="thread-summary-toggle" style="
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8eaed;
">
  <div style="
    display: flex;
    align-items: center;
    justify-content: space-between;
  ">
    <div style="flex: 1;">
      <h3 style="
        margin: 0 0 2px 0;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #202124;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        📊 Email Thread Summary
      </h3>
      <p style="
        margin: 0;
        font-size: 12px;
        color: #5f6368;
        line-height: 1.3;
      ">AI-generated conversation analysis</p>
    </div>
    
    <!-- Properly aligned toggle switch -->
    <label class="toggle-switch" style="
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
      margin-left: 16px;
      flex-shrink: 0;
    ">
      <input type="checkbox" id="summary-mode-switch" style="
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
        background-color: #ccc;
        transition: .3s;
        border-radius: 24px;
      "></span>
    </label>
  </div>
  
  <div id="thread-summary-section" style="display: none; margin-top: 12px;">
    <div id="summary-content" style="
      background: white;
      padding: 12px;
      border-radius: 6px;
      border: 1px solid #dadce0;
      font-family: Roboto, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #202124;
      max-height: 250px;
      overflow-y: auto;
    ">
      <!-- Summary content will be loaded here -->
    </div>
  </div>
</div>
  
      <!-- Custom Reply Mode - Properly Aligned -->
<div id="custom-prompt-toggle" style="
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e8eaed;
">
  <div style="
    display: flex;
    align-items: center;
    justify-content: space-between;
  ">
    <div style="flex: 1;">
      <h3 style="
        margin: 0 0 2px 0;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
        font-size: 14px;
        font-weight: 500;
        color: #202124;
        display: flex;
        align-items: center;
        gap: 8px;
      ">
        ✏️ Custom Reply Mode
      </h3>
      <p style="
        margin: 0;
        font-size: 12px;
        color: #5f6368;
        line-height: 1.3;
      ">Provide custom instructions for AI</p>
    </div>
    
    <!-- Properly aligned toggle switch -->
    <label class="toggle-switch" style="
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
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
        background-color: #ccc;
        transition: .3s;
        border-radius: 24px;
      "></span>
    </label>
  </div>
  
  <div id="custom-prompt-section" style="display: none; margin-top: 12px;">
    <textarea id="custom-prompt-input" placeholder="E.g., 'Write a polite rejection for this interview invitation mentioning schedule conflicts'" style="
      width: 100%;
      min-height: 80px;
      padding: 10px 12px;
      border: 1px solid #dadce0;
      border-radius: 6px;
      font-family: Roboto, Arial, sans-serif;
      font-size: 13px;
      resize: vertical;
      transition: border-color 0.2s ease;
      box-sizing: border-box;
      margin-bottom: 8px;
    "></textarea>
    
    <div style="
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-bottom: 8px;
    ">
      <button class="preset-btn" data-prompt="Write a polite rejection for this interview invitation due to other commitments" style="
        padding: 4px 8px;
        background: #e8f0fe;
        border: 1px solid #c1d9fe;
        border-radius: 12px;
        color: #1a73e8;
        font-size: 11px;
        font-family: Roboto, Arial, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Reject Interview</button>
      
      <button class="preset-btn" data-prompt="Cancel this meeting professionally, apologizing for the inconvenience" style="
        padding: 4px 8px;
        background: #e8f0fe;
        border: 1px solid #c1d9fe;
        border-radius: 12px;
        color: #1a73e8;
        font-size: 11px;
        font-family: Roboto, Arial, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Cancel Meeting</button>
      
      <button class="preset-btn" data-prompt="Postpone this appointment to next week, suggesting alternative times" style="
        padding: 4px 8px;
        background: #e8f0fe;
        border: 1px solid #c1d9fe;
        border-radius: 12px;
        color: #1a73e8;
        font-size: 11px;
        font-family: Roboto, Arial, sans-serif;
        cursor: pointer;
        transition: all 0.2s ease;
      ">Reschedule</button>
    </div>
    
    <button id="generate-custom-reply" style="
      width: 100%;
      padding: 8px 16px;
      background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
      border: none;
      border-radius: 6px;
      color: white;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    ">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      Generate Reply
    </button>
  </div>
</div>
      
      <div id="reply-content" style="
        min-height: 250px;
        padding: 24px;
        background: #f8f9fa;
        border-radius: 12px;
        margin-bottom: 24px;
        font-family: 'Roboto', Arial, sans-serif;
        font-size: 15px;
        line-height: 1.6;
        color: #202124;
        border: 1px solid #e8eaed;
        position: relative;
        overflow: hidden;
      ">
        <div class="loading-state" style="
          text-align: center;
          padding: 40px 0;
        ">
          <div style="
            width: 60px;
            height: 60px;
            margin: 0 auto 24px;
            position: relative;
          ">
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border: 3px solid #f3f3f3;
              border-radius: 50%;
            "></div>
            <div style="
              position: absolute;
              width: 100%;
              height: 100%;
              border: 3px solid transparent;
              border-top: 3px solid #1a73e8;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
          </div>
          <h3 style="
            margin: 0 0 8px 0;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 18px;
            font-weight: 400;
            color: #5f6368;
          ">Crafting your reply...</h3>
          <p style="
            margin: 0;
            color: #80868b;
            font-size: 14px;
          ">AI is analyzing the email and generating a professional response</p>
        </div>
      </div>
      
      <div style="
        display: flex;
        gap: 16px;
        justify-content: flex-end;
        padding-top: 8px;
      ">
        <button id="copy-reply" style="
          padding: 12px 24px;
          border: 1px solid #dadce0;
          background: white;
          color: #1a73e8;
          border-radius: 8px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
          Copy to Clipboard
        </button>
        <button id="insert-reply" style="
          padding: 12px 32px;
          border: none;
          background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
          color: white;
          border-radius: 8px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
          background: linear-gradient(135deg, #34a853 0%, #188038 100%);
          color: white;
          border-radius: 8px;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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
    </div>
    
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes modalSlideIn {
        from {
          transform: translate(-50%, -50%) scale(0.9);
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
      
      #close-modal:hover {
        background: rgba(255, 255, 255, 0.2) !important;
        transform: rotate(90deg);
      }
      
      #copy-reply:hover {
        background: #f8f9fa !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      
      #insert-reply:hover {
        background: linear-gradient(135deg, #1557b0 0%, #1240a0 100%) !important;
        box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3);
        transform: translateY(-1px);
      }
      
      #direct-reply:hover {
        background: linear-gradient(135deg, #188038 0%, #0d652d 100%) !important;
        box-shadow: 0 4px 8px rgba(52, 168, 83, 0.3);
        transform: translateY(-1px);
      }
      
      #reply-content:not(.loading) .loading-state {
        display: none;
      }
      
      /* Toggle Switch Styles - Updated */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 24px;
}

.toggle-switch .slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
}

/* Green when checked */
.toggle-switch input:checked + .slider {
  background-color: #34a853;
}

.toggle-switch input:focus + .slider {
  box-shadow: 0 0 1px #34a853;
}

.toggle-switch input:checked + .slider:before {
  transform: translateX(20px);
}

/* Hover effects */
.toggle-switch .slider:hover {
  opacity: 0.9;
}

.toggle-switch input:checked + .slider:hover {
  background-color: #2d8f47;
}
      /* Preset button styles */
      .preset-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      /* Blue buttons (rejection/cancellation) */
      .preset-btn[style*="#e8f0fe"]:hover {
        background: #d2e3fc !important;
        border-color: #a8c7fa !important;
      }
      
      /* Green buttons (acceptance) */
      .preset-btn[style*="#e6f4ea"]:hover {
        background: #c8e6c9 !important;
        border-color: #a5d6a7 !important;
      }
      
      /* Yellow buttons (information) */
      .preset-btn[style*="#fef7e0"]:hover {
        background: #feeaa7 !important;
        border-color: #fdcc80 !important;
      }
      
      /* Purple buttons (acknowledgment) */
      .preset-btn[style*="#f3e8ff"]:hover {
        background: #e0b3ff !important;
        border-color: #d092ff !important;
      }
      
      /* Dark green buttons (business) */
      .preset-btn[style*="#e8f5e8"]:hover {
        background: #c8e6c9 !important;
        border-color: #a5d6a7 !important;
      }
      
      /* Pink buttons (deadline) */
      .preset-btn[style*="#fce4ec"]:hover {
        background: #f8bbd0 !important;
        border-color: #f48fb1 !important;
      }
      
      /* Light blue buttons (feedback) */
      .preset-btn[style*="#e3f2fd"]:hover {
        background: #bbdefb !important;
        border-color: #90caf9 !important;
      }
      
      .preset-btn:active {
        transform: scale(0.98);
      }
      
      /* Generate button styles */
      #generate-custom-reply:hover {
        background: linear-gradient(135deg, #1557b0 0%, #1240a0 100%) !important;
        box-shadow: 0 4px 8px rgba(26, 115, 232, 0.3) !important;
        transform: translateY(-1px);
      }
      
      #generate-custom-reply:active {
        transform: translateY(0);
      }
      
      /* Custom prompt input styles */
      #custom-prompt-input:focus {
        outline: none;
        border-color: #1a73e8;
      }
      
      /* Scrollbar styling */
      #reply-content::-webkit-scrollbar {
        width: 8px;
      }
      
      #reply-content::-webkit-scrollbar-track {
        background: #f1f3f4;
        border-radius: 4px;
      }
      
      #reply-content::-webkit-scrollbar-thumb {
        background: #dadce0;
        border-radius: 4px;
      }
      
      #reply-content::-webkit-scrollbar-thumb:hover {
        background: #bdc1c6;
      }
      
      /* Success animation */
      @keyframes successPulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); }
      }
      
      .success-icon {
        animation: successPulse 0.6s ease-out;
      }
      
      /* Developer link hover effect */
      #developer-link:hover {
        border-bottom-color: rgba(255, 255, 255, 0.9) !important;
      }
    </style>
  `;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(modal);
  
  // Add event listeners for toggle switch
  const toggleSwitch = document.getElementById("custom-mode-switch");
  const customPromptSection = document.getElementById("custom-prompt-section");
  
  toggleSwitch.addEventListener("change", (e) => {
    customPromptSection.style.display = e.target.checked ? "block" : "none";
    const replyContent = document.getElementById("reply-content");
    
    if (e.target.checked) {
      // Hide the reply content in custom mode initially
      replyContent.style.display = "none";
    } else {
      // Show the reply content and generate immediately in auto mode
      replyContent.style.display = "block";
      // Get the email content and generate reply automatically
      const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
      if (emailContent) {
        generateReplyContent(emailContent.innerText, false, null);
      }
    }
  });
  
  // Add event listeners for preset buttons
  const presetButtons = document.querySelectorAll(".preset-btn");
  const customPromptInput = document.getElementById("custom-prompt-input");
  
  presetButtons.forEach(button => {
     button.addEventListener("click", () => {
       customPromptInput.value = button.getAttribute("data-prompt");
       // Visual feedback
       button.style.background = "#c8e6c9 !important";
       button.style.borderColor = "#a5d6a7 !important";
       setTimeout(() => {
         button.style.background = "#e8f0fe !important";
         button.style.borderColor = "#c1d9fe !important";
       }, 200);
     });
   });
  // Add event listener for Generate Reply button
  const generateButton = document.getElementById("generate-custom-reply");
  if (generateButton) {
    generateButton.addEventListener("click", () => {
      const customPrompt = customPromptInput.value.trim();
      if (!customPrompt) {
        alert("Please enter a custom prompt or select a preset option");
        return;
      }
      
      // Show reply content area and generate with custom prompt
      const replyContent = document.getElementById("reply-content");
      replyContent.style.display = "block";
      
      const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
      if (emailContent) {
        generateReplyContent(emailContent.innerText, true, customPrompt);
      }
    });
  }
  
// Add event listeners for summary toggle with caching
const summaryToggleSwitch = document.getElementById("summary-mode-switch");
const threadSummarySection = document.getElementById("thread-summary-section");
const summaryContent = document.getElementById("summary-content");

if (summaryToggleSwitch) {
  summaryToggleSwitch.addEventListener("change", async (e) => {
    threadSummarySection.style.display = e.target.checked ? "block" : "none";
    
    if (e.target.checked) {
      const cacheKey = `summary_${generateCacheKey()}`;
      
      // Check if we already have a cached summary for this thread
      if (responseCache.has(cacheKey)) {
        console.log("📄 Using cached summary");
        const cachedSummary = responseCache.get(cacheKey);
        
        // Add a small indicator that it's cached
        summaryContent.innerHTML = `
          <div style="
            position: relative;
            border: 1px solid #e8eaed;
            border-radius: 8px;
            background: #f8f9fa;
            margin-bottom: 12px;
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
            <div style="padding: 16px;">
            </div>
          </div>
        `;
        
        displayThreadSummary(summaryContent, cachedSummary);
        return;
      }
      
      // If not cached, show loading and make API call
      console.log("🔄 Generating new summary");
      summaryContent.innerHTML = `
        <div class="summary-loading" style="text-align: center; padding: 20px 0;">
          <div style="width: 40px; height: 40px; margin: 0 auto 16px; position: relative;">
            <div style="position: absolute; width: 100%; height: 100%; border: 3px solid #f3f3f3; border-radius: 50%;"></div>
            <div style="position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-top: 3px solid #1a73e8; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          </div>
          <p style="margin: 0; color: #5f6368; font-size: 14px;">Analyzing conversation history...</p>
        </div>
      `;
      
      try {
        const threadData = await extractEmailThread();
        const analysisResult = await analyzeEmailThread(threadData);
        
        // Extract the analysis data from the nested structure
        const analysisData = analysisResult.analysis || analysisResult;
        
        if (analysisData && analysisData.summary) {
          // Cache the analysis data
          responseCache.set(cacheKey, analysisData);
          console.log("💾 Cached summary data");
          
          displayThreadSummary(summaryContent, analysisData);
        } else {
          summaryContent.innerHTML = `
            <div style="text-align: center; padding: 20px;">
              <p style="margin: 0; color: #5f6368; font-size: 14px;">No analysis data found.</p>
            </div>
          `;
        }
        
      } catch (error) {
        console.error("Error:", error);
        summaryContent.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <p style="margin: 0; color: #ea4335; font-size: 14px;">Error: ${error.message}</p>
          </div>
        `;
      }
    }
  });
}

  // Add event listeners
  backdrop.addEventListener("click", () => {
    backdrop.style.animation = "fadeOut 0.3s ease-out forwards";
    modal.style.animation = "modalSlideOut 0.3s ease-out forwards";
    setTimeout(() => {
      backdrop.style.display = "none";
      modal.style.display = "none";
    }, 300);
  });
  
  document.getElementById("close-modal").addEventListener("click", () => {
    backdrop.style.animation = "fadeOut 0.3s ease-out forwards";
    modal.style.animation = "modalSlideOut 0.3s ease-out forwards";
    setTimeout(() => {
      backdrop.style.display = "none";
      modal.style.display = "none";
    }, 300);
  });
  
  document.getElementById("copy-reply").addEventListener("click", () => {
  // Get text from the actual reply content, excluding HTML structure
  const replyTextElement = document.getElementById("cached-reply-text") || 
                          document.querySelector("#reply-content div[style*='white-space: pre-wrap']") ||
                          document.getElementById("reply-content");
  
  const replyText = replyTextElement.innerText || replyTextElement.textContent;
  
  navigator.clipboard.writeText(replyText).then(() => {
    // Show success feedback
    const button = document.getElementById("copy-reply");
    const originalContent = button.innerHTML;
    button.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" class="success-icon">
        <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
      </svg>
      Copied!
    `;
    button.style.color = "#34a853";
    
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.style.color = "#1a73e8";
    }, 2000);
  });
});

document.getElementById("insert-reply").addEventListener("click", () => {
  // Get only the reply text, not the HTML structure
  const replyTextElement = document.getElementById("cached-reply-text") || 
                          document.querySelector("#reply-content div[style*='white-space: pre-wrap']") ||
                          document.getElementById("reply-content");
  
  const replyText = replyTextElement.innerText || replyTextElement.textContent;
  
  insertReplyIntoGmail(replyText);
  
  // Close modal with animation
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById(MODAL_ID);
  backdrop.style.animation = "fadeOut 0.3s ease-out forwards";
  modal.style.animation = "modalSlideOut 0.3s ease-out forwards";
  setTimeout(() => {
    backdrop.style.display = "none";
    modal.style.display = "none";
  }, 300);
});

document.getElementById("direct-reply").addEventListener("click", () => {
  // Get only the reply text, not the HTML structure
  const replyTextElement = document.getElementById("cached-reply-text") || 
                          document.querySelector("#reply-content div[style*='white-space: pre-wrap']") ||
                          document.getElementById("reply-content");
  
  const replyText = replyTextElement.innerText || replyTextElement.textContent;
  
  directReplyEmail(replyText);
  
  // Close modal with animation
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById(MODAL_ID);
  backdrop.style.animation = "fadeOut 0.3s ease-out forwards";
  modal.style.animation = "modalSlideOut 0.3s ease-out forwards";
  setTimeout(() => {
    backdrop.style.display = "none";
    modal.style.display = "none";
  }, 300);
});
  // Add closing animations
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    
    @keyframes modalSlideOut {
      from {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      to {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
  
  return { modal, backdrop };
}

/**
 * Enhanced function to expand all collapsed parts of the email thread
 */
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
    
    // Give more time for DOM to update after expansions
    setTimeout(resolve, 1000);
  });
}

/**
 * Format email content to preserve line breaks and paragraphs
 */
function formatEmailContent(content) {
  if (!content) return "";
  
  // Add line breaks after common email patterns
  let formatted = content
    // Add line break after "wrote:" pattern
    .replace(/(wrote:)([^\n])/g, '$1\n$2')
    
    // Add line breaks for greeting patterns
    .replace(/(Greetings,|Dear|Hello|Hi|Hey)([^\n])/g, '$1\n$2')
    
    // Add line breaks for signature patterns
    .replace(/(Regards,|Sincerely,|Best,|Thanks,|Thank you,)([^\n])/g, '$1\n$2')
    
    // Fix line breaks for common separators
    .replace(/(.)(https?:\/\/)/g, '$1\n\n$2');
  
  // Remove excess line breaks
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  return formatted;
}

/**
 * Main function to extract email thread with support for larger chains
 */
async function extractEmailThread() {
  console.log("Starting improved email thread extraction for larger chains...");
  
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
  
  // APPROACH FOR LARGER CHAINS:
  // 1. Find all distinct message containers
  // 2. Extract visible content from each
  // 3. Look for quoted blocks within each
  // 4. Sort by position in thread
  
  // Get all message containers - try multiple selectors for different Gmail layouts
  const containerSelectors = [
    'div[role="listitem"]',                // Main message containers
    'div.adn.ads',                         // Individual message blocks
    'div.gs',                              // Message groups
    'div[data-message-id]',                // Messages with IDs
    'table.message'                        // Table-based messages (older Gmail)
  ];
  
  let allContainers = [];
  
  // Collect all potential containers
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
    // Skip if no height (invisible) or already processed
    if (!container.offsetHeight) continue;
    
    // Generate a container ID (use data attributes if available, otherwise position)
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
    
    // 1. Extract sender information
    const senderInfo = extractSenderInfo(container);
    
    // 2. Extract visible content (excluding quotes)
    const visibleContent = extractVisibleContent(container);
    
    // 3. Look for quoted content (previous messages)
    const quotedMessages = extractQuotedMessages(container);
    
    // 4. Add the container's visible content as a message (if not empty)
    if (visibleContent && visibleContent.trim().length > 15) {
      threadData.emails.push({
        index: i * 10, // Use multiples of 10 to leave space for quoted messages
        sender: senderInfo.name,
        senderEmail: senderInfo.email,
        timestamp: senderInfo.timestamp,
        fullContent: formatEmailContent(visibleContent),
        isQuoted: false
      });
    }
    
    // 5. Add quoted messages (if any)
    quotedMessages.forEach((message, j) => {
      // Avoid duplicates by checking content similarity
      const isDuplicate = threadData.emails.some(email => 
        email.fullContent && message.content && 
        (email.fullContent.includes(message.content.substring(0, 50)) || 
         message.content.includes(email.fullContent.substring(0, 50)))
      );
      
      if (!isDuplicate && message.content.trim().length > 15) {
        threadData.emails.push({
          index: (i * 10) + j + 1, // Position quoted messages after their container
          sender: message.sender,
          senderEmail: message.email,
          timestamp: message.timestamp,
          fullContent: formatEmailContent(message.content),
          isQuoted: true
        });
      }
    });
  }
  
  // Remove duplicate messages
  threadData.emails = removeDuplicateEmails(threadData.emails);
  
  // Sort: older messages first (by index)
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
  console.log("COMPLETE THREAD TEXT:", threadData.completeThreadText);
  
  return threadData;
}

/**
 * Extract sender information from a message container
 */
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
    // Try to get email from attributes
    const emailAttr = element.getAttribute('email') || 
                      element.getAttribute('data-hovercard-id');
    
    if (emailAttr && emailAttr.includes('@')) {
      email = emailAttr;
      name = element.textContent.trim();
      break;
    } 
    // If element text contains email pattern
    else if (element.textContent.includes('@')) {
      const emailMatch = element.textContent.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (emailMatch && emailMatch[1]) {
        email = emailMatch[1];
        name = element.textContent.trim();
        break;
      }
    }
    // Just get the display name
    else if (element.textContent.trim()) {
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

/**
 * Extract visible content from a message container (excluding quoted content)
 */
function extractVisibleContent(container) {
  // Try various selectors to find content
  const contentSelectors = [
    '.a3s.aiL', '.a3s', '.ii.gt div[dir="ltr"]', 
    '.message-body', '.adP', '.Am.Al.editable'
  ];
  
  let content = "";
  
  // Find content elements, excluding quoted sections
  for (const selector of contentSelectors) {
    const elements = container.querySelectorAll(selector);
    for (const element of elements) {
      // Create a clone to avoid modifying original DOM
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
  
  // If no content found, try getting all text and clean it
  if (!content) {
    // Clone to avoid modifying the DOM
    const clone = container.cloneNode(true);
    
    // Remove quoted sections and UI elements
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

/**
 * Extract quoted messages from a container
 */
function extractQuotedMessages(container) {
  const quotedMessages = [];
  
  // Find all quoted elements
  const quotedElements = container.querySelectorAll('.gmail_quote, blockquote, .yahoo_quoted');
  
  quotedElements.forEach(element => {
    const quoteText = element.innerText.trim();
    
    // Try to parse sender info and content
    let sender = "Previous sender";
    let email = "";
    let timestamp = "Earlier";
    let content = quoteText;
    
    // Look for common header patterns
    // Pattern 1: "On [date], [name] <[email]> wrote:"
    const onWroteMatch = quoteText.match(/On .+?, (.+?) <([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)> wrote:/);
    if (onWroteMatch) {
      sender = onWroteMatch[1].trim();
      email = onWroteMatch[2];
      
      // Extract timestamp from the header
      const dateMatch = quoteText.match(/On (.+?),/);
      if (dateMatch) {
        timestamp = dateMatch[1].trim();
      }
      
      // Get content after the header
      const headerEnd = quoteText.indexOf("wrote:") + 6;
      if (headerEnd > 6) {
        content = quoteText.substring(headerEnd).trim();
      }
    }
    // Pattern 2: "From: [name] <[email]>"
    else {
      const fromMatch = quoteText.match(/From: (.+?) <([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)>/);
      if (fromMatch) {
        sender = fromMatch[1].trim();
        email = fromMatch[2];
        
        // Extract date from common headers
        const dateMatch = quoteText.match(/Date: (.+?)(?:\r|\n)/);
        if (dateMatch) {
          timestamp = dateMatch[1].trim();
        }
        
        // Get content after the headers
        const subjectIndex = quoteText.indexOf("Subject:");
        if (subjectIndex > 0) {
          const nextLine = quoteText.indexOf("\n", subjectIndex);
          if (nextLine > 0) {
            content = quoteText.substring(nextLine + 1).trim();
          }
        }
      }
    }
    
    // If we couldn't extract sender via patterns, just check for email addresses
    if (sender === "Previous sender") {
      const emailMatch = quoteText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
      if (emailMatch) {
        email = emailMatch[1];
      }
    }
    
    // Add to quoted messages
    quotedMessages.push({
      sender,
      email,
      timestamp,
      content
    });
  });
  
  return quotedMessages;
}

/**
 * Helper function to remove duplicate emails based on content similarity
 */
function removeDuplicateEmails(emails) {
  const uniqueEmails = [];
  const seenContents = new Set();
  
  emails.forEach(email => {
    // Create a simplified content signature for comparison
    const contentSignature = email.fullContent
      .substring(0, 100)     // First 100 chars
      .toLowerCase()         // Case insensitive
      .replace(/\s+/g, ' '); // Normalize whitespace
    
    // Check if we've seen this content before
    if (!seenContents.has(contentSignature) && contentSignature.length > 10) {
      seenContents.add(contentSignature);
      uniqueEmails.push(email);
    }
  });
  
  return uniqueEmails;
}

// Make them both the same function
const extractEmailThreadDirect = extractEmailThread;

/**
 * Clean up email content to remove UI elements, timestamps, and quoted content
 */
function cleanEmailContent(content, timestamp) {
  let cleaned = content;
  
  // Remove the timestamp from the content if it appears at the beginning
  if (timestamp && cleaned.startsWith(timestamp)) {
    cleaned = cleaned.substring(timestamp.length).trim();
  }
  
  // Remove common Gmail interface text
  const uiTexts = [
    "Click here to Reply or Forward",
    "Reply Forward",
    "Reply all Forward",
    "Show details",
    "Hide details",
    "Reply Reply all Forward"
  ];
  
  uiTexts.forEach(text => {
    cleaned = cleaned.replace(new RegExp(text, "g"), "");
  });
  
  // Remove quoted content
  cleaned = removeQuotedContent(cleaned);
  
  // Replace multiple line breaks with just two
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  
  return cleaned.trim();
}

/**
 * Helper function to remove quoted content from emails to avoid duplication
 */
function removeQuotedContent(content) {
  // Common patterns for quoted content
  const quotedPatterns = [
    /On .* wrote:[\s\S]+/i,                  // "On DATE, PERSON wrote:"
    /From: .*\r?\n[\s\S]+Sent: .*\r?\n/i,    // Outlook style quotes
    /From:.*\[mailto:.*\][\s\S]+/i,          // Another Outlook format
    /------+ ?Forwarded message ?------+[\s\S]+/i, // Forwarded messages
    /------+ ?Original Message ?------+[\s\S]+/i,  // Original message quotes
    /-{5,}[\s\S]+/,                         // Any 5 or more hyphens followed by content
    /\>[\s\S]+/                              // Content with > prefix (quoted replies)
  ];
  
  let cleanContent = content;
  
  // Try removing each pattern
  quotedPatterns.forEach(pattern => {
    cleanContent = cleanContent.replace(pattern, '');
  });
  
  return cleanContent.trim();
}

/**
 * Helper function to remove duplicate emails based on content similarity
 */
function removeDuplicateEmails(emails) {
  const uniqueEmails = [];
  const seenContents = new Set();
  
  emails.forEach(email => {
    // Create a simplified version of content for comparison (first 100 chars)
    const contentSignature = email.fullContent.substring(0, 100).toLowerCase().replace(/\s+/g, ' ');
    
    // Check if we've seen this content before
    if (!seenContents.has(contentSignature) && contentSignature.length > 10) {
      seenContents.add(contentSignature);
      uniqueEmails.push(email);
    }
  });
  
  return uniqueEmails;
}

/**
 * Direct extraction function that tries multiple strategies
 * This can be called directly from your button click handler
 */


// Example usage:
// button.addEventListener("click", async () => {
//   const threadData = await extractEmailThreadDirect();
//   console.log("Thread data:", threadData);
// });


function extractReceiverEmail() {
  // Method A: Check Gmail's recipient span (typically for sent mail)
  const recipientSpan = document.querySelector('span.g2[email]');
  if (recipientSpan) {
    return recipientSpan.getAttribute('email');
  }

  // Method B: Look through all span[email] elements and filter likely recipient
  const emailElements = document.querySelectorAll('span[email]');
  for (const el of emailElements) {
    const email = el.getAttribute('email');
    const name = el.getAttribute('name') || el.textContent.trim();
    if (email && name !== email) {
      return email; // Likely recipient
    }
  }

  // Method C: Fallback - Look for mailto links in the email header
  const mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
  for (const link of mailtoLinks) {
    const href = link.getAttribute('href');
    const emailMatch = href.match(/^mailto:([^?]+)/);
    if (emailMatch) {
      return emailMatch[1];
    }
  }

  // Nothing found
  return null;
}



// Function to insert reply into Gmail compose box
function insertReplyIntoGmail(replyText) {
  // Click the reply button to open compose area
  const replyButton = document.querySelector('div[role="button"][aria-label*="Reply"]');
  if (replyButton) {
    replyButton.click();
    
    // Wait for compose area to open
    setTimeout(() => {
      // Find the compose box (contenteditable div)
      const composeBox = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
      if (composeBox) {
        // Insert the reply text
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
  // Click the reply button to open compose area
  const replyButton = document.querySelector('div[role="button"][aria-label*="Reply"]');
  if (replyButton) {
    replyButton.click();
    
    // Wait for compose area to open
    setTimeout(() => {
      // Find the compose box (contenteditable div)
      const composeBox = document.querySelector('div[role="textbox"][aria-label*="Message Body"]');
      if (composeBox) {
        // Insert the reply text
        composeBox.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, replyText);
        
        // Wait a moment and then find and click the send button
        setTimeout(() => {
          // Try multiple selectors for the send button
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
            
            // Show success notification
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
  
  // Add slide up animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateX(-50%) translateY(100%); }
      to { transform: translateX(-50%) translateY(0); }
    }
  `;
  if (!document.head.querySelector('style[data-slideup]')) {
    style.setAttribute('data-slideup', 'true');
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

// Add slide down animation
const slideDownStyle = document.createElement("style");
slideDownStyle.textContent = `
  @keyframes slideDown {
    from { transform: translateX(-50%) translateY(0); }
    to { transform: translateX(-50%) translateY(150%); }
  }
`;
if (!document.head.querySelector('style[data-slidedown]')) {
  slideDownStyle.setAttribute('data-slidedown', 'true');
  document.head.appendChild(slideDownStyle);
}

// Update generateReply to accept receiver email
async function generateReply(emailContent, receiverEmail) {
  const modalElements = createModal();
  const modal = modalElements.modal;
  const backdrop = modalElements.backdrop;
  
  // Get the custom mode settings
  const customModeSwitch = document.getElementById("custom-mode-switch");
  const customPromptInput = document.getElementById("custom-prompt-input");
  const replyContent = document.getElementById("reply-content");
  
  // Show modal with animation
  backdrop.style.display = "block";
  modal.style.display = "block";
  backdrop.style.animation = "fadeIn 0.3s ease-out";
  modal.style.animation = "modalSlideIn 0.4s ease-out forwards";
  
  // Add receiver email to the modal header if available
  const modalHeader = modal.querySelector('h2');
  if (modalHeader && receiverEmail) {
    const emailInfo = document.createElement('p');
    emailInfo.style.cssText = `
      margin: 4px 0 0 0;
      font-family: Roboto, Arial, sans-serif;
      color: rgba(255, 255, 255, 0.8);
      font-size: 12px;
    `;
    emailInfo.textContent = `Replying to: ${receiverEmail}`;
    // modalHeader.insertAdjacentElement('afterend', emailInfo);
  }
  
  // If custom mode is enabled, just show the UI and wait for user input
  if (customModeSwitch && customModeSwitch.checked) {
    replyContent.style.display = "none";
    return;
  }
  
  // Otherwise, generate reply automatically
  replyContent.style.display = "block";
  generateReplyContent(emailContent, false, null, receiverEmail);
}

// Enhanced generateReply function with caching
async function generateReplyWithCache(emailContent, receiverEmail) {
  const cacheKey = `autoreply_${generateCacheKey()}`;
  
  // Check if we already have a cached response for this thread
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
    
    // Display the cached response with indicator
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

  // If not cached, proceed with normal generation and cache the result
  console.log("🔄 Generating new auto-reply response");
  
  // Call original generateReply function
  await generateReply(emailContent, receiverEmail);
  
  // The reply will be cached when generateReplyContent completes successfully
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

// Update the generateReplyContent function to accept and use the recipient email
async function generateReplyContent(emailContent, useCustomPrompt, customPrompt, receiverEmail) {
  const replyContent = document.getElementById("reply-content");
  
  // Show loading state
  replyContent.innerHTML = `
    <div class="loading-state" style="
      text-align: center;
      padding: 40px 0;
    ">
      <div style="
        width: 60px;
        height: 60px;
        margin: 0 auto 24px;
        position: relative;
      ">
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid #f3f3f3;
          border-radius: 50%;
        "></div>
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top: 3px solid #1a73e8;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
      </div>
      <h3 style="
        margin: 0 0 8px 0;
        font-family: 'Google Sans', Roboto, Arial, sans-serif;
        font-size: 18px;
        font-weight: 400;
        color: #5f6368;
      ">Crafting your reply...</h3>
      <p style="
        margin: 0;
        color: #80868b;
        font-size: 14px;
      ">AI is analyzing the email and generating a professional response</p>
      <p style="
        margin: 16px 0 0 0;
        color: #80868b;
        font-size: 12px;
      ">This may take a few seconds...</p>
      ${receiverEmail ? `<p style="margin: 8px 0 0 0; color: #1a73e8; font-size: 12px;">Replying to: ${receiverEmail}</p>` : ''}
    </div>
  `;
  
  replyContent.style.opacity = "1";
  replyContent.classList.add("loading");
  
  const requestBody = {
    prompt: emailContent,
    useCustomPrompt: Boolean(useCustomPrompt),
    customPrompt: customPrompt || "",
    receiverEmail: receiverEmail || "" // Include receiver email if available
  };

  // Define primary and fallback API endpoints
  const PRIMARY_API = `${BACKEND_URL}/generate`;
  const FALLBACK_API = `${FALLBACK_URL}/generate`;
  
  let usingFallback = false;
  
  try {
    // First try with primary API endpoint
    console.log("Sending request to primary API:", PRIMARY_API);
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    let response;
    try {
      // Try primary endpoint first
      response = await fetch(PRIMARY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Add timeout to catch long-running requests
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
    } catch (primaryError) {
      // Primary API failed, try fallback
      console.warn("Primary API failed, trying fallback:", primaryError.message);
      usingFallback = true;
      
      // Show fallback notification in UI
      const loadingStateEl = replyContent.querySelector(".loading-state p");
      if (loadingStateEl) {
        loadingStateEl.innerHTML = "Primary API unavailable. Trying backup server...";
      }
      
      // Try fallback API
      response = await fetch(FALLBACK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    }
    
    // Log response details
    console.log(`Response from ${usingFallback ? "fallback" : "primary"} API:`, response.status);
    
    const responseText = await response.text();
    
    if (!response.ok) {
      // If primary API failed with error status, try fallback
      if (!usingFallback && (response.status === 503 || response.status === 500 || response.status === 404)) {
        console.warn(`Primary API returned ${response.status}, trying fallback API`);
        usingFallback = true;
        
        // Update loading message
        const loadingStateEl = replyContent.querySelector(".loading-state p");
        if (loadingStateEl) {
          loadingStateEl.innerHTML = `Primary server returned ${response.status}. Trying backup server...`;
        }
        
        // Try fallback API
        const fallbackResponse = await fetch(FALLBACK_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        console.log("Fallback API response:", fallbackResponse.status);
        
        if (!fallbackResponse.ok) {
          throw new Error(`Both APIs failed. Fallback API: HTTP error! status: ${fallbackResponse.status}`);
        }
        
        const fallbackResponseText = await fallbackResponse.text();
        const data = JSON.parse(fallbackResponseText);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        // Display the generated reply with fade effect
        displayReplyContent(replyContent, data.reply, true);
        return;
      } else {
        // Both APIs failed or we're already using fallback
        console.error("Response not OK:", response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }
    
    // Parse successful response
    const data = JSON.parse(responseText);
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Cache the response
      const cacheKey = `autoreply_${generateCacheKey()}`;
      responseCache.set(cacheKey, data.reply);
      console.log("💾 Cached auto-reply response");

      // Display the generated reply with fade effect
      displayReplyContent(replyContent, data.reply, usingFallback);
    
  } catch (error) {
    console.error("Error generating reply:", error);
    console.error("Error details:", error.message, error.stack);
    
    replyContent.classList.remove("loading");
    replyContent.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="#ea4335" style="margin-bottom: 16px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <h3 style="
          margin: 0 0 12px 0;
          font-family: 'Google Sans', Roboto, Arial, sans-serif;
          font-size: 18px;
          color: #202124;
          font-weight: 400;
        ">Failed to generate reply</h3>
        <p style="
          margin: 0 0 8px 0;
          color: #5f6368;
          font-size: 14px;
        ">${error.message}</p>
        <p style="
          margin: 0;
          color: #80868b;
          font-size: 13px;
        ">Our servers may be experiencing high traffic. Please try again later.</p>
      </div>
    `;
  }
}

// Function to send email thread to analyze-thread endpoint
async function analyzeEmailThread(threadData) {
  console.log("📊 Sending thread data to analyze-thread endpoint...");
  
  const requestBody = {
    thread: threadData
  };

  // Use the same backend URLs as generateReply
  const PRIMARY_API = `${BACKEND_URL}/analyze-thread`;
  const FALLBACK_API = `${FALLBACK_URL}/analyze-thread`;
  
  let usingFallback = false;
  
  try {
    let response;
    try {
      // Try primary endpoint first
      response = await fetch(PRIMARY_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
    } catch (primaryError) {
      console.warn("Primary analyze-thread API failed, trying fallback:", primaryError.message);
      usingFallback = true;
      
      // Try fallback API
      response = await fetch(FALLBACK_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
    }
    
    console.log(`Analyze-thread response from ${usingFallback ? "fallback" : "primary"} API:`, response.status);
    
    if (!response.ok) {
      if (!usingFallback && (response.status === 503 || response.status === 500 || response.status === 404)) {
        console.warn(`Primary analyze-thread API returned ${response.status}, trying fallback API`);
        
        const fallbackResponse = await fetch(FALLBACK_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!fallbackResponse.ok) {
          throw new Error(`Both analyze-thread APIs failed. Fallback API: HTTP error! status: ${fallbackResponse.status}`);
        }
        
        const fallbackData = await fallbackResponse.json();
        console.log("✅ Thread analysis completed via fallback API:", fallbackData);
        return fallbackData;
      } else {
        throw new Error(`Analyze-thread HTTP error! status: ${response.status}`);
      }
    }
    
    const data = await response.json();
    console.log("✅ Thread analysis completed:", data);
    return data;
    
  } catch (error) {
    console.error("❌ Error analyzing thread:", error);
    console.error("Error details:", error.message);
    // Don't throw error - this is a background operation
    return null;
  }
}

// Helper function to display reply content with fade effect
function displayReplyContent(replyContent, replyText, usedFallback) {
  replyContent.style.opacity = "0";
  setTimeout(() => {
    replyContent.classList.remove("loading");
    
    // Create reply container with fallback notice if applicable
    let replyHtml = `<div style="white-space: pre-wrap;">${replyText}</div>`;
    
    // Add a subtle notice if using fallback server
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
    
    // Add topics - handle the new format: topics.main[].label and subtopics
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
          <ul style="
            margin: 0;
            padding-left: 20px;
          ">
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
    
    // Add sentiment analysis - handle the new format: sentiment_analysis.overall
    if (analysisResult.sentiment_analysis) {
      const sentiment = analysisResult.sentiment_analysis;
      summaryHTML += `
        <div style="
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px solid #e8eaed;
        ">
          <h4 style="
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 15px;
            color: #202124;
            margin: 0 0 8px 0;
            font-weight: 500;
          ">Sentiment Analysis</h4>
          ${sentiment.overall ? `
            <p style="
              margin: 0 0 4px 0;
              font-size: 13px;
              color: #5f6368;
            ">Overall Sentiment: <span style="color: #202124; font-weight: 500; text-transform: capitalize;">${sentiment.overall}</span></p>
          ` : ''}
          ${sentiment.tone_shifts && sentiment.tone_shifts.length > 0 ? `
            <p style="
              margin: 0;
              font-size: 13px;
              color: #5f6368;
            ">Tone Changes: <span style="color: #202124; font-weight: 500;">${sentiment.tone_shifts.join(', ')}</span></p>
          ` : `
            <p style="
              margin: 0;
              font-size: 13px;
              color: #5f6368;
            ">Tone: <span style="color: #202124; font-weight: 500;">Consistent throughout</span></p>
          `}
        </div>
      `;
    }
    
    // Add named entities - handle the new simplified format
    if (analysisResult.named_entities) {
      const entities = analysisResult.named_entities;
      let entitiesHTML = '';
      
      // People (now just an array of strings)
      if (entities.people && entities.people.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">People</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.people.map(person => `<li>${person}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      // Companies (now just an array of strings)
      if (entities.companies && entities.companies.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">Companies</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.companies.map(company => `<li>${company}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      // Dates (if any)
      if (entities.dates && entities.dates.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">Important Dates</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.dates.map(date => `<li>${date}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      // Email addresses (if any)
      if (entities.email_addresses && entities.email_addresses.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">Email Addresses</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.email_addresses.map(email => `<li>${email}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      // Mobile numbers (if any)
      if (entities.mobile_numbers && entities.mobile_numbers.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">Phone Numbers</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.mobile_numbers.map(number => `<li>${number}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      // Locations (if any)
      if (entities.locations && entities.locations.length > 0) {
        entitiesHTML += `
          <div style="margin-bottom: 12px;">
            <h5 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 14px;
              color: #202124;
              margin: 0 0 4px 0;
              font-weight: 500;
            ">Locations</h5>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px;">
              ${entities.locations.map(location => `<li>${location}</li>`).join('')}
            </ul>
          </div>
        `;
      }
      
      if (entitiesHTML) {
        summaryHTML += `
          <div style="
            margin-top: 16px;
            padding-top: 12px;
            border-top: 1px solid #e8eaed;
          ">
            <h4 style="
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 15px;
              color: #202124;
              margin: 0 0 12px 0;
              font-weight: 500;
            ">Key Information</h4>
            ${entitiesHTML}
          </div>
        `;
      }
    }
    
    // If the API returned empty results
    if (summaryHTML === '') {
      summaryHTML = `
        <div style="text-align: center; padding: 20px;">
          <p style="
            margin: 0;
            color: #5f6368;
            font-size: 14px;
          ">No conversation analysis available for this thread.</p>
        </div>
      `;
    }
    
    summaryContainer.innerHTML = summaryHTML;
    summaryContainer.style.transition = "opacity 0.3s ease-in";
    summaryContainer.style.opacity = "1";
  }, 300);
}

// Add a function to clear modal content when navigating between emails
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
  const summaryModeSwitch = document.getElementById("summary-mode-switch");
  const threadSummarySection = document.getElementById("thread-summary-section");
  const summaryContent = document.getElementById("summary-content");
  
  if (summaryModeSwitch) {
    summaryModeSwitch.checked = false;
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
  // Check if we're viewing an email (not inbox)
  if (!window.location.href.includes('#inbox/')) {
    console.log("📧 Not viewing an email, skipping button injection");
    return;
  }

  // Try multiple possible selectors for Gmail's toolbar
  const selectors = [
    'div[gh="tm"]',
    'div[role="toolbar"]',
    'div.ams',
    'div.btC',
    'div.Cr.aqJ',
    'td.gU.Up > div > div',
    'div.G-atb',
    'div.nH.qY > div.nH.aqm > div > div > div > div'
  ];
  
  let toolbar = null;
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      if (el.offsetHeight > 0 && (el.querySelector('div[role="button"]') || el.querySelector('div[data-tooltip]'))) {
        toolbar = el;
        console.log(`✅ Found suitable toolbar with selector: ${selector}`);
        break;
      }
    }
    if (toolbar) break;
  }

  if (!toolbar) {
    console.log("❌ No suitable toolbar found");
    return;
  }

  // Check if button already exists
  if (document.getElementById(BUTTON_ID)) {
    console.log("✅ Button already exists");
    return;
  }

  console.log("🎯 Injecting button...");
  
  // Create a wrapper div similar to Gmail's button style
  const buttonWrapper = document.createElement("div");
  buttonWrapper.style.display = "inline-block";
  buttonWrapper.style.position = "relative";
  buttonWrapper.style.marginLeft = "8px";
  
  const button = document.createElement("div");
  button.id = BUTTON_ID;
  button.setAttribute("role", "button");
  button.setAttribute("tabindex", "0");
  button.innerHTML = `
    <div style="
      position: relative;
      padding: 8px 20px;
      text-align: center;
      border-radius: 100px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-family: 'Google Sans', Roboto, Arial, sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      overflow: hidden;
      letter-spacing: 0.5px;
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
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Auto-Reply
        <span style="
          font-size: 16px;
          animation: bounce 1.5s ease-in-out infinite;
        ">✨</span>
      </span>
      <div style="
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
        transition: left 0.5s;
      "></div>
    </div>
  `;
  
  // Add hover effect
  button.onmouseenter = (e) => {
    const innerDiv = e.currentTarget.firstElementChild;
    innerDiv.style.transform = "scale(1.05)";
    innerDiv.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
    innerDiv.style.background = "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)";
    // Trigger shine effect
    const shineEffect = innerDiv.querySelector('div[style*="left: -100%"]');
    if (shineEffect) {
      shineEffect.style.left = "100%";
    }
  };
  
  button.onmouseleave = (e) => {
    const innerDiv = e.currentTarget.firstElementChild;
    innerDiv.style.transform = "scale(1)";
    innerDiv.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
    innerDiv.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
    // Reset shine effect
    const shineEffect = innerDiv.querySelector('div[style*="left"]');
    if (shineEffect) {
      setTimeout(() => {
        shineEffect.style.left = "-100%";
      }, 500);
    }
  };
  
  // Add sparkle animation
  const sparkleStyle = document.createElement("style");
  sparkleStyle.textContent = `
    @keyframes sparkle {
      0% { transform: rotate(0deg) scale(1); }
      50% { transform: rotate(180deg) scale(1.1); }
      100% { transform: rotate(360deg) scale(1); }
    }
    
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `;
  if (!document.head.querySelector('style[data-sparkle]')) {
    sparkleStyle.setAttribute('data-sparkle', 'true');
    document.head.appendChild(sparkleStyle);
  }
  
button.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  console.log("🚀 Auto-Reply button clicked!");
  
  // Extract receiver's email address
  const receiverEmail = extractReceiverEmail();
  console.log("📧 Receiver's email:", receiverEmail);

  const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
  if (emailContent) {
    const emailText = emailContent.innerText;
    console.log("📧 Email content found:", emailText.substring(0, 100) + "...");
    
    // Extract email thread for analysis (background operation with caching)
    console.log("🔍 Extracting email thread for analysis...");
    try {
      const cacheKey = `summary_${generateCacheKey()}`;
      
      // Only extract and analyze thread if not already cached
      if (!responseCache.has(cacheKey)) {
        const threadData = await extractEmailThread();
        console.log("📊 Thread extracted, sending to analyze-thread endpoint...");
        
        // Send thread data to analyze-thread endpoint (background operation)
        analyzeEmailThread(threadData).then(result => {
          if (result && result.analysis) {
            responseCache.set(cacheKey, result.analysis);
            console.log("💾 Cached summary data from auto-reply");
          }
        }).catch(error => {
          console.error("Background thread analysis failed:", error);
        });
      } else {
        console.log("📄 Thread analysis already cached");
      }
      
    } catch (error) {
      console.error("Error extracting thread:", error);
    }

    // Generate reply with caching
    await generateReplyWithCache(emailText, receiverEmail);
  } else {
    alert("Could not find email content. Please make sure you're viewing an email.");
  }
}, true);

  // Add keyboard support
  button.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      button.click();
    }
  });
  
  buttonWrapper.appendChild(button);
  toolbar.appendChild(buttonWrapper);
  console.log("✅ Auto-Reply button injected successfully");
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
  }
  
  injectButton();
}

// Start checking
checkInterval = setInterval(checkAndInjectButton, 500);

// Also listen for Gmail's navigation events
if (window.addEventListener) {
  window.addEventListener('hashchange', () => {
    console.log("🔄 Hash changed, checking for button injection...");
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

// Start observing the document body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log("✅ Gmail Auto-Reply monitoring started");