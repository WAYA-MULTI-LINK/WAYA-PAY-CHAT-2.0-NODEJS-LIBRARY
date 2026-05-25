"use strict";

const axios = require("axios");

const API_BASE = {
  test: "https://services.staging.wayapay.ng",
  prod: "https://services.wayapay.ng",
};

const PAYMENT_LINK = {
  test: "https://pay.staging.wayapay.ng/?_tranId=",
  prod: "https://pay.wayapay.ng/?_tranId=",
};

/**
 * WayaPay Rest Client Class
 *
 * @param {String} merchantId - WayaPay merchant ID
 * @param {String} publicKey - WayaPay API secret key
 * @param {String} environment - "development" | "production"
 */
class WayaPayRestClient {
  constructor(merchantId, publicKey, environment) {
    if (!merchantId || !publicKey || !environment) {
      throw new Error(
        "merchantId, publicKey, and environment mode is required",
      );
    }

    const isProd =
      environment.trim().toLowerCase() === "production" ||
      environment.trim().toLowerCase() === "prod";

    this.merchantId = merchantId;
    this.publicKey = publicKey;
    this.baseUrl = isProd ? API_BASE.prod : API_BASE.test;
    this.defaultPaymentLink = isProd ? PAYMENT_LINK.prod : PAYMENT_LINK.test;
  }

