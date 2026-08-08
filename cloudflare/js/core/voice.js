var Voice = (function() {
  var micIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>';
  var micOffIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/></svg>';

  function isSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function getTextarea(id) {
    return document.getElementById(id);
  }

  function findBtn(id, btn) {
    if (btn) return btn;
    return document.querySelector('[data-voice="' + id + '"]');
  }

  function setVoiceBtnState(id, btn, state) {
    btn = findBtn(id, btn);
    if (!btn) return;
    if (!btn._voiceOrigHtml) btn._voiceOrigHtml = btn.innerHTML;
    btn.classList.remove('voice-idle', 'voice-listening', 'voice-recording', 'voice-denied');
    switch (state) {
      case 'listening':
        btn.classList.add('voice-listening');
        btn.style.background = '#3b82f6';
        btn.style.color = '#fff';
        btn.title = 'Listening... Tap to stop';
        btn.innerHTML = micIcon + ' Listening...';
        break;
      case 'recording':
        btn.classList.add('voice-recording');
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        btn.title = 'Recording... Tap to stop';
        btn.innerHTML = micIcon + ' Recording...';
        break;
      case 'denied':
        btn.classList.add('voice-denied');
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
        btn.title = 'Microphone permission denied';
        btn.innerHTML = micOffIcon + ' Mic Off';
        break;
      default:
        btn.classList.add('voice-idle');
        btn.style.background = '';
        btn.style.color = '';
        btn.title = 'Voice input';
        btn.innerHTML = btn._voiceOrigHtml;
    }
  }

  function showNotSupportedDialog() {
    var existing = document.getElementById('voiceNotSupDialog');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'voiceNotSupDialog';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:micFadeIn 0.2s ease';
    var d = document.createElement('div');
    d.style.cssText = 'background:var(--bg-card,#080c1c);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:micSlideUp 0.3s cubic-bezier(0.22,1,0.36,1)';
    d.innerHTML = '' +
      '<div style="width:64px;height:64px;border-radius:50%;background:rgba(59,130,246,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" width="32" height="32"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>' +
      '</div>' +
      '<h3 style="font-size:18px;font-weight:700;color:var(--text-primary,#e2e8f0);margin:0 0 8px">Voice Input Not Supported</h3>' +
      '<p style="font-size:13px;color:var(--text-secondary,#94a3b8);margin:0 0 24px;line-height:1.6">Voice Input is not supported in this browser. Please use the latest version of <strong style="color:var(--text-primary,#e2e8f0)">Google Chrome</strong> or <strong style="color:var(--text-primary,#e2e8f0)">Microsoft Edge</strong> for the best experience.</p>' +
      '<button id="voiceNotSupClose" style="padding:10px 24px;border-radius:10px;border:none;background:var(--primary,#6366f1);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s">Got it</button>';
    overlay.appendChild(d);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.getElementById('voiceNotSupClose').addEventListener('click', function() { overlay.remove(); });
  }

  function showPermissionDialog(id, customMessage) {
    var existing = document.getElementById('micPermDialog');
    if (existing) existing.remove();
    var msg = customMessage || 'Voice Input requires microphone access to convert your speech to text. Please allow microphone permission in your browser settings and try again.';
    var overlay = document.createElement('div');
    overlay.id = 'micPermDialog';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:micFadeIn 0.2s ease';
    var d = document.createElement('div');
    d.style.cssText = 'background:var(--bg-card,#080c1c);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:32px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);animation:micSlideUp 0.3s cubic-bezier(0.22,1,0.36,1)';
    d.innerHTML = '' +
      '<div style="width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 20px">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="32" height="32"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/><line x1="1" y1="1" x2="23" y2="23" stroke="#ef4444" stroke-width="2"/></svg>' +
      '</div>' +
      '<h3 style="font-size:18px;font-weight:700;color:var(--text-primary,#e2e8f0);margin:0 0 8px">Microphone Permission Required</h3>' +
      '<p style="font-size:13px;color:var(--text-secondary,#94a3b8);margin:0 0 24px;line-height:1.6">' + msg + '</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button id="micPermRetry" style="padding:10px 24px;border-radius:10px;border:none;background:var(--primary,#6366f1);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s">Retry</button>' +
        '<button id="micPermSettings" style="padding:10px 24px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.08));background:var(--bg-input,rgba(255,255,255,0.05));color:var(--text-primary,#e2e8f0);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s">Open Browser Settings</button>' +
        '<button id="micPermClose" style="padding:10px 24px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.08));background:transparent;color:var(--text-secondary,#94a3b8);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s">Cancel</button>' +
      '</div>';
    overlay.appendChild(d);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) { overlay.remove(); setVoiceBtnState(id, null, 'idle'); }
    });
    document.getElementById('micPermRetry').addEventListener('click', function() {
      overlay.remove();
      toggle(id, findBtn(id, null));
    });
    document.getElementById('micPermSettings').addEventListener('click', function() {
      var ua = navigator.userAgent;
      if (ua.indexOf('Edg/') !== -1) {
        try { window.open('edge://settings/content/microphone', '_blank'); } catch(ex) { if (Notify) Notify.info('Go to Edge Settings > Cookies and site permissions > Microphone.'); }
      } else if (ua.indexOf('Chrome') !== -1) {
        try { window.open('chrome://settings/content/microphone', '_blank'); } catch(ex) { if (Notify) Notify.info('Go to Chrome Settings > Privacy and security > Site settings > Microphone.'); }
      } else {
        if (Notify) Notify.info('Please go to your browser settings and allow microphone access for this site.');
      }
    });
    document.getElementById('micPermClose').addEventListener('click', function() {
      overlay.remove();
      setVoiceBtnState(id, null, 'idle');
    });
  }

  function doStartRecognition(id, btn) {
    var ta = getTextarea(id);
    if (!ta || !isSupported()) return;
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    ta._voiceRecognition = recognition;
    ta._voiceActive = true;
    setVoiceBtnState(id, btn, 'listening');
    var finalTranscript = ta.value || '';
    var interimDiv = document.getElementById(id + '_interim');
    if (!interimDiv) {
      interimDiv = document.createElement('div');
      interimDiv.id = id + '_interim';
      interimDiv.style.cssText = 'font-size:11px;color:var(--primary);padding:4px 0;min-height:16px;font-style:italic';
      ta.parentNode.insertBefore(interimDiv, ta.nextSibling);
    }
    recognition.onresult = function(event) {
      setVoiceBtnState(id, btn, 'recording');
      var interim = '';
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript && finalTranscript.charAt(finalTranscript.length - 1) !== ' ' ? ' ' : '') + event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      ta.value = finalTranscript;
      interimDiv.textContent = interim ? 'Hearing: ' + interim : '';
    };
    recognition.onerror = function(event) {
      ta._voiceActive = false;
      if (interimDiv) interimDiv.textContent = '';
      if (event.error === 'no-speech') {
        setVoiceBtnState(id, btn, 'idle');
        if (Notify) Notify.info('No speech detected. Please try again.');
        return;
      }
      if (event.error === 'aborted') {
        setVoiceBtnState(id, btn, 'idle');
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceBtnState(id, btn, 'denied');
        showPermissionDialog(id);
        return;
      }
      if (event.error === 'not-found') {
        setVoiceBtnState(id, btn, 'denied');
        showPermissionDialog(id, 'No microphone found. Please connect a microphone and try again.');
        return;
      }
      setVoiceBtnState(id, btn, 'idle');
      if (Notify) Notify.error('Voice input error: ' + event.error);
    };
    recognition.onend = function() {
      ta._voiceActive = false;
      setVoiceBtnState(id, btn, 'idle');
      if (interimDiv) interimDiv.textContent = '';
    };
    try {
      recognition.start();
    } catch (e) {
      ta._voiceActive = false;
      setVoiceBtnState(id, btn, 'idle');
      showPermissionDialog(id);
    }
  }

  function toggle(id, btn) {
    var ta = getTextarea(id);
    if (!ta) return;
    if (!isSupported()) {
      showNotSupportedDialog();
      return;
    }
    if (ta._voiceActive) {
      try { ta._voiceRecognition.stop(); } catch (e) {}
      ta._voiceActive = false;
      setVoiceBtnState(id, btn, 'idle');
      return;
    }
    doStartRecognition(id, btn);
  }

  return {
    toggle: toggle,
    isSupported: isSupported,
    micIcon: micIcon,
    micOffIcon: micOffIcon
  };
})();
