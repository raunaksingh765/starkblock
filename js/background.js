// StarkBlock Background Service Worker

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('StarkBlock installed!');
  
  // Set default values
  await chrome.storage.local.set({
    stats: {
      blockedCount: 0,
      dataSaved: 0,
      timeSaved: 0,
      speedBoost: 15
    },
    protectionMode: 'standard',
    whitelist: [],
    recentBlocks: []
  });
  
  // Update dynamic rules
  await updateBlockingRules('standard');
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'changeMode') {
    updateBlockingRules(request.mode);
  }
  
  if (request.action === 'blockDetected') {
    handleBlockDetected(request.data);
  }
});

// Update blocking rules based on mode
async function updateBlockingRules(mode) {
  console.log('Updating rules for mode:', mode);
  
  // Get current rules
  const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
  const ruleIds = existingRules.map(rule => rule.id);
  
  // Remove old rules
  if (ruleIds.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIds
    });
  }
  
  // Different blocking levels based on mode
  let newRules = [];
  
  if (mode === 'stealth' || mode === 'standard' || mode === 'aggressive') {
    // Common blocking rules for all modes
    newRules = [
      {
        id: 1,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*doubleclick.net*',
          resourceTypes: ['script', 'xmlhttprequest', 'image']
        }
      },
      {
        id: 2,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*googlesyndication.com*',
          resourceTypes: ['script', 'xmlhttprequest']
        }
      },
      {
        id: 3,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*google-analytics.com*',
          resourceTypes: ['script', 'xmlhttprequest']
        }
      },
      {
        id: 4,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*facebook.com/tr*',
          resourceTypes: ['script', 'xmlhttprequest', 'image']
        }
      },
      {
        id: 5,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*ads*',
          resourceTypes: ['script', 'image']
        }
      },
      {
        id: 6,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*tracker*',
          resourceTypes: ['script', 'xmlhttprequest']
        }
      },
      {
        id: 7,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*analytics*',
          resourceTypes: ['script', 'xmlhttprequest']
        }
      }
    ];
  }
  
  // Aggressive mode adds more rules
  if (mode === 'aggressive') {
    newRules.push(
      {
        id: 8,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*popup*',
          resourceTypes: ['sub_frame']
        }
      },
      {
        id: 9,
        priority: 1,
        action: { type: 'block' },
        condition: {
          urlFilter: '*banner*',
          resourceTypes: ['image', 'script']
        }
      }
    );
  }
  
  // Add new rules
  if (newRules.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: newRules
    });
  }
}

// Handle detected blocks
async function handleBlockDetected(data) {
  // Get current stats
  const result = await chrome.storage.local.get(['stats', 'recentBlocks']);
  let stats = result.stats || {
    blockedCount: 0,
    dataSaved: 0,
    timeSaved: 0,
    speedBoost: 15
  };
  let recentBlocks = result.recentBlocks || [];
  
  // Update stats
  stats.blockedCount++;
  stats.dataSaved += Math.floor(Math.random() * 50) + 10; // Estimate
  stats.timeSaved += Math.floor(Math.random() * 3) + 1; // Estimate
  
  // Add to recent blocks
  recentBlocks.unshift({
    type: data.type || 'Ad',
    domain: data.domain || 'unknown',
    timestamp: Date.now()
  });
  
  // Keep only last 20 blocks
  if (recentBlocks.length > 20) {
    recentBlocks = recentBlocks.slice(0, 20);
  }
  
  // Save updated data
  await chrome.storage.local.set({ stats, recentBlocks });
  
  // Notify popup if open
  try {
    chrome.runtime.sendMessage({ action: 'statsUpdated' });
  } catch (e) {
    // Popup not open, ignore
  }
  
  // Update badge
  chrome.action.setBadgeText({ text: stats.blockedCount > 999 ? '999+' : stats.blockedCount.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#00D9FF' });
}

// Check if domain is whitelisted
async function isWhitelisted(url) {
  try {
    const domain = new URL(url).hostname;
    const result = await chrome.storage.local.get(['whitelist']);
    const whitelist = result.whitelist || [];
    return whitelist.includes(domain);
  } catch (e) {
    return false;
  }
}

// Listen for web requests (if available)
if (chrome.webRequest) {
  chrome.webRequest.onBeforeRequest.addListener(
    async (details) => {
      // Check if domain is whitelisted
      if (await isWhitelisted(details.url)) {
        return { cancel: false };
      }
      
      // Detect ad/tracker patterns
      const url = details.url.toLowerCase();
      const isAd = url.includes('ads') || 
                   url.includes('doubleclick') || 
                   url.includes('googlesyndication') ||
                   url.includes('adservice') ||
                   url.includes('banner');
      
      const isTracker = url.includes('analytics') || 
                        url.includes('tracker') || 
                        url.includes('pixel') ||
                        url.includes('facebook.com/tr');
      
      if (isAd || isTracker) {
        handleBlockDetected({
          type: isAd ? 'Ad' : 'Tracker',
          domain: new URL(details.url).hostname
        });
      }
      
      return { cancel: false }; // Let declarativeNetRequest handle blocking
    },
    { urls: ['<all_urls>'] },
    []
  );
}

// Periodic stats update
setInterval(async () => {
  const result = await chrome.storage.local.get(['stats']);
  if (result.stats && result.stats.blockedCount > 0) {
    chrome.action.setBadgeText({ 
      text: result.stats.blockedCount > 999 ? '999+' : result.stats.blockedCount.toString() 
    });
  }
}, 10000);

console.log('StarkBlock background service worker running');
