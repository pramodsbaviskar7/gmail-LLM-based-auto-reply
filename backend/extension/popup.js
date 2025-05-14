// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggleButton = document.getElementById('toggleCustomSignature');
  const customForm = document.getElementById('customSignatureForm');
  const successMessage = document.getElementById('successMessage');
  const clearButton = document.getElementById('clearButton');
  
  // Load saved preferences
  loadSavedPreferences();
  
  // Toggle form visibility
  toggleButton.addEventListener('click', function() {
    if (customForm.style.display === 'none' || !customForm.style.display) {
      customForm.style.display = 'block';
      toggleButton.textContent = '▲ Customize Signature (Optional)';
    } else {
      customForm.style.display = 'none';
      toggleButton.textContent = '▼ Customize Signature (Optional)';
    }
  });
  
  // Handle form submission
  customForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userInfo = {
      full_name: document.getElementById('fullName').value,
      email: document.getElementById('email').value,
      linkedin: document.getElementById('linkedin').value,
      mobile: document.getElementById('phone').value
    };
    
    // Only save non-empty values
    const filteredUserInfo = {};
    for (const [key, value] of Object.entries(userInfo)) {
      if (value.trim()) {
        filteredUserInfo[key] = value.trim();
      }
    }
    
    // Save to Chrome storage
    chrome.storage.sync.set({
      userEmail: userInfo.email,
      userInfo: Object.keys(filteredUserInfo).length > 0 ? filteredUserInfo : null
    }, function() {
      // Show success message
      successMessage.style.display = 'block';
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3000);
    });
  });
  
  // Handle clear button
  clearButton.addEventListener('click', function() {
    document.getElementById('fullName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('linkedin').value = '';
    document.getElementById('phone').value = '';
    
    // Clear from storage
    chrome.storage.sync.clear(function() {
      successMessage.textContent = '✓ Preferences cleared!';
      successMessage.style.display = 'block';
      setTimeout(() => {
        successMessage.style.display = 'none';
        successMessage.textContent = '✓ Preferences saved successfully!';
      }, 3000);
    });
  });
  
  // Load saved preferences
  function loadSavedPreferences() {
    chrome.storage.sync.get(['userEmail', 'userInfo'], function(result) {
      if (result.userInfo) {
        document.getElementById('fullName').value = result.userInfo.full_name || '';
        document.getElementById('email').value = result.userInfo.email || result.userEmail || '';
        document.getElementById('linkedin').value = result.userInfo.linkedin || '';
        document.getElementById('phone').value = result.userInfo.mobile || '';
      } else if (result.userEmail) {
        document.getElementById('email').value = result.userEmail;
      }
    });
  }
});