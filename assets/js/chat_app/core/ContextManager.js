/**
 * ContextManager - Handles conversation context with intelligent message selection
 * Implements multiple strategies for context window management
 */
export class ContextManager {
  constructor(maxContextSize = 10, strategy = 'balanced') {
    this.maxContextSize = maxContextSize;
    this.strategy = strategy; // 'recent', 'balanced', 'important', 'sliding'
    this.context = [];
    this.messageImportance = new Map(); // Track message importance scores
  }

  /**
   * Update context with new messages using selected strategy
   * @param {Array} messages - All conversation messages
   * @param {Number} maxCount - Maximum messages to keep in context
   */
  updateContext(messages, maxCount = null) {
    const limit = maxCount || this.maxContextSize;
    
    if (messages.length <= limit) {
      this.context = [...messages];
      return;
    }

    switch (this.strategy) {
      case 'recent':
        this.context = this._strategyRecent(messages, limit);
        break;
      case 'balanced':
        this.context = this._strategyBalanced(messages, limit);
        break;
      case 'important':
        this.context = this._strategyImportant(messages, limit);
        break;
      case 'sliding':
        this.context = this._strategySlidingWindow(messages, limit);
        break;
      default:
        this.context = this._strategyBalanced(messages, limit);
    }
  }

  /**
   * STRATEGY: Keep only the most recent messages
   * Good for: Short conversations, real-time chat
   * Pros: Keeps latest context, fastest
   * Cons: Loses important history
   */
  _strategyRecent(messages, limit) {
    return messages.slice(-limit);
  }

  /**
   * STRATEGY: Keep first few (history) + last few (recent)
   * Good for: Balanced context retention
   * Pros: Maintains narrative flow and recent context
   * Cons: Can miss middle important info
   */
  _strategyBalanced(messages, limit) {
    if (messages.length <= limit) return messages;

    const halfMax = Math.floor(limit / 2);
    const firstMessages = messages.slice(0, halfMax);
    const lastMessages = messages.slice(-halfMax);
    
    // Combine ensuring user messages are prioritized
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    
    // Keep first user message for context
    const baseContext = [
      userMessages[0],
      ...messages.slice(1, halfMax)
    ];
    
    // Add recent messages
    const recentContext = messages.slice(-halfMax);
    
    return [...new Map([...baseContext, ...recentContext].map(m => [m, m])).values()];
  }

  /**
   * STRATEGY: Prioritize "important" messages
   * Scores messages by: length, questions, commands, key terms
   * Good for: Complex conversations, important context
   * Pros: Keeps most relevant info
   * Cons: Slower, complex scoring
   */
  _strategyImportant(messages, limit) {
    if (messages.length <= limit) return messages;

    // Score each message
    const scored = messages.map((msg, idx) => ({
      msg,
      score: this._calculateImportanceScore(msg, idx, messages)
    }));

    // Sort by importance, keep recent ones
    const sorted = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Re-sort by original order to maintain conversation flow
    return sorted
      .sort((a, b) => messages.indexOf(a.msg) - messages.indexOf(b.msg))
      .map(item => item.msg);
  }

  /**
   * STRATEGY: Sliding window with decay
   * More recent messages weighted higher, older ones fade
   * Good for: Long conversations, progressive forgetting
   * Pros: Natural conversation flow, tunable decay
   * Cons: Complex implementation
   */
  _strategySlidingWindow(messages, limit) {
    if (messages.length <= limit) return messages;

    const decayFactor = 0.9;
    const now = Date.now();
    
    // Score by recency with exponential decay
    const scored = messages.map((msg, idx) => {
      const age = (now - (msg.timestamp || now)) / 1000 / 60; // minutes
      const recencyScore = Math.exp(-decayFactor * (messages.length - idx) / messages.length);
      return { msg, score: recencyScore };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .sort((a, b) => messages.indexOf(a.msg) - messages.indexOf(b.msg))
      .map(item => item.msg);
  }

  /**
   * Calculate importance score for a message
   */
  _calculateImportanceScore(message, index, allMessages) {
    let score = 0;

    // Factor 1: Position (first message is important)
    if (index === 0) score += 3;
    
    // Factor 2: Message length (longer = more info)
    const content = typeof message.content === 'string' ? message.content : '';
    score += Math.min(content.length / 100, 2);

    // Factor 3: Contains questions (likely important)
    if (content.includes('?')) score += 2;

    // Factor 4: Contains code/technical (likely important)
    if (content.includes('```') || content.includes('function') || content.includes('class')) score += 2;

    // Factor 5: Role-based (user messages > assistant)
    if (message.role === 'user') score += 1;

    // Factor 6: Is it a follow-up question (high importance)
    if (index > 0 && message.role === 'user') {
      const prevWasAssistant = allMessages[index - 1]?.role === 'assistant';
      if (prevWasAssistant) score += 0.5;
    }

    // Factor 7: Contains files/images (high importance)
    if (Array.isArray(message.content)) score += 2;

    return score;
  }

  /**
   * Add message to context with importance tracking
   */
  addMessage(message, importance = 1) {
    this.context.push(message);
    this.messageImportance.set(message, importance);
    
    // Auto-trim if exceeds max
    if (this.context.length > this.maxContextSize) {
      this._trimContext();
    }
  }

  /**
   * Remove message from context
   */
  removeMessage(messageIndex) {
    const removed = this.context.splice(messageIndex, 1);
    if (removed.length > 0) {
      this.messageImportance.delete(removed[0]);
    }
  }

  /**
   * Trim context to max size using current strategy
   */
  _trimContext() {
    this.updateContext(this.context, this.maxContextSize);
  }

  /**
   * Get current context
   */
  getContext() {
    return [...this.context];
  }

  /**
   * Clear context completely
   */
  clearContext() {
    this.context = [];
    this.messageImportance.clear();
  }

  /**
   * Get context statistics for debugging
   */
  getStats() {
    return {
      totalMessages: this.context.length,
      maxSize: this.maxContextSize,
      strategy: this.strategy,
      userMessages: this.context.filter(m => m.role === 'user').length,
      assistantMessages: this.context.filter(m => m.role === 'assistant').length,
      totalTokensEstimate: this._estimateTokens()
    };
  }

  /**
   * Rough token estimation (OpenAI ~4 chars per token)
   */
  _estimateTokens() {
    return this.context.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return sum + Math.ceil(content.length / 4);
    }, 0);
  }

  /**
   * Change strategy at runtime
   */
  setStrategy(newStrategy) {
    if (['recent', 'balanced', 'important', 'sliding'].includes(newStrategy)) {
      this.strategy = newStrategy;
      this.updateContext(this.context, this.maxContextSize);
    }
  }
}
