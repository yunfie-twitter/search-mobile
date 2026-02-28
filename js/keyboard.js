/**
 * Keyboard Navigation - macOS Spotlight inspired
 * Handles all keyboard shortcuts and navigation
 */

class KeyboardNavigation {
  constructor(app) {
    this.app = app;
    this.suggestionIndex = -1;
    this.resultIndex = -1;
    this.isMetaKey = navigator.platform.includes('Mac') ? 'metaKey' : 'ctrlKey';
    this.init();
  }

  init() {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  handleKeyDown(event) {
    // ⌘K or Ctrl+K - Focus search
    if (event[this.isMetaKey] && event.key === 'k') {
      event.preventDefault();
      this.focusSearch();
      return;
    }

    // Escape - Unfocus search or close modals
    if (event.key === 'Escape') {
      this.handleEscape();
      return;
    }

    // Number keys with modifier - Switch tabs
    if (event[this.isMetaKey] && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      this.switchTab(parseInt(event.key) - 1);
      return;
    }

    // Arrow navigation in suggestions
    if (this.app.showSuggestions && ['ArrowDown', 'ArrowUp', 'Tab'].includes(event.key)) {
      this.navigateSuggestions(event);
      return;
    }

    // J/K or Arrow keys - Navigate results
    if (this.app.results.length > 0 && !this.app.isSearchFocused) {
      if (['j', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        this.navigateResults('down');
        return;
      }
      if (['k', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        this.navigateResults('up');
        return;
      }
    }

    // Enter - Open selected result
    if (event.key === 'Enter' && this.resultIndex >= 0) {
      event.preventDefault();
      this.openResult(event[this.isMetaKey]);
      return;
    }

    // Space - Quick Look
    if (event.key === ' ' && this.resultIndex >= 0 && !this.app.isSearchFocused) {
      event.preventDefault();
      this.showQuickLook();
      return;
    }
  }

  focusSearch() {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  handleEscape() {
    // Close Quick Look if open
    if (this.app.showQuickLook) {
      this.app.showQuickLook = false;
      return;
    }

    // Close context menu if open
    if (this.app.showContextMenu) {
      this.app.showContextMenu = false;
      return;
    }

    // Close settings if open
    if (this.app.showSettings) {
      this.app.showSettings = false;
      return;
    }

    // Blur search input
    const searchInput = document.querySelector('.search-input');
    if (searchInput && document.activeElement === searchInput) {
      searchInput.blur();
    }
  }

  switchTab(index) {
    const types = ['web', 'image', 'video', 'news'];
    if (index >= 0 && index < types.length) {
      this.app.changeSearchType(types[index]);
    }
  }

  navigateSuggestions(event) {
    event.preventDefault();
    const suggestions = this.app.suggestions;
    const maxIndex = suggestions.length - 1;

    if (event.key === 'ArrowDown' || event.key === 'Tab') {
      this.suggestionIndex = Math.min(this.suggestionIndex + 1, maxIndex);
    } else if (event.key === 'ArrowUp') {
      this.suggestionIndex = Math.max(this.suggestionIndex - 1, -1);
    }

    // Update UI to show focus
    this.updateSuggestionFocus();

    // If Enter is pressed on a suggestion
    if (event.key === 'Enter' && this.suggestionIndex >= 0) {
      this.app.selectSuggestion(suggestions[this.suggestionIndex]);
      this.suggestionIndex = -1;
    }
  }

  updateSuggestionFocus() {
    const items = document.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      if (index === this.suggestionIndex) {
        item.classList.add('keyboard-focus');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('keyboard-focus');
      }
    });
  }

  navigateResults(direction) {
    const maxIndex = this.app.results.length - 1;

    if (direction === 'down') {
      this.resultIndex = Math.min(this.resultIndex + 1, maxIndex);
    } else {
      this.resultIndex = Math.max(this.resultIndex - 1, 0);
    }

    this.updateResultFocus();
  }

  updateResultFocus() {
    const cards = document.querySelectorAll('.result-card');
    cards.forEach((card, index) => {
      if (index === this.resultIndex) {
        card.classList.add('keyboard-focus');
        card.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } else {
        card.classList.remove('keyboard-focus');
      }
    });
  }

  openResult(newTab = false) {
    if (this.resultIndex < 0 || this.resultIndex >= this.app.results.length) {
      return;
    }

    const result = this.app.results[this.resultIndex];
    if (newTab) {
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = result.url;
    }
  }

  showQuickLook() {
    if (this.resultIndex < 0 || this.resultIndex >= this.app.results.length) {
      return;
    }

    const result = this.app.results[this.resultIndex];
    this.app.showQuickLook = true;
    this.app.quickLookData = result;
  }

  reset() {
    this.suggestionIndex = -1;
    this.resultIndex = -1;
    
    // Remove all focus classes
    document.querySelectorAll('.keyboard-focus').forEach(el => {
      el.classList.remove('keyboard-focus');
    });
  }
}

// Export for use in main app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardNavigation;
}
