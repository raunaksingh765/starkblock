// StarkBlock Content Script
let zapperMode = false;
let zapperOverlay = null;

// Initialize
(function() {
  'use strict';
  
  // Load and apply zapped elements for this domain
  loadZappedElements();
  
  // Block cookie consent banners
  blockCookieBanners();
  
  // Block annoying overlays
  blockAnnoyingElements();
  
  // Initialize YouTube blocker if on YouTube
  if (window.location.hostname.includes('youtube.com')) {
    initYouTubeBlocker();
  }
  
  // Apply custom CSS
  injectCustomStyles();
})();

// Listen for messages from background/popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'activateZapper':
      activateElementZapper();
      break;
      
    case 'initYouTubeBlocker':
      initYouTubeBlocker();
      break;
  }
  
  return true;
});

// Load previously zapped elements
async function loadZappedElements() {
  try {
    const result = await chrome.storage.local.get(['zappedElements']);
    const zappedElements = result.zappedElements || {};
    const domain = window.location.hostname;
    
    if (zappedElements[domain]) {
      zappedElements[domain].forEach(selector => {
        hideElement(selector);
      });
    }
  } catch (error) {
    console.error('StarkBlock: Error loading zapped elements', error);
  }
}

// Element Zapper - Interactive element removal
function activateElementZapper() {
  if (zapperMode) return;
  
  zapperMode = true;
  document.body.style.cursor = 'crosshair';
  
  // Create overlay
  zapperOverlay = document.createElement('div');
  zapperOverlay.id = 'starkblock-zapper-overlay';
  zapperOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 217, 255, 0.1);
    z-index: 999999;
    pointer-events: none;
  `;
  document.body.appendChild(zapperOverlay);
  
  // Create instruction banner
  const banner = document.createElement('div');
  banner.id = 'starkblock-zapper-banner';
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #00D9FF, #0891b2);
    color: #0a0e27;
    padding: 15px 30px;
    border-radius: 10px;
    font-family: 'Segoe UI', sans-serif;
    font-weight: 700;
    font-size: 16px;
    z-index: 1000000;
    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.5);
    animation: slideDown 0.3s ease-out;
  `;
  banner.innerHTML = `
    ⚡ ELEMENT ZAPPER ACTIVE - Click to remove elements | ESC to exit
  `;
  document.body.appendChild(banner);
  
  // Highlight on hover
  const hoverHighlight = (e) => {
    if (e.target.id === 'starkblock-zapper-banner' || 
        e.target.id === 'starkblock-zapper-overlay') return;
    
    const element = e.target;
    element.style.outline = '3px solid #00D9FF';
    element.style.outlineOffset = '2px';
    element.style.boxShadow = '0 0 20px rgba(0, 217, 255, 0.5)';
  };
  
  const removeHighlight = (e) => {
    if (e.target.id === 'starkblock-zapper-banner' || 
        e.target.id === 'starkblock-zapper-overlay') return;
    
    const element = e.target;
    element.style.outline = '';
    element.style.outlineOffset = '';
    element.style.boxShadow = '';
  };
  
  // Zap on click
  const zapElement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.target.id === 'starkblock-zapper-banner' || 
        e.target.id === 'starkblock-zapper-overlay') return;
    
    const element = e.target;
    const selector = generateSelector(element);
    
    // Animate removal
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(0)';
    element.style.opacity = '0';
    
    setTimeout(() => {
      element.remove();
    }, 300);
    
    // Save to storage
    chrome.runtime.sendMessage({
      action: 'elementZapped',
      selector: selector
    });
    
    // Show notification
    showZapNotification('Element zapped! ⚡');
  };
  
  // Exit on ESC
  const exitZapper = (e) => {
    if (e.key === 'Escape') {
      deactivateZapper();
    }
  };
  
  // Add event listeners
  document.addEventListener('mouseover', hoverHighlight);
  document.addEventListener('mouseout', removeHighlight);
  document.addEventListener('click', zapElement, true);
  document.addEventListener('keydown', exitZapper);
  
  // Store cleanup function
  window.starkblockZapperCleanup = () => {
    document.removeEventListener('mouseover', hoverHighlight);
    document.removeEventListener('mouseout', removeHighlight);
    document.removeEventListener('click', zapElement, true);
    document.removeEventListener('keydown', exitZapper);
  };
}

