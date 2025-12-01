const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
let token = '';

async function test() {
    try {
        console.log('1. Registering User...');
        const regRes = await axios.post(`${API_URL}/auth/register`, {
            email: `test${Date.now()}@example.com`,
            password: 'password123'
        });
        console.log('   Success! User ID:', regRes.data.user.id);
        token = regRes.data.token;

        console.log('\n2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: regRes.data.user.email,
            password: 'password123'
        });
        console.log('   Success! Token received.');
        token = loginRes.data.token;

        console.log('\n3. Placing Bet & Spinning...');
        const spinRes = await axios.post(`${API_URL}/game/spin`, {
            bets: [{ type: 'color', value: 'red', amount: 10 }]
        }, {
            headers: { 'x-auth-token': token }
        });
        console.log('   Success!');
        console.log('   Result:', spinRes.data.result);
        console.log('   Winnings:', spinRes.data.winnings);
        console.log('   New Balance:', spinRes.data.balance);

    } catch (error) {
        console.error('TEST FAILED:', error.response ? error.response.data : error.message);
    }
}

test();
