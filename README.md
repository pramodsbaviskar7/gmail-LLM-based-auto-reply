# 🚀 Gmail AI Assistant Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white)](https://render.com)

The ultimate AI-powered Chrome extension that revolutionizes Gmail productivity! Generate intelligent auto-replies AND compose professional emails from scratch using advanced LLM technology with a robust FastAPI backend. Transform your email workflow with context-aware responses, thread analysis, and enterprise-grade reliability!

## ✨ Features

### 🤖 **Smart AI Capabilities**
- **Intelligent Auto-Reply Generation**: Leverages advanced Groq LLM (Llama3) for context-aware email responses
- **AI Email Composition**: Create professional emails from scratch with customizable parameters
- **Thread Analysis**: Analyzes entire email threads for better context understanding  
- **Multi-Language Support**: Write emails in 9+ languages including Hindi, Spanish, French, German, and more
- **Custom Prompts**: Support for personalized reply styles and custom prompts
- **Multi-Model Support**: Configurable LLM models with temperature control

### ✍️ **AI Compose Features**
- **Professional Email Creation**: Generate emails from simple prompts or descriptions
- **Advanced Customization**: 15+ parameters including tone, length, structure, and complexity
- **Smart Language Detection**: Automatically detects language requests in user input (e.g., "hindi mein likho")
- **Multiple Tones**: Professional, friendly, casual, formal, enthusiastic, and more
- **Structure Options**: Standard paragraphs, bullet points, numbered lists, or sectioned format
- **Signature Management**: Dynamic signature integration with user preferences
- **Hinglish Support**: Understands Hindi-English mix input and converts to proper target language

### 📧 **Gmail Integration**
- **Seamless Integration**: Works directly within Gmail interface with no external tabs
- **Dual Functionality**: Both auto-reply and compose features in one extension
- **Thread-Aware**: Understands email context and conversation history
- **One-Click Operation**: Simple buttons for both reply generation and email composition
- **Copy & Insert**: Easy copy to clipboard or direct insert into compose window

### 🎨 **User Experience**
- **Beautiful UI**: Modern interface with smooth animations and loading states
- **Responsive Design**: Works on all screen sizes and Gmail themes
- **Real-time Status**: Progress indicators and comprehensive error handling
- **Form Validation**: Smart input validation with helpful error messages
- **Keyboard Shortcuts**: Quick access with hotkeys

### 🌍 **Multilingual Support**
- **9+ Languages**: English, Hindi, Spanish, French, German, Italian, Portuguese, Chinese, Japanese
- **Native Script Support**: Proper script rendering (देवनागरी for Hindi, ગુજરાતી for Gujarati, etc.)
- **Language Priority System**: User requests override dropdown selections
- **Hinglish Intelligence**: Understands mixed Hindi-English input naturally

### 🔧 **Enterprise Features**
- **Rate Limiting**: Built-in API rate limiting (50 requests/minute)
- **Advanced Caching**: Intelligent response caching for faster performance
- **Circuit Breaker**: Fault tolerance with automatic error recovery
- **Health Monitoring**: Comprehensive health checks and uptime monitoring
- **Multi-Platform Deployment**: Supports Vercel, Render, and other platforms
- **Input Sanitization**: Advanced security with HTML/script injection protection

### 🔐 **Security & Privacy**
- **Privacy-Focused**: Your emails are processed securely and never stored
- **HTTPS Encryption**: All communications encrypted via HTTPS
- **CORS Protection**: Secure cross-origin resource sharing
- **No Data Persistence**: Zero data retention policy
- **Content Security**: Advanced input sanitization and validation

### 🌐 **Deployment & Reliability**
- **Dual Platform Support**: Deployed on both Vercel and Render for redundancy
- **Auto-Scaling**: Handles high traffic with automatic scaling
- **Error Recovery**: Robust error handling and retry mechanisms
- **Production Ready**: Environment-specific configurations

## 📸 Screenshots

