import { ChatConfig } from './core/ChatConfig.js';
import { DatabaseManager } from './core/DatabaseManager.js';
import { ChatUI } from './ui/ChatUI.js';
import { ChatService } from './core/ChatService.js';
import { DOMUtils, copyToClipboard, FileUtils } from './utils/utils.js';
import { MarkdownUtils } from './utils/MarkdownUtils.js';
import { TemplateUtils } from './utils/TemplateUtils.js';
import { ModelManager } from './core/ModelManager.js';
import { SettingsManager } from './core/SettingsManager.js';
import { SearchManager } from './core/SearchManager.js';

class ChatApplication {
  constructor(config = {}) {
    this.config = new ChatConfig(config);
    this.dbManager = new DatabaseManager(this.config);
    this.ui = new ChatUI();
    this.modelManager = new ModelManager(this.ui.root);
    this.settingsManager = new SettingsManager(this.ui.root);
    this.searchManager = new SearchManager(this.ui.root);

    this.host = this.settingsManager.getHost();
    this.chatService = new ChatService(this.host);
    this.sessionId = 0;
    this.context = [];
    this.maxContext = 20;
    this.aiOptions = {};
    this.systemPrompt = this.config.ai.system;
    this.model = '';
    this.modelList = [];

    this.initialize();
    this.registerEvents();
  }

  async initialize() {
    window.addEventListener('popstate', (event) => {
      this.handleUrlChange(event);
    });

    window.addEventListener('beforeunload', () => {
      this.chatService.destroy();
    });

    const sessionIdFromUrl = this.getSessionIdFromUrl();
    if (sessionIdFromUrl) {
      history.replaceState({ type: 'chat', sessionId: sessionIdFromUrl }, null, `?session=${sessionIdFromUrl}`);
    } else {
      history.replaceState({ type: 'new' }, null, window.location.pathname);
    }

    const dbInitialized = await this.dbManager.initialize();
    if (dbInitialized) {
      await this.loadChatHistory();
    }

    if (sessionIdFromUrl) {
      await this.displayChatHistory(sessionIdFromUrl);
    }

    const aiInitialized = await this.chatService.initialize();
    if (!aiInitialized) {
      this.ui.addSystemMessage('Chrome AI is not available. Please enable it in chrome://flags/#prompt-api-for-gemini-nano and chrome://flags/#optimization-guide-on-device-model.');
      console.warn('Could not initialize window.ai. The app may not function correctly.');
    }
    await this.loadModels();
    this.updateTokenUsage();

  }

  registerEvents() {
    this.ui.root.addEventListener('send-message', async () => {
      if (DOMUtils.hasClass(this.ui.root, 'generating')) {
        this.abortGenerate();
        return;
      }
      await this.processChat();
    });

    this.ui.root.addEventListener('new-chat', () => {
      this.startNewChat();
    });

    this.ui.root.addEventListener('display-chat', async (e) => {
      const sessionId = e.detail.sessionId;
      history.pushState({ type: 'chat', sessionId: sessionId }, null, `?session=${sessionId}`);
      await this.displayChatHistory(sessionId);
    });

    this.ui.root.addEventListener('model-selected', (e) => {
      this.model = e.detail.model;
      localStorage.setItem('selectedModel', this.model);
    });

    this.ui.root.addEventListener('save-edit', async (e) => {
      const { messageBlock, content, messageIndex } = e.detail;
      await this.saveEdit(messageBlock, content, messageIndex);
    });

    this.ui.root.addEventListener('rename-chat', async (e) => {
      const { sessionId, title } = e.detail;
      if (!sessionId || !title) return;
      await this.dbManager.updateChatHistoryTitle(sessionId, title);

      // Update document title if this is the current session
      if (this.sessionId === Number(sessionId)) {
        document.title = title;
      }
    });

    this.ui.root.addEventListener('delete-chat', async (e) => {
      const { sessionId } = e.detail;
      await this.dbManager.deleteSession(sessionId);
      if (this.sessionId === Number(sessionId)) {
        this.startNewChat();
      }
    });

    this.ui.root.addEventListener('copy-message', async (e) => {
      await copyToClipboard(e.detail.content);
    });

    this.ui.root.addEventListener('regenerate-message', async (e) => {
      const { messageBlock, messageIndex } = e.detail;

      // Get the last user message
      const userBlock = this.ui.contentContainer.children[messageIndex - 1];
      const userContent = userBlock.querySelector('.message').textContent;

      this.ui.removeBlocksAfter(messageIndex - 1); // Remove from the user message

      // Refresh context to exclude removed messages
      const conversationInfo = await this.dbManager.db.get(this.config.stores.conversations.name, this.sessionId);
      const updatedMessages = conversationInfo.messages.slice(0, [messageIndex - 1]);
      await this.refreshContext(updatedMessages, this.maxContext);

      // Process the user message again
      await this.processChat(userContent);
    });
  }

