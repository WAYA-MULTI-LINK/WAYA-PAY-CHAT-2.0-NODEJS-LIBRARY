# WayaPay

WAYA-PAY REST CLIENT NODEJS LIBRARY

## Installation

To install the API, you need to type the following command in your terminal:

```javascript
npm install --save wayapay-rest-client
```

## Usage

```javascript
const WayaPayRestClient = require('wayapay-rest-client');

const merchantId = "MER_qZaVZ1645265780823HOaZW";
const publicKey = "WAYAPUBK_TEST_0x3442f06c8fa6454e90c5b1a518758c70";
const environment = process.env.NODE_ENV;

const wayapay = new WayaPayRestClient(merchantId, publicKey, environment);

```

### Initialize Payment
```javascript
wayapay.initializePayment({
    amount: '157.00',
    narration: 'Airtime Purchase',
    firstName: 'John',
    lastName: 'Doe',
    email: 'johndoe@gmail.com',
    phoneNumber: '09087654321'
}).then((result)=> {
	console.log(result);
}).catch((error)=> {
	console.log(error);
});
```

### Verify Payment
tranId (transaction Id gotten from initialize payment)
```javascript
wayapay.verifyPayment(tranId)
.then((result)=> {
	console.log(result);
}).catch((error)=> {
	console.log(error);
});
```

## License
[MIT](https://github.com/WAYA-MULTI-LINK/WAYA-PAY-CHAT-2.0-NODEJS-LIBRARY/blob/main/LICENSE)
