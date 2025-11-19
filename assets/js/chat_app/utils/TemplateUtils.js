export class TemplateUtils {
  static generateMessageBlock(content, role, previewItems = '') {
    switch (role) {
      case 'user':
        return `<div class="chat__block user" data-role="${role}">
                  <div class="preview__wrapper">${previewItems}</div>
                  <div class="message__wrapper">
                      <div class="actions__wrapper">
                        <button class="action__button edit" title="Edit message">
                          <svg class="icon">
                            <use href="/assets/image/svg/icons.svg#edit-icon" />
                          </svg>
                        </button>
                      </div>
                      <span class="message">${content}</span>
                  </div>
                </div>`;
      case 'assistant':
        return `<div class="chat__block assistant" data-role="${role}">
                  <svg class="icon assistant__logo">
                    <use href="/assets/image/svg/icons.svg#stars-icon" />
                  </svg>
                  <div class="response_wrapper">
                    <div class="response">
                      ${content}
                    </div>
                    <div class="actions__wrapper">
                      <button class="action__button copy" title="Copy message">
                        <svg class="icon">
                          <use href="/assets/image/svg/icons.svg#copy-icon" />
                        </svg>
                      </button>
                      <button class="action__button regenerate" title="Regenerate response">
                        <svg class="icon">
                          <use href="/assets/image/svg/icons.svg#repeat-icon" />
                        </svg>
                      </button>
                      <button class="action__button like" title="Good response">
                        <svg class="icon">
                          <use href="/assets/image/svg/icons.svg#like-icon" />
                        </svg>
                      </button>
                      <button class="action__button dislike" title="Bad response">
                        <svg class="icon">
                          <use href="/assets/image/svg/icons.svg#dislike-icon" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>`;
      case 'system':
        return `<div class="chat__block system">
                  ${content} 
                </div>`;
      default:
        return '';
    }
  }

  static generateChatHistoryItem(title, sessionId) {
    return `<div class="item" data-session-id="${sessionId}" tabindex="0">
              <span class="title">${title}</span>
              <div class="menu">
                <button class="menu__item rename" title="Rename">
                  <svg class="icon">
                    <use href="/assets/image/svg/icons.svg#edit-icon" />
                  </svg>
                </button>
                <button class="menu__item delete" title="Delete">
                  <svg class="icon">
                    <use href="/assets/image/svg/icons.svg#delete-icon" />
                  </svg>
                </button>
              </div>
            </div>`;
  }

  static generatePreviewItems(items, type = 'image') {
    let previewItems = '';
    items.forEach((item, index) => {
      switch (type) {
        case 'image':
          previewItems += `<img src="${item.url}" class="preview__item image">`;
          break;
       case 'file':
          previewItems += `<span class="preview__item file">${item.name}</span>`;
          break;
      }
     });
    return previewItems;
  }
}