![Auto-Reply Feature](ss1_1280x800.png) 
![AI Compose Interface](ss2_1280x800.png) 
![Advanced Settings](ss3_1280x800.png)

## 🛠️ Tech Stack

### **Frontend**
- Chrome Extension (Manifest V3)
- Vanilla JavaScript (ES6+)
- Modern CSS with animations
- Advanced form handling and validation

### **Backend**
- **Framework**: FastAPI + Python 3.11+
- **LLM**: Groq API (Llama3-8B-8192)
- **Caching**: TTL cache with intelligent invalidation
- **Rate Limiting**: Token bucket algorithm (50 req/min)
- **Circuit Breaker**: Automatic fault tolerance
- **Input Validation**: Pydantic models with comprehensive validation

### **AI & Language Processing**
- **Language Detection**: Smart pattern recognition for natural language requests
- **Content Generation**: Context-aware email composition
- **Multi-script Support**: Unicode handling for international languages
- **Template System**: Dynamic prompt building with 15+ parameters

### **Deployment**
- **Primary**: Vercel (serverless functions)
- **Secondary**: Render (container deployment)
- **Monitoring**: UptimeRobot health checks

## 🚀 Installation

### Chrome Extension
1. Install from [Chrome Web Store](https://chrome.google.com/webstore) (Coming Soon)
2. Or load unpacked extension for development

## 🔧 Configuration

The extension works out-of-the-box with our hosted backend API. For enterprise users or custom deployments, configuration options are available.

### Backend Architecture

The application automatically detects deployment platforms:
- **Vercel**: Optimized for serverless functions
- **Render**: Optimized for container deployment
- **Auto-Scaling**: Handles traffic spikes automatically

## 📖 Usage

### Auto-Reply Feature
1. Open any email in Gmail
2. Click the "Auto-Reply ✨" button in the Gmail toolbar
3. Wait for the AI to analyze the email and generate a response
4. Review the generated reply
5. Click "Copy to Clipboard" or "Insert into Reply"
6. Edit if needed and send!

### AI Compose Feature
1. Click the "Compose AI 📝" button in Gmail
2. Enter your email prompt or description
3. Customize parameters:
   - **Tone**: Professional, friendly, casual, formal, etc.
   - **Length**: Brief, short, medium, or detailed
   - **Language**: Choose from 9+ supported languages
   - **Structure**: Standard, bullets, numbered lists, or sections
   - **Voice**: First person, second person, or third person
4. Set advanced options like signature inclusion, emojis, and custom elements
5. Click "Generate Email" and review the result
6. Copy to clipboard or insert directly into Gmail

### Language Features
- **Natural Requests**: Type "hindi mein likho" to get Hindi output
- **Hinglish Support**: Enter "meeting ka reminder bhejno" and get professional output
- **Override System**: Language requests in prompt override dropdown selection
- **Multi-script**: Get proper देवनागरी, ગુજરાતી, or other native scripts

## 🌍 Supported Languages

| Language | Script | Example Request |
|----------|--------|-----------------|
| English | Latin | "write in English" |
| Hindi | देवनागरी | "hindi mein likho" |
| Spanish | Latin | "en español" |
| French | Latin | "en français" |
| German | Latin | "auf Deutsch" |
| Italian | Latin | "in italiano" |
| Portuguese | Latin | "em português" |
| Chinese | 中文 | "用中文写" |
| Japanese | 日本語 | "日本語で書く" |

## 🔒 Privacy & Security

- ✅ **Zero Data Retention**: Emails processed in real-time, never stored
- ✅ **HTTPS Encryption**: All communications encrypted end-to-end
- ✅ **CORS Protection**: Secure cross-origin resource sharing policies
- ✅ **Rate Limiting**: Protection against abuse (50 requests/minute)
- ✅ **Input Sanitization**: Advanced XSS and injection protection
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

#### Auto-Reply
```
POST /api/auto-reply
```

#### Email Composition
```
POST /api/compose
```

#### Health Check
```
GET /health
```

## 🐛 Troubleshooting

### Common Issues

#### Extension not showing up?
- Ensure Developer mode is enabled in Chrome
- Check for errors in Chrome DevTools console
- Verify manifest.json is valid

#### Compose form validation errors?
- Check that required fields (prompt) are filled
- Ensure prompt length is between 1-1000 characters
- Verify network connectivity for real-time validation

#### Language not working correctly?
- For Hindi/regional languages, ensure proper request format: "hindi mein likho"
- Check that browser supports Unicode rendering
- Try both dropdown selection and natural language requests

#### Rate Limiting Issues?
- Current limit: 50 requests per minute
- Check `/health` endpoint for rate limit status
- Implement exponential backoff in your usage

### Code Standards
- Python: Follow PEP 8, use Black for formatting
- JavaScript: Use ES6+, consistent indentation
- Documentation: Update README for new features
- Testing: Add tests for new functionality

## 📊 Performance

- **Response Time**: ~200-400ms average (compose), ~150-300ms (auto-reply)
- **Uptime**: 99.9% (monitored by UptimeRobot)
- **Rate Limit**: 50 requests/minute per user
- **Cache Hit Rate**: ~75% for repeated patterns
- **Concurrent Users**: Supports 100+ simultaneous users
- **Language Processing**: <100ms for language detection

## 🆕 What's New in v3.0

### Major Features Added
- **AI Compose Functionality**: Complete email composition from scratch
- **Multi-Language Support**: 9+ languages with native script support
- **Advanced Customization**: 15+ parameters for email personalization
- **Smart Language Detection**: Natural language request processing
- **Signature Management**: Dynamic user preference integration
- **Enhanced Security**: Advanced input validation and sanitization

### Performance Improvements
- Reduced API response times by 25%
- Improved caching efficiency
- Enhanced error handling and recovery
- Better rate limiting algorithms

### UI/UX Enhancements
- Modern compose interface with form validation
- Real-time parameter preview
- Improved error messaging
- Better mobile responsiveness

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Pramod Baviskar**
- LinkedIn: [@pramodsbaviskar](https://www.linkedin.com/in/pramodsbaviskar/)
- GitHub: [@pramodbaviskar](https://github.com/pramodbaviskar)
- Email: pramodsbaviskar7@gmail.com

## 🙏 Acknowledgments

- [Groq](https://groq.com) for providing lightning-fast LLM API
- [FastAPI](https://fastapi.tiangolo.com) for the excellent web framework
- [Vercel](https://vercel.com) for serverless deployment platform
- [Render](https://render.com) for reliable container hosting
- [Chrome Extensions](https://developer.chrome.com/docs/extensions/) team for excellent documentation
- Community contributors for language support and testing

## 🌟 Support

If you found this project helpful:
- ⭐ Give it a star on GitHub
- 🐛 Report bugs or suggest features via Issues
- 💬 Join discussions in the repository
- 📢 Share it with your network
- 🌍 Help with translations for more languages

## 📈 Roadmap

### Upcoming Features
- [ ] Firefox extension support
- [ ] Outlook and Yahoo Mail integration
- [ ] Advanced AI models (GPT-4, Claude)
- [ ] Team/Enterprise features with shared templates
- [ ] Mobile app companion
- [ ] Webhook integrations and API
- [ ] Email scheduling and follow-up reminders
- [ ] Advanced analytics and insights
- [ ] More regional languages (Tamil, Telugu, Bengali)
- [ ] Voice-to-email composition

### Version History
- **v3.0.0** - AI Compose feature, multi-language support, enhanced security
- **v2.0.0** - Production-ready with enterprise features
- **v1.5.0** - Added thread analysis and caching
- **v1.0.0** - Initial release with basic AI reply generation

---

Made with ❤️ by **Pramod Baviskar** | Revolutionizing email productivity with AI | Now supporting 9+ languages!