  async processChat(editedContent = null, files = null) {
    try {
      let userContent = editedContent || this.ui.textarea.value.trim();
      if (!userContent && !this.ui.getAttachedFile() || DOMUtils.hasClass(this.ui.root, 'generating')) return;

      this.ui.textarea.value = '';
      DOMUtils.addClass(this.ui.root, 'generating');

      let isNewSession = !this.ui.root.hasAttribute('data-session-id');

      if (isNewSession) {
        this.sessionId = await this.dbManager.createNewSession();
        DOMUtils.setAttribute(this.ui.root, 'data-session-id', this.sessionId);
        this.ui.addChatHistoryItem(`New Chat ${this.sessionId}`, this.sessionId, 'afterbegin');
      }

      DOMUtils.removeClass(this.ui.root, 'initial');

      // Build message content with files if attached
      let messageContent = userContent;
      let messageToSave = { role: 'user', content: userContent };
      let previewItemsHTML = '';

      const attachedFiles = this.ui.getAttachedFile();
      if (attachedFiles && attachedFiles.length > 0) {
        // Prepare content array for API based on file type
        const contentArray = [];

        // Add text content first
        if (userContent) {
          contentArray.push({
            type: 'text',
            value: userContent,
          });
        }

        // Process each file
        for (const attachedFile of attachedFiles) {
          if (FileUtils.isImageFile(attachedFile)) {
            // Handle image file - pass File object directly
            contentArray.push({
              type: 'image',
              value: attachedFile,
            });

            // Generate preview for image
            const base64Image = await FileUtils.readFileAsBase64(attachedFile);
            const previewItems = [{ url: base64Image }];
            previewItemsHTML += TemplateUtils.generatePreviewItems(previewItems, 'image');
          } else if (FileUtils.isTextFile(attachedFile)) {
            // Handle text file - combine filename and content with userContent as single text item
            const fileContent = await FileUtils.readFileAsText(attachedFile);
            contentArray.push({
              type: 'text',
              value: `FILE ATTACHED: ${attachedFile.name}
---FILE CONTENT START---
${fileContent}
---FILE CONTENT END---`,
            });

            // Generate preview for text file
            const previewItems = [{ name: attachedFile.name }];
            previewItemsHTML += TemplateUtils.generatePreviewItems(previewItems, 'file');
          }
        }

        messageContent = contentArray;
        messageToSave = { role: 'user', content: messageContent };
        this.ui.clearAttachedFile();
      }

      // Render the user message with file preview and add a placeholder for the assistant
      this.ui.renderMessage(userContent, 'user', previewItemsHTML);
      this.ui.renderMessage('', 'assistant');
      this.ui.scrollToBottom();

      // Save the user message to the DB and update the conversation context
      await this.dbManager.addMessage(this.sessionId, messageToSave);
      this.context.push({ role: 'user', content: messageContent });

      // Get the assistant response element for streaming updates
      const lastAssistantBlock = this.ui.contentContainer.querySelector(
        '.chat__block.assistant:last-child .response_wrapper .response'
      );

      // Stream the assistant response
      const responseStream = this.chatService.streamChat(this.sessionId, {
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.context
        ],
        options: { temperature: this.settingsManager.getSetting('chat', 'temperature') }
      });

      const parser = MarkdownUtils.getParser(lastAssistantBlock);
      let assistantContent = '';
      for await (const part of responseStream) {
        assistantContent += part.message.content;
        MarkdownUtils.parserWrite(parser, part.message.content);
      }
      MarkdownUtils.parserEnd(parser);

      DOMUtils.removeClass(this.ui.root, 'generating');

      MarkdownUtils.highlightCode();
      await this.dbManager.addMessage(this.sessionId, { role: 'assistant', content: assistantContent });
      this.context.push({ role: 'assistant', content: assistantContent });

      this.ui.scrollToBottom();

      // If this is a new session, update the chat history title
      if (isNewSession) {
        const updatedTitle = await this.chatService.getTitle(this.sessionId, userContent);
        if (updatedTitle) {
          const historyItem = this.ui.chatHistoryContainer.querySelector(`.item[data-session-id="${this.sessionId}"] .title`);
          if (historyItem) historyItem.textContent = updatedTitle;
          await this.dbManager.updateChatHistoryTitle(this.sessionId, updatedTitle);
        }
      }

      this.updateTokenUsage();

      // Update context if necessary
      if (this.context.length >= this.maxContext) {
        await this.refreshContext(this.context, this.maxContext);
      }

      console.log(this.context);
    } catch (error) {
      DOMUtils.removeClass(this.ui.root, 'generating');
      console.error('Error processing chat:', error);
    }
  }

  startNewChat() {
    DOMUtils.addClass(this.ui.root, 'initial');
    DOMUtils.removeClass(this.ui.root, 'scrolled');
    this.ui.clearChatHistory();
    this.ui.textarea.value = '';
    DOMUtils.removeAttribute(this.ui.root, 'data-session-id');
    this.context = [];
    this.sessionId = 0;
    this.ui.clearActiveHistoryItem();

    // Push new history state
    history.pushState({ type: 'new' }, null, window.location.pathname);
    this.updateTokenUsage();
  }

  async loadChatHistory() {
    try {
      const chatHistoryItems = await this.dbManager.getRecentItems(this.config.stores.sessions.name, this.config.ui.maxHistory, 'updateTime');
      if (chatHistoryItems.length) {
        chatHistoryItems.forEach(item => {
          this.ui.addChatHistoryItem(item.title, item.sessionId);
        });
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }

  async displayChatHistory(sessionId) {
    if ((sessionId == this.sessionId)) return;
    try {
      DOMUtils.removeClass(this.ui.root, 'initial');
      this.ui.clearChatHistory();
      DOMUtils.setAttribute(this.ui.root, 'data-session-id', sessionId);
      this.sessionId = Number(sessionId);

      const conversationInfo = await this.dbManager.db.get(this.config.stores.conversations.name, this.sessionId);
      if (conversationInfo.messages.length) {
        for (const message of conversationInfo.messages) {
          let previewItemsHTML = '';

          // Generate preview items if message has array content (with files)
          if (Array.isArray(message.content)) {
            const imageItem = message.content.find(item => item.type === 'image');
            const fileNameMatch = message.content.find(item => 
              item.type === 'text' && item.value.includes('[File:')
            );

            if (imageItem && imageItem.value instanceof Blob) {
              // For blob/file objects, convert to data URL
              const base64Image = await FileUtils.readFileAsBase64(imageItem.value);
              const previewItems = [{ url: base64Image }];
              previewItemsHTML = TemplateUtils.generatePreviewItems(previewItems, 'image');
            } else if (fileNameMatch) {
              // Extract filename from text
              const match = fileNameMatch.value.match(/\[File: ([^\]]+)\]/);
              if (match) {
                const previewItems = [{ name: match[1] }];
                previewItemsHTML = TemplateUtils.generatePreviewItems(previewItems, 'file');
              }
            }
          }

          if (message.role === 'assistant') {
            this.ui.renderMessage(MarkdownUtils.parseMarkdown(message.content), message.role);
          } else {
            this.ui.renderMessage(message.content, message.role, previewItemsHTML);
          }
        }
        this.ui.scrollToBottom();
        MarkdownUtils.highlightCode();
        await this.refreshContext(conversationInfo.messages, this.maxContext);
        console.log(this.context);
      }

      const sessionInfo = await this.dbManager.db.get(this.config.stores.sessions.name, this.sessionId);
      document.title = sessionInfo.title;

      const historyItem = this.ui.chatHistoryContainer.querySelector(`.item[data-session-id="${sessionId}"]`);
      if (historyItem) {
        this.ui.setActiveHistoryItem(historyItem);
      }

      this.updateTokenUsage();
    } catch (error) {
      console.error('Error displaying chat history:', error);
    }
  }

  async loadModels() {
    try {
      const modelListResponse = await this.chatService.list();
      if (modelListResponse.models.length) {
        this.modelList = modelListResponse.models;
        if (!localStorage.getItem('selectedModel')) {
          localStorage.setItem('selectedModel', this.modelList[0].name);
        }
        this.model = localStorage.getItem('selectedModel');

        // Populate the model menu
        this.modelManager.populateModelMenu(this.modelList);
        this.modelManager.setActiveModel(this.model);
      } else {
        console.error('At least one model is required');
        this.ui.addSystemMessage('At least one model is required');
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      this.ui.addSystemMessage('Error initializing chat. Check console for details.');
    }
  }

  async refreshContext(messages, maxCount = 10) {
    try {
      if (messages.length > maxCount) {
        const halfMax = Math.floor(maxCount / 2);
        const firstHalf = messages.filter(msg => msg.role === 'user').slice(0, halfMax);
        const lastHalf = messages.slice(-halfMax);
        this.context = [...firstHalf, ...lastHalf];
      } else if (messages.length) {
        this.context = messages;
      }
    } catch (error) {
      console.error('Error updating context:', error);
    }
  }

  abortGenerate() {
    this.chatService.abort();
  }

  getSessionIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('session');
  }

  async handleUrlChange(event) {
    const sessionId = this.getSessionIdFromUrl();
    const state = event.state;

    if (state && state.type === 'chat' && sessionId) {
      await this.displayChatHistory(sessionId);
    } else if (state && state.type === 'new') {
      this.startNewChat();
    }
  }

  async saveEdit(messageBlock, content, messageIndex) {
    try {
      const sessionId = Number(this.ui.root.dataset.sessionId);
      await this.dbManager.updateMessage(sessionId, messageBlock, content, messageIndex);

      // Remove blocks from UI after the edited message
      this.ui.removeBlocksAfter(messageIndex);

      // Refresh context after saving edit
      const conversationInfo = await this.dbManager.db.get(this.config.stores.conversations.name, this.sessionId);
      await this.refreshContext(conversationInfo.messages, this.maxContext);

      // Process chat with the edited content
      await this.processChat(content);

    } catch (error) {
      console.error('Error saving edit:', error);
    }
  }

  async updateTokenUsage() {
    const session = await this.chatService.getSession(this.sessionId);
    if (session && typeof session.inputQuota === 'number') {
      const available = session.inputQuota;
      const used = session.inputUsage;
      this.ui.root.style.setProperty('--available', available);
      this.ui.root.style.setProperty('--used', used);
      this.ui.root.style.setProperty('--left', available - used);
    }
  }
}

// Initialize the application
new ChatApplication();