'use strict';

const axios = require('axios');

const apiBase = {
    test: 'https://services.staging.wayapay.ng',
    prod: 'https://services.staging.wayapay.ng'
};

const paymentLink = {
    test: 'https://pay.staging.wayapay.ng/?_tranId=',
    prod: 'https://pay.staging.wayapay.ng/?_tranId='
};

var baseUrl = apiBase.test;
var defaultPaymentLink = paymentLink.test;

/**
 * WayaPay Rest Client Class
 * 
 * @constructor
 */
function WayaPayRestClient(merchantId, publicKey, environment = 'development') {
    if (!merchantId && !publicKey) throw new Error('merchantId and publicKey is required');

    if (!merchantId) throw new Error('merchantId is required');

    if (!publicKey) throw new Error('publicKey is required');

    if (!(this instanceof WayaPayRestClient)) {
        return new WayaPayRestClient(merchantId, publicKey);
    }

    if (environment.toLowerCase() === 'production') {
        baseUrl = apiBase.prod;
        defaultPaymentLink = paymentLink.prod;
    }

    this.merchantId = merchantId;
    this.publicKey = publicKey;
}

/**
 * Initialize Payment
 * 
 * @param {Object} [payload] - payload object.
 * @param {String} [payload.amount] - Transaction amount
 * @param {String} [payload.narration] - Transaction narration
 * @param {String} [payload.firstName] - Customer firstName
 * @param {String} [payload.lastName] - Customer lastName
 * @param {String} [payload.email] - Customer email address?
 * @param {String} [payload.phoneNumber] - Customer phoneNumber?
 * @returns {Object}
 */
 WayaPayRestClient.prototype.initializePayment = async function (payload) {
    try {
        const { amount, narration, firstName, lastName, email, phoneNumber } = payload;

        if (!amount) {
            return { message: 'amount is required' }
        }
        if (!narration) {
            return { message: 'narration is required' }
        }
        if (!firstName) {
            return { message: 'firstName is required' }
        }
        if (!lastName) {
            return { message: 'lastName is required' }
        }
        if (!email) {
            return { message: 'email is required' }
        }
        if (!phoneNumber) {
            return { message: 'phoneNumber is required' }
        }

        let data = {
            amount,
            description: narration,
            currency: 566,
            fee: 1,
            customer: {
                name: `${firstName} ${lastName}`,
                email,
                phoneNumber
            },
            merchantId: this.merchantId,
            wayaPublicKey: this.publicKey
        };

        const url = `${baseUrl}/payment-gateway/api/v1/request/transaction`;
        const result = await axios({
            method: 'POST',
            url,
            headers: { 'Content-Type': 'application/json' },
            data: { ...data }
        });

        const tranId = result.data.data.tranId;
        Object.assign(result.data.data, { authorization_url: `${defaultPaymentLink}${tranId}` });
        
        return result.data;
    } catch (error) {
        if (error?.response) {
            return error?.response?.data
        }
        if (error?.request) {
            return error?.message
        }
        return error;
    }
}

/**
 * Verify Payment
 * 
 * @param {String} tranId Transaction Id
 * @returns {Object}
 */
WayaPayRestClient.prototype.verifyPayment = async function (tranId) {
    try {
        if (!tranId) {
            return { message: 'tranId is required' }
        }

        const url = `${baseUrl}/payment-gateway/api/v1/reference/query/${tranId}`;
        const result = await axios({
            method: 'GET',
            url,
            headers: { 'Content-Type': 'application/json' }
        });

        return result.data;
    } catch (error) {
        if (error.response) {
            return error.response.data
        }
        if (error.request) {
            return error.message
        }
        return error;
    }
}

module.exports = WayaPayRestClient;