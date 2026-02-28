/**
 * Advanced Desktop Features - Phase 3
 * Multi-select, Search History, Tabs, Picture-in-Picture
 */

// Multi-cursor selection handler
class MultiSelect {
  constructor(app) {
    this.app = app;
    this.selectedItems = new Set();
    this.isSelecting = false;
    this.init();
  }

  init() {
    document.addEventListener('click', this.handleClick.bind(this), true);
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleClick(event) {
    const card = event.target.closest('.result-card');
    if (!card) return;

    // Check if Cmd/Ctrl is pressed
    const isMetaPressed = event.metaKey || event.ctrlKey;
    
    if (isMetaPressed) {
      event.preventDefault();
      event.stopPropagation();
      
      const index = Array.from(document.querySelectorAll('.result-card')).indexOf(card);
      
      if (this.selectedItems.has(index)) {
        this.selectedItems.delete(index);
        card.classList.remove('multi-selected');
      } else {
        this.selectedItems.add(index);
        card.classList.add('multi-selected');
      }
    }
  }

  handleKeyDown(event) {
    // Open all selected in new tabs with Cmd/Ctrl+Enter
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && this.selectedItems.size > 0) {
      event.preventDefault();
      this.openAllSelected();
    }

    // Clear selection with Escape
    if (event.key === 'Escape' && this.selectedItems.size > 0) {
      this.clearSelection();
    }
  }

  openAllSelected() {
    const cards = Array.from(document.querySelectorAll('.result-card'));
    this.selectedItems.forEach(index => {
      const result = this.app.results[index];
      if (result) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    });
    this.clearSelection();
  }

  clearSelection() {
    this.selectedItems.clear();
    document.querySelectorAll('.multi-selected').forEach(card => {
      card.classList.remove('multi-selected');
    });
  }

  getCount() {
    return this.selectedItems.size;
  }
}

// Search history manager
class SearchHistory {
  constructor(app) {
    this.app = app;
    this.maxItems = 20;
    this.storageKey = 'wholphin_search_history';
  }

  add(query) {
    if (!query || !query.trim()) return;
    
    let history = this.getAll();
    
    // Remove duplicates
    history = history.filter(item => item.query !== query);
    
    // Add to beginning
    history.unshift({
      query: query,
      timestamp: Date.now(),
      type: this.app.currentType
    });
    
    // Limit to maxItems
    history = history.slice(0, this.maxItems);
    
    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }

  getAll() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getRecent(limit = 10) {
    return this.getAll().slice(0, limit);
  }

  clear() {
    localStorage.removeItem(this.storageKey);
  }

  remove(query) {
    let history = this.getAll();
    history = history.filter(item => item.query !== query);
    localStorage.setItem(this.storageKey, JSON.stringify(history));
  }
}

// Tab manager for multi-tab search
class TabManager {
  constructor(app) {
    this.app = app;
    this.tabs = [];
    this.activeTabId = null;
    this.nextTabId = 1;
    this.init();
  }

  init() {
    // Create initial tab
    this.createTab('新規検索', true);
  }

  createTab(title = '新規検索', activate = false) {
    const tab = {
      id: this.nextTabId++,
      title: title || '新規検索',
      query: '',
      type: 'web',
      results: [],
      page: 1,
      scrollPosition: 0
    };
    
    this.tabs.push(tab);
    
    if (activate || this.tabs.length === 1) {
      this.switchTab(tab.id);
    }
    
    return tab;
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;
    
    // Save current tab state
    if (this.activeTabId) {
      const currentTab = this.tabs.find(t => t.id === this.activeTabId);
      if (currentTab) {
        currentTab.query = this.app.query;
        currentTab.type = this.app.currentType;
        currentTab.results = this.app.results;
        currentTab.page = this.app.currentPage;
        currentTab.scrollPosition = window.scrollY;
      }
    }
    
    // Load tab state
    this.activeTabId = tab.id;
    this.app.query = tab.query;
    this.app.currentType = tab.type;
    this.app.results = tab.results;
    this.app.currentPage = tab.page;
    this.app.searchPerformed = tab.results.length > 0;
    
    // Restore scroll position
    setTimeout(() => {
      window.scrollTo(0, tab.scrollPosition);
    }, 100);
    
    // Update tab title if query exists
    if (tab.query) {
      tab.title = tab.query.length > 20 ? tab.query.substring(0, 20) + '...' : tab.query;
    }
  }

  closeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1 || this.tabs.length === 1) return; // Keep at least one tab
    
    this.tabs.splice(index, 1);
    
    // If closing active tab, switch to adjacent tab
    if (this.activeTabId === tabId) {
      const newIndex = Math.max(0, index - 1);
      this.switchTab(this.tabs[newIndex].id);
    }
  }

  getTabs() {
    return this.tabs;
  }

  getActiveTab() {
    return this.tabs.find(t => t.id === this.activeTabId);
  }
}

// Picture-in-Picture handler for videos
class PictureInPicture {
  constructor() {
    this.currentVideo = null;
    this.pipWindow = null;
  }

  async requestPiP(videoUrl, title) {
    // Check if PiP is supported
    if (!document.pictureInPictureEnabled && !('documentPictureInPicture' in window)) {
      console.warn('Picture-in-Picture not supported');
      return false;
    }

    try {
      // For video elements
      const video = document.querySelector('video');
      if (video && video.readyState >= 2) {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        }
        await video.requestPictureInPicture();
        this.currentVideo = video;
        return true;
      }

      // Fallback: Open video in small window
      this.openPiPWindow(videoUrl, title);
      return true;
    } catch (error) {
      console.error('PiP error:', error);
      return false;
    }
  }

  openPiPWindow(url, title) {
    const width = 480;
    const height = 320;
    const left = window.screen.width - width - 20;
    const top = window.screen.height - height - 80;
    
    const features = `width=${width},height=${height},left=${left},top=${top},` +
                    'resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no';
    
    this.pipWindow = window.open(url, 'pip_' + Date.now(), features);
    
    if (this.pipWindow) {
      this.pipWindow.document.title = title || 'Video Player';
    }
  }

  async exitPiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      if (this.pipWindow && !this.pipWindow.closed) {
        this.pipWindow.close();
      }
      this.currentVideo = null;
      this.pipWindow = null;
    } catch (error) {
      console.error('Exit PiP error:', error);
    }
  }

  isActive() {
    return !!document.pictureInPictureElement || 
           (this.pipWindow && !this.pipWindow.closed);
  }
}

// Smooth scroll enhancements
class SmoothScroll {
  constructor() {
    this.isScrolling = false;
    this.scrollTarget = 0;
    this.currentScroll = 0;
    this.init();
  }

  init() {
    // Add momentum scrolling CSS
    document.body.style.webkitOverflowScrolling = 'touch';
    
    // Handle wheel events for smooth scrolling
    document.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
    
    // Handle pinch zoom
    document.addEventListener('gesturestart', this.handleGesture.bind(this));
    document.addEventListener('gesturechange', this.handleGesture.bind(this));
    document.addEventListener('gestureend', this.handleGesture.bind(this));
  }

  handleWheel(event) {
    // Allow native smooth scrolling for trackpads
    if (Math.abs(event.deltaY) < 50) {
      return; // Likely trackpad, let browser handle
    }
    
    // For mouse wheel, use custom smooth scroll
    event.preventDefault();
    
    const delta = event.deltaY;
    this.scrollTarget = Math.max(0, this.scrollTarget + delta);
    
    if (!this.isScrolling) {
      this.startSmoothing();
    }
  }

  startSmoothing() {
    this.isScrolling = true;
    this.currentScroll = window.scrollY;
    this.animateScroll();
  }

  animateScroll() {
    const diff = this.scrollTarget - this.currentScroll;
    
    if (Math.abs(diff) < 1) {
      this.isScrolling = false;
      return;
    }
    
    this.currentScroll += diff * 0.1; // Easing factor
    window.scrollTo(0, this.currentScroll);
    
    requestAnimationFrame(() => this.animateScroll());
  }

  handleGesture(event) {
    event.preventDefault();
    
    if (event.type === 'gesturechange') {
      const scale = event.scale;
      document.body.style.zoom = scale;
    } else if (event.type === 'gestureend') {
      // Reset or commit zoom
      const scale = parseFloat(document.body.style.zoom) || 1;
      if (scale < 0.8) {
        document.body.style.zoom = 0.8;
      } else if (scale > 1.5) {
        document.body.style.zoom = 1.5;
      }
    }
  }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiSelect, SearchHistory, TabManager, PictureInPicture, SmoothScroll };
}
