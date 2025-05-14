console.log("✅ Gmail Auto LLM Reply: Content script loaded");

const BUTTON_ID = "auto-reply-button";
const MODAL_ID = "auto-reply-modal";
const BACKEND_URL = "https://gmail-llm-based-auto-reply.vercel.app"; // Updated to Vercel URL
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
      
      #reply-content:not(.loading) .loading-state {
        display: none;
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

// Function to generate reply using the backend
async function generateReply(emailContent) {
  const modalElements = createModal();
  const modal = modalElements.modal;
  const backdrop = modalElements.backdrop;
  
  // Show modal with animation
  backdrop.style.display = "block";
  modal.style.display = "block";
  backdrop.style.animation = "fadeIn 0.3s ease-out";
  modal.style.animation = "modalSlideIn 0.4s ease-out forwards";
  
  const replyContent = document.getElementById("reply-content");
  replyContent.classList.add("loading");
  
  try {
    const response = await fetch(`${BACKEND_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: emailContent })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Display the generated reply with fade effect
    replyContent.style.opacity = "0";
    setTimeout(() => {
      replyContent.classList.remove("loading");
      replyContent.innerHTML = `<div style="white-space: pre-wrap;">${data.reply}</div>`;
      replyContent.style.transition = "opacity 0.3s ease-in";
      replyContent.style.opacity = "1";
    }, 300);
    
  } catch (error) {
    console.error("Error generating reply:", error);
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
        ">Make sure your backend is running at ${BACKEND_URL}</p>
      </div>
    `;
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
    
    // Get the email content
    const emailContent = document.querySelector('div[role="listitem"] div.a3s.aiL');
    if (emailContent) {
      const emailText = emailContent.innerText;
      console.log("📧 Email content found:", emailText.substring(0, 100) + "...");
      
      // Generate reply using backend
      await generateReply(emailText);
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