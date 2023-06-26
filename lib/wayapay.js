"use strict";

const axios = require("axios");

const apiBase = {
  test: "https://services.staging.wayapay.ng",
  prod: "https://services.wayapay.ng",
};

const paymentLink = {
  test: "https://pay.staging.wayapay.ng/?_tranId=",
  prod: "https://pay.wayapay.ng/?_tranId=",
};

var baseUrl = apiBase.test;
var defaultPaymentLink = paymentLink.test;

/**
 * WayaPay Rest Client Class
 *
 * @constructor
 * @param {String} [merchantId] - wayapay merchantId
 * @param {String} [publicKey] - wayapay publicKey
 * @param {String} [environment] - development/production. Default (development)
 */
function WayaPayRestClient(merchantId, publicKey, environment) {
  if (!merchantId || !publicKey || !environment) {
    throw new Error("merchantId, publicKey, and environment mode is required");
  }

  if (environment.trim().toLowerCase() === "production" || environment.trim().toLowerCase() === "prod") {
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
    const {
      amount,
      narration,
      firstName,
      lastName,
      email,
      phoneNumber,
      currency,
    } = payload;

    if (!amount) {
      return { status: false, message: "amount is required" };
    }
    if (!narration) {
      return { status: false, message: "narration is required" };
    }
    if (!firstName) {
      return { status: false, message: "firstName is required" };
    }
    if (!lastName) {
      return { status: false, message: "lastName is required" };
    }
    if (!email) {
      return { status: false, message: "email is required" };
    }
    if (!phoneNumber) {
      return { status: false, message: "phoneNumber is required" };
    }

    const url = `${baseUrl}/payment-gateway/api/v1/request/transaction`;

    const { data: responseData } = await axios({
      url,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: {
        amount,
        description: narration,
        currency: currency || "NGN",
        fee: 1,
        customer: {
          name: `${firstName} ${lastName}`,
          email,
          phoneNumber,
        },
        merchantId: this.merchantId,
        wayaPublicKey: this.publicKey,
      },
    });

    const tranId = responseData.data.tranId;
    Object.assign(responseData.data, {
      authorization_url: `${defaultPaymentLink}${tranId}`,
    });

    return { data: responseData.data, status: true };
  } catch (error) {
    if (error?.response) {
      return error?.response?.data;
    }
    if (error?.request) {
      return error?.message;
    }
    return error;
  }
};

/**
 * Verify Payment
 *
 * @param {String} tranId Transaction Id
 * @returns {Object}
 */
WayaPayRestClient.prototype.verifyPayment = async function (tranId) {
  try {
    if (!tranId) {
      return { status: false, message: "tranId is required" };
    }

    const url = `${baseUrl}/payment-gateway/api/v1/reference/query/${tranId}`;
    const result = await axios({
      method: "GET",
      url,
      headers: { "Content-Type": "application/json" },
    });

    return result.data;
  } catch (error) {
    if (error.response) {
      return error.response.data;
    }
    if (error.request) {
      return error.message;
    }
    return error;
  }
};

module.exports = WayaPayRestClient;
