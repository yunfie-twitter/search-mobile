/**
 * Enhanced Tab Bar Interactions
 * iOS-native UX patterns: haptic feedback, double-tap, swipe gestures, long-press
 */

class EnhancedTabBar {
  constructor() {
    this.tabBar = document.querySelector('.tab-bar');
    this.tabs = document.querySelectorAll('.tab-bar-item');
    this.contentAreas = {};
    this.currentTab = null;
    this.lastTapTime = 0;
    this.lastTapTab = null;
    this.longPressTimer = null;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    this.isScrolledToTop = true;
    
    this.init();
  }

  init() {
    if (!this.tabBar || this.tabs.length === 0) return;

    // Store initial active tab
    this.currentTab = document.querySelector('.tab-bar-item.active');
    
    // Add ARIA attributes for accessibility
    this.setupAccessibility();
    
    // Setup event listeners
    this.setupTapHandlers();
    this.setupSwipeGestures();
    this.setupScrollDetection();
    this.setupKeyboardNavigation();
    
    // Initialize content areas
    this.initContentAreas();
  }

  setupAccessibility() {
    this.tabBar.setAttribute('role', 'navigation');
    this.tabBar.setAttribute('aria-label', '検索タイプナビゲーション');
    
    this.tabs.forEach((tab, index) => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', tab.classList.contains('active'));
      tab.setAttribute('tabindex', tab.classList.contains('active') ? '0' : '-1');
      tab.setAttribute('aria-label', tab.querySelector('.tab-bar-label')?.textContent || `タブ ${index + 1}`);
    });
  }

  setupTapHandlers() {
    this.tabs.forEach((tab) => {
      // Click handler with double-tap detection
      tab.addEventListener('click', (e) => this.handleTap(tab, e));
      
      // Long-press handler
      tab.addEventListener('touchstart', (e) => this.handleTouchStart(tab, e), { passive: true });
      tab.addEventListener('touchend', () => this.handleTouchEnd(), { passive: true });
      tab.addEventListener('touchcancel', () => this.handleTouchEnd(), { passive: true });
      tab.addEventListener('touchmove', () => this.cancelLongPress(), { passive: true });
      
      // Mouse long-press for desktop testing
      tab.addEventListener('mousedown', (e) => this.handleTouchStart(tab, e));
      tab.addEventListener('mouseup', () => this.handleTouchEnd());
      tab.addEventListener('mouseleave', () => this.cancelLongPress());
    });
  }

  handleTap(tab, event) {
    const now = Date.now();
    const isDoubleTap = (now - this.lastTapTime) < 300 && this.lastTapTab === tab;
    
    if (isDoubleTap && tab.classList.contains('active')) {
      // Double-tap on active tab: scroll to top
      this.scrollToTop();
      this.triggerHaptic('light');
      event.preventDefault();
      return;
    }
    
    if (!tab.classList.contains('active')) {
      // Switch tab
      this.switchTab(tab);
      this.triggerHaptic('light');
    }
    
    this.lastTapTime = now;
    this.lastTapTab = tab;
  }

  handleTouchStart(tab, event) {
    this.longPressTimer = setTimeout(() => {
      this.showContextMenu(tab, event);
      this.triggerHaptic('medium');
    }, 500); // iOS standard long-press duration
  }

  handleTouchEnd() {
    this.cancelLongPress();
  }

  cancelLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  showContextMenu(tab, event) {
    const tabType = tab.dataset.tab || 'all';
    const rect = tab.getBoundingClientRect();
    
    // Remove existing context menu
    document.querySelectorAll('.tab-context-menu').forEach(el => el.remove());
    
    const menu = document.createElement('div');
    menu.className = 'tab-context-menu';
    menu.innerHTML = `
      <button class="context-menu-item" data-action="refresh">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z"/>
          <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9H3.1z"/>
        </svg>
        <span>更新</span>
      </button>
      <button class="context-menu-item" data-action="copy">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
          <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
        </svg>
        <span>URLをコピー</span>
      </button>
    `;
    
    menu.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - rect.top + 8}px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
    `;
    
    document.body.appendChild(menu);
    
    // Add animation
    requestAnimationFrame(() => {
      menu.style.animation = 'scaleIn 0.2s ease-out';
    });
    
    // Handle menu actions
    menu.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        const action = item.dataset.action;
        if (action === 'refresh') {
          this.refreshTab(tabType);
        } else if (action === 'copy') {
          this.copyTabURL(tabType);
        }
        menu.remove();
      });
    });
    
    // Close on outside click
    setTimeout(() => {
      const closeHandler = (e) => {
        if (!menu.contains(e.target)) {
          menu.remove();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 100);
  }

  setupSwipeGestures() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    
    mainContent.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = false;
    }, { passive: true });
    
    mainContent.addEventListener('touchmove', (e) => {
      if (!isDragging) {
        const deltaX = Math.abs(e.touches[0].clientX - startX);
        const deltaY = Math.abs(e.touches[0].clientY - startY);
        
        // Only trigger if horizontal swipe is dominant
        if (deltaX > deltaY && deltaX > 50) {
          isDragging = true;
        }
      }
    }, { passive: true });
    
    mainContent.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - startX;
      
      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0) {
          this.swipeToPreviousTab();
        } else {
          this.swipeToNextTab();
        }
        this.triggerHaptic('light');
      }
      
      isDragging = false;
    }, { passive: true });
  }

  setupScrollDetection() {
    window.addEventListener('scroll', () => {
      this.isScrolledToTop = window.scrollY < 50;
    }, { passive: true });
  }

  setupKeyboardNavigation() {
    this.tabBar.addEventListener('keydown', (e) => {
      const currentIndex = Array.from(this.tabs).indexOf(document.activeElement);
      if (currentIndex === -1) return;
      
      let nextIndex = currentIndex;
      
      switch(e.key) {
        case 'ArrowLeft':
          nextIndex = Math.max(0, currentIndex - 1);
          break;
        case 'ArrowRight':
          nextIndex = Math.min(this.tabs.length - 1, currentIndex + 1);
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = this.tabs.length - 1;
          break;
        case 'Enter':
        case ' ':
          this.tabs[currentIndex].click();
          e.preventDefault();
          return;
        default:
          return;
      }
      
      if (nextIndex !== currentIndex) {
        this.tabs[nextIndex].focus();
        e.preventDefault();
      }
    });
  }

  switchTab(newTab) {
    const oldTab = this.currentTab;
    
    // Update tab states
    this.tabs.forEach(tab => {
      const isActive = tab === newTab;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive);
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    
    // Animate content transition
    const oldContent = this.contentAreas[oldTab?.dataset.tab];
    const newContent = this.contentAreas[newTab.dataset.tab];
    
    if (oldContent && newContent) {
      oldContent.classList.add('tab-content-leave-active');
      
      setTimeout(() => {
        oldContent.style.display = 'none';
        oldContent.classList.remove('tab-content-leave-active');
        
        newContent.style.display = 'block';
        newContent.classList.add('tab-content-enter-active');
        
        setTimeout(() => {
          newContent.classList.remove('tab-content-enter-active');
        }, 350);
      }, 350);
    }
    
    this.currentTab = newTab;
    
    // Update URL without page reload
    const tabType = newTab.dataset.tab || 'all';
    const url = new URL(window.location);
    url.searchParams.set('type', tabType);
    window.history.pushState({}, '', url);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('tabchange', {
      detail: { tab: tabType }
    }));
  }

  scrollToTop() {
    if (this.isScrolledToTop) return;
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  swipeToPreviousTab() {
    const currentIndex = Array.from(this.tabs).indexOf(this.currentTab);
    if (currentIndex > 0) {
      this.switchTab(this.tabs[currentIndex - 1]);
    }
  }

  swipeToNextTab() {
    const currentIndex = Array.from(this.tabs).indexOf(this.currentTab);
    if (currentIndex < this.tabs.length - 1) {
      this.switchTab(this.tabs[currentIndex + 1]);
    }
  }

  refreshTab(tabType) {
    // Trigger refresh event
    window.dispatchEvent(new CustomEvent('tabrefresh', {
      detail: { tab: tabType }
    }));
    
    // Show toast notification
    this.showToast('更新しました');
  }

  copyTabURL(tabType) {
    const url = new URL(window.location);
    url.searchParams.set('type', tabType);
    
    navigator.clipboard.writeText(url.toString()).then(() => {
      this.showToast('URLをコピーしました');
      this.triggerHaptic('light');
    });
  }

  initContentAreas() {
    // Map tab data-tab to content areas
    this.tabs.forEach(tab => {
      const tabType = tab.dataset.tab;
      const content = document.querySelector(`[data-content="${tabType}"]`);
      if (content) {
        this.contentAreas[tabType] = content;
      }
    });
  }

  triggerHaptic(intensity = 'light') {
    // Use Vibration API if available
    if ('vibrate' in navigator) {
      const patterns = {
        light: 10,
        medium: 20,
        heavy: 30
      };
      navigator.vibrate(patterns[intensity] || 10);
    }
    
    // Use Haptic Feedback API if available (iOS Safari)
    if (window.TapticEngine) {
      window.TapticEngine.impact({ style: intensity });
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'tab-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: calc(var(--tab-bar-height) + 24px);
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: toastSlideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideDown 0.3s ease-out forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

// Add toast animations to stylesheet dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes toastSlideDown {
    from {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
  }
  
  .tab-context-menu {
    background-color: var(--color-bg-elevated);
    border: 1px solid var(--color-border-primary);
    border-radius: 16px;
    padding: 8px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    min-width: 200px;
  }
  
  @media (prefers-color-scheme: dark) {
    .tab-context-menu {
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    }
  }
  
  .context-menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 15px;
    color: var(--color-text-primary);
    cursor: pointer;
    transition: background-color 0.15s;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
  }
  
  .context-menu-item:hover {
    background-color: var(--color-gray-6);
  }
  
  .context-menu-item:active {
    transform: scale(0.98);
  }
  
  .context-menu-item svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    color: var(--color-text-secondary);
  }
`;
document.head.appendChild(style);

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.enhancedTabBar = new EnhancedTabBar();
  });
} else {
  window.enhancedTabBar = new EnhancedTabBar();
}
