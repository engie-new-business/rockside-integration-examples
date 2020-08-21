const cors = require('cors')
const bodyParser = require('body-parser');
const express = require('express');
const request = require('request-promise');
const {
  TypedDataUtils
} = require('eth-sig-util');

const ethUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const port = process.env.PORT || '8000'

const network = process.env.NETWORK || 'ropsten'
const chainId = process.env.CHAINID || 3

const adminPrivateKey = process.env.ADMIN_PRIVATEKEY
const adminAddress = ethUtil.privateToAddress(Buffer.from(adminPrivateKey.substring(2), 'hex'))
const admin = ethUtil.bufferToHex(adminAddress);

const apikey = process.env.APIKEY
const rocksideURL = process.env.APIURL
const forwarderAddress = process.env.FORWARDER

const gnosisSafeProxyFactory = process.env.GNOSIS_SAFE_PROXY_FACTORY || "0x016457118b425fe86952381eC5127F28D4248984"
const gnosisSafeMasterCopy = process.env.GNOSIS_SAFE_MASTERCOPY || "0xB6998f4E968573534D6ea6A500323B0d1cd03767"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

async function deployGnosisSafe(req, res) {
  const owner = req.body.owner
  const initData = web3.eth.abi.encodeFunctionCall({
    name: 'setup',
    type: 'function',
    inputs: [{
      type: 'address[]',
      name: '_owners'
    },{
      type: 'uint256',
      name: '_threshold'
    },{
      type: 'address',
      name: 'to'
    },{
      type: 'bytes',
      name: 'data'
    },{
      type: 'address',
      name: 'fallbackHandler'
    },{
      type: 'address',
      name: 'paymentToken'
    },{
      type: 'uint256',
      name: 'payment'
    },{
      type: 'address',
      name: 'paymentReceiver'
    },]
  }, [[owner], 1, ZERO_ADDRESS, '0x', ZERO_ADDRESS, ZERO_ADDRESS, 0, ZERO_ADDRESS]);

  const dataForFactory = web3.eth.abi.encodeFunctionCall({
    name: 'createProxyWithNonce',
    type: 'function',
    inputs: [{
      type: 'address',
      name: '_mastercopy'
    }, {
      type: 'bytes',
      name: 'initializer'
    }, {
      type: 'uint256',
      name: 'saltNonce'
    }]
  }, [gnosisSafeMasterCopy, initData, getRandomSalt()]);
  const {
    nonce,
    gas_prices: gasPrice
  } = await fetchRelayParams(admin);

  const hash = hashRelayMessage(admin, gnosisSafeProxyFactory, dataForFactory, nonce);
  const signature = await sign(hash)
  const trackingId = await _forward(admin, gnosisSafeProxyFactory, dataForFactory, nonce, signature, gasPrice)
  res.status(200).json({
    trackingId
  })
}

async function prepareGnosisTransact(req, res) {
  const privateKey = req.body.ownerPrivatekey

  const safeAddress = req.body.safe_address

  const to = req.body.to
  const value = req.body.value
  const data = req.body.data
  const operation = req.body.operation
  const safeTxGas = req.body.safeTxGas
  const baseGas = req.body.baseGas
  const gasPrice = req.body.gasPrice
  const gasToken = req.body.gasToken
  const refundReceiver = req.body.refundReceiver
  const signatures = req.body.signatures
  const nonce = req.body.nonce


  const domain = {
    verifyingContract: safeAddress,
  };

  const eip712DomainType = [{
      name: 'verifyingContract',
      type: 'address'
    }
  ];
  const encodedDomain = TypedDataUtils.encodeData(
    'EIP712Domain',
    domain, {
      EIP712Domain: eip712DomainType
    }
  );
  const hashedDomain = ethUtil.keccak256(encodedDomain);
  const messageTypes = {
    'SafeTx': [
      {name: "to", type: "address"},
      {name: "value", type: "uint256"},
      {name: "data", type: "bytes"},
      {name: "operation", type: "uint8"},
      {name: "safeTxGas", type: "uint256"},
      {name: "baseGas", type: "uint256"},
      {name: "gasPrice", type: "uint256"},
      {name: "gasToken", type: "address"},
      {name: "refundReceiver", type: "address"},
      {name: "nonce", type: "uint256"},
    ]
  }
  const encodedMessage = TypedDataUtils.encodeData(
    'SafeTx',
    {to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, nonce},
    messageTypes,
  );

  const hashedMessage = ethUtil.keccak256(encodedMessage);

  const hash = ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashedDomain,
      hashedMessage,
    ])
  );

  const sig = await ethUtil.ecsign(hash, Buffer.from(privateKey.substring(2), 'hex'));
  const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
  const execTransactionData = web3.eth.abi.encodeFunctionCall({
    name: 'execTransaction',
    type: 'function',
    inputs: [
      {type: 'address',name: 'to'},
      {type: 'uint256',name: 'value'},
      {type: 'bytes',name: 'data'},
      {type: 'uint8',name: 'operation'},
      {type: 'uint256',name: 'safeTxGas'},
      {type: 'uint256',name: 'baseGas'},
      {type: 'uint256',name: 'gasPrice'},
      {type: 'address',name: 'gasToken'},
      {type: 'address',name: 'refundReceiver'},
      {type: 'bytes',name: 'signatures'},]
  }, [to, value, data, operation, safeTxGas, baseGas, gasPrice, gasToken, refundReceiver, signature]);
  res.status(200).json({
    execTransactionData
  })
}

