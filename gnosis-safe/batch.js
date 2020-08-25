const {
  TypedDataUtils
} = require('eth-sig-util');

const ethUtil = require('ethereumjs-util');
const abi = require('ethereumjs-abi');
const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)
const { solidityPack } = require('./utils');

const txs = process.argv.slice(2);

let data = '0x'

txs.forEach((txRaw) => {
  const tx = JSON.parse(txRaw)
  let pack = solidityPack('uint8',tx.operation, 0)
        + solidityPack('address',tx.to, 0).slice(2)
        + solidityPack('uint256',tx.value, 0)
        + solidityPack('uint256',tx.data.slice(2).length/2, 0)
        + solidityPack('bytes',tx.data, 0).slice(2)

  data += pack
});

multiSendCall = web3.eth.abi.encodeFunctionCall({
  name: 'multiSend',
  type: 'function',
  inputs: [
    {name: 'transactions',type: 'bytes'},
  ]
}, [data]);

console.log(multiSendCall)
