// StarkBlock Background Service Worker
let stats = {
  blockedCount: 0,
  dataSaved: 0,
  timeSaved: 0,
  speedBoost: 45
};

let settings = {
  enabled: true,
  mode: 'standard',
  whitelist: []
};

let tabStats = {};

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('StarkBlock installed - Genius-level protection activated');
  
  // Set default settings
  await chrome.storage.local.set({ 
    stats, 
    settings,
    whitelist: []
  });
  
  // Initialize declarative net request rules
  await updateBlockingRules();
});

// Load settings on startup
chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(['stats', 'settings', 'whitelist']);
  if (result.stats) stats = result.stats;
  if (result.settings) settings = result.settings;
  if (result.whitelist) settings.whitelist = result.whitelist;
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'toggleProtection':
      settings.enabled = message.enabled;
      chrome.storage.local.set({ enabled: message.enabled });
      break;
      
    case 'changeMode':
      settings.mode = message.mode;
      chrome.storage.local.set({ mode: message.mode });
      updateBlockingRules();
      break;
      
    case 'updateWhitelist':
      settings.whitelist = message.whitelist;
      chrome.storage.local.set({ whitelist: message.whitelist });
      break;
      
    case 'elementZapped':
      handleElementZap(message.selector, sender.tab.id);
      break;
      
    case 'getStats':
      sendResponse({ stats });
      break;
  }
  
  return true;
});

// Monitor web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!settings.enabled) return {};
    
    const url = details.url;
    const tabId = details.tabId;
    
    // Check whitelist
    if (isWhitelisted(url)) return {};
    
    // Check if URL should be blocked
    if (shouldBlock(url, details.type)) {
      // Update stats
      stats.blockedCount++;
      stats.dataSaved += estimateDataSaved(details.type);
      stats.timeSaved += 0.1; // Estimate 100ms saved per block
      
      // Update tab-specific stats
      if (!tabStats[tabId]) {
        tabStats[tabId] = { blocked: [] };
      }
      
      tabStats[tabId].blocked.push({
        type: getBlockType(url),
        url: new URL(url).hostname,
        timestamp: Date.now()
      });
      
      // Save stats
      chrome.storage.local.set({ stats, [`tabStats_${tabId}`]: tabStats[tabId] });
      
      // Notify popup if open
      chrome.runtime.sendMessage({ 
        action: 'statsUpdate', 
        stats 
      }).catch(() => {}); // Ignore if popup not open
      
      chrome.runtime.sendMessage({
        action: 'threatBlocked',
        threat: {
          type: getBlockType(url),
          url: new URL(url).hostname
        }
      }).catch(() => {});
      
      return { cancel: true };
    }
    
    return {};
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Clear tab stats when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStats[tabId];
  chrome.storage.local.remove([`tabStats_${tabId}`]);
});

// Check if URL is whitelisted
function isWhitelisted(url) {
  try {
    const hostname = new URL(url).hostname;
    return settings.whitelist.some(domain => hostname.includes(domain));
  } catch {
    return false;
  }
}

// Check if URL should be blocked
function shouldBlock(url, type) {
  const urlLower = url.toLowerCase();
  
  // Ad networks and trackers
  const adDomains = [
    'doubleclick.net', 'googleadservices.com', 'googlesyndication.com',
    'google-analytics.com', 'googletagmanager.com', 'facebook.net',
    'connect.facebook.net', 'scorecardresearch.com', 'outbrain.com',
    'taboola.com', 'advertising.com', 'adnxs.com', 'adsrvr.org',
    'adform.net', 'pubmatic.com', 'rubiconproject.com', 'openx.net',
    'casalemedia.com', 'criteo.com', 'bidswitch.net', 'adsafeprotected.com'
  ];
  
  // Tracking scripts
  const trackingPatterns = [
    '/analytics', '/tracking', '/pixel', '/beacon', '/telemetry',
    '/collect', '/tracker', '/metrics', '/stats', '/events'
  ];
  
  // Ad-related patterns
  const adPatterns = [
    '/ads/', '/ad/', '/advert', '/banner', '/popup', '/popunder',
    '/sponsor', '/affiliate', 'pagead', 'adserver', 'adsystem'
  ];
  
  // Check domains
  if (adDomains.some(domain => urlLower.includes(domain))) {
    return true;
  }
  
  // Check patterns
  if (trackingPatterns.some(pattern => urlLower.includes(pattern))) {
    return true;
  }
  
  if (adPatterns.some(pattern => urlLower.includes(pattern))) {
    return true;
  }
  
  // Check by resource type
  if (type === 'script' || type === 'xmlhttprequest') {
    // More aggressive blocking for scripts in aggressive mode
    if (settings.mode === 'aggressive') {
      return adPatterns.some(pattern => urlLower.includes(pattern));
    }
  }
  
  return false;
}

// Get block type for categorization
function getBlockType(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('track') || urlLower.includes('analytics') || urlLower.includes('pixel')) {
    return 'Tracker';
  }
  if (urlLower.includes('ad') || urlLower.includes('banner') || urlLower.includes('sponsor')) {
    return 'Advertisement';
  }
  if (urlLower.includes('popup') || urlLower.includes('popunder')) {
    return 'Popup';
  }
  if (urlLower.includes('crypto') || urlLower.includes('coinhive')) {
    return 'Cryptominer';
  }
  
  return 'Unknown';
}

// Estimate data saved based on resource type
function estimateDataSaved(type) {
  switch (type) {
    case 'script': return 15000; // 15KB average
    case 'image': return 50000; // 50KB average
    case 'stylesheet': return 10000; // 10KB average
    case 'xmlhttprequest': return 5000; // 5KB average
    case 'media': return 500000; // 500KB average
    default: return 3000; // 3KB average
  }
}

// Handle element zapping
async function handleElementZap(selector, tabId) {
  const result = await chrome.storage.local.get(['zappedElements']);
  const zappedElements = result.zappedElements || {};
  
  // Get tab URL
  const tab = await chrome.tabs.get(tabId);
  const url = new URL(tab.url);
  const domain = url.hostname;
  
  if (!zappedElements[domain]) {
    zappedElements[domain] = [];
  }
  
  if (!zappedElements[domain].includes(selector)) {
    zappedElements[domain].push(selector);
  }
  
  await chrome.storage.local.set({ zappedElements });
}

// Update blocking rules based on mode
async function updateBlockingRules() {
  // This would be implemented with declarativeNetRequest rules
  // For now, we're using webRequest API
  console.log(`Blocking mode updated to: ${settings.mode}`);
}

// Badge updates
function updateBadge(tabId, count) {
  chrome.action.setBadgeText({ 
    text: count > 0 ? count.toString() : '',
    tabId 
  });
  chrome.action.setBadgeBackgroundColor({ 
    color: '#00D9FF',
    tabId 
  });
}

// Periodic stats save
setInterval(() => {
  chrome.storage.local.set({ stats });
}, 30000); // Save every 30 seconds

// YouTube ad blocking (content script will handle this)
// Listen for YouTube-specific blocking requests
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.url.includes('youtube.com')) {
    chrome.tabs.sendMessage(details.tabId, { 
      action: 'initYouTubeBlocker' 
    }).catch(() => {});
  }
}, { url: [{ hostContains: 'youtube.com' }] });
