import { io } from "socket.io-client";
import { useAuthStore } from "../stores/auth";

class SocketService {
    constructor() {
        this.socket = null;
    }

    connect() {
        if (this.socket) return;

        const authStore = useAuthStore();
        const token = localStorage.getItem('token');

        this.socket = io('http://localhost:3000', {
            auth: {
                token: token
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
}

export default new SocketService();
