// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const emailListTextarea = document.getElementById('emailList');
  const actionBtn = document.getElementById('actionBtn');
  const statusDiv = document.getElementById('status');

  let isRunning = false;

  // Load saved email list
  chrome.storage.local.get(['emailList'], function(result) {
    if (result.emailList) {
      emailListTextarea.value = result.emailList;
    }
  });

  // Save email list on change
  emailListTextarea.addEventListener('input', function() {
    chrome.storage.local.set({ emailList: emailListTextarea.value });
  });

  actionBtn.addEventListener('click', async function() {
    if (isRunning) {
      // Stop functionality
      isRunning = false;
      updateUI();
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        await chrome.tabs.sendMessage(tab.id, { action: 'stopMatching' });
        showStatus('Matching stopped', 'error');
      } catch (error) {
        console.error('Error stopping matching:', error);
        showStatus('Matching stopped (forced)', 'error');
      }
      return;
    }

    // Start functionality
    const emailText = emailListTextarea.value.trim();
    if (!emailText) {
      showStatus('Please enter at least one email address', 'error');
      return;
    }

    // Parse and validate emails
    const emails = emailText.split('\n')
      .map(email => email.trim())
      .filter(email => email && isValidEmail(email));
    
    if (emails.length === 0) {
      showStatus('No valid email addresses found', 'error');
      return;
    }

    // Check if we're on a Goldcast registrants page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Current tab URL:', tab.url);
    
    if (!tab.url.includes('admin.goldcast.io') || !tab.url.includes('registrants')) {
      showStatus('Please navigate to a Goldcast registrants page first', 'error');
      return;
    }

    isRunning = true;
    updateUI();
    
    try {
      // Send emails to content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'startMatching',
        emails: emails
      });
      
      console.log('Message sent to content script, response:', response);
      
      if (response && response.success) {
        showStatus(`Starting to match ${emails.length} email${emails.length > 1 ? 's' : ''}...`, 'processing');
      } else {
        throw new Error('Failed to communicate with content script');
      }
    } catch (error) {
      console.error('Error sending message to content script:', error);
      isRunning = false;
      updateUI();
      showStatus('Error: Could not communicate with page. Try refreshing the page.', 'error');
    }
  });

  // Listen for messages from content script
  chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'updateStatus') {
      showStatus(message.message, message.type);
      if (message.progress) {
        updateProgress(message.progress);
      }
    } else if (message.action === 'matchingComplete') {
      isRunning = false;
      updateUI();
      showStatus(message.message, 'success');
    } else if (message.action === 'matchingError') {
      isRunning = false;
      updateUI();
      showStatus(message.message, 'error');
    }
  });

  function updateUI() {
    if (isRunning) {
      actionBtn.textContent = 'Stop';
      actionBtn.className = 'stop-btn';
    } else {
      actionBtn.textContent = 'Start Matching';
      actionBtn.className = 'primary-btn';
    }
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
  }

  function updateProgress(progress) {
    const progressDiv = statusDiv.querySelector('.progress') || document.createElement('div');
    progressDiv.className = 'progress';
    progressDiv.textContent = progress;
    if (!statusDiv.querySelector('.progress')) {
      statusDiv.appendChild(progressDiv);
    }
  }

  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
});
