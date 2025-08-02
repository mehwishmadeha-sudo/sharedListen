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
        this.clearBtn = document.getElementById('clearBtn');
        
        // Initialize split editor
        this.editor = new SplitTextEditor(
            this.ownEditor, 
            this.remoteEditor, 
            this.remoteCursor, 
            this.remoteSelection
        );
        
        this.editor.setEnabled(false);
        this.setupCallbacks();
        this.setupControls();
        this.startApp();
    }

    setupControls() {
        this.increaseSizeBtn.addEventListener('click', () => {
            this.editor.increaseFontSize();
        });

        this.decreaseSizeBtn.addEventListener('click', () => {
            this.editor.decreaseFontSize();
        });

        this.fontToggleBtn.addEventListener('click', () => {
            this.editor.toggleFont();
        });

        this.darkModeBtn.addEventListener('click', () => {
            this.editor.toggleDarkMode();
        });

        this.clearBtn.addEventListener('click', () => {
            this.editor.clearOwnText();
        });
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