let WayaPayRestClient = require('../lib/wayapay');
let chai = require('chai')
let expect = chai.expect;
let should = chai.should();

const merchantId = "MER_qZaVZ1645265780823HOaZW";
const publicKey = "WAYAPUBK_TEST_0x3442f06c8fa6454e90c5b1a518758c70";

const payload = {
    amount: '157.05',
    narration: 'Airtime Purchase',
    firstName: 'Faiz',
    lastName: 'Fasasi',
    email: 'faizfasasi@gmail.com',
    phoneNumber: '09087654321'
}

describe("WayaPay Rest Client Test", () => {

    var tranId;

    // Both merchantId and publicKey is missing
    it('should throw "merchantId and publicKey is required" error if constructor is null', () => {
        const wayapay = () => new WayaPayRestClient(null, null);
        expect(wayapay).to.throw(Error, /merchantId and publicKey is required/);
    });

    // Missing merchantId
    it('should throw an error with "merchantId is required" text if merchantId is null', () => {
        const wayapay = () => new WayaPayRestClient(null, publicKey);
        expect(wayapay).to.throw(Error, /merchantId is required/);
    });

    // Missing publicKey
    it('should throw an error with "publicKey is required" text if publicKey is null', () => {
        const wayapay = () => new WayaPayRestClient(merchantId, null);
        expect(wayapay).to.throw(Error, /publicKey is required/);
    });

    // Initialize Payment
    it('should intialize payment', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey);
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
    
    // Verify Payment
    it('should verify payment', (done) => {
        const wayapay = new WayaPayRestClient(merchantId, publicKey);
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