  /**
   * Initialize Payment
   *
   * @param {Object} payload
   * @param {String} payload.currency - ISO currency code (e.g. NGN)
   * @param {Number} payload.amount - Amount to collect, in the major unit
   * @param {String} payload.callBackUrl - URL the customer is redirected to after payment
   * @param {String} payload.idempotencyKey - Unique key to safely retry without creating duplicates
   * @param {String} payload.paymentRef - Your unique reference for this payment
   * @param {Object} payload.metadata - Customer details and optional fields
   * @param {String} payload.metadata.firstName - Customer's first name
   * @param {String} payload.metadata.lastName - Customer's last name
   * @param {String} payload.metadata.phoneNumber - Customer's phone number
   * @param {String} payload.metadata.emailAddress - Customer's email address
   * @param {String} [payload.metadata.cancelUrl] - URL the customer is redirected to if they cancel
   * @returns {Object}
   */
  async initializePayment(payload) {
    try {
      const {
        currency,
        amount,
        callBackUrl,
        idempotencyKey,
        paymentRef,
        metadata,
      } = payload;

      if (!currency) return { status: false, message: "currency is required" };
      if (!amount) return { status: false, message: "amount is required" };
      if (!callBackUrl)
        return { status: false, message: "callBackUrl is required" };
      if (!idempotencyKey)
        return { status: false, message: "idempotencyKey is required" };
      if (!paymentRef)
        return { status: false, message: "paymentRef is required" };
      if (!metadata) return { status: false, message: "metadata is required" };
      if (!metadata.firstName)
        return { status: false, message: "metadata.firstName is required" };
      if (!metadata.lastName)
        return { status: false, message: "metadata.lastName is required" };
      if (!metadata.phoneNumber)
        return { status: false, message: "metadata.phoneNumber is required" };
      if (!metadata.emailAddress)
        return { status: false, message: "metadata.emailAddress is required" };

      const url = `${this.baseUrl}/payment-collect/initiate`;

      const { data: responseData } = await axios({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Merchant-ID": this.merchantId,
          "API-Secret-Key": this.publicKey,
        },
        data: {
          currency,
          amount,
          callBackUrl,
          idempotencyKey,
          paymentRef,
          metadata,
        },
      });

      return { data: responseData.data, status: true };
    } catch (error) {
      if (error?.response) return error?.response?.data;
      if (error?.request) return error?.message;
      return error;
    }
  }

  /**
   * Initiate Payout
   * Sends funds from your merchant balance to a bank account.
   * Verify the destination account with the Account Verification endpoint before calling this.
   *
   * @param {Object} payload
   * @param {String} payload.currency - ISO currency code (e.g. NGN)
   * @param {Number} payload.amount - Amount to send, in the major unit
   * @param {String} payload.idempotencyKey - Unique key to safely retry without creating duplicates
   * @param {String} payload.bankCode - Destination bank code (use Fetch Bank List for valid codes)
   * @param {String} payload.accountNumber - Destination account number
   * @returns {Object} { status, code, transactionRef }
   */
  async initiatePayout(payload) {
    try {
      const { currency, amount, idempotencyKey, bankCode, accountNumber } =
        payload;

      if (!currency) return { status: false, message: "currency is required" };
      if (!amount) return { status: false, message: "amount is required" };
      if (!idempotencyKey)
        return { status: false, message: "idempotencyKey is required" };
      if (!bankCode) return { status: false, message: "bankCode is required" };
      if (!accountNumber)
        return { status: false, message: "accountNumber is required" };

      const url = `${this.baseUrl}/payment-payout/initiate`;

      const { data: responseData } = await axios({
        url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Merchant-ID": this.merchantId,
          "API-Secret-Key": this.publicKey,
        },
        data: { currency, amount, idempotencyKey, bankCode, accountNumber },
      });

      return { data: responseData, status: true };
    } catch (error) {
      if (error?.response) return error?.response?.data;
      if (error?.request) return error?.message;
      return error;
    }
  }

  /**
   * Verify Transaction
   * Retrieves the current status of a transaction by reference.
   * Use this after a payout or to confirm a payment collection.
   *
   * @param {String} transactionRef - The transaction reference returned when the payment or payout was initiated
   * @returns {Object} { status, message, code, data: { id, reference, status, payoutType, providerName, createdAt } }
   */
  async verifyTransaction(transactionRef) {
    try {
      if (!transactionRef)
        return { status: false, message: "transactionRef is required" };

      const url = `${this.baseUrl}/payment/transaction?ref=${transactionRef}`;

      const { data: responseData } = await axios({
        method: "GET",
        url,
        headers: {
          "Content-Type": "application/json",
          "Merchant-ID": this.merchantId,
          "API-Secret-Key": this.publicKey,
        },
      });

      return { data: responseData.data, status: true };
    } catch (error) {
      if (error?.response) return error?.response?.data;
      if (error?.request) return error?.message;
      return error;
    }
  }

  /**
   * Fetch Bank List
   * Returns the list of supported banks with their codes.
   * Use these codes when calling initiatePayout or verifyAccount.
   *
   * @returns {Object} { status, message, code, data: [{ code, name, id, status }] }
   */
  async fetchBankList() {
    try {
      const url = `${this.baseUrl}/banks-list`;

      const { data: responseData } = await axios({
        method: "GET",
        url,
        headers: {
          "Content-Type": "application/json",
          "Merchant-ID": this.merchantId,
          "API-Secret-Key": this.publicKey,
        },
      });

      return { data: responseData.data, status: true };
    } catch (error) {
      if (error?.response) return error?.response?.data;
      if (error?.request) return error?.message;
      return error;
    }
  }

  /**
   * Verify Account
   * Resolves an account number against a bank and returns the registered account name.
   * Always call this before initiating a payout.
   *
   * @param {Object} payload
   * @param {String} payload.accountNumber - Account number to verify
   * @param {String} payload.bankCode - Bank code (use fetchBankList for valid codes)
   * @returns {Object} { status, message, code, data: { accountNumber, accountName, bankCode, bankName, ... } }
   */
  async verifyAccount(payload) {
    try {
      const { accountNumber, bankCode } = payload;

      if (!accountNumber)
        return { status: false, message: "accountNumber is required" };
      if (!bankCode) return { status: false, message: "bankCode is required" };

      const url = `${this.baseUrl}/account-verification`;

      const { data: responseData } = await axios({
        method: "GET",
        url,
        headers: {
          "Content-Type": "application/json",
          "Merchant-ID": this.merchantId,
          "API-Secret-Key": this.publicKey,
        },
        data: { accountNumber, bankCode },
      });

      return { data: responseData.data, status: true };
    } catch (error) {
      if (error?.response) return error?.response?.data;
      if (error?.request) return error?.message;
      return error;
    }
  }
}

module.exports = WayaPayRestClient;
