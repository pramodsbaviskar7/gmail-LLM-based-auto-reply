# 🚀 Gmail AI Auto-Reply Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white)](https://render.com)

AI-powered Chrome extension that auto-generates intelligent Gmail replies using advanced LLM technology with a robust FastAPI backend. Transform your email productivity with context-aware responses, thread analysis, and enterprise-grade reliability!

## ✨ Features

### 🤖 **Smart AI Capabilities**
- **Intelligent Reply Generation**: Leverages advanced Groq LLM (Llama3) for context-aware email responses
- **Thread Analysis**: Analyzes entire email threads for better context understanding
- **Custom Prompts**: Support for personalized reply styles and custom prompts
- **Multi-Model Support**: Configurable LLM models with temperature control

### 📧 **Gmail Integration**
- **Seamless Integration**: Works directly within Gmail interface with no external tabs
- **Thread-Aware**: Understands email context and conversation history
- **One-Click Operation**: Simple button to generate replies instantly
- **Copy & Insert**: Easy copy to clipboard or direct insert into compose window

### 🎨 **User Experience**
- **Beautiful UI**: Modern interface with smooth animations and loading states
- **Responsive Design**: Works on all screen sizes and Gmail themes
- **Real-time Status**: Progress indicators and error handling
- **Keyboard Shortcuts**: Quick access with hotkeys

### 🔧 **Enterprise Features**
- **Rate Limiting**: Built-in API rate limiting (100 requests/minute)
- **Caching System**: Intelligent response caching for faster replies
- **Circuit Breaker**: Fault tolerance with automatic error recovery
- **Health Monitoring**: Comprehensive health checks and uptime monitoring
- **Multi-Platform Deployment**: Supports Vercel, Render, and other platforms

### 🔐 **Security & Privacy**
- **Privacy-Focused**: Your emails are processed securely and never stored
- **HTTPS Encryption**: All communications encrypted via HTTPS
- **CORS Protection**: Secure cross-origin resource sharing
- **No Data Persistence**: Zero data retention policy

### 🌐 **Deployment & Reliability**
- **Dual Platform Support**: Deployed on both Vercel and Render for redundancy
- **Auto-Scaling**: Handles high traffic with automatic scaling
- **Error Recovery**: Robust error handling and retry mechanisms
- **Production Ready**: Environment-specific configurations

## 📸 Screenshots

![alt text](ss1_1280x800.png) ![alt text](ss2_1280x800.png) ![alt text](ss3_1280x800.png)

## 🛠️ Tech Stack

### **Frontend**
- Chrome Extension (Manifest V3)
- Vanilla JavaScript (ES6+)
- Modern CSS with animations

### **Backend**
- **Framework**: FastAPI + Python 3.11+
- **LLM**: Groq API (Llama3-8B-8192)
- **Caching**: In-memory TTL cache with statistics
- **Rate Limiting**: Token bucket algorithm
- **Circuit Breaker**: Automatic fault tolerance

### **Deployment**
- **Primary**: Vercel (serverless functions)
- **Secondary**: Render (container deployment)
- **Monitoring**: UptimeRobot health checks

### **DevOps**
- Environment-specific configurations
- Automatic deployments
- Health monitoring and alerts

## 🚀 Installation

