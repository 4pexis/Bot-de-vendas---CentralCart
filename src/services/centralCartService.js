const axios = require('axios');
require('dotenv').config();

// Configura uma instância do axios com a URL base e o token de autorização.
// Assim, não precisamos repetir essas informações em toda chamada.
const api = axios.create({
    baseURL: 'https://api.centralcart.com.br/v1',
    headers: {
        'Authorization': `Bearer ${process.env.CENTRALCART_API_KEY}`,
        'Content-Type': 'application/json'
    }
});

/**
 * Funções exportadas para serem usadas pelos comandos do bot.
 * Cada função representa uma ação na API da CentralCart.
 */
module.exports = {
    // --- Pacotes ---
    getPackages: () => api.get('/app/package'),
    getPackageById: async (packageId) => {
        const response = await api.get('/app/package');
        return response.data.data.find(p => p.id === packageId);
    },
    createPackage: (data) => api.post('/app/package', data),
    updatePackage: (packageId, data) => api.patch(`/app/package/${packageId}`, data),
    deletePackage: (packageId) => api.delete(`/app/package/${packageId}`),

    // --- Descontos (Cupons) ---
    createCoupon: (data) => api.post('/app/discount', data),
    deleteCoupon: (couponId) => api.delete(`/app/discount/${couponId}`),
    
    // --- Pedidos ---
    getOrder: (orderId) => api.get(`/app/order/${orderId}`),
    listOrders: (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        return api.get(`/app/order?${params}`);
    },
    updateOrder: (orderId, data) => api.patch(`/app/order/${orderId}`, data),
    resendOrderCommands: (orderId) => api.post(`/app/order/${orderId}/command/resend`),

    // --- Checkout ---
    createCheckout: (checkoutData) => api.post('/app/checkout', checkoutData),

    // --- Utilitários ---
    getTopCustomers: (from, to) => api.get(`/app/widget/top_customers?from=${from}&to=${to}`),
    getUserSpent: (identifier) => api.get(`/app/user_spent?client_identifier=${identifier}`),
};