async function forward(req, res) {
  const to = req.body.to
  const data = req.body.data

  const {
    nonce,
    gas_prices: gasPrice
  } = await fetchRelayParams(admin);
  const hash = hashRelayMessage(admin, to, data, nonce);

  const signature = await sign(hash)
  const trackingId = await _forward(admin, to, data, nonce, signature, gasPrice)
  res.status(200).json({
    trackingId
  })
}

async function getRocksideTx(req, res) {
  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/transactions/${req.params.trackingId}?apikey=${apikey}`,
    method: 'GET',
    json: true,
  })

  res.json(response)
}

function hashRelayMessage(signer, to, data, nonce) {
  const domain = {
    verifyingContract: forwarderAddress,
    chainId
  };

  const eip712DomainType = [{
      name: 'verifyingContract',
      type: 'address'
    },
    {
      name: 'chainId',
      type: 'uint256'
    }
  ];
  const encodedDomain = TypedDataUtils.encodeData(
    'EIP712Domain',
    domain, {
      EIP712Domain: eip712DomainType
    }
  );
  const hashedDomain = ethUtil.keccak256(encodedDomain);

  const messageTypes = {
    'TxMessage': [{
      name: "signer",
      type: "address"
    }, {
      name: "to",
      type: "address"
    }, {
      name: "data",
      type: "bytes"
    }, {
      name: "nonce",
      type: "uint256"
    }, ]
  };

  const encodedMessage = TypedDataUtils.encodeData(
    'TxMessage', {
      signer,
      to,
      data,
      nonce
    },
    messageTypes,
  );

  const hashedMessage = ethUtil.keccak256(encodedMessage);

  return ethUtil.keccak256(
    Buffer.concat([
      Buffer.from('1901', 'hex'),
      hashedDomain,
      hashedMessage,
    ])
  );
}

async function _forward(signer, to, data, nonce, signature, gasPrice) {
  const requestBody = {
    message: {
      signer,
      to,
      data,
      nonce
    },
    signature,
    speed: 'safelow',
    gas_price_limit: gasPrice.safelow,
  };

  const response = await request({
    method: 'POST',
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarderAddress}?apikey=${apikey}`,
    method: 'POST',
    body: requestBody,
    json: true,
  })

  return response.tracking_id;
}

async function sign(hash) {
  const sig = await ethUtil.ecsign(hash, Buffer.from(adminPrivateKey.substring(2), 'hex'));
  const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
  return signature
}

async function fetchRelayParams(account) {
  const requestBody = {
    account,
    channel_id: '0'
  };

  const response = await request({
    uri: `${rocksideURL}/ethereum/${network}/forwarders/${forwarderAddress}/relayParams?apikey=${apikey}`,
    method: 'POST',
    body: requestBody,
    json: true,
  })

  return response;
}

function getRandomSalt() {
  const salt = Math.ceil(Math.random() * 10000000000000000000);
  return '0x' + salt.toString(16);
}

function wrap(handler) {
  return (req, res, next) => {
    return Promise
      .resolve(handler(req, res))
      .catch(next);
  }
}

let app = express();

app.use(bodyParser.json())
app.use(cors())

app.post('/deploy', wrap(deployGnosisSafe))
app.post('/prepare', wrap(prepareGnosisTransact))
app.post('/forward', wrap(forward))
app.get('/tx/:trackingId', wrap(getRocksideTx))

app.set('trust proxy', true);
app.use(function(err, req, res, next) {
  res.status(500).json({
    error: err.message
  })
});
app.listen(port);
