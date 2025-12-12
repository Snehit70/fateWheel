import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor removed. Auth token is set globally by the auth store via api.defaults.headers.common
// when the Supabase session changes.

export default api;
