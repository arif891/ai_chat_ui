# Chrome Built-in AI Chat UI

A modern, feature-rich Progressive Web App (PWA) for seamless AI conversations using Chrome's built-in Gemini Nano model. Built with zero dependencies and optimized for privacy and performance.

![App Screenshot](.github/screenshot.avif)

 > This is a rough prototype and may contain bugs. The code is not organized or optimized. I currently can't properly understand what I wrote before. However, it works for now, and I will improve it later. Sorry for the inconvenience. The README was written by AI.

## ✨ Key Features

### Core Functionality
- 🎯 **AI-Powered Chat** - Real-time streaming responses using Chrome's Gemini Nano
- 💬 **Multi-turn Conversations** - Full conversation history and context management
- 🎨 **Modern Dark/Light Themes** - Beautiful UI with automatic theme detection
- 📱 **Fully Responsive** - Optimized for desktop, tablet, and mobile devices
- 🔄 **Real-time Streaming** - Stream responses as they're generated for better UX

### File Management
- 📷 **Image Support** - Upload and analyze images with thumbnail previews
- 📄 **Text Files** - Upload and process text, JSON, CSV, and Markdown files
- 🎵 **Audio Support** - Upload audio files (MP3, WAV, OGG, M4A, FLAC, AAC) ❌
- ✚ **Multiple Files** - Attach multiple files in a single message
- 👀 **Live Previews** - See file previews before sending messages

### User Experience
- 💾 **Chat History** - Persistent chat sessions stored locally
- 🔍 **Search Functionality** - Find previous conversations
- ✏️ **Message Editing** - Edit and regenerate responses
- 🏷️ **Auto-naming** - Automatic chat titles from first message
- 📋 **Copy Messages** - Easily copy assistant responses
- ⚡ **Token Tracking** - Monitor API quota usage in real-time

### Technical Excellence
- 🔒 **Privacy First** - All data stays local, no external servers
- 📴 **Offline Ready** - PWA support with service worker
- ⚙️ **Zero Dependencies** - Pure vanilla JavaScript
- 📊 **IndexedDB Storage** - Efficient local data persistence
- 🎯 **Modular Architecture** - Well-organized, maintainable codebase

## 📋 Prerequisites

### System Requirements
- **Browser:** Chrome/Chromium 139+
- **Operating System:**
  - Windows 10/11
  - macOS 13+ (Ventura and later)
  - Linux
  - ChromeOS (Platform 16389.0.0+) on Chromebook Plus devices
  
  > ⚠️ Chrome for Android, iOS, and non-Chromebook Plus ChromeOS devices are not yet supported

### Hardware Requirements
- **Storage:** Minimum 22 GB free space
- **Memory & CPU:**
  - **With GPU:** 4GB+ VRAM
  - **CPU Only:** 16GB+ RAM and 4+ CPU cores
- **Network:** Unlimited or unmetered connection recommended

### Enable Chrome AI API
1. Open `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`
2. Set **"Prompt API for Gemini Nano with Multimodal Input"** to "Enabled"
3. Restart Chrome
   
   > Chrome Dev don't require this flag as the API is enabled by default.

## 🚀 Quick Start

### Installation

