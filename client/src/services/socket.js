import { io } from "socket.io-client";

const TIME_SYNC_INTERVAL = 5 * 60 * 1000;

class SocketService {
    constructor() {
        this.socket = null;
        this.serverTimeOffset = 0;
        this.pendingListeners = [];
        this._timeSyncInterval = null;
    }

    connect(token = null) {
        if (this.socket) return;

        const storedToken = localStorage.getItem('token');
        const authToken = token || storedToken;

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        this.socket = io(socketUrl, {
            auth: {
                token: authToken
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.syncTime();
            
            if (this._timeSyncInterval) clearInterval(this._timeSyncInterval);
            this._timeSyncInterval = setInterval(() => this.syncTime(), TIME_SYNC_INTERVAL);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from WebSocket:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
        });

        this.pendingListeners.forEach(({ event, callback }) => {
            this.socket.on(event, callback);
        });
        this.pendingListeners = [];
    }

    disconnect() {
        if (this._timeSyncInterval) {
            clearInterval(this._timeSyncInterval);
            this._timeSyncInterval = null;
        }
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.socket) {
            // Buffer the listener for when socket connects
            this.pendingListeners.push({ event, callback });
            return;
        }
        this.socket.on(event, callback);
    }

    off(event, callback) {
        // Also remove from pending listeners if socket hasn't connected yet
        if (callback) {
            this.pendingListeners = this.pendingListeners.filter(
                l => !(l.event === event && l.callback === callback)
            );
        } else {
            this.pendingListeners = this.pendingListeners.filter(l => l.event !== event);
        }

        if (!this.socket) return;
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    emit(event, ...args) {
        if (!this.socket) return;
        this.socket.emit(event, ...args);
    }

    setToken(token) {
        return new Promise((resolve) => {
            if (this.socket) {
                this.socket.auth = { token };
                if (this.socket.connected) {
                    // Wait for reconnection to complete before resolving
                    const onReconnect = () => {
                        this.socket.off('connect', onReconnect);
                        resolve();
                    };
                    this.socket.on('connect', onReconnect);
                    this.socket.disconnect().connect();
                } else {
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    syncTime() {
        if (!this.socket) return;
        const start = Date.now();
        this.socket.emit('timeSync', (serverTime) => {
            const end = Date.now();
            const latency = (end - start) / 2;
            this.serverTimeOffset = serverTime - (end - latency);
            console.log('Time synced. Offset:', this.serverTimeOffset, 'ms');
        });
    }

    getServerTime() {
        return Date.now() + this.serverTimeOffset;
    }
}

export default new SocketService();
