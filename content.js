// content.js
let isRunning = false;
let emailsToMatch = [];
let matchedEmails = new Set();
let currentPage = 1;
let totalPages = 1;
let processedPages = 0;

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  console.log('Content script received message:', message);
  
  if (message.action === 'startMatching') {
    startMatching(message.emails);
    sendResponse({ success: true });
  } else if (message.action === 'stopMatching') {
    stopMatching();
    sendResponse({ success: true });
  } else {
    sendResponse({ success: false, error: 'Unknown action' });
  }
});

async function startMatching(emails) {
  if (isRunning) {
    console.log('Already running, ignoring start request');
    return;
  }
  
  console.log(`Starting matching process with ${emails.length} emails:`, emails);
  
  isRunning = true;
  emailsToMatch = emails.map(email => email.toLowerCase());
  matchedEmails.clear();
  currentPage = 1;
  processedPages = 0;
  
  try {
    // Calculate total pages from pagination info
    calculateTotalPages();
    
    sendStatusUpdate(`Starting email matching process for ${emailsToMatch.length} emails...`, 'processing');
    await processCurrentPage();
    processedPages = 1;
    
    if (isRunning && totalPages > 1) {
      await processAllPages();
    }
    
    if (isRunning) {
      sendMessage('matchingComplete', 
        `Matching complete! Found ${matchedEmails.size} of ${emailsToMatch.length} emails across ${processedPages} pages.`
      );
    }
    
  } catch (error) {
    console.error('Error in matching process:', error);
    sendMessage('matchingError', `Error: ${error.message}`);
  } finally {
    isRunning = false;
  }
}

function stopMatching() {
  isRunning = false;
  sendStatusUpdate('Matching stopped by user', 'error');
}

function calculateTotalPages() {
  // Look for pagination info like "1 – 15 of 287"
  const paginationText = document.querySelector('.tw-text-slate-400')?.textContent;
  if (paginationText) {
    const match = paginationText.match(/of (\d+)/);
    if (match) {
      const totalRecords = parseInt(match[1]);
      const recordsPerPage = 15; // Based on the examples showing 15 records per page
      totalPages = Math.ceil(totalRecords / recordsPerPage);
      console.log(`Calculated ${totalPages} total pages for ${totalRecords} records`);
    }
  }
  
  // If we couldn't find pagination info, assume at least 1 page
  if (totalPages < 1) {
    totalPages = 1;
  }
}

async function processCurrentPage() {
  if (!isRunning) return;
  
  console.log(`Starting to process page ${currentPage}...`);
  
  const currentPageInfo = getCurrentPageInfo();
  sendStatusUpdate(
    `Processing page ${currentPage} of ${totalPages}...`,
    'processing',
    `Found ${matchedEmails.size} matches so far`
  );
  
  // Wait for page to load completely
  await waitForPageLoad();
  
  // Find all email addresses on current page
  const emailElements = findEmailElements();
  console.log(`Found ${emailElements.length} email elements on page ${currentPage}`);
  
  if (emailElements.length === 0) {
    console.log('No email elements found, trying alternative approach...');
    // Try to find any elements containing @ symbol
    const allElements = document.querySelectorAll('*');
    let foundEmails = 0;
    for (const el of allElements) {
      if (el.children.length === 0 && el.textContent.includes('@')) {
        console.log(`Found potential email element: ${el.textContent} in ${el.tagName}.${el.className}`);
        foundEmails++;
        if (foundEmails > 10) break; // Limit output
      }
    }
  }
  
  let pageMatches = 0;
  
  for (const element of emailElements) {
    if (!isRunning) break;
    
    const email = element.textContent.trim().toLowerCase();
    console.log(`Checking email: ${email}`);
    
    if (emailsToMatch.includes(email) && !matchedEmails.has(email)) {
      console.log(`Found matching email: ${email}`);
      // Find corresponding checkbox
      const checkbox = findCheckboxForEmail(element);
      if (checkbox) {
        console.log(`Found checkbox for ${email}, checked: ${checkbox.checked}`);
        if (!checkbox.checked) {
          // Make checkbox visible first (remove tw-hidden class and add tw-block)
          checkbox.classList.remove('tw-hidden');
          checkbox.classList.add('tw-block', '!tw-block');
          
          // Also trigger hover state on parent to make it visible
          const parentCell = checkbox.closest('td');
          if (parentCell) {
            parentCell.classList.add('group-hover');
          }
          
          // Small delay to ensure visibility
          await delay(50);
          
          // Click the checkbox
          checkbox.click();
          
          // Alternative click methods if direct click doesn't work
          if (!checkbox.checked) {
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          }
          
          matchedEmails.add(email);
          pageMatches++;
          console.log(`Matched and checked: ${email}`);
          
          // Small delay to avoid overwhelming the UI
          await delay(100);
        } else {
          console.log(`Checkbox for ${email} was already checked`);
          matchedEmails.add(email);
          pageMatches++;
        }
      } else {
        console.log(`No checkbox found for ${email}`);
      }
    }
  }
  
  sendStatusUpdate(
    `Page ${currentPage} complete - ${pageMatches} new matches found`,
    'processing',
    `Total matches: ${matchedEmails.size} of ${emailsToMatch.length}`
  );
}

