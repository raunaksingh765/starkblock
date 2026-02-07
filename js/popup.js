// StarkBlock Popup Script
let stats = {
  blockedCount: 0,
  dataSaved: 0,
  timeSaved: 0,
  speedBoost: 0
};

let currentMode = 'standard';
let isEnabled = true;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await loadSettings();
  initializeEventListeners();
  startRealTimeUpdates();
  animateOnLoad();
});

// Load statistics from storage
async function loadStats() {
  try {
    const result = await chrome.storage.local.get(['stats']);
    if (result.stats) {
      stats = result.stats;
      updateStatsDisplay();
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Load user settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['mode', 'enabled']);
    currentMode = result.mode || 'standard';
    isEnabled = result.enabled !== false;
    
    // Update UI
    document.getElementById('master-toggle').checked = isEnabled;
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === currentMode);
    });
    
    updateProtectionStatus();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Update stats display
function updateStatsDisplay() {
  document.getElementById('blocked-count').textContent = formatNumber(stats.blockedCount);
  document.getElementById('data-saved').textContent = formatBytes(stats.dataSaved);
  document.getElementById('time-saved').textContent = formatTime(stats.timeSaved);
  document.getElementById('speed-boost').textContent = `${stats.speedBoost}%`;
}

// Initialize all event listeners
function initializeEventListeners() {
  // Master toggle
  document.getElementById('master-toggle').addEventListener('change', async (e) => {
    isEnabled = e.target.checked;
    await chrome.storage.local.set({ enabled: isEnabled });
    updateProtectionStatus();
    
    // Notify background script
    chrome.runtime.sendMessage({ 
      action: 'toggleProtection', 
      enabled: isEnabled 
    });
    
    // Haptic feedback (visual)
    e.target.parentElement.style.transform = 'scale(0.95)';
    setTimeout(() => {
      e.target.parentElement.style.transform = 'scale(1)';
    }, 100);
  });

  // Mode selector
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const mode = e.currentTarget.dataset.mode;
      currentMode = mode;
      
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      await chrome.storage.local.set({ mode });
      
      // Notify background script
      chrome.runtime.sendMessage({ 
        action: 'changeMode', 
        mode 
      });
    });
  });

  // Whitelist site
  document.getElementById('whitelist-site').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    const domain = url.hostname;
    
    const result = await chrome.storage.local.get(['whitelist']);
    const whitelist = result.whitelist || [];
    
    if (whitelist.includes(domain)) {
      // Remove from whitelist
      const index = whitelist.indexOf(domain);
      whitelist.splice(index, 1);
      showNotification(`Removed ${domain} from whitelist`);
    } else {
      // Add to whitelist
      whitelist.push(domain);
      showNotification(`Added ${domain} to whitelist ❤️`);
    }
    
    await chrome.storage.local.set({ whitelist });
    chrome.runtime.sendMessage({ action: 'updateWhitelist', whitelist });
  });

  // Element Zapper
  document.getElementById('element-zapper').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    await chrome.tabs.sendMessage(tab.id, { action: 'activateZapper' });
    window.close();
  });

  // View Report
  document.getElementById('view-report').addEventListener('click', () => {
    chrome.tabs.create({ url: 'report.html' });
  });

  // Threat list toggle
  document.getElementById('threat-toggle').addEventListener('click', (e) => {
    const list = document.getElementById('threat-list');
    const isVisible = list.style.display !== 'none';
    
    list.style.display = isVisible ? 'none' : 'block';
    e.currentTarget.classList.toggle('active', !isVisible);
  });

  // Settings
  document.getElementById('settings-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'settings.html' });
  });

  // About
  document.getElementById('about-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://github.com/yourusername/starkblock' });
  });
}

// Update protection status text
function updateProtectionStatus() {
  const statusText = document.getElementById('protection-status');
  const statusCard = document.querySelector('.status-card');
  
  if (isEnabled) {
    statusText.textContent = 'STARK SHIELD ACTIVE';
    statusCard.style.borderColor = 'rgba(0, 217, 255, 0.5)';
  } else {
    statusText.textContent = 'PROTECTION OFFLINE';
    statusCard.style.borderColor = 'rgba(239, 68, 68, 0.5)';
  }
}

// Start real-time updates
function startRealTimeUpdates() {
  // Get current tab stats
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs[0]) {
      const tabId = tabs[0].id;
      const result = await chrome.storage.local.get([`tabStats_${tabId}`]);
      
      if (result[`tabStats_${tabId}`]) {
        updateThreatList(result[`tabStats_${tabId}`].blocked);
      }
    }
  });

  // Listen for updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'statsUpdate') {
      stats = message.stats;
      updateStatsDisplay();
    } else if (message.action === 'threatBlocked') {
      addThreatToList(message.threat);
    }
  });
}

// Update threat list
function updateThreatList(threats) {
  const list = document.getElementById('threat-list');
  const badge = document.getElementById('threat-count-badge');
  
  if (!threats || threats.length === 0) {
    list.innerHTML = '<div class="empty-state">No threats detected on this page</div>';
    badge.textContent = '0';
    return;
  }
  
  badge.textContent = threats.length.toString();
  list.innerHTML = threats.slice(0, 10).map(threat => `
    <div class="threat-item">
      <strong>${threat.type}</strong>: ${threat.url}
    </div>
  `).join('');
}

// Add new threat to list (real-time)
function addThreatToList(threat) {
  const list = document.getElementById('threat-list');
  const badge = document.getElementById('threat-count-badge');
  const currentCount = parseInt(badge.textContent);
  
  // Remove empty state if exists
  const emptyState = list.querySelector('.empty-state');
  if (emptyState) {
    list.innerHTML = '';
  }
  
  // Add new threat at top
  const threatItem = document.createElement('div');
  threatItem.className = 'threat-item';
  threatItem.innerHTML = `<strong>${threat.type}</strong>: ${threat.url}`;
  threatItem.style.animation = 'slideIn 0.3s ease-out';
  
  list.insertBefore(threatItem, list.firstChild);
  
  // Update badge
  badge.textContent = (currentCount + 1).toString();
  
  // Keep only last 10
  const items = list.querySelectorAll('.threat-item');
  if (items.length > 10) {
    items[items.length - 1].remove();
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, rgba(0, 217, 255, 0.9), rgba(0, 217, 255, 0.7));
    color: #0a0e27;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.5);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

// Format numbers with K, M notation
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// Format bytes to MB, GB
function formatBytes(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

// Format time in hours
function formatTime(seconds) {
  const hours = seconds / 3600;
  if (hours >= 1) return hours.toFixed(1) + 'h';
  const minutes = seconds / 60;
  if (minutes >= 1) return minutes.toFixed(0) + 'm';
  return seconds.toFixed(0) + 's';
}

// Animate on load
function animateOnLoad() {
  const cards = document.querySelectorAll('.stat-card');
  cards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    setTimeout(() => {
      card.style.transition = 'all 0.4s ease';
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, index * 50);
  });
}
