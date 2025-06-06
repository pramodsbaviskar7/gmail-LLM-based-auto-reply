// content-compose.js - Complete version with all features
console.log('🚀 RespondX Compose: Script loaded');

class GmailComposeFeature {
    constructor() {
        this.modal = null;
        this.composeButton = null;
        this.initialized = false;
        this.darkMode = false;
        this.API_URL = 'https://gmail-llm-based-auto-reply.vercel.app'; 
        this.BACKUP_API_URL = 'https://gmail-llm-based-auto-reply.onrender.com';
        // ADD THESE NEW LINES:
        this.recognition = null;
        this.isListening = false;
        this.voiceButton = null;
        this.formStateId = Date.now();

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
    box-sizing: border-box; /* This is crucial - includes padding and border in width */
    max-width: 100%; /* Prevents expanding beyond container */
    overflow-wrap: break-word; /* Breaks long words if needed */
    word-wrap: break-word; /* Fallback for older browsers */
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
                /* Add these scrollbar styles to your existing CSS in the injectStyles() method */

/* Light mode scrollbars (default) */
.rx-modal ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.rx-modal ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.rx-modal ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
    border: 1px solid #f1f5f9;
}

.rx-modal ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.rx-modal ::-webkit-scrollbar-corner {
    background: #f1f5f9;
}

/* Dark mode scrollbars */
.rx-modal.dark ::-webkit-scrollbar-track {
    background: #1f2937;
}

.rx-modal.dark ::-webkit-scrollbar-thumb {
    background: #4b5563;
    border: 1px solid #1f2937;
}

.rx-modal.dark ::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

.rx-modal.dark ::-webkit-scrollbar-corner {
    background: #1f2937;
}

/* Firefox scrollbar support */
.rx-modal {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
}

.rx-modal.dark {
    scrollbar-color: #4b5563 #1f2937;
}

/* Also style scrollbars for specific scrollable elements */
.rx-body ::-webkit-scrollbar {
    width: 8px;
}

.rx-body ::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 4px;
}

.rx-body ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
}

.rx-body ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

.rx-modal.dark .rx-body ::-webkit-scrollbar-track {
    background: #1f2937;
}

.rx-modal.dark .rx-body ::-webkit-scrollbar-thumb {
    background: #4b5563;
}

.rx-modal.dark .rx-body ::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

/* For textareas specifically */
.rx-textarea::-webkit-scrollbar {
    width: 6px;
}

.rx-textarea::-webkit-scrollbar-track {
    background: #f9fafb;
    border-radius: 3px;
}

.rx-textarea::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
}

.rx-textarea::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
}

.rx-modal.dark .rx-textarea::-webkit-scrollbar-track {
    background: #374151;
}

.rx-modal.dark .rx-textarea::-webkit-scrollbar-thumb {
    background: #4b5563;
}

.rx-modal.dark .rx-textarea::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
}

/* Specific fixes for the optional input fields */
#recipientContext,
#subjectLine,
#openingSentence,
#closingLine {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 14px;
    background: white;
    color: #1f2937;
    transition: border-color 0.2s;
    box-sizing: border-box;
    max-width: 100%;
    font-family: inherit;
}

.rx-modal.dark #recipientContext,
.rx-modal.dark #subjectLine,
.rx-modal.dark #openingSentence,
.rx-modal.dark #closingLine {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
}

#recipientContext:focus,
#subjectLine:focus,
#openingSentence:focus,
#closingLine:focus {
    outline: none;
    border-color: #667eea;
}

/* Additional container fixes */
.rx-body {
    padding: 24px;
    overflow-y: auto;
    overflow-x: hidden; /* Prevent horizontal scroll */
    flex: 1;
    box-sizing: border-box;
    width: 100%;
}

/* Ensure the modal container doesn't overflow */
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
    box-sizing: border-box;
}

/* Fix for tab content containers */
.rx-tab-content {
    display: none;
    width: 100%;
    box-sizing: border-box;
}

.rx-tab-content.active {
    display: block;
    width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .rx-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }
    
    .rx-body {
        padding: 16px;
    }
    
    .rx-modal {
        width: 95%;
        margin: 10px;
    }
        
}
        /* Updated Voice Input Button - Icon Only */
.voice-input-container {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
}

.voice-input-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    position: relative;
    overflow: hidden;
}

.voice-input-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    border-radius: 50%;
}

.voice-input-btn:hover::before {
    opacity: 1;
}

.voice-input-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.voice-input-btn.listening {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    animation: pulse-recording 1.5s ease-in-out infinite;
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
}

.voice-input-btn.listening::before {
    background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.2) 100%);
    opacity: 1;
}

.voice-input-btn.listening:hover {
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.6);
}

@keyframes pulse-recording {
    0%, 100% { 
        transform: scale(1);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4), 0 0 0 0 rgba(239, 68, 68, 0.4);
    }
    50% { 
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6), 0 0 0 8px rgba(239, 68, 68, 0.1);
    }
}

/* Dark mode adjustments for voice button */
.rx-modal.dark .voice-input-btn {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%);
    box-shadow: 0 2px 8px rgba(129, 140, 248, 0.3);
}

.rx-modal.dark .voice-input-btn:hover {
    box-shadow: 0 4px 16px rgba(129, 140, 248, 0.4);
}

.rx-modal.dark .voice-input-btn.listening {
    background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
    box-shadow: 0 2px 8px rgba(248, 113, 113, 0.4);
}


/* Updated tooltip styles to match theme */
.voice-tooltip {
    position: absolute;
    bottom: 50px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.voice-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: #1f2937;
}

.voice-tooltip.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-4px);
}

.rx-modal.dark .voice-tooltip {
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    color: #1f2937;
    box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}

.rx-modal.dark .voice-tooltip::after {
    border-top-color: #f3f4f6;
}

/* Enhanced modal opening tooltip */
.modal-voice-hint {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    display: flex;
    align-items: center;
    gap: 12px;
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-voice-hint.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}