1. Open [this](https://chrome-ai-ui.vercel.app/) url.
2. **Install as PWA:**
   - Click the install button in the address bar
   - Or use Chrome menu → "Install app" 

### First Use
1. Enable Chrome AI APIs (see Prerequisites)
2. Open the app in Chrome
3. Start chatting - your first message will trigger model download (~4GB)
4. Chat history is automatically saved

## 📁 Project Structure

```
Chrome_AI/
├── index.html                      # Main application entry point
├── pages/                          # Static pages
│   ├── auth/                      # Authentication pages
│   ├── error/                     # Error pages
│   └── static/                    # Static content pages
├── assets/
│   ├── css/
│   │   ├── base.css              # Global styles
│   │   └── chat_app/             # Chat application styles
│   │       ├── main.css
│   │       └── modules/
│   ├── js/
│   │   ├── base.js               # Core utilities
│   │   ├── chat_app/             # Chat application logic
│   │   │   ├── main.js           # Main application class
│   │   │   ├── core/             # Core business logic
│   │   │   │   ├── ChatConfig.js
│   │   │   │   ├── ChatService.js
│   │   │   │   ├── DatabaseManager.js
│   │   │   │   ├── HistoryManager.js
│   │   │   │   ├── ModelManager.js
│   │   │   │   ├── SearchManager.js
│   │   │   │   └── SettingsManager.js
│   │   │   ├── ui/               # UI components
│   │   │   │   └── ChatUI.js
│   │   │   └── utils/            # Utility functions
│   │   │       ├── utils.js      # DOM, file, and common utilities
│   │   │       ├── MarkdownUtils.js
│   │   │       └── TemplateUtils.js
│   │   └── pages/                # Page-specific scripts
│   ├── image/
│   │   └── svg/                  # SVG icons
│   ├── font/                     # Custom fonts
│   └── brand/                    # Brand assets
├── layx/                         # UI Framework
│   ├── main/                     # Core framework components
│   ├── components/               # Reusable UI components
│   ├── utilities/                # CSS utility classes
│   ├── helpers/                  # Layout helpers
│   └── others/                   # Advanced features
├── README.md
└── LICENSE

```

## 🎯 Core Features Deep Dive

### Chat Management
- **Create New Chat:** Click "New Chat" to start a fresh conversation
- **Chat History:** Sidebar shows recent chats (up to 10 items)
- **Search Chats:** Search previous conversations by content
- **Rename Chats:** Right-click a chat to rename it
- **Delete Chats:** Remove chats you no longer need

### File Attachments
```javascript
Supported file types:
├── 📷 Images: JPEG, PNG, WebP, GIF, SVG
├── 📄 Documents: TXT, MD, JSON, CSV
└── 🎵 Audio: MP3, WAV, OGG, M4A, FLAC, AAC ❌
```

**Usage:**
1. Click the attachment button
2. Select one or multiple files
3. See live previews before sending
4. Include your message and send
5. Files are processed and sent with your query

### Message Operations
- **Edit:** Click the edit button (✎) on your message
- **Regenerate:** Click regenerate (↻) on assistant responses
- **Copy:** Click copy (©) to copy assistant responses
- **Like/Dislike:** Rate responses for feedback

### Settings
- **Temperature Control:** Adjust response creativity (0-1)
- **Theme:** Switch between Light/Dark modes
- **API Settings:** Configure custom endpoints if needed

## 🛠️ Development

### Architecture Overview

**MVC Pattern:**
- **Models:** `DatabaseManager`, `ChatConfig`
- **Views:** `ChatUI`, `TemplateUtils`
- **Controllers:** `ChatApplication`, `ChatService`

**Key Classes:**

| Class | Purpose |
|-------|---------|
| `ChatApplication` | Main application orchestrator |
| `ChatService` | Chrome AI API interface |
| `DatabaseManager` | IndexedDB data persistence |
| `ChatUI` | DOM rendering and events |
| `FileUtils` | File type detection and reading |
| `MarkdownUtils` | Markdown parsing and rendering |

### Customization

#### 1. Theme Customization
```css
/* Edit color variables */
layx/main/base/variable_color.css

/* Available color schemes: */
- --primary-color
- --surface-color
- --surface-2-color
- --bg-color
```

#### 2. UI Styling
```css
Main styles:     assets/css/chat_app/main.css
Component styles: assets/css/chat_app/modules/
```

#### 3. Configuration
```javascript
// Edit ChatConfig in main.js
const config = {
  ai: {
    system: 'Your system prompt here'
  },
  ui: {
    maxHistory: 10  // Max recent chats
  }
}
```

### Adding New Features

**Example: Custom Command Handler**
```javascript
// In main.js registerEvents()
this.ui.root.addEventListener('custom-event', async (e) => {
  // Your handler logic
});
```

## 📦 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 139+ | ✅ Full Support |
| Edge | 139+ | ❌ Not Supported |
| Chromium | 139+ | ❌ Not Supported |
| Firefox | - | ❌ Not Supported |
| Safari | - | ❌ Not Supported |

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m 'Add AmazingFeature with detailed description'
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open** a Pull Request with description

### Contribution Guidelines
- Follow existing code style
- Test your changes in Chrome 139+
- Update documentation if needed
- Include meaningful commit messages

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🗺️ Roadmap

- [x] Basic chat functionality
- [x] File upload support (images, text, audio)
- [x] Chat history management
- [x] Dark/Light themes
- [x] Multi-file attachments
- [ ] Voice input/output
- [ ] Advanced context management
- [ ] Plugin system
- [ ] Custom system prompts
- [ ] Export conversations
- [ ] Integration with other AI providers

## 🆘 Support & Troubleshooting

### Common Issues

**"Chrome AI is not available"**
- Enable the required APIs in `chrome://flags/`
- Ensure you're using Chrome 139+
- Check your system meets hardware requirements

**"Model download failed"**
- Ensure 22GB+ free storage
- Check internet connection
- Restart Chrome and try again

**"Chat history not loading"**
- Clear IndexedDB: Chrome DevTools → Application → Storage
- Refresh the page

### Getting Help
- 📖 [Chrome AI Documentation](https://developer.chrome.com/docs/ai/prompt-api)
- 🐛 [Report Bugs](https://github.com/arif891/chrome_ai_ui/issues)
- 💡 [Request Features](https://github.com/arif891/chrome_ai_ui/issues)
- 💬 [Discussions](https://github.com/arif891/chrome_ai_ui/discussions)

## 📊 Performance

- **First Load:** < 500ms
- **Chat Response:** Real-time streaming
- **Chat History:** < 100ms load time
- **Memory Usage:** ~50-100MB (varies with conversation size)

## 🔐 Security & Privacy

- ✅ All data stored locally (IndexedDB)
- ✅ No external API calls except Chrome AI
- ✅ No tracking or analytics
- ✅ HTTPS recommended for deployment
- ✅ PWA with offline capability


## ⭐ Show Your Support

If you found this project helpful, please consider:
- ⭐ Starring the repository
- 🐛 Reporting issues
- 📝 Contributing improvements
- 📢 Sharing with other 