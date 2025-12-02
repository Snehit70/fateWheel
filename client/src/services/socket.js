import { io } from "socket.io-client";
import { useAuthStore } from "../stores/auth";

class SocketService {
    constructor() {
        this.socket = null;
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
            console.log('Connected to WebSocket');
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
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.connect(token);
    }
}

export default new SocketService();
