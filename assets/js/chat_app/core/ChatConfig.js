export class ChatConfig {
  constructor(userConfig = {}) {
    return {
      database: {
        name: 'chatHistoryDB',
        version: 1
      },
      stores: {
        sessions: {
          name: 'sessions',
          options: { keyPath: 'sessionId', autoIncrement: false },
          indexes: [
            { name: 'updateTime', keyPath: 'updateTime', options: { unique: false } },
            { name: 'title', keyPath: 'title', options: { unique: false } }
          ]
        },
        conversations: {
          name: 'conversations',
          options: { keyPath: 'sessionId', autoIncrement: false }
        }
      },
      ai: {
        system: `
          You are a friendly AI assistant. Follow the user's vibe, and if needed, do role play.
          Your responses should be helpful, informative, and engaging.
          The current date and time is: ${new Date().toLocaleString(undefined, {
            weekday: "long", year: "numeric", month: "long", day: "numeric", 
            hour: "2-digit", minute: "2-digit", timeZoneName: "long"
          })}.
        `,
        options: {}
      },
      ui: {
       pageSize: {
         history: 100,
         messages: 25
       }
      },
      ...userConfig
    };
  }
}
