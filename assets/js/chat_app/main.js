import { ChatConfig } from './core/ChatConfig.js';
import { DatabaseManager } from './core/DatabaseManager.js';
import { ChatUI } from './ui/ChatUI.js';
import { ChatService } from './core/ChatService.js';
import { DOMUtils, copyToClipboard } from './utils/utils.js';
import { MarkdownUtils } from './utils/MarkdownUtils.js';
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

    await this.loadModels();
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

  async processChat(editedContent = null) {
    try {
      let userContent = editedContent || this.ui.textarea.value.trim();
      if (!userContent || DOMUtils.hasClass(this.ui.root, 'generating')) return;

      this.ui.textarea.value = '';
      DOMUtils.addClass(this.ui.root, 'generating');

      let isNewSession = !this.ui.root.hasAttribute('data-session-id');

      if (isNewSession) {
        this.sessionId = await this.dbManager.createNewSession();
        DOMUtils.setAttribute(this.ui.root, 'data-session-id', this.sessionId);
        this.ui.addChatHistoryItem(`New Chat ${this.sessionId}`, this.sessionId, 'afterbegin');
      }

      DOMUtils.removeClass(this.ui.root, 'initial');

      // Render the user message and add a placeholder for the assistant
      this.ui.renderMessage(userContent, 'user');
      this.ui.renderMessage('', 'assistant');
      this.ui.scrollToBottom();

      // Save the user message to the DB and update the conversation context
      await this.dbManager.addMessage(this.sessionId, { role: 'user', content: userContent });
      this.context.push({ role: 'user', content: userContent });

      // Get the assistant response element for streaming updates
      const lastAssistantBlock = this.ui.contentContainer.querySelector(
        '.chat__block.assistant:last-child .response_wrapper .response'
      );

      // Stream the assistant response
      const responseStream = this.chatService.streamChat({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...this.context
        ],
        options: this.aiOptions
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

      // If this is a new session, update the chat history title
      if (isNewSession) {
        const updatedTitle = await this.chatService.getTitle(this.model, userContent);
        if (updatedTitle) {
          const historyItem = this.ui.chatHistoryContainer.querySelector(`.item[data-session-id="${this.sessionId}"] .title`);
          if (historyItem) {
            historyItem.textContent = updatedTitle;
          }
          await this.dbManager.updateChatHistoryTitle(this.sessionId, updatedTitle);
        }
      }

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
          if (message.role === 'assistant') {
            this.ui.renderMessage(MarkdownUtils.parseMarkdown(message.content), message.role);
          } else {
            this.ui.renderMessage(message.content, message.role);
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
}

// Initialize the application
const chatApp = new ChatApplication();