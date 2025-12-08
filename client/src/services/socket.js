import { io } from "socket.io-client";
import { useAuthStore } from "../stores/auth";

class SocketService {
    constructor() {
        this.socket = null;
        this.serverTimeOffset = 0; // Initialize to 0 to prevent NaN before sync
    }

    connect(token = null) {
        if (this.socket) return;

        const storedToken = localStorage.getItem('token');
        const authToken = token || storedToken;

        const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
        this.socket = io(socketUrl, {
            auth: {
                token: authToken
            }
        });

        this.socket.on('connect', () => {
            console.log('Socket connected');
            this.syncTime();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    on(event, callback) {
        if (!this.socket) return;
        this.socket.on(event, callback);
    }

    off(event) {
        if (!this.socket) return;
        this.socket.off(event);
    }

    emit(event, data, callback) {
        if (!this.socket) return;
        this.socket.emit(event, data, callback);
    }

    setToken(token) {
        this.token = token;
        if (this.socket) {
            this.socket.auth = { token };
            if (this.socket.connected) {
                this.socket.disconnect().connect();
            }
        }
    }

    async syncTime() {
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