### Chrome Extension
1. Install from [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
2. Or download from [Releases](https://github.com/yourusername/gmail-auto-reply-extension/releases)

## 🔧 Configuration

The extension works out-of-the-box with our hosted backend API. For enterprise users or custom deployments, configuration options are available.

### Backend Architecture

The application automatically detects deployment platforms:
- **Vercel**: Optimized for serverless functions
- **Render**: Optimized for container deployment
- **Auto-Scaling**: Handles traffic spikes automatically

## 📖 Usage

### Basic Usage
1. Open any email in Gmail
2. Click the "Auto-Reply ✨" button in the Gmail toolbar
3. Wait for the AI to analyze the email and generate a response
4. Review the generated reply
5. Click "Copy to Clipboard" or "Insert into Reply"
6. Edit if needed and send!

### Advanced Features
- **Custom Prompts**: Use the custom prompt feature for specialized replies
- **Thread Analysis**: Extension automatically analyzes email threads for context
- **Multiple Recipients**: Handles emails with multiple recipients intelligently

## 🔒 Privacy & Security

- ✅ **Zero Data Retention**: Emails processed in real-time, never stored
- ✅ **HTTPS Encryption**: All communications encrypted end-to-end
- ✅ **CORS Protection**: Secure cross-origin resource sharing policies
- ✅ **Rate Limiting**: Protection against abuse and overuse
- ✅ **Circuit Breaker**: Automatic fault tolerance and recovery
- ✅ **No Third-Party Tracking**: No analytics or tracking scripts

## 🛠️ Development

For developers interested in contributing or customizing the extension:

### Prerequisites
- Google Chrome browser (latest version)
- Python 3.11+ (for backend development)
- Node.js 18+ (for development tools)
- Groq API key ([Get it here](https://console.groq.com))

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API status and information |
| `/health` | GET/HEAD | Comprehensive health check |
| `/ping` | GET/HEAD | Simple uptime check |
| `/generate` | POST | Generate email reply |
| `/analyze-thread` | POST | Analyze email thread |

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-05-25T03:29:56Z",
  "api_latency_ms": 150.2,
  "cache": {
    "hits": 45,
    "misses": 12,
    "size": 57
  },
  "circuit_breaker": {
    "state": "closed",
    "failure_count": 0
  },
  "version": "2.0.0"
}
```

## 📁 Project Structure

```
gmail-auto-reply-extension/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration file
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables
│   ├── .env.example         # Environment template
│   └── vercel.json          # Vercel deployment config
├── extension/
│   ├── manifest.json        # Chrome extension manifest
│   ├── content.js           # Main extension logic
│   ├── popup.html           # Extension popup UI
│   ├── popup.js             # Popup functionality
│   └── styles.css           # Extension styles
├── README.md
└── LICENSE
```

## 🐛 Troubleshooting

### Common Issues

#### Extension not showing up?
- Ensure Developer mode is enabled in Chrome
- Check for errors in Chrome DevTools console
- Verify manifest.json is valid

#### API not responding?
- Verify backend is running (`curl http://localhost:8000/health`)
- Check GROQ_API_KEY environment variable
- Ensure CORS is configured properly
- Check API rate limits

#### Email detection not working?
- Clear extension storage in Chrome settings
- Try different Gmail themes (Default works best)
- Check browser console for JavaScript errors
- Ensure Gmail is fully loaded before using extension

#### Rate Limiting Issues?
- Current limit: 100 requests per minute
- Check `/health` endpoint for rate limit status
- Implement exponential backoff in your usage

### Debug Mode

Enable debug logging in development:
```bash
# Backend debug mode
ENVIRONMENT=development uvicorn main:app --reload --log-level debug

# Extension debug mode
# Open Chrome DevTools in Gmail and check console logs
```

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

### Development Process
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Add tests if applicable
5. Ensure code formatting (`black`, `prettier`)
6. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
7. Push to the branch (`git push origin feature/AmazingFeature`)
8. Open a Pull Request

### Code Standards
- Python: Follow PEP 8, use Black for formatting
- JavaScript: Use ES6+, consistent indentation
- Documentation: Update README for new features
- Testing: Add tests for new functionality

## 🚀 Deployment Status

| Platform | Status | URL |
|----------|--------|-----|
| Vercel | 🟢 Live | `https://gmail-llm-based-auto-reply.vercel.app` |
| Render | 🟢 Live | `https://gmail-llm-based-auto-reply.onrender.com` |

## 📊 Performance

- **Response Time**: ~150-300ms average
- **Uptime**: 99.9% (monitored by UptimeRobot)
- **Rate Limit**: 100 requests/minute per user
- **Cache Hit Rate**: ~80% for repeated requests
- **Concurrent Users**: Supports 50+ simultaneous users

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Pramod Baviskar**
- LinkedIn: [@pramodsbaviskar](https://www.linkedin.com/in/pramodsbaviskar/)
- GitHub: [@pramodbaviskar](https://github.com/pramodbaviskar)
- Email: pramod.baviskar@gmail.com

## 🙏 Acknowledgments

- [Groq](https://groq.com) for providing lightning-fast LLM API
- [FastAPI](https://fastapi.tiangolo.com) for the excellent web framework
- [Vercel](https://vercel.com) for serverless deployment platform
- [Render](https://render.com) for reliable container hosting
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) team for excellent documentation

## 🌟 Support

If you found this project helpful:
- ⭐ Give it a star on GitHub
- 🐛 Report bugs or suggest features via Issues
- 💬 Join discussions in the repository
- 📢 Share it with your network

## 📈 Roadmap

### Upcoming Features
- [ ] Firefox extension support
- [ ] Multiple email provider support (Outlook, Yahoo)
- [ ] Advanced AI models integration
- [ ] Team/Enterprise features
- [ ] Mobile app companion
- [ ] Webhook integrations

### Version History
- **v2.0.0** - Production-ready with enterprise features
- **v1.5.0** - Added thread analysis and caching
- **v1.0.0** - Initial release with basic AI reply generation

---

Made with ❤️ by **Pramod Baviskar** | Transforming email productivity with AI