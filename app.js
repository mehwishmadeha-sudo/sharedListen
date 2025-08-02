// Simple Shared Text Application
class SplitTextApp {
    constructor() {
        this.webrtc = new WebRTCHandler();
        this.firebase = new FirebasePairing();
        
        // Get elements
        this.ownEditor = document.getElementById('ownEditor');
        this.remoteEditor = document.getElementById('remoteEditor');
        this.remoteCursor = document.getElementById('remoteCursor');
        this.remoteSelection = document.getElementById('remoteSelection');
        this.connectionBar = document.getElementById('connectionBar');
        
        // Control buttons
        this.increaseSizeBtn = document.getElementById('increaseSizeBtn');
        this.decreaseSizeBtn = document.getElementById('decreaseSizeBtn');
        this.fontToggleBtn = document.getElementById('fontToggleBtn');
        this.darkModeBtn = document.getElementById('darkModeBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.controlsToggle = document.getElementById('controlsToggle');
        this.floatingToggle = document.getElementById('floatingToggle');
        this.controlsContainer = document.getElementById('controlsContainer');
        
        // Initialize split editor
        this.editor = new SplitTextEditor(
            this.ownEditor, 
            this.remoteEditor, 
            this.remoteCursor, 
            this.remoteSelection
        );
        
        this.controlsVisible = true;
        this.editor.setEnabled(false);
        this.setupCallbacks();
        this.setupControls();
        this.startApp();
    }

    setupControls() {
        // Prevent keyboard hiding by preventing default and refocusing
        const preventKeyboardHide = (callback) => {
            return (e) => {
                e.preventDefault();
                const activeElement = document.activeElement;
                callback();
                // Refocus the text area after a short delay to prevent keyboard hiding
                setTimeout(() => {
                    if (activeElement && activeElement.tagName === 'TEXTAREA') {
                        activeElement.focus();
                    }
                }, 10);
            };
        };

        this.increaseSizeBtn.addEventListener('click', preventKeyboardHide(() => {
            this.editor.increaseFontSize();
        }));

        this.decreaseSizeBtn.addEventListener('click', preventKeyboardHide(() => {
            this.editor.decreaseFontSize();
        }));

        this.fontToggleBtn.addEventListener('click', preventKeyboardHide(() => {
            this.editor.toggleFont();
        }));

        this.darkModeBtn.addEventListener('click', preventKeyboardHide(() => {
            this.editor.toggleDarkMode();
        }));

        this.refreshBtn.addEventListener('click', preventKeyboardHide(() => {
            this.refreshPage();
        }));

        this.clearBtn.addEventListener('click', preventKeyboardHide(() => {
            this.editor.clearOwnText();
        }));

        // Controls toggle functionality
        this.controlsToggle.addEventListener('click', preventKeyboardHide(() => {
            this.toggleControls();
        }));
        
        this.floatingToggle.addEventListener('click', preventKeyboardHide(() => {
            this.toggleControls();
        }));
    }

    toggleControls() {
        this.controlsVisible = !this.controlsVisible;
        
        if (this.controlsVisible) {
            this.controlsContainer.classList.remove('hidden');
            this.floatingToggle.classList.remove('visible');
        } else {
            this.controlsContainer.classList.add('hidden');
            this.floatingToggle.classList.add('visible');
        }
    }

    refreshPage() {
        // Close connections before refresh
        if (this.webrtc) {
            this.webrtc.close();
        }
        if (this.firebase) {
            this.firebase.cleanup();
        }
        
        // Reload the page
        window.location.reload();
    }

    setupCallbacks() {
        this.webrtc.onStatusChange((connected) => {
            this.editor.setEnabled(connected);
            this.updateConnectionStatus(connected);
            if (connected) {
                this.editor.focus();
            }
        });

        this.webrtc.onMessage((data) => {
            this.editor.applyRemoteChange(data);
        });

        this.webrtc.onIceCandidate((candidate) => {
            this.firebase.addIceCandidate(candidate);
        });

        this.webrtc.onConnected(() => {
            this.firebase.cleanup();
        });

        this.firebase.onConnection(async (action, data) => {
            if (action === 'createOffer') {
                this.webrtc.initialize();
                return await this.webrtc.createOffer();
            }
            
            if (action === 'receiveOffer') {
                this.webrtc.initialize();
                return await this.webrtc.receiveOffer(data);
            }
            
            if (action === 'receiveAnswer') {
                return await this.webrtc.receiveAnswer(data);
            }
        });

        this.firebase.listenForCandidates((candidate) => {
            this.webrtc.addIceCandidate(candidate);
        });

        // Handle text and cursor changes
        this.editor.onChange((change) => {
            if (this.webrtc.isChannelOpen()) {
                this.webrtc.sendMessage(change);
            }
        });

        this.editor.onCursorMove((cursorData) => {
            if (this.webrtc.isChannelOpen()) {
                this.webrtc.sendMessage(cursorData);
            }
        });

        // Handle font size changes
        this.editor.onFontSizeChange((fontSizeData) => {
            if (this.webrtc.isChannelOpen()) {
                this.webrtc.sendMessage(fontSizeData);
            }
        });

        // Handle font family changes
        this.editor.onFontChange((fontData) => {
            if (this.webrtc.isChannelOpen()) {
                this.webrtc.sendMessage(fontData);
            }
        });

        // Handle dark mode changes
        this.editor.onDarkModeChange((darkModeData) => {
            if (this.webrtc.isChannelOpen()) {
                this.webrtc.sendMessage(darkModeData);
            }
        });
    }

    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionBar.classList.add('hidden');
        } else {
            this.connectionBar.classList.remove('hidden');
        }
    }

    async startApp() {
        try {
            await this.firebase.startPairing();
        } catch (error) {
            console.error('Failed to start app:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SplitTextApp();
});

window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.webrtc.close();
        window.app.firebase.cleanup();
    }
}); 
