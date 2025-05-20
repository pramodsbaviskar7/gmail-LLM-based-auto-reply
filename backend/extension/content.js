console.log("✅ Gmail Auto LLM Reply: Content script loaded");

const BUTTON_ID = "auto-reply-button";
const MODAL_ID = "auto-reply-modal";
const BACKEND_URL = "https://gmail-llm-based-auto-reply.vercel.app";
const FALLBACK_URL = "https://gmail-llm-based-auto-reply.onrender.com";
let checkInterval = null;
let currentUrl = window.location.href;

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
      <!-- Toggle for custom prompt -->
      <div id="custom-prompt-toggle" style="
        margin-bottom: 24px;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 12px;
        border: 1px solid #e8eaed;
      ">
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        ">
          <div>
            <h3 style="
              margin: 0 0 4px 0;
              font-family: 'Google Sans', Roboto, Arial, sans-serif;
              font-size: 16px;
              font-weight: 500;
              color: #202124;
            ">Custom Reply Mode</h3>
            <p style="
              margin: 0;
              font-size: 13px;
              color: #5f6368;
            ">Provide your own instructions for the AI to generate replies</p>
          </div>
          <label class="toggle-switch" style="
            position: relative;
            display: inline-block;
            width: 48px;
            height: 26px;
          ">
            <input type="checkbox" id="custom-mode-switch" style="
              opacity: 0;
              width: 0;
              height: 0;
            ">
            <span class="slider" style="
              position: absolute;
              cursor: pointer;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: #ccc;
              transition: .4s;
              border-radius: 34px;
            "></span>
          </label>
        </div>
        
        <div id="custom-prompt-section" style="display: none;">
          <textarea id="custom-prompt-input" placeholder="E.g., 'Write a polite rejection for this interview invitation mentioning schedule conflicts' or 'Cancel this meeting professionally, expressing gratitude'" style="
            width: 100%;
            min-height: 120px;
            padding: 12px 16px;
            border: 1px solid #dadce0;
            border-radius: 8px;
            font-family: Roboto, Arial, sans-serif;
            font-size: 14px;
            resize: vertical;
            transition: border-color 0.2s ease;
            box-sizing: border-box;
          "></textarea>
          
          <div style="
            margin-top: 12px;
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: center;
          ">
            <button class="preset-btn" data-prompt="Write a polite rejection for this interview invitation due to other commitments" style="
              padding: 8px 16px;
              background: #e8f0fe;
              border: 1px solid #c1d9fe;
              border-radius: 8px;
              color: #1a73e8;
              font-size: 13px;
              font-family: Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Reject Interview</button>
            <button class="preset-btn" data-prompt="Cancel this meeting professionally, apologizing for the inconvenience" style="
              padding: 8px 16px;
              background: #e8f0fe;
              border: 1px solid #c1d9fe;
              border-radius: 8px;
              color: #1a73e8;
              font-size: 13px;
              font-family: Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Cancel Meeting</button>
            <button class="preset-btn" data-prompt="Postpone this appointment to next week, suggesting alternative times" style="
              padding: 8px 16px;
              background: #e8f0fe;
              border: 1px solid #c1d9fe;
              border-radius: 8px;
              color: #1a73e8;
              font-size: 13px;
              font-family: Roboto, Arial, sans-serif;
              cursor: pointer;
              transition: all 0.2s ease;
            ">Reschedule</button>
          </div>
          
          <button id="generate-custom-reply" style="
            margin-top: 16px;
            width: 100%;
            padding: 12px 24px;
            background: linear-gradient(135deg, #1a73e8 0%, #1557b0 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-family: 'Google Sans', Roboto, Arial, sans-serif;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          ">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
      
      /* Toggle switch styles */
      .toggle-switch .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        transition: .4s;
        border-radius: 34px;
      }
      
      .toggle-switch .slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 4px;
        bottom: 4px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }
      
      .toggle-switch input:checked + .slider {
        background-color: #1a73e8;
      }
      
      .toggle-switch input:checked + .slider:before {
        transform: translateX(22px);
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
    const replyText = document.getElementById("reply-content").innerText;
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
    const replyText = document.getElementById("reply-content").innerText;
    insertReplyIntoGmail(replyText);
    
    // Close modal with animation
    backdrop.style.animation = "fadeOut 0.3s ease-out forwards";
    modal.style.animation = "modalSlideOut 0.3s ease-out forwards";
    setTimeout(() => {
      backdrop.style.display = "none";
      modal.style.display = "none";
    }, 300);
  });
  
  // Add event listener for Direct Reply button
  document.getElementById("direct-reply").addEventListener("click", () => {
    const replyText = document.getElementById("reply-content").innerText;
    directReplyEmail(replyText);
    
    // Close modal with animation
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
 * Function to extract the receiver's email address from Gmail
 * This works in both scenarios:
 * 1. When viewing a received email (extracts your email)
 * 2. When viewing a sent email (extracts the recipient's email)
 */
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
  
// Make the button clickable
  button.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("🚀 Auto-Reply button clicked!");
    
    // Extract receiver's email address
    const receiverEmail = extractReceiverEmail();
    console.log("📧 Receiver's email:", receiverEmail);
    
    // Store for later use
    if (receiverEmail) {
      sessionStorage.setItem('receiver_email', receiverEmail);
    }
    
    // Get the email content
    const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
    if (emailContent) {
      const emailText = emailContent.innerText;
      console.log("📧 Email content found:", emailText.substring(0, 100) + "...");
      
      // Generate reply using backend (now with receiver email)
      await generateReply(emailText, receiverEmail);
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