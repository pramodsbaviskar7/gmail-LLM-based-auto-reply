// popup.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('Popup script loaded'); // Debug log
  
  const toggleButton = document.getElementById('toggleCustomSignature');
  const customForm = document.getElementById('customSignatureForm');
  const successMessage = document.getElementById('successMessage');
  const clearButton = document.getElementById('clearButton');
  const signatureForm = document.getElementById('customSignatureForm');
  
  // Get available storage (sync preferred, fallback to local)
  const getStorage = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      return chrome.storage.sync || chrome.storage.local;
    }
    return null;
  };
  
  // Check if elements exist
  if (!toggleButton) {
    console.error('Toggle button not found');
    return;
  }
  
  if (!customForm) {
    console.error('Custom form not found');
    return;
  }
  
  console.log('All elements found successfully');
  console.log('signatureForm found:', !!signatureForm); // Add this debug log
  
  // Load saved preferences
  loadSavedPreferences();
  
  // Toggle form visibility
  toggleButton.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Toggle button clicked'); // Debug log
    
    const isHidden = customForm.style.display === 'none' || !customForm.style.display;
    
    if (isHidden) {
      customForm.style.display = 'block';
      toggleButton.textContent = '▲ Customize Signature (Optional)';
      console.log('Form shown');
    } else {
      customForm.style.display = 'none';
      toggleButton.textContent = '▼ Customize Signature (Optional)';
      console.log('Form hidden');
    }
  });
  
  // Handle form submission
  if (signatureForm) {
    console.log('Adding submit event listener to form'); // Add this debug log
    
    signatureForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      console.log('Form submit event triggered!'); // Add this debug log
      
      try {
        const userInfo = {
          full_name: document.getElementById('fullName').value,
          email: document.getElementById('email').value,
          linkedin: document.getElementById('linkedin').value,
          mobile: document.getElementById('phone').value
        };
        
        console.log('User info collected:', userInfo); // Add this debug log
        
        // Only save non-empty values
        const filteredUserInfo = {};
        for (const [key, value] of Object.entries(userInfo)) {
          if (value.trim()) {
            filteredUserInfo[key] = value.trim();
          }
        }
        
        console.log('Filtered user info:', filteredUserInfo);
        
        // Get available storage
        const storage = getStorage();
        if (!storage) {
          console.error('Chrome storage API not available - ensure extension has storage permission');
          return;
        }
        
        console.log('About to save to Chrome storage...');
        
        // Save to Chrome storage
        storage.set({
          userEmail: userInfo.email,
          userInfo: Object.keys(filteredUserInfo).length > 0 ? filteredUserInfo : null
        }, function() {
          console.log('Chrome storage callback triggered');
          
          if (chrome.runtime.lastError) {
            console.error('Storage error:', chrome.runtime.lastError);
            return;
          }
          
          console.log('Data saved successfully');
          
          // Show success message
          if (successMessage) {
            console.log('Showing success message');
            successMessage.style.display = 'block';
            
            // Auto-close popup after 2 seconds
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            console.error('Success message element not found');
          }
        });
      } catch (error) {
        console.error('Error in form submission:', error);
      }
    });
  } else {
    console.error('Signature form not found!'); // Add this debug log
  }
  
  // Handle clear button
  if (clearButton) {
    clearButton.addEventListener('click', function() {
      console.log('Clear button clicked');
      
      document.getElementById('fullName').value = '';
      document.getElementById('email').value = '';
      document.getElementById('linkedin').value = '';
      document.getElementById('phone').value = '';
      
      // Clear from storage
      const storage = getStorage();
      if (storage) {
        storage.clear(function() {
          if (chrome.runtime.lastError) {
            console.error('Clear storage error:', chrome.runtime.lastError);
            return;
          }
          
          console.log('Storage cleared');
          
          if (successMessage) {
            successMessage.textContent = '✓ Preferences cleared!';
            successMessage.style.display = 'block';
            setTimeout(() => {
              successMessage.style.display = 'none';
              successMessage.textContent = '✓ Preferences saved successfully!';
            }, 4000);
          }
        });
      } else {
        console.error('Chrome storage API not available for clearing');
      }
    });
  }
  
  // Load saved preferences
  function loadSavedPreferences() {
    const storage = getStorage();
    if (!storage) return;

    storage.get(['userEmail', 'userInfo'], function(result) {
      if (chrome.runtime.lastError) return;
      if (result.userInfo) {
        const fullNameField = document.getElementById('fullName');
        const emailField = document.getElementById('email');
        const linkedinField = document.getElementById('linkedin');
        const phoneField = document.getElementById('phone');
        if (fullNameField) fullNameField.value = result.userInfo.full_name || '';
        if (emailField) emailField.value = result.userInfo.email || result.userEmail || '';
        if (linkedinField) linkedinField.value = result.userInfo.linkedin || '';
        if (phoneField) phoneField.value = result.userInfo.mobile || '';
      } else if (result.userEmail) {
        const emailField = document.getElementById('email');
        if (emailField) emailField.value = result.userEmail;
      }
    });
  }

  // ── Feature 11: Context Injection ──────────────────────────────────────────
  const contextField = document.getElementById('userContext');
  const saveContextBtn = document.getElementById('saveContextBtn');
  const contextSuccess = document.getElementById('contextSuccess');

  // Load saved context
  const storage = getStorage();
  if (storage) {
    storage.get(['userContext'], function(result) {
      if (contextField && result.userContext) contextField.value = result.userContext;
    });
  }

  if (saveContextBtn) {
    saveContextBtn.addEventListener('click', function() {
      const ctx = contextField ? contextField.value.trim() : '';
      const s = getStorage();
      if (!s) return;
      s.set({ userContext: ctx }, function() {
        if (chrome.runtime.lastError) return;
        if (contextSuccess) {
          contextSuccess.style.display = 'block';
          setTimeout(() => { contextSuccess.style.display = 'none'; }, 2500);
        }
      });
    });
  }

  // ── Feature 10: Templates Library ──────────────────────────────────────────
  function loadTemplates() {
    const s = getStorage();
    if (!s) return;
    s.get(['rxTemplates'], function(result) {
      const templates = result.rxTemplates || [];
      renderTemplates(templates);
    });
  }

  function renderTemplates(templates) {
    const list = document.getElementById('templatesList');
    if (!list) return;
    if (!templates.length) {
      list.innerHTML = '<div style="font-size:12px; color:#9ca3af; margin-bottom:8px;">No templates saved yet.</div>';
      return;
    }
    list.innerHTML = templates.map((t, i) => `
      <div class="template-item">
        <span title="${t.content}">${t.name}</span>
        <button data-idx="${i}">Delete</button>
      </div>`).join('');

    list.querySelectorAll('button[data-idx]').forEach(btn => {
      btn.addEventListener('click', function() {
        const idx = parseInt(this.getAttribute('data-idx'));
        const s = getStorage();
        if (!s) return;
        s.get(['rxTemplates'], function(result) {
          const tpls = result.rxTemplates || [];
          tpls.splice(idx, 1);
          s.set({ rxTemplates: tpls }, () => loadTemplates());
        });
      });
    });
  }

  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  if (saveTemplateBtn) {
    saveTemplateBtn.addEventListener('click', function() {
      const name = document.getElementById('templateName')?.value.trim();
      const content = document.getElementById('templateContent')?.value.trim();
      if (!name || !content) return;
      const s = getStorage();
      if (!s) return;
      s.get(['rxTemplates'], function(result) {
        const tpls = result.rxTemplates || [];
        tpls.push({ name, content, createdAt: Date.now() });
        s.set({ rxTemplates: tpls }, function() {
          document.getElementById('templateName').value = '';
          document.getElementById('templateContent').value = '';
          loadTemplates();
        });
      });
    });
  }

  loadTemplates();

  // ── Settings ────────────────────────────────────────────────────────────────
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const settingsSuccess = document.getElementById('settingsSuccess');

  // Load saved settings
  if (storage) {
    storage.get(['rxSettings'], function(result) {
      const s = result.rxSettings || {};
      const followupDaysEl = document.getElementById('followupDays');
      const sentimentEl = document.getElementById('sentimentWarning');
      const badgeEl = document.getElementById('inboxBadge');
      if (followupDaysEl) followupDaysEl.value = s.followupDays || 3;
      if (sentimentEl) sentimentEl.checked = s.sentimentWarning !== false;
      if (badgeEl) badgeEl.checked = s.inboxBadge !== false;
    });
  }

  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', function() {
      const settings = {
        followupDays: parseInt(document.getElementById('followupDays')?.value || 3),
        sentimentWarning: document.getElementById('sentimentWarning')?.checked !== false,
        inboxBadge: document.getElementById('inboxBadge')?.checked !== false,
      };
      const s = getStorage();
      if (!s) return;
      s.set({ rxSettings: settings }, function() {
        if (chrome.runtime.lastError) return;
        if (settingsSuccess) {
          settingsSuccess.style.display = 'block';
          setTimeout(() => { settingsSuccess.style.display = 'none'; }, 2500);
        }
      });
    });
  }
});