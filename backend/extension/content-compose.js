// content-compose.js - Complete version with all features
console.log('🚀 RespondX Compose: Script loaded');

class GmailComposeFeature {
    constructor() {
        this.modal = null;
        this.composeButton = null;
        this.initialized = false;
        this.darkMode = false;
        this.API_URL = 'https://gmail-llm-based-auto-reply.vercel.app';
    }

    init() {
        if (this.initialized) return;
        console.log('🎯 RespondX Compose: Starting initialization...');
        
        // Inject styles first
        this.injectStyles();
        
        // Try to inject button
        this.injectComposeButton();
        
        // Create modal
        this.createModal();
        
        this.initialized = true;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* Compose Button Styles - Matching Gmail's style */
            .respondx-compose-btn {
                background: #667eea !important;
                color: white !important;
                border: none;
                box-shadow: 0 1px 2px 0 rgba(60,64,67,0.302), 0 1px 3px 1px rgba(60,64,67,0.149);
                display: inline-flex;
                align-items: center;
                justify-content: flex-start;
                gap: 12px;
                padding: 0 24px 0 0;
                height: 56px;
                border-radius: 16px;
                cursor: pointer;
                font-family: 'Google Sans', Roboto, Arial, sans-serif;
                font-size: 14px;
                font-weight: 500;
                letter-spacing: 0.25px;
                transition: box-shadow 0.08s linear;
                min-width: 56px;
                overflow: hidden;
                white-space: nowrap;
                position: relative;
            }

            .respondx-compose-btn:hover {
                box-shadow: 0 1px 3px 0 rgba(60,64,67,0.302), 0 4px 8px 3px rgba(60,64,67,0.149);
                background: #5a67d8 !important;
            }

            .respondx-compose-btn:active {
                box-shadow: 0 1px 3px 0 rgba(60,64,67,0.302), 0 4px 8px 3px rgba(60,64,67,0.149);
            }

            .respondx-compose-icon {
                background: #5a67d8;
                width: 56px;
                height: 56px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-left: -1px;
                flex-shrink: 0;
            }

            .respondx-compose-text {
                padding-right: 8px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            /* Modal Styles */
            .rx-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
            }

            .rx-modal-overlay.active {
                opacity: 1;
                visibility: visible;
            }

            .rx-modal {
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 800px;
                max-height: 90vh;
                overflow: hidden;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                transform: scale(0.9);
                transition: transform 0.3s ease;
            }

            .rx-modal-overlay.active .rx-modal {
                transform: scale(1);
            }

            /* Dark mode styles */
            .rx-modal.dark {
                background: #1f2937;
                color: #f3f4f6;
            }

            .rx-header {
                padding: 20px 24px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .rx-modal.dark .rx-header {
                border-bottom-color: #374151;
            }

            .rx-header h2 {
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
                display: flex;
                align-items: center;
                gap: 8px;
                margin: 0;
            }

            .rx-modal.dark .rx-header h2 {
                color: #f3f4f6;
            }

            .rx-header-actions {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .rx-theme-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #6b7280;
            }

            .rx-modal.dark .rx-theme-toggle {
                color: #9ca3af;
            }

            .rx-toggle {
                position: relative;
                width: 44px;
                height: 24px;
                background: #e5e7eb;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.3s;
            }

            .rx-toggle.active {
                background: #667eea;
            }

            .rx-toggle-slider {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                transition: transform 0.3s;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }

            .rx-toggle.active .rx-toggle-slider {
                transform: translateX(20px);
            }

            .rx-close {
                background: none;
                border: none;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                color: #6b7280;
            }

            .rx-close:hover {
                background: #f3f4f6;
            }

            .rx-modal.dark .rx-close {
                color: #9ca3af;
            }

            .rx-modal.dark .rx-close:hover {
                background: #374151;
            }

            .rx-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .rx-tabs {
                display: flex;
                gap: 16px;
                margin-bottom: 24px;
                border-bottom: 1px solid #e5e7eb;
            }

            .rx-modal.dark .rx-tabs {
                border-bottom-color: #374151;
            }

            .rx-tab {
                padding: 8px 16px;
                font-size: 14px;
                font-weight: 500;
                color: #6b7280;
                cursor: pointer;
                border-bottom: 2px solid transparent;
                transition: all 0.2s;
            }

            .rx-tab.active {
                color: #667eea;
                border-bottom-color: #667eea;
            }

            .rx-modal.dark .rx-tab {
                color: #9ca3af;
            }

            .rx-modal.dark .rx-tab.active {
                color: #818cf8;
                border-bottom-color: #818cf8;
            }

            .rx-tab-content {
                display: none;
            }

            .rx-tab-content.active {
                display: block;
            }

            .rx-form-group {
                margin-bottom: 20px;
            }

            .rx-label {
                display: block;
                margin-bottom: 8px;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
            }

            .rx-modal.dark .rx-label {
                color: #e5e7eb;
            }

            .rx-textarea {
                width: 100%;
                min-height: 120px;
                padding: 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                resize: vertical;
                transition: border-color 0.2s;
                font-family: inherit;
                background: white;
                color: #1f2937;
            }

            .rx-modal.dark .rx-textarea {
                background: #374151;
                border-color: #4b5563;
                color: #f3f4f6;
            }

            .rx-textarea:focus {
                outline: none;
                border-color: #667eea;
            }

            .rx-char-count {
                text-align: right;
                font-size: 12px;
                color: #6b7280;
                margin-top: 4px;
            }

            .rx-modal.dark .rx-char-count {
                color: #9ca3af;
            }

            .rx-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 20px;
            }

            .rx-select {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                background: white;
                color: #1f2937;
                cursor: pointer;
                transition: border-color 0.2s;
            }

            .rx-modal.dark .rx-select {
                background: #374151;
                border-color: #4b5563;
                color: #f3f4f6;
            }

            .rx-select:focus {
                outline: none;
                border-color: #667eea;
            }

            .rx-input {
                width: 100%;
                padding: 10px 12px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 14px;
                background: white;
                color: #1f2937;
                transition: border-color 0.2s;
            }

            .rx-modal.dark .rx-input {
                background: #374151;
                border-color: #4b5563;
                color: #f3f4f6;
            }

            .rx-checkbox-group {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
                margin-bottom: 16px;
            }

            .rx-checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                font-size: 14px;
                color: #374151;
            }

