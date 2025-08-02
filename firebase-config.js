const firebaseConfig = {
    apiKey: "AIzaSyAm7Vh4d7YiwrFMd5MPtTT5FFasFpCOgPU",
    authDomain: "sharedlisten-394bd.firebaseapp.com",
    databaseURL: "https://sharedlisten-394bd-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "sharedlisten-394bd",
    storageBucket: "sharedlisten-394bd.firebasestorage.app",
    messagingSenderId: "597454000388",
    appId: "1:597454000388:web:bbc801f331103edd944051",
    measurementId: "G-DSN3LRSZQX"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

class FirebasePairing {
    constructor() {
        this.sessionRef = database.ref('shared-session');
        this.userId = this.generateUserId();
        this.onConnectionCallback = null;
        this.isCleanedUp = false;
    }

    generateUserId() {
        return 'user_' + Math.random().toString(36).substr(2, 9);
    }

    onConnection(callback) {
        this.onConnectionCallback = callback;
    }

    async startPairing() {
        try {
            const snapshot = await this.sessionRef.once('value');
            const sessionData = snapshot.val();

            if (!sessionData || !sessionData.offer) {
                await this.createOffer();
            } else if (sessionData.offer && !sessionData.answer) {
                await this.createAnswer(sessionData.offer);
            } else {
                await this.sessionRef.remove();
                setTimeout(() => this.startPairing(), 1000);
            }
        } catch (error) {
            throw error;
        }
    }

    async createOffer() {
        if (this.onConnectionCallback) {
            const offer = await this.onConnectionCallback('createOffer');
            
            await this.sessionRef.set({
                offer: offer,
                answer: null,
                candidates: {},
                created: Date.now(),
                offerer: this.userId
            });

            this.sessionRef.child('answer').on('value', async (snapshot) => {
                const answer = snapshot.val();
                if (answer && !this.isCleanedUp) {
                    await this.onConnectionCallback('receiveAnswer', answer);
                }
            });
        }
    }

    async createAnswer(offer) {
        if (this.onConnectionCallback) {
            const answer = await this.onConnectionCallback('receiveOffer', offer);
            await this.sessionRef.child('answer').set(answer);
        }
    }

    async addIceCandidate(candidate) {
        if (!this.isCleanedUp) {
            const candidateRef = this.sessionRef.child('candidates').push();
            await candidateRef.set({
                candidate: candidate.toJSON(),
                from: this.userId,
                timestamp: Date.now()
            });
        }
    }

    listenForCandidates(callback) {
        this.sessionRef.child('candidates').on('child_added', (snapshot) => {
            const data = snapshot.val();
            if (data && data.from !== this.userId && data.candidate) {
                callback(data.candidate);
            }
        });
    }

    cleanup() {
        if (!this.isCleanedUp) {
            this.isCleanedUp = true;
            this.sessionRef.off();
            
            setTimeout(() => {
                this.sessionRef.remove().catch(() => {});
            }, 3000);
        }
    }

    getUserId() {
        return this.userId;
    }
} 
