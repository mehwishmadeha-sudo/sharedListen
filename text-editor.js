// Simple Text Editor Handler
class SplitTextEditor {
    constructor(ownTextarea, remoteEditor, remoteCursor, remoteSelection) {
        this.ownTextarea = ownTextarea;
        this.remoteEditor = remoteEditor;
        this.remoteCursor = remoteCursor;
        this.remoteSelection = remoteSelection;
        
        this.lastContent = '';
        this.isUpdating = false;
        this.onChangeCallback = null;
        this.onCursorMoveCallback = null;
        this.onSelectionChangeCallback = null;
        this.onFontSizeChangeCallback = null;
        
        this.currentFontSize = 16;
        this.isNotoFont = false; // false = monospace, true = noto
        this.isDarkMode = false; // false = light, true = dark
        
        this.setupEventListeners();
    }

    onChange(callback) {
        this.onChangeCallback = callback;
    }

    onCursorMove(callback) {
        this.onCursorMoveCallback = callback;
    }

    onSelectionChange(callback) {
        this.onSelectionChangeCallback = callback;
    }

    onFontSizeChange(callback) {
        this.onFontSizeChangeCallback = callback;
    }

    onFontChange(callback) {
        this.onFontChangeCallback = callback;
    }

    onDarkModeChange(callback) {
        this.onDarkModeChangeCallback = callback;
    }

    setupEventListeners() {
        // Handle text input in own area
        this.ownTextarea.addEventListener('input', () => {
            if (!this.isUpdating) {
                this.handleChange();
            }
        });

        // Handle cursor and selection changes in own area
        this.ownTextarea.addEventListener('selectionchange', () => {
                if (!this.isUpdating) {
                this.handleCursorChange();
            }
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === this.ownTextarea && !this.isUpdating) {
                this.handleCursorChange();
            }
        });

        this.ownTextarea.addEventListener('click', () => {
            if (!this.isUpdating) {
                this.handleCursorChange();
            }
        });