            .rx-modal.dark .rx-checkbox-label {
                color: #e5e7eb;
            }

            .rx-generate-btn {
                width: 100%;
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                margin-top: 24px;
            }

            .rx-generate-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .rx-generate-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .rx-loading-spinner {
                width: 20px;
                height: 20px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top-color: white;
                border-radius: 50%;
                animation: rx-spin 0.8s linear infinite;
                display: none;
            }

            .rx-generate-btn.loading .rx-loading-spinner {
                display: block;
            }

            .rx-generate-btn.loading .rx-btn-text {
                display: none;
            }

            @keyframes rx-spin {
                to { transform: rotate(360deg); }
            }

            .rx-result-section {
                display: none;
                margin-top: 24px;
                padding-top: 24px;
                border-top: 1px solid #e5e7eb;
            }

            .rx-modal.dark .rx-result-section {
                border-top-color: #374151;
            }

            .rx-result-section.show {
                display: block;
            }

            .rx-result-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }

            .rx-result-actions {
                display: flex;
                gap: 8px;
            }

            .rx-action-btn {
                padding: 6px 12px;
                border: 1px solid #e5e7eb;
                background: white;
                border-radius: 6px;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 4px;
                color: #374151;
            }

            .rx-modal.dark .rx-action-btn {
                background: #374151;
                border-color: #4b5563;
                color: #e5e7eb;
            }

            .rx-action-btn:hover {
                background: #f3f4f6;
                border-color: #d1d5db;
            }

            .rx-modal.dark .rx-action-btn:hover {
                background: #4b5563;
                border-color: #6b7280;
            }

            .rx-action-btn.primary {
                background: #667eea;
                color: white;
                border-color: #667eea;
            }

            .rx-action-btn.primary:hover {
                background: #5a67d8;
            }

            .rx-email-preview {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 16px;
            }

            .rx-modal.dark .rx-email-preview {
                background: #374151;
                border-color: #4b5563;
            }

            .rx-email-subject {
                font-weight: 600;
                margin-bottom: 12px;
                padding-bottom: 12px;
                border-bottom: 1px solid #e5e7eb;
                color: #1f2937;
            }

            .rx-modal.dark .rx-email-subject {
                color: #f3f4f6;
                border-bottom-color: #4b5563;
            }

            .rx-email-body {
                white-space: pre-wrap;
                color: #374151;
                line-height: 1.6;
            }

            .rx-modal.dark .rx-email-body {
                color: #e5e7eb;
            }
        `;
        document.head.appendChild(style);
    }

    injectComposeButton() {
        const checkForCompose = setInterval(() => {
            const composeButton = document.querySelector('.T-I.T-I-KE.L3');
            
            if (composeButton && !this.composeButton) {
                clearInterval(checkForCompose);
                
                // Get the parent container and make it flex if needed
                const parentContainer = composeButton.parentNode;
                parentContainer.style.display = 'flex';
                parentContainer.style.gap = '8px';
                parentContainer.style.alignItems = 'center';
                parentContainer.style.paddingRight = '8px';
                
                // Create our button WITHOUT the L3 class that adds the pencil
                this.composeButton = document.createElement('div');
                this.composeButton.className = 'T-I J-J5-Ji aFh T-I-ax7';
                this.composeButton.setAttribute('role', 'button');
                this.composeButton.setAttribute('tabindex', '0');
                this.composeButton.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                    color: white !important;
                    flex: 1;
                    min-width: 0;
                    height: 56px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Add content - centered text without any icon
                this.composeButton.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; color: white;">
                        <span style="font-weight: 600; font-size: 13px;">AI ✨</span>
                        <span style="font-size: 13px;">Compose</span>
                    </div>
                `;
                
                // Add hover effect
                this.composeButton.addEventListener('mouseenter', () => {
                    this.composeButton.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                });
                
                this.composeButton.addEventListener('mouseleave', () => {
                    this.composeButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                });
                
                this.composeButton.addEventListener('click', () => this.openModal());
                
                // Make compose button also flex to share space
                composeButton.style.flex = '1';
                composeButton.style.minWidth = '0';
                
                // Insert beside the compose button
                composeButton.parentNode.appendChild(this.composeButton);
            }
        }, 500);
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'rx-modal-overlay';
        this.modal.innerHTML = `
            <div class="rx-modal">
                <div class="rx-header">
                    <h2>
                        <span>✨</span>
                        Compose Email with AI
                    </h2>
                    <div class="rx-header-actions">
                        <div class="rx-theme-toggle">
                            <span>☀️</span>
                            <div class="rx-toggle" id="themeToggle">
                                <div class="rx-toggle-slider"></div>
                            </div>
                            <span>🌙</span>
                        </div>
                        <button class="rx-close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="rx-body">
                    <div class="rx-tabs">
                        <div class="rx-tab active" data-tab="basic">Basic Options</div>
                        <div class="rx-tab" data-tab="advanced">Advanced Options</div>
                        <div class="rx-tab" data-tab="templates">Templates</div>
                    </div>

                    <form id="composeForm">
                        <!-- Basic Options Tab -->
                        <div class="rx-tab-content active" data-content="basic">
                            <div class="rx-form-group">
                                <label class="rx-label">
                                    What would you like to write about? <span style="color: #ef4444;">*</span>
                                </label>
                                <textarea 
                                    class="rx-textarea" 
                                    id="promptInput"
                                    placeholder="E.g., Write an email to my team about the upcoming project deadline next Friday. Remind them about the key deliverables and ask for status updates."
                                    maxlength="1000"
                                    required
                                ></textarea>
                                <div class="rx-char-count">
                                    <span id="charCount">0</span>/1000
                                </div>
                            </div>

                            <div class="rx-grid">
                                <div class="rx-form-group">
                                    <label class="rx-label">Tone</label>
                                    <select class="rx-select" id="toneSelect">
                                        <option value="professional">Professional</option>
                                        <option value="friendly">Friendly</option>
                                        <option value="formal">Formal</option>
                                        <option value="casual">Casual</option>
                                        <option value="concise">Concise</option>
                                        <option value="enthusiastic">Enthusiastic</option>
                                        <option value="neutral">Neutral</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Length</label>
                                    <select class="rx-select" id="lengthSelect">
                                        <option value="brief">Brief (2-3 sentences)</option>
                                        <option value="short">Short (1 paragraph)</option>
                                        <option value="medium" selected>Medium (2-3 paragraphs)</option>
                                        <option value="detailed">Detailed (4+ paragraphs)</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Language</label>
                                    <select class="rx-select" id="languageSelect">
                                        <option value="english" selected>English</option>
                                        <option value="spanish">Spanish</option>
                                        <option value="french">French</option>
                                        <option value="german">German</option>
                                        <option value="italian">Italian</option>
                                        <option value="portuguese">Portuguese</option>
                                        <option value="chinese">Chinese</option>
                                        <option value="japanese">Japanese</option>
                                        <option value="hindi">Hindi</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Response Type</label>
                                    <select class="rx-select" id="responseTypeSelect">
                                        <option value="general">General Email</option>
                                        <option value="accept">Accept/Confirm</option>
                                        <option value="decline">Decline/Reject</option>
                                        <option value="request">Request Information</option>
                                        <option value="reschedule">Reschedule</option>
                                        <option value="followup">Follow Up</option>
                                        <option value="thank">Thank You</option>
                                        <option value="apology">Apology</option>
                                    </select>
                                </div>
                            </div>

                            <div class="rx-form-group">
                                <label class="rx-label">Recipient Context (optional)</label>
                                <input 
                                    type="text" 
                                    class="rx-input" 
                                    id="recipientContext"
                                    placeholder="E.g., my manager, potential client, colleague, team"
                                >
                            </div>

                            <div class="rx-checkbox-group">
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="includeGreeting" checked>
                                    Include greeting
                                </label>
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="includeClosing" checked>
                                    Include closing
                                </label>
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="includeSignature" checked>
                                    Include signature
                                </label>
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="useEmojis">
                                    Use emojis
                                </label>
                            </div>
                        </div>

                        <!-- Advanced Options Tab -->
                        <div class="rx-tab-content" data-content="advanced">
                            <div class="rx-grid">
                                <div class="rx-form-group">
                                    <label class="rx-label">Greeting Style</label>
                                    <select class="rx-select" id="greetingStyle">
                                        <option value="default">Default</option>
                                        <option value="firstname">Hi [First Name]</option>
                                        <option value="formal">Dear [Title] [Last Name]</option>
                                        <option value="team">Hello Team/Everyone</option>
                                        <option value="time">Good morning/afternoon</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Voice</label>
                                    <select class="rx-select" id="voiceSelect">
                                        <option value="first">First Person (I/We)</option>
                                        <option value="second">Second Person (You)</option>
                                        <option value="third">Third Person</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Language Complexity</label>
                                    <select class="rx-select" id="complexitySelect">
                                        <option value="simple">Simple</option>
                                        <option value="standard" selected>Standard</option>
                                        <option value="technical">Technical</option>
                                        <option value="business">Business Professional</option>
                                    </select>
                                </div>

                                <div class="rx-form-group">
                                    <label class="rx-label">Content Structure</label>
                                    <select class="rx-select" id="structureSelect">
                                        <option value="standard">Standard</option>
                                        <option value="bullets">With Bullet Points</option>
                                        <option value="numbered">With Numbered List</option>
                                        <option value="sections">With Sections</option>
                                    </select>
                                </div>
                            </div>

                            <div class="rx-form-group">
                                <label class="rx-label">Subject Line (optional)</label>
                                <input 
                                    type="text" 
                                    class="rx-input" 
                                    id="subjectLine"
                                    placeholder="Leave empty for AI to generate"
                                >
                            </div>

                            <div class="rx-form-group">
                                <label class="rx-label">Opening Sentence (optional)</label>
                                <input 
                                    type="text" 
                                    class="rx-input" 
                                    id="openingSentence"
                                    placeholder="E.g., I hope this email finds you well"
                                >
                            </div>

                            <div class="rx-form-group">
                                <label class="rx-label">Closing Line (optional)</label>
                                <input 
                                    type="text" 
                                    class="rx-input" 
                                    id="closingLine"
                                    placeholder="E.g., Looking forward to your response"
                                >
                            </div>

                            <div class="rx-checkbox-group">
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="includeThreadSummary">
                                    Include thread summary
                                </label>
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="referencePastMessages">
                                    Reference past messages
                                </label>
                                <label class="rx-checkbox-label">
                                    <input type="checkbox" id="autoInsert">
                                    Auto-insert (vs copy only)
                                </label>
                            </div>
                        </div>

                        <!-- Templates Tab -->
                        <div class="rx-tab-content" data-content="templates">
                            <div class="rx-form-group">
                                <label class="rx-label">Quick Templates</label>
                                <select class="rx-select" id="templateSelect">
                                    <option value="">-- Select a template --</option>
                                    <option value="meeting-request">Meeting Request</option>
                                    <option value="meeting-followup">Meeting Follow-up</option>
                                    <option value="project-update">Project Update</option>
                                    <option value="deadline-reminder">Deadline Reminder</option>
                                    <option value="introduction">Introduction Email</option>
                                    <option value="thank-interview">Thank You - Interview</option>
                                    <option value="sick-leave">Sick Leave Notice</option>
                                    <option value="vacation-request">Vacation Request</option>
                                    <option value="resignation">Resignation Letter</option>
                                    <option value="complaint">Complaint</option>
                                    <option value="feedback">Feedback</option>
                                    <option value="proposal">Business Proposal</option>
                                </select>
                            </div>

                            <div class="rx-form-group">
                                <label class="rx-label">Template Preview</label>
                                <div class="rx-email-preview" id="templatePreview">
                                    Select a template to see a preview
                                </div>
                            </div>
                        </div>

                        <button type="submit" class="rx-generate-btn" id="generateButton">
                            <span class="rx-btn-text">Generate Email</span>
                            <div class="rx-loading-spinner"></div>
                        </button>
                    </form>

                    <!-- Result section -->
                    <div class="rx-result-section" id="resultSection">
                        <div class="rx-result-header">
                            <h3 style="margin: 0; font-size: 16px; font-weight: 600;">Generated Email</h3>
                            <div class="rx-result-actions">
                                <button class="rx-action-btn" id="copyButton">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    Copy
                                </button>
                                <button class="rx-action-btn primary" id="insertButton">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M12 5v14"></path>
                                        <path d="M19 12l-7 7-7-7"></path>
                                    </svg>
                                    Insert
                                </button>
                            </div>
                        </div>

                        <div class="rx-email-preview">
                            <div class="rx-email-subject" id="emailSubject"></div>
                            <div class="rx-email-body" id="emailBody"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        this.attachEventListeners();
    }

    attachEventListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.rx-close');
        closeBtn.addEventListener('click', () => this.closeModal());

        // Overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Theme toggle
        const themeToggle = this.modal.querySelector('#themeToggle');
        themeToggle.addEventListener('click', () => {
            this.darkMode = !this.darkMode;
            const modal = this.modal.querySelector('.rx-modal');
            modal.classList.toggle('dark', this.darkMode);
            themeToggle.classList.toggle('active', this.darkMode);
        });

        // Tab switching
        const tabs = this.modal.querySelectorAll('.rx-tab');
        const tabContents = this.modal.querySelectorAll('.rx-tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                tabContents.forEach(content => {
                    content.classList.toggle('active', content.dataset.content === targetTab);
                });
            });
        });

        // Character counter
        const promptInput = this.modal.querySelector('#promptInput');
        const charCount = this.modal.querySelector('#charCount');
        promptInput.addEventListener('input', () => {
            charCount.textContent = promptInput.value.length;
        });

        // Template selection
        const templateSelect = this.modal.querySelector('#templateSelect');
        const templatePreview = this.modal.querySelector('#templatePreview');
        
        templateSelect.addEventListener('change', () => {
            const template = this.getTemplate(templateSelect.value);
            if (template) {
                templatePreview.innerHTML = `<strong>Subject:</strong> ${template.subject}<br><br>${template.body.replace(/\n/g, '<br>')}`;
                // Fill the prompt with template
                promptInput.value = template.prompt;
                charCount.textContent = template.prompt.length;
            } else {
                templatePreview.textContent = 'Select a template to see a preview';
            }
        });

        // Form submission
        const form = this.modal.querySelector('#composeForm');
        form.addEventListener('submit', (e) => this.handleGenerate(e));

        // Copy button
        const copyBtn = this.modal.querySelector('#copyButton');
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Insert button
        const insertBtn = this.modal.querySelector('#insertButton');
        insertBtn.addEventListener('click', () => this.insertIntoGmail());

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    getTemplate(templateId) {
        const templates = {
            'meeting-request': {
                subject: 'Meeting Request - [Topic]',
                prompt: 'Write a professional email requesting a meeting to discuss [topic]. Suggest a few time slots for next week.',
                body: 'Dear [Name],\n\nI hope this email finds you well. I would like to schedule a meeting to discuss [topic].\n\nWould any of the following times work for you?\n- [Day] at [Time]\n- [Day] at [Time]\n- [Day] at [Time]\n\nPlease let me know what works best for your schedule.\n\nBest regards,\n[Your Name]'
            },
            'project-update': {
                subject: 'Project Update - [Project Name]',
                prompt: 'Write a project update email covering progress, completed tasks, upcoming milestones, and any blockers.',
                body: 'Hi Team,\n\nHere\'s our weekly project update:\n\nCompleted this week:\n• [Task 1]\n• [Task 2]\n\nIn progress:\n• [Task 3]\n• [Task 4]\n\nNext week:\n• [Upcoming task]\n\nBlockers:\n• [Any issues]\n\nBest,\n[Your Name]'
            },
            'deadline-reminder': {
                subject: 'Reminder: [Task] Due [Date]',
                prompt: 'Write a friendly reminder email about an upcoming deadline.',
                body: 'Hi [Name],\n\nJust a friendly reminder that [task/deliverable] is due on [date].\n\nPlease let me know if you need any assistance or if there are any concerns about meeting this deadline.\n\nThanks,\n[Your Name]'
            }
        };
        
        return templates[templateId] || null;
    }

    openModal() {
        if (!this.modal) {
            this.createModal();
        }
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus on the textarea
        setTimeout(() => {
            const promptInput = this.modal.querySelector('#promptInput');
            promptInput.focus();
        }, 300);
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        this.resetForm();
    }

    resetForm() {
        const form = this.modal.querySelector('#composeForm');
        form.reset();
        
        const resultSection = this.modal.querySelector('#resultSection');
        resultSection.classList.remove('show');
        
        const charCount = this.modal.querySelector('#charCount');
        charCount.textContent = '0';
        
        // Reset to first tab
        const tabs = this.modal.querySelectorAll('.rx-tab');
        const tabContents = this.modal.querySelectorAll('.rx-tab-content');
        tabs.forEach((tab, index) => {
            tab.classList.toggle('active', index === 0);
        });
        tabContents.forEach((content, index) => {
            content.classList.toggle('active', index === 0);
        });
    }

    async handleGenerate(e) {
        e.preventDefault();
        
        const generateButton = this.modal.querySelector('#generateButton');
        const resultSection = this.modal.querySelector('#resultSection');
        const errorMessage = this.modal.querySelector('#errorMessage');
        
        // Hide previous results
        resultSection.classList.remove('show');
        
        // Show loading state
        generateButton.classList.add('loading');
        generateButton.disabled = true;
        
        // Collect all form data
        const formData = {
            // Basic options
            prompt: this.modal.querySelector('#promptInput').value,
            tone: this.modal.querySelector('#toneSelect').value,
            length: this.modal.querySelector('#lengthSelect').value,
            language: this.modal.querySelector('#languageSelect').value,
            responseType: this.modal.querySelector('#responseTypeSelect').value,
            recipientContext: this.modal.querySelector('#recipientContext').value,
            
            // Checkboxes
            includeGreeting: this.modal.querySelector('#includeGreeting').checked,
            includeClosing: this.modal.querySelector('#includeClosing').checked,
            includeSignature: this.modal.querySelector('#includeSignature').checked,
            useEmojis: this.modal.querySelector('#useEmojis').checked,
            
            // Advanced options
            greetingStyle: this.modal.querySelector('#greetingStyle').value,
            voice: this.modal.querySelector('#voiceSelect').value,
            complexity: this.modal.querySelector('#complexitySelect').value,
            structure: this.modal.querySelector('#structureSelect').value,
            subjectLine: this.modal.querySelector('#subjectLine').value,
            openingSentence: this.modal.querySelector('#openingSentence').value,
            closingLine: this.modal.querySelector('#closingLine').value,
            includeThreadSummary: this.modal.querySelector('#includeThreadSummary').checked,
            referencePastMessages: this.modal.querySelector('#referencePastMessages').checked,
            autoInsert: this.modal.querySelector('#autoInsert').checked
        };
        
        try {
            // Call your API
            const response = await fetch(`${this.API_URL}/api/compose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate email');
            }
            
            const data = await response.json();
            
            // Display results
            this.modal.querySelector('#emailSubject').textContent = `Subject: ${data.subject}`;
            this.modal.querySelector('#emailBody').textContent = data.body;
            
            resultSection.classList.add('show');
            
            // Scroll to results
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            // Auto-insert if selected
            if (formData.autoInsert) {
                setTimeout(() => {
                    this.insertIntoGmail();
                }, 500);
            }
            
        } catch (error) {
            console.error('Error generating email:', error);
            
            // For testing, use mock data
            const mockResponse = this.generateMockEmail(formData);
            
            this.modal.querySelector('#emailSubject').textContent = `Subject: ${mockResponse.subject}`;
            this.modal.querySelector('#emailBody').textContent = mockResponse.body;
            
            resultSection.classList.add('show');
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } finally {
            generateButton.classList.remove('loading');
            generateButton.disabled = false;
        }
    }

    generateMockEmail(formData) {
        // Mock email generation based on options
        let subject = formData.subjectLine || 'Project Update - Q1 Progress';
        let body = '';
        
        // Greeting
        if (formData.includeGreeting) {
            switch (formData.greetingStyle) {
                case 'firstname':
                    body += 'Hi [First Name],\n\n';
                    break;
                case 'formal':
                    body += 'Dear [Title] [Last Name],\n\n';
                    break;
                case 'team':
                    body += 'Hello Team,\n\n';
                    break;
                case 'time':
                    body += 'Good morning,\n\n';
                    break;
                default:
                    body += 'Hi there,\n\n';
            }
        }
        
        // Opening
        if (formData.openingSentence) {
            body += formData.openingSentence + '\n\n';
        } else {
            body += 'I hope this email finds you well.\n\n';
        }
        
        // Main content based on type
        switch (formData.responseType) {
            case 'accept':
                body += 'I am pleased to confirm that I accept your proposal. ';
                break;
            case 'decline':
                body += 'Thank you for considering me for this opportunity. After careful consideration, I must respectfully decline. ';
                break;
            case 'request':
                body += 'I am writing to request additional information regarding the project. ';
                break;
            default:
                body += 'I wanted to reach out regarding the matter we discussed. ';
        }
        
        // Add structure based on selection
        if (formData.structure === 'bullets') {
            body += '\n\nKey points:\n• First point\n• Second point\n• Third point\n';
        }
        
        // Add emojis if requested
        if (formData.useEmojis) {
            body = body.replace(/\./g, '. 😊');
        }
        
        // Closing
        if (formData.closingLine) {
            body += '\n' + formData.closingLine;
        } else if (formData.includeClosing) {
            body += '\n\nLooking forward to your response.';
        }
        
        // Signature
        if (formData.includeSignature) {
            body += '\n\nBest regards,\n[Your Name]';
        }
        
        return { subject, body };
    }

    copyToClipboard() {
        const subject = this.modal.querySelector('#emailSubject').textContent;
        const body = this.modal.querySelector('#emailBody').textContent;
        const fullEmail = `${subject}\n\n${body}`;
        
        navigator.clipboard.writeText(fullEmail).then(() => {
            this.showNotification('Email copied to clipboard!', 'success');
        }).catch(() => {
            this.showNotification('Failed to copy email', 'error');
        });
    }

    insertIntoGmail() {
        // Find Gmail's compose button and click it
        const composeBtn = document.querySelector('.T-I.T-I-KE.L3');
        
        if (composeBtn) {
            composeBtn.click();
            
            // Wait for compose window to open
            setTimeout(() => {
                this.insertEmailContent();
            }, 500);
        } else {
            this.showNotification('Could not find Gmail compose button', 'error');
        }
    }

    insertEmailContent() {
        const subject = this.modal.querySelector('#emailSubject').textContent.replace('Subject: ', '');
        const body = this.modal.querySelector('#emailBody').textContent;
        
        // Find subject field
        const subjectField = document.querySelector('input[name="subjectbox"]');
        
        // Find body field
        const bodyField = document.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
                         document.querySelector('.Am.Al.editable');
        
        if (subjectField && bodyField) {
            // Insert subject
            subjectField.value = subject;
            subjectField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Insert body
            bodyField.innerHTML = body.replace(/\n/g, '<br>');
            bodyField.dispatchEvent(new Event('input', { bubbles: true }));
            
            this.showNotification('Email inserted into compose window!', 'success');
            
            // Close modal after a short delay
            setTimeout(() => {
                this.closeModal();
            }, 1500);
        } else {
            this.showNotification('Could not find compose fields', 'error');
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            animation: slideUp 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Add animation keyframes
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes slideUp {
        from {
            transform: translate(-50%, 100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(animationStyle);

// Initialize
const gmailCompose = new GmailComposeFeature();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => gmailCompose.init());
} else {
    gmailCompose.init();
}

// Re-initialize on navigation
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        setTimeout(() => gmailCompose.init(), 1000);
    }
}).observe(document, { subtree: true, childList: true });