async function processAllPages() {
  while (isRunning && currentPage < totalPages) {
    // Click next page button
    const nextButton = document.getElementById('next-button');
    if (!nextButton) {
      console.log('Next button not found');
      break;
    }
    
    // Check if next button is disabled (usually has different classes when disabled)
    const nextButtonClasses = nextButton.className;
    if (nextButtonClasses.includes('disabled') || nextButtonClasses.includes('tw-cursor-not-allowed')) {
      console.log('Next button is disabled');
      break;
    }
    
    sendStatusUpdate(`Moving to page ${currentPage + 1} of ${totalPages}...`, 'processing');
    
    nextButton.click();
    currentPage++;
    
    // Wait for page to load
    await waitForPageLoad();
    await delay(1500); // Additional delay for page transition
    
    // Process the new page
    await processCurrentPage();
    processedPages++;
  }
}

function findEmailElements() {
  // Look for email addresses in specific <p> elements with the exact class
  // Based on the HTML structure: emails are in <p class="tw-max-w-[300px] tw-truncate"> elements
  const emailElements = [];
  
  // Try multiple selectors to find email elements
  let pElements = document.querySelectorAll('p.tw-max-w-\\[300px\\].tw-truncate');
  console.log(`Found ${pElements.length} elements with escaped brackets selector`);
  
  // If the escaped version doesn't work, try without escaping
  if (pElements.length === 0) {
    pElements = document.querySelectorAll('p[class*="tw-max-w-"][class*="tw-truncate"]');
    console.log(`Found ${pElements.length} elements with attribute selector`);
  }
  
  // If still no luck, try finding all p elements and filter
  if (pElements.length === 0) {
    const allPs = document.querySelectorAll('p');
    console.log(`Found ${allPs.length} total p elements, filtering for emails...`);
    pElements = Array.from(allPs).filter(p => {
      const classes = p.className;
      return classes.includes('tw-max-w-') && classes.includes('tw-truncate');
    });
    console.log(`Filtered to ${pElements.length} p elements with correct classes`);
  }
  
  for (const p of pElements) {
    const text = p.textContent.trim();
    console.log(`Checking text: "${text}"`);
    if (text.includes('@') && text.includes('.')) {
      // Basic email validation
      if (isValidEmail(text)) {
        console.log(`Valid email found: ${text}`);
        emailElements.push(p);
      }
    }
  }
  
  console.log(`Found ${emailElements.length} email elements total`);
  return emailElements;
}

function findCheckboxForEmail(emailElement) {
  // Find the table row containing this email
  const row = emailElement.closest('tr');
  if (!row) {
    console.log('No row found for email element');
    return null;
  }
  
  // Look for checkbox in the first cell of the row
  const firstCell = row.querySelector('td');
  if (!firstCell) {
    console.log('No first cell found in row');
    return null;
  }
  
  // Find checkbox with the pattern select-registrant-checkbox-*
  const checkbox = firstCell.querySelector('input[type="checkbox"][id^="select-registrant-checkbox-"]');
  if (!checkbox) {
    console.log('No checkbox found in first cell');
  }
  return checkbox;
}

function getCurrentPageInfo() {
  const paginationText = document.querySelector('.tw-text-slate-400')?.textContent;
  return paginationText || `Page ${currentPage}`;
}

async function waitForPageLoad() {
  // Wait for the table to be present and populated
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 20; // 10 seconds max wait
    
    const checkLoaded = () => {
      attempts++;
      const table = document.querySelector('table');
      const rows = document.querySelectorAll('tbody tr');
      
      // Try different selectors for email elements
      let emails = document.querySelectorAll('p.tw-max-w-\\[300px\\].tw-truncate');
      if (emails.length === 0) {
        emails = document.querySelectorAll('p[class*="tw-max-w-"][class*="tw-truncate"]');
      }
      
      console.log(`Page load check ${attempts}: table=${!!table}, rows=${rows.length}, emails=${emails.length}`);
      
      if (table && rows.length > 0) {
        console.log(`Page loaded with ${rows.length} rows and ${emails.length} email elements`);
        resolve();
      } else if (attempts >= maxAttempts) {
        console.log('Max wait time exceeded, proceeding anyway');
        resolve();
      } else {
        setTimeout(checkLoaded, 500);
      }
    };
    checkLoaded();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function sendStatusUpdate(message, type, progress = '') {
  sendMessage('updateStatus', message, type, progress);
}

function sendMessage(action, message, type = '', progress = '') {
  chrome.runtime.sendMessage({
    action: action,
    message: message,
    type: type,
    progress: progress
  });
}

// Initialize when script loads
console.log('Goldcast Email Matcher content script loaded');

// Check if we're on the right page
if (window.location.href.includes('admin.goldcast.io') && window.location.href.includes('registrants')) {
  console.log('Detected Goldcast registrants page');
} else {
  console.log('Not on a Goldcast registrants page');
}
