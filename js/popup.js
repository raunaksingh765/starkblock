// StarkBlock Popup JavaScript

// Initialize stats
let stats = {
  blockedCount: 0,
  dataSaved: 0,
  timeSaved: 0,
  speedBoost: 0,
  mode: 'standard'
};

// Load saved data on popup open
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadMode();
  await checkWhitelistStatus();
  updateUI();
  setupEventListeners();
  startThreatFeed();
});

// Load stats from storage
async function loadStats() {
  const result = await chrome.storage.local.get(['stats']);
  if (result.stats) {
    stats = { ...stats, ...result.stats };
  }
}

// Load protection mode
async function loadMode() {
  const result = await chrome.storage.local.get(['protectionMode']);
  if (result.protectionMode) {
    stats.mode = result.protectionMode;
  }
}

// Check if current site is whitelisted
async function checkWhitelistStatus() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]) {
    const url = new URL(tabs[0].url);
    const domain = url.hostname;
    
    const result = await chrome.storage.local.get(['whitelist']);
    const whitelist = result.whitelist || [];
    
    const isWhitelisted = whitelist.includes(domain);
    const whitelistBtn = document.getElementById('whitelistBtn');
    const whitelistText = document.getElementById('whitelistText');
    
    if (isWhitelisted) {
      whitelistText.textContent = 'Remove from Whitelist';
      whitelistBtn.style.background = 'rgba(255, 100, 100, 0.1)';
    } else {
      whitelistText.textContent = 'Whitelist Site';
      whitelistBtn.style.background = '';
    }
  }
}

// Update UI with current stats
function updateUI() {
  document.getElementById('blockedCount').textContent = stats.blockedCount.toLocaleString();
  document.getElementById('dataSaved').textContent = formatBytes(stats.dataSaved);
  document.getElementById('timeSaved').textContent = formatTime(stats.timeSaved);
  document.getElementById('speedBoost').textContent = stats.speedBoost + '%';
  
  // Update active mode button
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === stats.mode) {
      btn.classList.add('active');
    }
  });
}

// Format bytes to readable format
function formatBytes(bytes) {
  if (bytes === 0) return '0 MB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Format seconds to readable format
function formatTime(seconds) {
  if (seconds === 0) return '0s';
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
  return (seconds / 3600).toFixed(1) + 'h';
}

// Setup event listeners
function setupEventListeners() {
  // Mode selector buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const mode = btn.dataset.mode;
      stats.mode = mode;
      await chrome.storage.local.set({ protectionMode: mode });
      
      // Send message to background script
      chrome.runtime.sendMessage({ 
        action: 'changeModer',
        mode: mode 
      });
      
      updateUI();
      showNotification(`Protection mode changed to ${mode.toUpperCase()}`);
    });
  });
  
  // Element Zapper
  document.getElementById('elementZapper').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      await chrome.tabs.sendMessage(tabs[0].id, { action: 'startZapper' });
      window.close();
    }
  });
  
  // Whitelist button
  document.getElementById('whitelistBtn').addEventListener('click', async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
      
      const result = await chrome.storage.local.get(['whitelist']);
      let whitelist = result.whitelist || [];
      
      const index = whitelist.indexOf(domain);
      if (index > -1) {
        whitelist.splice(index, 1);
        showNotification(`Removed ${domain} from whitelist`);
      } else {
        whitelist.push(domain);
        showNotification(`Added ${domain} to whitelist`);
      }
      
      await chrome.storage.local.set({ whitelist });
      await checkWhitelistStatus();
      
      // Reload the tab
      chrome.tabs.reload(tabs[0].id);
    }
  });
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // About button
  document.getElementById('aboutBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/raunaksingh765/starkblock' });
  });
}

// Start threat feed updates
function startThreatFeed() {
  updateThreatFeed();
  setInterval(updateThreatFeed, 3000);
}

// Update threat feed with recent blocks
async function updateThreatFeed() {
  const result = await chrome.storage.local.get(['recentBlocks']);
  const recentBlocks = result.recentBlocks || [];
  
  const feedElement = document.getElementById('threatFeed');
  
  if (recentBlocks.length === 0) {
    feedElement.innerHTML = `
      <div class="threat-item">
        <span class="threat-type">✅ Clean</span>
        <span class="threat-domain">No threats detected</span>
      </div>
    `;
    return;
  }
  
  feedElement.innerHTML = recentBlocks.slice(0, 5).map(block => `
    <div class="threat-item">
      <span class="threat-type">${getBlockIcon(block.type)} ${block.type}</span>
      <span class="threat-domain">${block.domain}</span>
    </div>
  `).join('');
}

// Get icon for block type
function getBlockIcon(type) {
  const icons = {
    'Ad': '🎯',
    'Tracker': '🔍',
    'Malware': '⚠️',
    'Script': '📜',
    'Cookie': '🍪'
  };
  return icons[type] || '🛡️';
}

// Show notification
function showNotification(message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 217, 255, 0.95);
    color: #0a0e27;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'statsUpdated') {
    loadStats().then(() => updateUI());
  }
});