// Deactivate zapper
function deactivateZapper() {
  zapperMode = false;
  document.body.style.cursor = '';
  
  if (zapperOverlay) {
    zapperOverlay.remove();
    zapperOverlay = null;
  }
  
  const banner = document.getElementById('starkblock-zapper-banner');
  if (banner) banner.remove();
  
  if (window.starkblockZapperCleanup) {
    window.starkblockZapperCleanup();
  }
}

// Generate CSS selector for element
function generateSelector(element) {
  if (element.id) return `#${element.id}`;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c).join('.');
    if (classes) return `${element.tagName.toLowerCase()}.${classes}`;
  }
  return element.tagName.toLowerCase();
}

// Hide element by selector
function hideElement(selector) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.display = 'none !important';
  });
}

// Block cookie consent banners
function blockCookieBanners() {
  const cookieBannerSelectors = [
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="consent"]',
    '[id*="consent"]',
    '[class*="gdpr"]',
    '[id*="gdpr"]',
    '.cc-window',
    '.cc-banner',
    '#onetrust-consent-sdk',
    '[class*="CookieConsent"]'
  ];
  
  const observer = new MutationObserver(() => {
    cookieBannerSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.textContent.toLowerCase().includes('cookie') || 
            el.textContent.toLowerCase().includes('consent')) {
          el.style.display = 'none';
        }
      });
    });
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial cleanup
  setTimeout(() => {
    cookieBannerSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      } catch (e) {}
    });
  }, 1000);
}

// Block annoying elements
function blockAnnoyingElements() {
  const annoyingSelectors = [
    '[class*="popup"]',
    '[class*="modal"][class*="newsletter"]',
    '[class*="subscribe-overlay"]',
    '[id*="popup"]',
    '[class*="notification-permission"]'
  ];
  
  setInterval(() => {
    annoyingSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (el.offsetHeight > 200 && el.style.position === 'fixed') {
            el.remove();
          }
        });
      } catch (e) {}
    });
  }, 2000);
}

// YouTube Ad Blocker
function initYouTubeBlocker() {
  // Skip ads on YouTube
  const skipAd = () => {
    // Click skip button
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
    if (skipButton) {
      skipButton.click();
    }
    
    // Hide ad overlay
    const adOverlay = document.querySelector('.ytp-ad-overlay-container');
    if (adOverlay) {
      adOverlay.style.display = 'none';
    }
    
    // Fast-forward through ad
    const video = document.querySelector('video');
    if (video && document.querySelector('.ad-showing')) {
      video.currentTime = video.duration;
    }
  };
  
  // Run frequently
  setInterval(skipAd, 500);
  
  // Remove ad containers
  const adContainers = [
    '#player-ads',
    '.ytp-ad-module',
    'ytd-companion-slot-renderer',
    '#masthead-ad'
  ];
  
  setInterval(() => {
    adContainers.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }, 1000);
}

// Inject custom styles
function injectCustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    
    /* Hide known ad containers */
    [class*="advertisement"],
    [id*="advertisement"],
    [class*="ad-container"],
    [id*="google_ads"],
    iframe[src*="doubleclick"],
    iframe[src*="googlesyndication"] {
      display: none !important;
      visibility: hidden !important;
    }
  `;
  document.head.appendChild(style);
}

// Show zap notification
function showZapNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #00D9FF, #0891b2);
    color: #0a0e27;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 14px;
    z-index: 1000001;
    animation: slideDown 0.3s ease-out;
    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.5);
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = 'all 0.3s ease';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => notification.remove(), 300);
  }, 2000);
}

console.log('StarkBlock: Protection active on this page');