.modal-voice-hint .hint-icon {
    font-size: 18px;
    animation: bounce-hint 2s ease-in-out infinite;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

@keyframes bounce-hint {
    0%, 100% { 
        transform: translateY(0) scale(1);
    }
    50% { 
        transform: translateY(-4px) scale(1.1);
    }
}

.rx-modal.dark .modal-voice-hint {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%);
    box-shadow: 0 8px 32px rgba(129, 140, 248, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Voice activity indicator improvements */
.voice-indicator {
    display: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 16px;
    border-radius: 12px;
    margin-top: 12px;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.rx-modal.dark .voice-indicator {
    background: linear-gradient(135deg, #818cf8 0%, #a855f7 100%);
    box-shadow: 0 4px 12px rgba(129, 140, 248, 0.2);
}

.voice-status {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.voice-animation {
    display: flex;
    gap: 3px;
    align-items: center;
}

.voice-wave {
    width: 3px;
    height: 16px;
    background: white;
    border-radius: 2px;
    animation: voice-wave 1.2s ease-in-out infinite;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
}

.voice-wave:nth-child(2) {
    animation-delay: 0.2s;
}

.voice-wave:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes voice-wave {
    0%, 100% { 
        height: 4px; 
        opacity: 0.6;
        transform: scaleY(1);
    }
    50% { 
        height: 16px; 
        opacity: 1;
        transform: scaleY(1.2);
    }
}

.interim-text {
    font-style: italic;
    opacity: 0.9;
    margin-top: 4px;
    font-size: 13px;
    min-height: 18px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    backdrop-filter: blur(4px);
}

/* Enhanced button icons - using better symbols */
.voice-input-btn .voice-icon {
    font-size: 16px;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* Responsive adjustments */
@media (max-width: 480px) {
    .voice-input-container {
        flex-direction: row;
        justify-content: flex-start;
    }
    
    .voice-input-btn {
        width: 36px;
        height: 36px;
        font-size: 14px;
    }
    
    .modal-voice-hint {
        padding: 12px 18px;
        font-size: 13px;
        max-width: 280px;
        text-align: center;
    }
}

.clear-input-btn {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
    color: white;
    border: none;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    box-shadow: 0 2px 6px rgba(107, 114, 128, 0.3);
    position: relative;
}

.clear-input-btn:hover {
    background: linear-gradient(135deg, #4b5563 0%, #374151 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
}

.clear-input-btn.clearing {
    animation: clear-spin 0.6s ease-in-out;
}

@keyframes clear-spin {
    0% { transform: rotate(0deg) scale(1); }
    50% { transform: rotate(180deg) scale(0.9); }
    100% { transform: rotate(360deg) scale(1); }
}

.rx-modal.dark .clear-input-btn {
    background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
}

.rx-modal.dark .clear-input-btn:hover {
    background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}
    /* FIX: Dark mode for Templates tab */

/* Template Preview Area - Dark Mode Support */
.template-preview {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Template Preview Content */
.template-preview-content {
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 16px;
    min-height: 200px;
}

/* Template Subject Line */
.template-subject {
    color: var(--accent-color);
    font-weight: 600;
    margin-bottom: 12px;
    background: transparent;
}

/* Template Body Text */
.template-body {
    color: var(--text-primary);
    line-height: 1.5;
    white-space: pre-wrap;
    background: transparent;
}

/* Quick Templates Dropdown - Dark Mode */
.template-dropdown {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

.template-dropdown option {
    background: var(--bg-secondary);
    color: var(--text-primary);
}

/* Template Container */
.templates-container {
    background: var(--bg-primary);
    color: var(--text-primary);
}

/* Ensure all text in templates section follows dark mode */
.templates-tab .form-group label,
.templates-tab .form-control,
.templates-tab .template-preview *,
.templates-tab h3,
.templates-tab h4 {
    color: var(--text-primary) !important;
    background: var(--bg-primary);
}

/* Fix any input fields in templates */
.templates-tab input,
.templates-tab select,
.templates-tab textarea {
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
}

/* Dark mode specific overrides */
[data-theme="dark"] .template-preview {
    background: #2a2a2a;
    color: #e0e0e0;
    border-color: #404040;
}

[data-theme="dark"] .template-preview-content {
    background: #1e1e1e;
    color: #e0e0e0;
}

[data-theme="dark"] .template-subject {
    color: #60a5fa;
}

[data-theme="dark"] .template-body {
    color: #e0e0e0;
}

/* If you're using specific class names, add them here */
.dark-mode .template-preview,
.dark .template-preview {
    background: #2a2a2a !important;
    color: #e0e0e0 !important;
}

.dark-mode .template-preview-content,
.dark .template-preview-content {
    background: #1e1e1e !important;
    color: #e0e0e0 !important;
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
    initVoiceRecognition() {
    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported');
        return false;
    }

    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configuration
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        
        // Get language from dropdown
        const languageSelect = this.modal.querySelector('#languageSelect');
        const selectedLang = languageSelect ? languageSelect.value : 'english';
        
        const langMap = {
            'english': 'en-US',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE',
            'italian': 'it-IT',
            'portuguese': 'pt-BR',
            'chinese': 'zh-CN',
            'japanese': 'ja-JP',
            'hindi': 'hi-IN'
        };
        
        this.recognition.lang = langMap[selectedLang] || 'en-US';
        console.log('Voice recognition language set to:', this.recognition.lang);
        
        // Event handlers - NO NOTIFICATION IN ONSTART
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            // No notification here to prevent duplicates
        };
        
        this.recognition.onresult = (event) => {
            console.log('Speech recognition result received:', event);
            this.handleVoiceResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            this.handleVoiceError(event);
        };
        
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            this.stopVoiceInput();
        };
        
        this.recognition.onnomatch = () => {
            console.log('No speech match found');
            this.showNotification('No speech recognized. Please try again.', 'error');
        };
        
        this.recognition.onspeechstart = () => {
            console.log('Speech detected');
        };
        
        this.recognition.onspeechend = () => {
            console.log('Speech ended');
        };
        
        return true;
        
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        return false;
    }
}

h// REPLACE your existing handleVoiceResult method with this fixed version:

handleVoiceResult(event) {
    const promptInput = this.modal.querySelector('#promptInput');
    const charCount = this.modal.querySelector('#charCount');
    
    if (!event.results || event.results.length === 0) {
        console.log('No speech results received');
        return;
    }
    
    let finalTranscript = '';
    let interimTranscript = '';

    // Process all results from the current event
    for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        
        // Check if result exists and has transcript
        if (result && result[0] && result[0].transcript) {
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
                finalTranscript += transcript;
                console.log('Final transcript:', transcript);
            } else {
                interimTranscript += transcript;
                console.log('Interim transcript:', transcript);
            }
        }
    }

    // Only update the textarea with final results
    if (finalTranscript.trim()) {
        // Get current cursor position
        const cursorPos = promptInput.selectionStart;
        const currentText = promptInput.value;
        
        // Insert the new text at cursor position
        const beforeCursor = currentText.substring(0, cursorPos);
        const afterCursor = currentText.substring(cursorPos);
        const newText = beforeCursor + finalTranscript + ' ' + afterCursor;
        
        promptInput.value = newText;
        charCount.textContent = newText.length;
        
        // Set cursor after the inserted text
        const newCursorPos = cursorPos + finalTranscript.length + 1;
        promptInput.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger input event for any other listeners
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Update the interim display
    this.updateVoiceIndicator(interimTranscript);
}

// ALSO UPDATE your initVoiceRecognition method with better error handling:

initVoiceRecognition() {
    // Check for speech recognition support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.error('Speech recognition not supported');
        return false;
    }

    try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configuration
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        
        // Get language from dropdown
        const languageSelect = this.modal.querySelector('#languageSelect');
        const selectedLang = languageSelect ? languageSelect.value : 'english';
        
        const langMap = {
            'english': 'en-US',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE',
            'italian': 'it-IT',
            'portuguese': 'pt-BR',
            'chinese': 'zh-CN',
            'japanese': 'ja-JP',
            'hindi': 'hi-IN'
        };
        
        this.recognition.lang = langMap[selectedLang] || 'en-US';
        console.log('Voice recognition language set to:', this.recognition.lang);
        
        // Event handlers
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.showNotification('🎤 Listening... Speak clearly!', 'success');
        };
        
        this.recognition.onresult = (event) => {
            console.log('Speech recognition result received:', event);
            this.handleVoiceResult(event);
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event);
            this.handleVoiceError(event);
        };
        
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            this.stopVoiceInput();
        };
        
        this.recognition.onnomatch = () => {
            console.log('No speech match found');
            this.showNotification('No speech recognized. Please try again.', 'error');
        };
        
        this.recognition.onspeechstart = () => {
            console.log('Speech detected');
        };
        
        this.recognition.onspeechend = () => {
            console.log('Speech ended');
        };
        
        return true;
        
    } catch (error) {
        console.error('Error initializing speech recognition:', error);
        return false;
    }
}