        this.ownTextarea.addEventListener('keyup', (e) => {
            if (!this.isUpdating && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                this.handleCursorChange();
            }
        });
    }

    handleChange() {
        const content = this.ownTextarea.value;
        if (content !== this.lastContent && this.onChangeCallback) {
            this.onChangeCallback({
                type: 'contentUpdate',
                content: content
            });
            this.lastContent = content;
        }
    }

    handleCursorChange() {
        const start = this.ownTextarea.selectionStart;
        const end = this.ownTextarea.selectionEnd;
        
        if (this.onCursorMoveCallback) {
            this.onCursorMoveCallback({
                type: 'cursorUpdate',
                cursorPosition: start,
                selectionStart: start,
                selectionEnd: end,
                hasSelection: start !== end
            });
        }
    }

    // Apply remote changes to the upper area
    applyRemoteChange(change) {
        this.isUpdating = true;
        
        if (change.type === 'contentUpdate') {
            this.remoteEditor.textContent = change.content;
            // Auto-scroll to bottom to show the latest content
            this.scrollToBottom();
        } else if (change.type === 'cursorUpdate') {
            this.updateRemoteCursor(change);
        } else if (change.type === 'fontSizeUpdate') {
            this.applyRemoteFontSize(change.fontSize);
        } else if (change.type === 'fontUpdate') {
            this.applyRemoteFont(change.isNotoFont);
        } else if (change.type === 'darkModeUpdate') {
            this.applyRemoteDarkMode(change.isDarkMode);
        }
        
        setTimeout(() => {
            this.isUpdating = false;
        }, 10);
    }

    // Auto-scroll the remote editor to the bottom
    scrollToBottom() {
        // Use requestAnimationFrame to ensure the content is rendered before scrolling
        requestAnimationFrame(() => {
            this.remoteEditor.scrollTop = this.remoteEditor.scrollHeight;
        });
    }

    updateRemoteCursor(cursorData) {
        // Hide cursor initially
        this.remoteCursor.classList.remove('visible');
        this.remoteSelection.style.display = 'none';
        
        if (!cursorData || !this.remoteEditor.textContent) return;
        
        // Get text content and calculate position
        const text = this.remoteEditor.textContent;
        const cursorPos = Math.min(cursorData.cursorPosition || 0, text.length);
        
        if (cursorData.hasSelection && cursorData.selectionStart !== cursorData.selectionEnd) {
            this.showRemoteSelection(cursorData.selectionStart, cursorData.selectionEnd);
        } else {
            this.showRemoteCursor(cursorPos);
        }
    }

    showRemoteCursor(position) {
        const coords = this.getTextPosition(position);
        if (coords) {
            this.remoteCursor.style.left = coords.x + 'px';
            this.remoteCursor.style.top = coords.y + 'px';
            this.remoteCursor.classList.add('visible');
        }
    }

    showRemoteSelection(start, end) {
        const startCoords = this.getTextPosition(start);
        const endCoords = this.getTextPosition(end);
        
        if (startCoords && endCoords) {
            this.remoteSelection.style.left = Math.min(startCoords.x, endCoords.x) + 'px';
            this.remoteSelection.style.top = Math.min(startCoords.y, endCoords.y) + 'px';
            this.remoteSelection.style.width = Math.abs(endCoords.x - startCoords.x) + 'px';
            this.remoteSelection.style.height = Math.abs(endCoords.y - startCoords.y) + 20 + 'px';
            this.remoteSelection.style.display = 'block';
        }
    }

    getTextPosition(charIndex) {
        const text = this.remoteEditor.textContent;
        if (charIndex > text.length) return null;
        
        // Create a range at the character position
        const range = document.createRange();
        const textNode = this.getTextNodeAtIndex(charIndex);
        
        if (!textNode) return null;
        
        range.setStart(textNode.node, textNode.offset);
        range.setEnd(textNode.node, textNode.offset);
        
        const rect = range.getBoundingClientRect();
        const editorRect = this.remoteEditor.getBoundingClientRect();
        
        return {
            x: rect.left - editorRect.left + this.remoteEditor.scrollLeft,
            y: rect.top - editorRect.top + this.remoteEditor.scrollTop
        };
    }

    getTextNodeAtIndex(index) {
        let currentIndex = 0;
        const walker = document.createTreeWalker(
            this.remoteEditor,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walker.nextNode()) {
            const nodeLength = node.textContent.length;
            if (currentIndex + nodeLength >= index) {
                return {
                    node: node,
                    offset: index - currentIndex
                };
            }
            currentIndex += nodeLength;
        }
        
        return null;
    }

    // Font size controls
    increaseFontSize() {
        this.currentFontSize = Math.min(this.currentFontSize + 2, 24);
        this.updateFontSize();
        this.broadcastFontSizeChange();
    }

    decreaseFontSize() {
        this.currentFontSize = Math.max(this.currentFontSize - 2, 10);
        this.updateFontSize();
        this.broadcastFontSizeChange();
    }

    updateFontSize() {
        this.ownTextarea.style.fontSize = this.currentFontSize + 'px';
        this.remoteCursor.style.height = (this.currentFontSize + 4) + 'px';
    }

    applyRemoteFontSize(fontSize) {
        this.remoteEditor.style.fontSize = fontSize + 'px';
    }

    broadcastFontSizeChange() {
        if (this.onFontSizeChangeCallback) {
            this.onFontSizeChangeCallback({
                type: 'fontSizeUpdate',
                fontSize: this.currentFontSize
            });
        }
    }

    // Font family controls
    toggleFont() {
        this.isNotoFont = !this.isNotoFont;
        this.updateFont();
        this.broadcastFontChange();
    }

    updateFont() {
        if (this.isNotoFont) {
            this.ownTextarea.classList.remove('monospace-font');
            this.ownTextarea.classList.add('noto-font');
        } else {
            this.ownTextarea.classList.remove('noto-font');
            this.ownTextarea.classList.add('monospace-font');
        }
    }

    applyRemoteFont(isNotoFont) {
        if (isNotoFont) {
            this.remoteEditor.classList.remove('monospace-font');
            this.remoteEditor.classList.add('noto-font');
        } else {
            this.remoteEditor.classList.remove('noto-font');
            this.remoteEditor.classList.add('monospace-font');
        }
    }

    broadcastFontChange() {
        if (this.onFontChangeCallback) {
            this.onFontChangeCallback({
                type: 'fontUpdate',
                isNotoFont: this.isNotoFont
            });
        }
    }

    // Dark mode controls
    toggleDarkMode() {
        this.isDarkMode = !this.isDarkMode;
        this.updateDarkMode();
        this.broadcastDarkModeChange();
    }

    updateDarkMode() {
        if (this.isDarkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        this.updateDarkModeIcon();
    }

    updateDarkModeIcon() {
        const darkModeBtn = document.getElementById('darkModeBtn');
        const icon = darkModeBtn.querySelector('i');
        if (this.isDarkMode) {
            icon.className = 'fa fa-sun-o';
        } else {
            icon.className = 'fa fa-moon-o';
        }
    }

    applyRemoteDarkMode(isDarkMode) {
        this.isDarkMode = isDarkMode;
        this.updateDarkMode();
    }

    broadcastDarkModeChange() {
        if (this.onDarkModeChangeCallback) {
            this.onDarkModeChangeCallback({
                type: 'darkModeUpdate',
                isDarkMode: this.isDarkMode
            });
        }
    }

    // Clear own text
    clearOwnText() {
        this.ownTextarea.value = '';
        this.handleChange();
        this.ownTextarea.focus();
    }

    setEnabled(enabled) {
        this.ownTextarea.disabled = !enabled;
    }

    focus() {
        this.ownTextarea.focus();
    }
} 