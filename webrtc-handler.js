// WebRTC Connection Handler
class WebRTCHandler {
    constructor() {
        this.peerConnection = null;
        this.dataChannel = null;
        this.onMessageCallback = null;
        this.onStatusCallback = null;
        this.isConnected = false;
        
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        };
    }

    // Set callback for incoming messages
    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    // Set callback for status changes
    onStatusChange(callback) {
        this.onStatusCallback = callback;
    }

    // Initialize WebRTC connection
    initialize() {
        this.peerConnection = new RTCPeerConnection(this.config);
        this.setupPeerConnection();
        return this.peerConnection;
    }

    // Setup peer connection event handlers
    setupPeerConnection() {
        // Create data channel for the offerer
        this.dataChannel = this.peerConnection.createDataChannel('textEditor');
        this.setupDataChannel(this.dataChannel);

        // Handle incoming data channels (for the answerer)
        this.peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel);
        };

        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && this.onIceCandidateCallback) {
                this.onIceCandidateCallback(event.candidate);
            }
        };

        // Connection state monitoring
        this.peerConnection.onconnectionstatechange = () => {
            if (this.peerConnection.connectionState === 'failed') {
                this.updateStatus(false, 'Connection failed');
            }
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            // console.log('ICE connection state:', this.peerConnection.iceConnectionState);
        };
    }

    // Setup data channel event handlers
    setupDataChannel(channel) {
        channel.onopen = () => {
            this.isConnected = true;
            this.dataChannel = channel;
            this.updateStatus(true, 'Connected');
            
            // Trigger cleanup after successful connection
            if (this.onConnectedCallback) {
                setTimeout(() => {
                    this.onConnectedCallback();
                }, 2000);
            }
        };

        channel.onclose = () => {
            this.isConnected = false;
            this.updateStatus(false, 'Disconnected');
        };

        channel.onmessage = (event) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(JSON.parse(event.data));
            }
        };
    }

    // Create offer (first person)
    async createOffer() {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    // Receive offer and create answer (second person)
    async receiveOffer(offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    // Receive answer (first person)
    async receiveAnswer(answer) {
        if (this.peerConnection.signalingState === 'have-local-offer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    // Add ICE candidate
    async addIceCandidate(candidate) {
        try {
            if (candidate.candidate) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (error) {
            // Ignore ICE candidate errors
        }
    }

    // Send message through data channel
    sendMessage(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    // Update connection status
    updateStatus(connected, message) {
        this.isConnected = connected;
        if (this.onStatusCallback) {
            this.onStatusCallback(connected, message);
        }
    }

    // Set ICE candidate callback
    onIceCandidate(callback) {
        this.onIceCandidateCallback = callback;
    }

    // Set connected callback for cleanup
    onConnected(callback) {
        this.onConnectedCallback = callback;
    }

    // Check if connected
    isChannelOpen() {
        return this.dataChannel && this.dataChannel.readyState === 'open';
    }

    // Close connection
    close() {
        if (this.dataChannel) {
            this.dataChannel.close();
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        this.isConnected = false;
        this.updateStatus(false, 'Disconnected');
    }
} 