// ALSO UPDATE your startVoiceInput method:

startVoiceInput() {
    if (!this.recognition) {
        if (!this.initVoiceRecognition()) {
            this.showNotification('Speech recognition not supported in this browser', 'error');
            return;
        }
    }

    // Stop any existing recognition
    if (this.isListening) {
        this.recognition.stop();
        return;
    }

    try {
        // Update language before starting
        const languageSelect = this.modal.querySelector('#languageSelect');
        const selectedLang = languageSelect ? languageSelect.value : 'english';
        
        const langMap = {
            'english': 'en-US',
            'spanish': 'es-ES',
            'french': 'fr-FR',
            'german': 'de-DE',
            'italian': 'it-IT',
            'portuguese': 'pt-BR',
            'chinese': 'zh-CN',
            'japanese': 'ja-JP',
            'hindi': 'hi-IN'
        };
        
        this.recognition.lang = langMap[selectedLang] || 'en-US';
        
        // Clear any previous state
        this.isListening = true;
        this.updateVoiceButton();
        this.showVoiceIndicator();
        
        // Start recognition
        this.recognition.start();
        
    } catch (error) {
        console.error('Error starting voice recognition:', error);
        this.showNotification('Could not start voice input: ' + error.message, 'error');
        this.stopVoiceInput();
    }
}

// DEBUGGING: Add this method to help troubleshoot

