let WayaPayRestClient = require('../lib/wayapay');
let chai = require('chai')
let expect = chai.expect;
let should = chai.should();

const merchantId = "MER_qZaVZ1645265780823HOaZW";
const publicKey = "WAYAPUBK_TEST_0x3442f06c8fa6454e90c5b1a518758c70";
const environment = "development";

const payload = {
    amount: '157.05',
    narration: 'Airtime Purchase',
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@gmail.com',
    phoneNumber: '09087654321',
    currency: 'NGN'
}

describe("WayaPay Rest Client Test", () => {

    var tranId;

    // Missing merchantId
    it('should throw an error with "merchantId is required" text if merchantId is null', () => {
        const wayapay = () => new WayaPayRestClient(null, publicKey, environment);
        expect(wayapay).to.throw(Error, /merchantId and publicKey is required/);
    });

    // Missing publicKey
    it('should throw an error with "publicKey is required" text if publicKey is null', () => {
        const wayapay = () => new WayaPayRestClient(merchantId, null, environment);
        expect(wayapay).to.throw(Error, /merchantId and publicKey is required/);
    });

    // Initialize Payment
    it('should intialize payment', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey, environment);
        wayapay.initializePayment(payload)
        .then((res) => {
            expect(res).to.have.property('status').eq(true);
            expect(res).to.have.property('timeStamp');
            expect(res).to.have.property('status');
            expect(res).to.have.property('message');
            expect(res).to.have.property('data');
            expect(res).to.have.property('data').property('tranId');
            expect(res).to.have.property('data').property('name');
            expect(res).to.have.property('data').property('customerId');
            expect(res).to.have.property('data').property('authorization_url');
            tranId = res.data.tranId;
            done();
        })
        .catch((error) => {
            return done(error);
        });
    });

    // Missing tranId
    it('should return "tranId is required" text if tranId is null', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey, environment);
        wayapay.verifyPayment(null)
        .then((res) => {
            expect(res).to.have.property('status').eq(false);
            expect(res).to.have.property('message').eq('tranId is required');
            done();
        })
        .catch((error) => {
            return done(error);
        });
    });

    // Invalid tranId
    it('should return "UNABLE TO FETCH" text if tranId does not exist', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey, environment);
        wayapay.verifyPayment('1653306759440')
        .then((res) => {
            expect(res).to.have.property('status').eq(false);
            expect(res).to.have.property('message').eq('UNABLE TO FETCH');
            done();
        })
        .catch((error) => {
            return done(error);
        });
    });
    
    // Verify Payment
    it('should verify payment', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey, environment);
        wayapay.verifyPayment(tranId)
        .then((res) => {
            expect(res).to.have.property('status').eq(true);
            expect(res).to.have.property('timeStamp');
            expect(res).to.have.property('status');
            expect(res).to.have.property('message');
            expect(res).to.have.property('data');
            done();
        })
        .catch((error) => {
            return done(error);
        });
    });
})