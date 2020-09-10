const {
  TypedDataUtils
} = require('eth-sig-util');

const ethUtil = require('ethereumjs-util');
const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const args = process.argv.slice(2);
const privateKey = args[0]
const safe_address = args[1]
const tx = JSON.parse(args[2])

const domain = {
  verifyingContract: safe_address,
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
  tx,
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

const sig = ethUtil.ecsign(hash, Buffer.from(privateKey.substring(2), 'hex'));
const signature = ethUtil.toRpcSig(sig.v, sig.r, sig.s);
const execTransactionData = web3.eth.abi.encodeFunctionCall({
  name: 'execTransaction',
  type: 'function',
  inputs: [
    {name: 'to',type: 'address'},
    {name: 'value',type: 'uint256'},
    {name: 'data',type: 'bytes'},
    {name: 'operation',type: 'uint8'},
    {name: 'safeTxGas',type: 'uint256'},
    {name: 'baseGas',type: 'uint256'},
    {name: 'gasPrice',type: 'uint256'},
    {name: 'gasToken',type: 'address'},
    {name: 'refundReceiver',type: 'address'},
    {name: 'signatures',type: 'bytes'},
  ]
}, [tx.to, tx.value, tx.data, tx.operation, tx.safeTxGas, tx.baseGas, tx.gasPrice, tx.gasToken, tx.refundReceiver, signature]);

console.log(execTransactionData)