debugVoiceRecognition() {
    console.log('=== Voice Recognition Debug Info ===');
    console.log('Browser:', navigator.userAgent);
    console.log('Speech Recognition available:', 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    console.log('Current language:', this.recognition ? this.recognition.lang : 'Not initialized');
    console.log('Is listening:', this.isListening);
    console.log('Recognition object:', this.recognition);
}

handleVoiceError(event) {
    console.error('Speech recognition error:', event.error);
    this.showNotification('Voice input error: ' + event.error, 'error');
    this.stopVoiceInput();
}

startVoiceInput() {
    if (!this.recognition) {
        if (!this.initVoiceRecognition()) {
            this.showNotification('Speech recognition not supported', 'error');
            return;
        }
    }

    try {
        this.recognition.start();
        this.isListening = true;
        this.updateVoiceButton();
        this.showVoiceIndicator();
        this.showNotification('🎤 Listening... Speak now!', 'success');
    } catch (error) {
        this.showNotification('Could not start voice input', 'error');
    }
}

stopVoiceInput() {
    if (this.recognition && this.isListening) {
        this.recognition.stop();
    }
    
    this.isListening = false;
    this.updateVoiceButton();
    this.hideVoiceIndicator();
}

toggleVoiceInput() {
    if (this.isListening) {
        this.stopVoiceInput();
    } else {
        this.startVoiceInput();
    }
}

updateVoiceButton() {
    if (!this.voiceButton) return;
    
    const tooltip = this.modal.querySelector('#voiceTooltip');
    
    if (this.isListening) {
        this.voiceButton.classList.add('listening');
        this.voiceButton.innerHTML = '⏹️';
        this.voiceButton.title = 'Click to stop recording';
        if (tooltip) {
            tooltip.textContent = 'Click to stop';
            tooltip.classList.remove('show'); // Hide tooltip while recording
        }
    } else {
        this.voiceButton.classList.remove('listening');
        this.voiceButton.innerHTML = '🎤';
        this.voiceButton.title = 'Click to start voice input';
        if (tooltip) {
            tooltip.textContent = 'Click to speak';
        }
    }
}

showVoiceIndicator() {
    let indicator = this.modal.querySelector('#voiceIndicator');
    if (indicator) {
        indicator.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <div class="voice-animation">
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                    <div class="voice-wave"></div>
                </div>
                <span>Listening...</span>
                <div class="interim-text" id="interimText"></div>
            </div>
        `;
        indicator.style.display = 'block';
    }
}

hideVoiceIndicator() {
    const indicator = this.modal.querySelector('#voiceIndicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

updateVoiceIndicator(interimText) {
    const interimElement = this.modal.querySelector('#interimText');
    if (interimElement && interimText) {
        interimElement.textContent = `"${interimText}"`;
    }
}
async loadUserSignaturePreferences() {
    return new Promise((resolve) => {
        // Check if Chrome extension APIs are available
        if (typeof chrome === 'undefined' || !chrome.storage) {
            console.warn('Chrome storage not available for signature preferences');
            resolve(null);
            return;
        }
        
        const storage = chrome.storage.sync || chrome.storage.local;
        
        storage.get(['userEmail', 'userInfo'], function(result) {
            if (chrome.runtime.lastError) {
                console.error('Error loading signature preferences:', chrome.runtime.lastError);
                resolve(null);
                return;
            }
            
            console.log('📝 Loaded signature preferences:', result);
            
            // Construct signature preferences object (same format as auto-reply)
            if (result.userInfo || result.userEmail) {
                const preferences = {
                    hasPreferences: true,
                    email: result.userInfo?.email || result.userEmail || null,
                    full_name: result.userInfo?.full_name || null,
                    linkedin: result.userInfo?.linkedin || null,
                    mobile: result.userInfo?.mobile || null
                };
                
                console.log('✅ Signature preferences loaded for compose:', preferences);
                resolve(preferences);
            } else {
                console.log('ℹ️ No signature preferences found');
                resolve(null);
            }
        });
    });
}

// 🔥 ADD THIS HELPER FUNCTION TOO
updateSignatureStatus(hasPreferences) {
    const signatureCheckbox = this.modal.querySelector('#includeSignature');
    if (signatureCheckbox && hasPreferences) {
        const label = signatureCheckbox.parentElement;
        if (label) {
            // Update the label to show signature is available
            label.innerHTML = `
                <input type="checkbox" id="includeSignature" checked>
                <span style="color: #34a853; display: flex; align-items: center; gap: 4px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    Include signature (from saved preferences)
                </span>
            `;
        }
    }
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
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
        <div class="voice-input-container">
    <button type="button" class="voice-input-btn" id="voiceInputBtn" title="Click to start voice input">
        🎤
        <div class="voice-tooltip" id="voiceTooltip">Click to speak</div>
    </button>
    <button type="button" class="clear-input-btn" id="clearInputBtn" title="Clear text">
        🗑️
    </button>
</div>
        <div class="rx-char-count">
            <span id="charCount">0</span>/1000
        </div>
    </div>
    <div class="voice-indicator" id="voiceIndicator"></div>
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
    
    this.trackFormChanges();
    
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
            // Show preview with better formatting
            templatePreview.innerHTML = `
                <div style="margin-bottom: 12px;">
                    <strong style="color: #667eea;">Subject:</strong> 
                    <span style="font-style: italic;">${template.subject}</span>
                </div>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 12px; white-space: pre-line; line-height: 1.5;">
                    ${template.body}
                </div>
            `;
            
            // Fill the prompt with template
            promptInput.value = template.prompt;
            charCount.textContent = template.prompt.length;
            
            // Add visual feedback
            templatePreview.style.border = '2px solid #667eea';
            templatePreview.style.backgroundColor = this.darkMode ? '#1f2937' : '#f8fafc';
            
            // Reset border after 2 seconds
            setTimeout(() => {
                templatePreview.style.border = '1px solid ' + (this.darkMode ? '#4b5563' : '#e5e7eb');
            }, 2000);
            
        } else {
            templatePreview.innerHTML = '<div style="color: #6b7280; font-style: italic;">Select a template to see a preview</div>';
            templatePreview.style.border = '1px solid ' + (this.darkMode ? '#4b5563' : '#e5e7eb');
            templatePreview.style.backgroundColor = this.darkMode ? '#374151' : '#f9fafb';
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

    // ========== VOICE INPUT EVENT LISTENERS ==========
    
    // Voice input button
    this.voiceButton = this.modal.querySelector('#voiceInputBtn');
    const voiceTooltip = this.modal.querySelector('#voiceTooltip');

    if (this.voiceButton) {
        this.voiceButton.addEventListener('click', () => this.toggleVoiceInput());
        
        // Show tooltip on hover
        this.voiceButton.addEventListener('mouseenter', () => {
            if (voiceTooltip && !this.isListening) {
                voiceTooltip.classList.add('show');
            }
        });
        
        // Hide tooltip on mouse leave
        this.voiceButton.addEventListener('mouseleave', () => {
            if (voiceTooltip) {
                voiceTooltip.classList.remove('show');
            }
        });
        
        // Update tooltip text based on state
        this.voiceButton.addEventListener('click', () => {
            if (voiceTooltip) {
                voiceTooltip.textContent = this.isListening ? 'Click to stop' : 'Click to speak';
            }
        });
    }

    // ========== ADD THE CLEAR BUTTON CODE RIGHT HERE ==========
    
    // Clear button functionality
    const clearButton = this.modal.querySelector('#clearInputBtn');
    if (clearButton) {
        clearButton.addEventListener('click', () => this.clearPromptText());
    }

    // ========== REST OF YOUR EXISTING CODE ==========

    // Stop voice input when modal is closed
    const originalCloseHandler = () => {
        // Stop voice input first
        if (this.isListening) {
            this.stopVoiceInput();
        }
        this.closeModal();
    };
    
    // Update close button to stop voice input
    closeBtn.removeEventListener('click', () => this.closeModal());
    closeBtn.addEventListener('click', originalCloseHandler);
    
    // Update overlay click to stop voice input
    this.modal.removeEventListener('click', (e) => {
        if (e.target === this.modal) {
            this.closeModal();
        }
    });
    this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
            if (this.isListening) {
                this.stopVoiceInput();
            }
            this.closeModal();
        }
    });
}

    getTemplate(templateId) {
    const templates = {
        'meeting-request': {
            subject: 'Meeting Request - Project Discussion',
            prompt: 'Write a professional email requesting a meeting to discuss the upcoming project timeline and deliverables. Suggest a few time slots for next week.',
            body: `Dear [Name],

I hope this email finds you well. I would like to schedule a meeting to discuss our upcoming project timeline and key deliverables.

Would any of the following times work for your schedule?
• Tuesday, [Date] at 2:00 PM - 3:00 PM
• Wednesday, [Date] at 10:00 AM - 11:00 AM  
• Thursday, [Date] at 3:00 PM - 4:00 PM

Please let me know which option works best for you, or feel free to suggest alternative times.

Best regards,
[Your Name]`
        },
        
        'meeting-followup': {
            subject: 'Follow-up: Action Items from Today\'s Meeting',
            prompt: 'Write a follow-up email summarizing the key points discussed in today\'s meeting and listing the action items with assigned owners.',
            body: `Hi Team,

Thank you for attending today's productive meeting. Here's a summary of what we discussed and the action items moving forward:

Key Discussion Points:
• [Point 1]
• [Point 2]
• [Point 3]

Action Items:
• [Action 1] - Assigned to [Name] - Due: [Date]
• [Action 2] - Assigned to [Name] - Due: [Date]
• [Action 3] - Assigned to [Name] - Due: [Date]

Our next meeting is scheduled for [Date] at [Time]. Please reach out if you have any questions.

Best,
[Your Name]`
        },
        
        'project-update': {
            subject: 'Project Update - [Project Name] Weekly Status',
            prompt: 'Write a comprehensive project update email covering progress, completed tasks, upcoming milestones, and any blockers or concerns.',
            body: `Hi Team,

Here's our weekly project update for [Project Name]:

✅ Completed This Week:
• [Task 1] - Delivered on schedule
• [Task 2] - Successfully implemented
• [Task 3] - Testing completed

🔄 In Progress:
• [Task 4] - 75% complete, on track for Friday
• [Task 5] - Currently in review phase
• [Task 6] - Development started

📅 Coming Up Next Week:
• [Upcoming task 1]
• [Upcoming task 2]
• [Milestone deadline on Friday]

⚠️ Blockers/Concerns:
• [Issue 1] - Need approval from [Department]
• [Issue 2] - Waiting for external vendor response

Overall Status: 🟢 On Track

Best regards,
[Your Name]`
        },
        
        'deadline-reminder': {
            subject: 'Friendly Reminder: [Task] Due [Date]',
            prompt: 'Write a polite but clear reminder email about an upcoming deadline, offering support if needed.',
            body: `Hi [Name],

I hope you're doing well. This is a friendly reminder that [task/deliverable] is due on [date].

Current status check:
• Is everything on track for the deadline?
• Do you need any additional resources or support?
• Are there any potential blockers I should be aware of?

Please don't hesitate to reach out if you need any assistance or if we need to discuss the timeline.

Thanks for your attention to this!

Best,
[Your Name]`
        },
        
        'introduction': {
            subject: 'Introduction - [Your Name] from [Company]',
            prompt: 'Write a professional introduction email for networking or business purposes, highlighting your background and purpose for reaching out.',
            body: `Dear [Name],

I hope this email finds you well. My name is [Your Name], and I'm [Your Position] at [Company Name].

I'm reaching out because [reason for connection - mutual contact, shared interest, business opportunity, etc.]. I believe there could be valuable synergies between our work in [relevant area].

A bit about my background:
• [Key experience/achievement 1]
• [Key experience/achievement 2]
• [Relevant expertise or interest]

I would love the opportunity to connect and learn more about your work at [Their Company]. Would you be open to a brief 15-20 minute call in the coming weeks?

Thank you for your time, and I look forward to hearing from you.

Best regards,
[Your Name]
[Your Title]
[Company Name]
[Contact Information]`
        },
        
        'thank-interview': {
            subject: 'Thank You - [Position] Interview',
            prompt: 'Write a professional thank you email after a job interview, reiterating interest and highlighting key qualifications.',
            body: `Dear [Interviewer Name],

Thank you for taking the time to meet with me today to discuss the [Position Title] role at [Company Name]. I thoroughly enjoyed our conversation about [specific topic discussed] and learning more about [something specific about the role/company].

Our discussion reinforced my enthusiasm for this opportunity. I'm particularly excited about [specific aspect of the role] and believe my experience in [relevant skill/experience] would enable me to make a meaningful contribution to your team.

I wanted to mention that [additional relevant point you forgot to mention or want to emphasize].

Please don't hesitate to reach out if you need any additional information. I look forward to the next steps in the process.

Thank you again for your time and consideration.

Best regards,
[Your Name]
[Your Phone Number]
[Your Email]`
        },
        
        'sick-leave': {
            subject: 'Sick Leave - [Your Name] - [Date]',
            prompt: 'Write a professional sick leave notification email informing about absence and coverage arrangements.',
            body: `Dear [Manager Name],

I am writing to inform you that I am feeling unwell today and will not be able to come to work. I expect to return on [expected return date], but will keep you updated if my condition changes.

Coverage arrangements:
• [Urgent task 1] - [Colleague name] has been briefed and can handle this
• [Meeting/commitment] - I have notified [relevant people] and rescheduled for [date]
• [Ongoing project] - No immediate action required, will catch up upon return

I will monitor my email periodically for any urgent matters, but may have delayed responses.

Thank you for understanding. I will keep you posted on my recovery.

Best regards,
[Your Name]`
        },
        
        'vacation-request': {
            subject: 'Vacation Request - [Dates]',
            prompt: 'Write a professional vacation request email with dates, coverage plans, and transition details.',
            body: `Dear [Manager Name],

I would like to request vacation time from [start date] to [end date], returning to work on [return date]. This will be [number] working days total.

Preparation and Coverage Plan:
• All current projects will be up to date before my departure
• [Colleague name] has agreed to cover urgent matters in my absence
• [Specific responsibility] will be handled by [person/plan]
• I will complete [specific tasks] before leaving

Transition Details:
• Client meetings scheduled during this period have been rescheduled
• All deliverables due during my absence will be completed beforehand
• Emergency contact: I will have limited availability but can be reached at [contact method] for critical issues only

I believe this timing works well as [reason - low activity period, after project completion, etc.].

Please let me know if you need any additional information or if there are concerns about this timing.

Thank you for considering my request.

Best regards,
[Your Name]`
        },
        
        'resignation': {
            subject: 'Resignation Notice - [Your Name]',
            prompt: 'Write a professional resignation letter with notice period, transition plans, and gratitude.',
            body: `Dear [Manager Name],

Please accept this letter as my formal notice of resignation from my position as [Your Job Title] at [Company Name]. My last day of employment will be [last working day], providing [notice period] notice as required.

This decision was not made lightly. I have accepted a position that will allow me to [brief reason - career growth, new challenges, etc.].

Transition Plan:
• I am committed to ensuring a smooth transition of my responsibilities
• I will complete [specific projects/tasks] before my departure
• I am happy to assist in training my replacement or documenting processes
• All current projects and client relationships will be properly handed over

I want to express my sincere gratitude for the opportunities for professional and personal growth during my time here. I have enjoyed working with the team and appreciate the support and guidance I've received.

Please let me know how I can help make this transition as smooth as possible.

Thank you for your understanding.

Sincerely,
[Your Name]`
        },
        
        'complaint': {
            subject: 'Concern Regarding [Issue]',
            prompt: 'Write a professional complaint email that clearly states the issue, impact, and desired resolution while maintaining a constructive tone.',
            body: `Dear [Recipient Name],

I am writing to bring to your attention a concern regarding [specific issue] that occurred on [date/timeframe].

Issue Description:
[Clear, factual description of what happened]

Impact:
• [Specific impact 1]
• [Specific impact 2]
• [How this affects work/service/etc.]

I have attempted to resolve this by [previous actions taken], but the issue persists.

Requested Resolution:
• [Specific action desired]
• [Timeline expectation]
• [Any follow-up needed]

I believe this can be resolved promptly and am happy to discuss this matter further at your convenience. I appreciate your attention to this matter and look forward to a swift resolution.

Please let me know the next steps or if you need any additional information.

Best regards,
[Your Name]
[Contact Information]`
        },
        
        'feedback': {
            subject: 'Feedback on [Topic/Project/Experience]',
            prompt: 'Write a constructive feedback email that provides specific observations, suggestions for improvement, and positive reinforcement.',
            body: `Dear [Name],

I wanted to share some feedback regarding [specific topic/project/interaction] from [timeframe].

What Went Well:
• [Specific positive observation 1]
• [Specific positive observation 2]
• [Recognition of good work/effort]

Areas for Improvement:
• [Specific observation with constructive suggestion]
• [Another area with actionable advice]
• [Resource or support that might help]

Overall Impression:
[Balanced summary that acknowledges strengths while addressing areas for growth]

I appreciate [specific thing you appreciated] and believe that focusing on [improvement area] will help achieve even better results in the future.

I'm happy to discuss this feedback further or provide additional support as needed.

Best regards,
[Your Name]`
        },
        
        'proposal': {
            subject: 'Business Proposal - [Project/Service Name]',
            prompt: 'Write a compelling business proposal email outlining a solution, benefits, timeline, and next steps.',
            body: `Dear [Client Name],

Thank you for the opportunity to propose a solution for [client's need/challenge].

Proposed Solution:
We recommend [solution overview] that will address your key requirements:
• [Benefit 1]
• [Benefit 2]
• [Benefit 3]

Project Scope:
• [Deliverable 1] - [Description]
• [Deliverable 2] - [Description]
• [Deliverable 3] - [Description]

Timeline:
• Phase 1: [Duration] - [Key activities]
• Phase 2: [Duration] - [Key activities]
• Project completion: [End date]

Investment:
• Total project cost: [Amount]
• Payment terms: [Terms]
• ROI expectation: [Expected return/value]

Why Choose Us:
• [Key differentiator 1]
• [Relevant experience/expertise]
• [Client success story or testimonial]

Next Steps:
I would love to schedule a call to discuss this proposal in detail and answer any questions you might have.

Thank you for your consideration. I look forward to the opportunity to work together.

Best regards,
[Your Name]
[Title]
[Company]
[Contact Information]`
        }
    };
    
    return templates[templateId] || null;
}

async openModal() {
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
    
    // 🔥 NEW: Load and show signature status
    try {
        const signaturePrefs = await this.loadUserSignaturePreferences();
        if (signaturePrefs?.hasPreferences) {
            this.updateSignatureStatus(true);
            console.log('✅ Signature preferences available for compose');
            
            // Show a subtle notification that signature is available
            setTimeout(() => {
                this.showNotification('📝 Your saved signature will be included', 'info');
            }, 1000);
        } else {
            console.log('ℹ️ No signature preferences found for compose');
        }
    } catch (error) {
        console.error('Error loading signature preferences:', error);
    }
    
    // Show voice input hint after modal opens
    setTimeout(() => {
        this.showVoiceHint();
    }, 500);
}


showVoiceHint() {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        return; // Don't show hint if voice input not supported
    }
    
    const hint = document.createElement('div');
    hint.className = 'modal-voice-hint';
    hint.innerHTML = `
        <div class="hint-icon">🎤</div>
        <div>You can use voice input! Click the microphone button to speak your email prompt.</div>
    `;
    
    document.body.appendChild(hint);
    
    // Show the hint
    setTimeout(() => {
        hint.classList.add('show');
    }, 100);
    
    // Hide the hint after 3 seconds
    setTimeout(() => {
        hint.classList.remove('show');
        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 400);
    }, 3000);
}

clearPromptText() {
    const promptInput = this.modal.querySelector('#promptInput');
    const charCount = this.modal.querySelector('#charCount');
    const clearBtn = this.modal.querySelector('#clearInputBtn');
    
    if (promptInput.value.trim() === '') {
        this.showNotification('Text area is already empty!', 'info');
        return;
    }
    
    // Add clearing animation
    clearBtn.classList.add('clearing');
    
    // Clear the text
    setTimeout(() => {
        promptInput.value = '';
        charCount.textContent = '0';
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        promptInput.focus();
        this.showNotification('✨ Text cleared!', 'success');
        clearBtn.classList.remove('clearing');
    }, 300);
}


    closeModal() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.resetForm();
    
    // Stop voice input if active
    if (this.isListening) {
        this.stopVoiceInput();
    }
    
    // Remove any lingering voice hints
    const hints = document.querySelectorAll('.modal-voice-hint');
    hints.forEach(hint => {
        if (hint.parentNode) {
            hint.parentNode.removeChild(hint);
        }
    });
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
    

    // BLOCK 1: REPLACE handleGenerate method (around line 2466)
// Find this method and replace it entirely:

// REPLACE your existing handleGenerate method with this fixed version:

async handleGenerate(e) {
    e.preventDefault();
    
    const generateButton = this.modal.querySelector('#generateButton');
    const resultSection = this.modal.querySelector('#resultSection');
    
    // Hide previous results
    resultSection.classList.remove('show');
    
    // Show loading state
    generateButton.classList.add('loading');
    generateButton.disabled = true;
    
    // 🔥 NEW: Load signature preferences
    let userSignaturePreferences = null;
    try {
        userSignaturePreferences = await this.loadUserSignaturePreferences();
        console.log('🔍 Loaded signature preferences for compose:', userSignaturePreferences);
    } catch (error) {
        console.error('Error loading signature preferences:', error);
    }
    
    // Collect all form data
    const formData = {
        // Basic options
        prompt: this.modal.querySelector('#promptInput').value.trim(),
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
        autoInsert: this.modal.querySelector('#autoInsert').checked,
        
        // 🔥 NEW: Include signature preferences
        userPreferences: userSignaturePreferences,
        
        // Form tracking
        _formStateId: this.formStateId,
        _timestamp: Date.now()
    };
    
    // Basic validation
    if (!formData.prompt || formData.prompt.length < 10) {
        this.showNotification('❌ Please enter a meaningful prompt (at least 10 characters)', 'error');
        generateButton.classList.remove('loading');
        generateButton.disabled = false;
        return;
    }
    
    try {
        console.log('🚀 Calling API with signature data:', formData);
        
        // Cache busting
        const cacheKey = `${this.formStateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;    
        const randomParam = Math.random().toString(36).substr(2, 15);
        
        // Call API with fallback and cool error handling
        let response;
        let usingBackup = false;

        try {
            // Show trying primary server message
            this.showNotification('🚀 Connecting to AI servers...', 'info');
            
            response = await fetch(`${this.API_URL}/api/compose?_t=${cacheKey}&_r=${randomParam}&_state=${this.formStateId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-Cache-Bust': cacheKey
                },
                body: JSON.stringify(formData)
            });
            
            // If response is not ok, throw error to trigger backup
            if (!response.ok) {
                throw new Error(`Primary server returned ${response.status}`);
            }
            
        } catch (primaryError) {
            console.warn('🔄 Primary API failed, trying backup...', primaryError);
            
            // Show cool backup message
            this.showNotification('🔄 Primary server busy! Switching to backup AI...', 'warning');
            usingBackup = true;
            
            try {
                response = await fetch(`${this.BACKUP_API_URL}/api/compose?_t=${cacheKey}&_r=${randomParam}&_state=${this.formStateId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache', 
                        'Expires': '0',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Cache-Bust': cacheKey
                    },
                    body: JSON.stringify(formData)
                });
                
                if (!response.ok) {
                    throw new Error(`Backup server returned ${response.status}`);
                }
                
                // Success with backup
                this.showNotification('✅ Backup AI to the rescue!', 'success');
                
            } catch (backupError) {
                console.error('💥 Both APIs failed:', backupError);
                
                // Cool error messages for complete failure
                let coolErrorMessage;
                if (primaryError.message.includes('fetch') && backupError.message.includes('fetch')) {
                    coolErrorMessage = '⚡ Our servers are taking a power nap. Please try again shortly!';
                } else if (primaryError.message.includes('500') || backupError.message.includes('500')) {
                    coolErrorMessage = '🤖 Both AI servers are having a coffee break! Please try again in a few moments.';
                } else {
                    coolErrorMessage = '⚡ Both primary and backup servers are taking a power nap. Please try again shortly!';
                }
                
                throw new Error(coolErrorMessage);
            }
        }
        
        if (!response.ok) {
            let errorMessage = `API Error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch {
                const errorText = await response.text();
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('✅ API Response with signature:', data);
        
        // Display results
        const emailSubjectElement = this.modal.querySelector('#emailSubject');
        const emailBodyElement = this.modal.querySelector('#emailBody');
        
        // Check if API returned a subject, otherwise use a fallback
        const subjectText = data.subject || 'No Subject';
        
        // Display the subject and body
        emailSubjectElement.textContent = `Subject: ${subjectText}`;
        emailBodyElement.textContent = data.body || 'No email body generated';
        
        // Show results section
        resultSection.classList.add('show');
        
        // Scroll to results
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Show success message with signature info
        let successMessage = usingBackup ? '🎯 Email generated via backup server!' : '✅ Email generated successfully!';
        if (data.metadata?.hasUserPreferences) {
            successMessage += ' (with your signature)';
        }
        this.showNotification(successMessage, 'success');
        
        // Auto-insert if selected
        if (formData.autoInsert) {
            setTimeout(() => {
                this.insertIntoGmail();
            }, 500);
        }
        
    } catch (error) {
        console.error('💥 Error generating email:', error);
        
        // If it's our custom cool message, show it directly
        if (error.message.includes('Houston') || error.message.includes('coffee break') || error.message.includes('power nap')) {
            this.showNotification(error.message, 'error');
        } else {
            // Cool custom error messages based on error type
            let customMessage;
            let errorType = 'error';
            
            if (error.message.includes('500')) {
                customMessage = '🤖 Our AI is having a coffee break! Please try again in a moment.';
                errorType = 'warning';
            } else if (error.message.includes('404')) {
                customMessage = '🔍 Hmm, our AI got lost in cyberspace. Please try again!';
            } else if (error.message.includes('403') || error.message.includes('401')) {
                customMessage = '🔐 Authentication hiccup detected. Please refresh and try again.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                customMessage = '🌐 Network gremlins detected! Check your connection and try again.';
            } else if (error.message.includes('timeout')) {
                customMessage = '⏰ Server is thinking too hard! Please try again.';
            } else if (error.message.includes('Rate limit')) {
                customMessage = '🚦 Whoa there, speedy! Rate limit hit. Please wait a moment and try again.';
            } else {
                // Generic but cool fallback
                customMessage = '🎭 Something mysterious happened! Please try again in a moment.';
            }
            
            this.showNotification(customMessage, errorType);
        }
        
    } finally {
        generateButton.classList.remove('loading');
        generateButton.disabled = false;
    }
}

    // generateMockEmail(formData) {
    //     // Mock email generation based on options
    //     let subject = formData.subjectLine || 'Project Update - Q1 Progress';
    //     let body = '';
        
    //     // Greeting
    //     if (formData.includeGreeting) {
    //         switch (formData.greetingStyle) {
    //             case 'firstname':
    //                 body += 'Hi [First Name],\n\n';
    //                 break;
    //             case 'formal':
    //                 body += 'Dear [Title] [Last Name],\n\n';
    //                 break;
    //             case 'team':
    //                 body += 'Hello Team,\n\n';
    //                 break;
    //             case 'time':
    //                 body += 'Good morning,\n\n';
    //                 break;
    //             default:
    //                 body += 'Hi there,\n\n';
    //         }
    //     }
        
    //     // Opening
    //     if (formData.openingSentence) {
    //         body += formData.openingSentence + '\n\n';
    //     } else {
    //         body += 'I hope this email finds you well.\n\n';
    //     }
        
    //     // Main content based on type
    //     switch (formData.responseType) {
    //         case 'accept':
    //             body += 'I am pleased to confirm that I accept your proposal. ';
    //             break;
    //         case 'decline':
    //             body += 'Thank you for considering me for this opportunity. After careful consideration, I must respectfully decline. ';
    //             break;
    //         case 'request':
    //             body += 'I am writing to request additional information regarding the project. ';
    //             break;
    //         default:
    //             body += 'I wanted to reach out regarding the matter we discussed. ';
    //     }
        
    //     // Add structure based on selection
    //     if (formData.structure === 'bullets') {
    //         body += '\n\nKey points:\n• First point\n• Second point\n• Third point\n';
    //     }
        
    //     // Add emojis if requested
    //     if (formData.useEmojis) {
    //         body = body.replace(/\./g, '. 😊');
    //     }
        
    //     // Closing
    //     if (formData.closingLine) {
    //         body += '\n' + formData.closingLine;
    //     } else if (formData.includeClosing) {
    //         body += '\n\nLooking forward to your response.';
    //     }
        
    //     // Signature
    //     if (formData.includeSignature) {
    //         body += '\n\nBest regards,\n[Your Name]';
    //     }
        
    //     return { subject, body };
    // }

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

    // ALSO REPLACE your insertEmailContent method with this fixed version:

insertEmailContent() {
    // 🔥 FIX: Properly extract the dynamic subject from the displayed text
    const subjectElement = this.modal.querySelector('#emailSubject');
    const bodyElement = this.modal.querySelector('#emailBody');
    
    // Extract subject by removing the "Subject: " prefix
    const fullSubjectText = subjectElement.textContent || '';
    const subject = fullSubjectText.replace(/^Subject:\s*/, '').trim();
    
    const body = bodyElement.textContent || '';
    
    console.log('📧 Inserting email content:', { subject, body: body.substring(0, 100) + '...' });
    
    // Find subject field
    const subjectField = document.querySelector('input[name="subjectbox"]');
    
    // Find body field
    const bodyField = document.querySelector('[role="textbox"][aria-label*="Message Body"]') ||
                     document.querySelector('.Am.Al.editable');
    
    if (subjectField && bodyField) {
        // Insert subject
        subjectField.value = subject;
        subjectField.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Insert body (convert line breaks to HTML)
        bodyField.innerHTML = body.replace(/\n/g, '<br>');
        bodyField.dispatchEvent(new Event('input', { bubbles: true }));
        
        this.showNotification('✅ Email inserted into compose window!', 'success');
        
        // Close modal after a short delay
        setTimeout(() => {
            this.closeModal();
        }, 1500);
    } else {
        console.error('❌ Could not find compose fields:', { subjectField, bodyField });
        this.showNotification('❌ Could not find compose fields', 'error');
    }
}
    showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    
    let backgroundColor, borderLeft;
    switch(type) {
        case 'success':
            backgroundColor = 'linear-gradient(135deg, #10b981, #059669)';
            borderLeft = '4px solid #065f46';
            break;
        case 'error':
            backgroundColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
            borderLeft = '4px solid #991b1b';
            break;
        case 'warning':
            backgroundColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
            borderLeft = '4px solid #92400e';
            break;
        case 'info':
            backgroundColor = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            borderLeft = '4px solid #1d4ed8';
            break;
        default:
            backgroundColor = 'linear-gradient(135deg, #6b7280, #4b5563)';
            borderLeft = '4px solid #374151';
    }
    
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 16px 24px;
        background: ${backgroundColor};
        border-left: ${borderLeft};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideUpBounce 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        font-weight: 500;
        font-size: 14px;
        max-width: 400px;
        text-align: center;
        backdrop-filter: blur(10px);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

trackFormChanges() {
    // Track when any form element changes to help with debugging
    const formElements = [
        '#promptInput',
        '#toneSelect', 
        '#lengthSelect', 
        '#languageSelect', 
        '#responseTypeSelect',
        '#recipientContext', 
        '#includeGreeting', 
        '#includeClosing', 
        '#includeSignature',
        '#useEmojis', 
        '#greetingStyle', 
        '#voiceSelect', 
        '#complexitySelect',
        '#structureSelect', 
        '#subjectLine', 
        '#openingSentence', 
        '#closingLine',
        '#includeThreadSummary', 
        '#referencePastMessages', 
        '#autoInsert'
    ];
    
    formElements.forEach(selector => {
        const element = this.modal.querySelector(selector);
        if (element) {
            element.addEventListener('change', () => {
                // UPDATE FORM STATE ID ON EVERY CHANGE
                this.formStateId = Date.now() + Math.random();
                
                const value = element.type === 'checkbox' ? element.checked : element.value;
                console.log(`🔄 Form changed: ${selector} = ${value}, New StateID: ${this.formStateId}`);
            });
            
            // Also track input events for text fields
            if (element.type === 'text' || element.tagName === 'TEXTAREA') {
                element.addEventListener('input', () => {
                    // UPDATE FORM STATE ID ON TEXT INPUT TOO
                    this.formStateId = Date.now() + Math.random();
                    console.log(`📝 Text input: ${selector} = "${element.value.substring(0, 50)}...", New StateID: ${this.formStateId}`);
                });
            }
        }
    });
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
    
    @keyframes slideUpBounce {
        0% {
            transform: translate(-50%, 100%);
            opacity: 0;
            scale: 0.8;
        }
        50% {
            transform: translate(-50%, -10px);
            opacity: 0.8;
            scale: 1.05;
        }
        100% {
            transform: translate(-50%, 0);
            opacity: 1;
            scale: 1;
        }
    }
`;

document.head.appendChild(animationStyle);

// Initialize
const gmailCompose = new GmailComposeFeature();
window.gmailCompose = gmailCompose;
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