document.addEventListener('DOMContentLoaded', async () => {
  const dialog = document.getElementById('model-info');
  const status = await checkAiLanguageModel();
  let btnTxt = 'Okay';
  if (!status.ready) {
    if (status.availability === 'downloadable') {
      btnTxt = 'Download';
    }

    dialog.innerHTML = `
            <div class="content">
                <div class="header">
                    <h1 class="title">Built-in AI is: ${status.availability}</h1>
                    <button class="close" command="close" commandfor="model-info"></button>
                </div>
                <div class="main">
                    <p>${status.message}</p>
                </div>
                <div class="footer grow">
                    <button class="lg dark wide" style="--padding-y:1.25rem" id="action-btn">${btnTxt}</button>
                </div>
            </div>
                    `;
    dialog.showModal();
    const actionBtn = document.getElementById('action-btn');
    actionBtn.addEventListener('click', () => {
      if (status.availability === 'downloadable') {
        LanguageModel.createSession()
          .then(() => {
            alert('✅ Model download started in the background. You can close this tab.');
            dialog.close();
          })
          .catch((err) => {
            alert(`🚨 Could not start model download: ${err.message}`);
          });
      } else {
        dialog.close();
      }
    });
  }
});

async function checkAiLanguageModel() {
  /* ---------- 1. Mobile short-circuit ---------- */
  if (navigator?.userAgentData?.mobile) {
    return {
      ready: false,
      availability: 'not-supported',
      message: '❌ The built-in AI model is not yet supported on mobile devices.'
    };
  }

  /* ---------- 2. API existence check ---------- */
  if (typeof LanguageModel === 'undefined') {
    return {
      ready: false,
      availability: 'not-supported',
      message:
        '❌ The LanguageModel API is absent. ' +
        'Enable the flag ' +
        '<code style="user-select:all;">chrome://flags/#prompt-api-for-gemini-nano-multimodal-input</code> ' +
        'in Chrome 127+ and restart the browser.'
    };
  }

  /* ---------- 3. Query the browser ---------- */
  try {
    const status = await LanguageModel.availability();

    const MESSAGES = {
      available: {
        ready: true,
        message: '✅ Built-in AI model is ready—create a session and start prompting!'
      },
      downloadable: {
        ready: false,
        message:
          '⚠️ Model found but not downloaded. ' +
          'It will install in the background; you can close this tab and return later.'
      },
      downloading: {
        ready: false,
        message:
          '⏳ Download in progress. The model keeps installing even if you close this tab.'
      },
      unavailable: {
        ready: false,
        message:
          '🔴 Model unavailable on this device. ' +
          '<a href="https://developer.chrome.com/docs/ai/prompt-api#hardware-requirements" target="_blank" rel="noopener">Check requirements</a>.'
      }
    };

    const tpl = MESSAGES[status] ?? {
      ready: false,
      message: `❓ Unexpected status: <code>${status}</code>`
    };

    return { ...tpl, availability: status };
  } catch (err) {
    return {
      ready: false,
      availability: 'error',
      message: `🚨 Could not query model availability: ${err.message}`
    };
  }
}