# 🚀 Gmail AI Auto-Reply Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)

AI-powered Chrome extension that auto-generates intelligent Gmail replies using LLM technology and a FastAPI backend. Transform your email productivity with context-aware responses!

## ✨ Features

- 🤖 **Smart Reply Generation**: Leverages advanced LLM (Groq) for context-aware email responses
- 📧 **Seamless Gmail Integration**: Works directly within Gmail interface
- ⚡ **One-Click Operation**: Simple button to generate replies instantly
- 🎨 **Beautiful UI**: Modern interface with smooth animations
- 📋 **Copy & Insert**: Easy copy to clipboard or direct insert into compose window
- 🔐 **Privacy-Focused**: Your emails are processed securely and never stored
- 🌐 **Custom Signatures**: Support for personalized email signatures
- 🚀 **Fast Backend**: Deployed on Vercel for lightning-fast responses

## 📸 Screenshots

[Add screenshots of your extension in action here]

## 🛠️ Tech Stack

- **Frontend**: Chrome Extension (Manifest V3)
- **Backend**: FastAPI + Python
- **LLM**: Groq API (Llama3)
- **Deployment**: Vercel
- **Languages**: JavaScript, Python

## 📋 Prerequisites

- Google Chrome browser
- Python 3.8+ (for backend development)
- Node.js (for extension packaging)
- Groq API key ([Get it here](https://console.groq.com))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gmail-auto-reply-extension.git
cd gmail-auto-reply-extension
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Add your Groq API key to .env
# GROQ_API_KEY=your_groq_api_key_here
```

### 3. Extension Setup

```bash
# Navigate to extension directory
cd ../extension

# No build required - Chrome extensions use vanilla JavaScript
```

### 4. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. The extension icon should appear in your toolbar

### 5. Deploy Backend (Optional)

For production use, deploy the backend to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd backend
vercel --prod
```

## 🔧 Configuration

### Backend Configuration

Create a `backend/config.py` file:

```python
USER_INFO = {
    "full_name": "Your Name",
    "email": "your.email@gmail.com",
    "linkedin": "https://www.linkedin.com/in/yourprofile",
    "mobile": "+1234567890"
}

EMAIL_CONFIG = {
    "default_closing": "Regards",
    "signature_format": "formal"
}

MODEL_CONFIG = {
    "model": "llama3-8b-8192",
    "temperature": 0.7,
    "max_tokens": 500
}
```

### Environment Variables

For production deployment on Vercel:

- `GROQ_API_KEY`: Your Groq API key
- `OWNER_EMAIL`: Your email (for personalized signatures)

## 📖 Usage

1. Open any email in Gmail
2. Click the "Auto-Reply ✨" button that appears in the toolbar
3. Wait for the AI to generate a response
4. Click "Copy to Clipboard" or "Insert into Reply"
5. Edit if needed and send!

## 🔒 Privacy & Security

- Email content is processed in real-time and never stored
- All communications are encrypted via HTTPS
- No third-party tracking or analytics
- Your Groq API key is stored securely and never exposed

## 🛠️ Development

### Backend Development

```bash
cd backend
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Extension Development

1. Make changes to files in the `extension` folder
2. Go to `chrome://extensions/`
3. Click the refresh icon on your extension
4. Test in Gmail

### API Endpoints

- `GET /`: API status
- `GET /health`: Health check
- `POST /generate`: Generate email reply
- `GET /config`: Get configuration (debug)

## 📁 Project Structure

```
gmail-auto-reply-extension/
├── backend/
│   ├── main.py           # FastAPI application
│   ├── config.py         # Configuration file
│   ├── requirements.txt  # Python dependencies
│   └── .env             # Environment variables
├── extension/
│   ├── manifest.json    # Chrome extension manifest
│   ├── content.js       # Main extension logic
│   ├── popup.html       # Extension popup UI
│   └── popup.js         # Popup functionality
└── README.md
```

## 🐛 Troubleshooting

### Extension not showing up?
- Make sure Developer mode is enabled
- Check for errors in Chrome DevTools console

### API not responding?
- Verify backend is running
- Check GROQ_API_KEY is set correctly
- Ensure CORS is configured properly

### Email detection not working?
- Clear extension storage
- Try different Gmail themes
- Check browser console for errors

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Pramod Baviskar**
- LinkedIn: [@pramodsbaviskar](https://www.linkedin.com/in/pramodsbaviskar/)
- GitHub: [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- [Groq](https://groq.com) for providing the LLM API
- [FastAPI](https://fastapi.tiangolo.com) for the awesome web framework
- [Vercel](https://vercel.com) for hosting

## 🌟 Support

If you found this helpful, please give it a ⭐ on GitHub!

---

Made with ❤️ by Pramod Baviskar