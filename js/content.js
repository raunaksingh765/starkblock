// StarkBlock Content Script

// Element Zapper state
let zapperActive = false;
let zapperOverlay = null;
let zapperHighlight = null;

// Initialize content script
(function() {
  'use strict';
  
  console.log('StarkBlock content script loaded');
  
  // Remove cookie banners
  removeCookieBanners();
  
  // Block ads in page
  blockAdsInPage();
  
  // YouTube ad blocking
  if (window.location.hostname.includes('youtube.com')) {
    blockYouTubeAds();
  }
})();

// Remove cookie consent banners
function removeCookieBanners() {
  const cookieSelectors = [
    '[class*="cookie"]',
    '[id*="cookie"]',
    '[class*="gdpr"]',
    '[id*="gdpr"]',
    '[class*="consent"]',
    '[id*="consent"]',
    '[aria-label*="cookie"]',
    '[aria-label*="consent"]'
  ];
  
  setTimeout(() => {
    cookieSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (el.offsetHeight > 50 && el.offsetWidth > 200) {
          el.style.display = 'none';
          sendBlockNotification('Cookie', el.className || 'banner');
        }
      });
    });
  }, 1000);
}

// Block ads in page content
function blockAdsInPage() {
  const adSelectors = [
    '[class*="advertisement"]',
    '[id*="advertisement"]',
    '[class*="ad-container"]',
    '[id*="ad-container"]',
    '[class*="google-ad"]',
    '[id*="google-ad"]',
    'iframe[src*="doubleclick"]',
    'iframe[src*="googlesyndication"]',
    'iframe[src*="ads"]'
  ];
  
  const observer = new MutationObserver(() => {
    adSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!el.dataset.starkblocked) {
          el.style.display = 'none';
          el.dataset.starkblocked = 'true';
          sendBlockNotification('Ad', el.className || 'inline');
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// YouTube-specific ad blocking
function blockYouTubeAds() {
  console.log('StarkBlock: YouTube ad blocking active');
  
  // Skip ads when they appear
  setInterval(() => {
    // Skip button
    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button');
    if (skipButton) {
      skipButton.click();
      console.log('StarkBlock: Skipped YouTube ad');
    }
    
    // Hide ad overlay
    const adOverlay = document.querySelector('.ytp-ad-player-overlay');
    if (adOverlay) {
      adOverlay.style.display = 'none';
    }
    
    // Mute during ads
    const video = document.querySelector('video');
    const adIndicator = document.querySelector('.ytp-ad-text');
    if (video && adIndicator) {
      video.muted = true;
      video.currentTime = video.duration; // Try to skip to end
    }
  }, 500);
}

// Send block notification to background
function sendBlockNotification(type, domain) {
  chrome.runtime.sendMessage({
    action: 'blockDetected',
    data: { type, domain }
  }).catch(() => {
    // Ignore if background script not available
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startZapper') {
    startElementZapper();
    sendResponse({ success: true });
  }
  return true;
});

// Element Zapper functionality
function startElementZapper() {
  if (zapperActive) return;
  
  zapperActive = true;
  createZapperUI();
  
  // Add event listeners
  document.addEventListener('mousemove', zapperMouseMove);
  document.addEventListener('click', zapperClick);
  document.addEventListener('keydown', zapperKeyDown);
}

function createZapperUI() {
  // Create overlay
  zapperOverlay = document.createElement('div');
  zapperOverlay.id = 'starkblock-zapper-overlay';
  zapperOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 999998;
    cursor: crosshair;
  `;
  
  // Create highlight
  zapperHighlight = document.createElement('div');
  zapperHighlight.id = 'starkblock-zapper-highlight';
  zapperHighlight.style.cssText = `
    position: absolute;
    border: 3px solid #00D9FF;
    background: rgba(0, 217, 255, 0.1);
    pointer-events: none;
    z-index: 999999;
    box-shadow: 0 0 20px rgba(0, 217, 255, 0.5);
    transition: all 0.1s ease;
  `;
  
  // Create instructions
  const instructions = document.createElement('div');
  instructions.id = 'starkblock-zapper-instructions';
  instructions.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 217, 255, 0.95);
    color: #0a0e27;
    padding: 15px 30px;
    border-radius: 8px;
    font-family: 'Arial', sans-serif;
    font-weight: bold;
    font-size: 16px;
    z-index: 1000000;
    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.5);
  `;
  instructions.textContent = '⚡ Element Zapper Active - Click to remove element | Press ESC to exit';
  
  document.body.appendChild(zapperOverlay);
  document.body.appendChild(zapperHighlight);
  document.body.appendChild(instructions);
}

function zapperMouseMove(e) {
  if (!zapperActive) return;
  
  // Get element under cursor
  const element = document.elementFromPoint(e.clientX, e.clientY);
  
  if (element && element.id !== 'starkblock-zapper-highlight' && 
      element.id !== 'starkblock-zapper-overlay' &&
      element.id !== 'starkblock-zapper-instructions') {
    
    const rect = element.getBoundingClientRect();
    zapperHighlight.style.left = rect.left + window.scrollX + 'px';
    zapperHighlight.style.top = rect.top + window.scrollY + 'px';
    zapperHighlight.style.width = rect.width + 'px';
    zapperHighlight.style.height = rect.height + 'px';
    zapperHighlight.style.display = 'block';
  }
}

function zapperClick(e) {
  if (!zapperActive) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Get element under cursor
  const element = document.elementFromPoint(e.clientX, e.clientY);
  
  if (element && element.id !== 'starkblock-zapper-highlight' && 
      element.id !== 'starkblock-zapper-overlay' &&
      element.id !== 'starkblock-zapper-instructions') {
    
    // Remove the element
    element.style.display = 'none';
    element.remove();
    
    // Show success notification
    showZapperNotification('⚡ Element Zapped!');
    
    // Send notification
    sendBlockNotification('Element', element.tagName);
  }
}

function zapperKeyDown(e) {
  if (e.key === 'Escape') {
    stopElementZapper();
  }
}

function stopElementZapper() {
  if (!zapperActive) return;
  
  zapperActive = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', zapperMouseMove);
  document.removeEventListener('click', zapperClick);
  document.removeEventListener('keydown', zapperKeyDown);
  
  // Remove UI elements
  if (zapperOverlay) zapperOverlay.remove();
  if (zapperHighlight) zapperHighlight.remove();
  document.getElementById('starkblock-zapper-instructions')?.remove();
}

function showZapperNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 217, 255, 0.95);
    color: #0a0e27;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000001;
    box-shadow: 0 4px 20px rgba(0, 217, 255, 0.5);
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 1500);
}
