# Rockside x GnosisSafe

## Introduction

Gnosis Safe is one of the best smart contract based wallet available on Ethereum. Fully tested, audited and trusted by the ecosystem.
It can manage all token standard and more, has a fully configurable multi-signature and compatible with all the client side wallets.
It's the perfect smart contract wallet for your client to manage their assets and enjoy the Rockside relayer.

The purpose of this repo is to provide a simple example on how to use GnosisSafe with Rockside.

## Architecture

An application running with GnosisSafe and Rockside will need two signatures and therefore two sets of keys. The user must have a third party wallet (Metamask, Ledger, ...).

The first comes from the user, he will sign his transaction intention. Some of the transaction parameters have a minimum requirement defined by the application. The message and signature are then passed to the application backend. The second signature is done by the backend for Rockside forwarding mechanism.

![signatures](https://raw.githubusercontent.com/rocksideio/rockside-integration-examples/master/gnosis-safe/img/signatures.png)

In this example, all actions concerning the user are in the `user.js` file and those for the backend of the application are in the` back.js` file.

## Process

### Configuration

#### Gnosis Safe contracts

First you need to find the addresses of the `GnosisSafeMasterCopy` and `GnosisSafeProxyFactory` deployed on your network. You can find the list of the supported network [here](https://github.com/gnosis/safe-contracts/tree/v1.1.1/.openzeppelin). The default value used in this script are contract deployed by Rockside team on ropsten. If you don't find your network you can still [deploy those smart contracts yourself](https://github.com/gnosis/safe-contracts#deploy).

#### Rockside

Then you need to create an admin key and deploy a forwarder for its address (doc [here](https://docs.rockside.io/rockside-api)).

You now you should be able to complete the env variables needed.

### Start the service

Start the backend of the application

```
node back.js
```

### Deploy a GnosisSafe for your user

Now that everything is running you can start to deploy some GnosisSafe wallet for your client.

```
curl --request POST 'http://localhost:8000/deploy' \
  --header 'Content-Type: application/json' \
  --data '{
  	"owner": {CLIENT_ADDRESS}
  }'
```

This will return a trackingId that you use as it follows

```
curl --request GET 'http://localhost:8000/tx/{TRACKING_ID}'
```

Once your tx, is mined you should have something like that

```
{
    ...
    "receipt": {
        ...
        "logs": [
            {
                ...
                "topics": [
                    "0xa38789425dbeee0239e16ff2d2567e31720127fbc6430758c1a4efc6aef29f80"
                ],
                "data": "0x000000000000000000000000eeec4ea0fb86f3018e88188c58b23d0657f7acb2",
                ...
            }
        ],
        ...
    },
    ...
}
```

Take the last 40 character from the field data, that the deployed Gnosis Safe address (well not exactly, it's a proxy in reality but this doesn't change much and is way cheaper)

### Prepare the gnosis transaction

The client will have to craft the transaction for the Gnosis Safe and sign it. You can help him with that but his privateKey should never be in your hand.

First create the safe tx

```
'{
  "to": ...,
  "value": ...,
  "data": ...,
  "operation": ...,
  "safeTxGas": ...,
  "baseGas": ...,
  "gasPrice": ...,
  "gasToken": ...,
  "refundReceiver": ...,
  "nonce": ...
}'
```

* `to`: An Ethereum address the transaction is going to.
* `value`: This is an amount in ether that can be set. It will be deducted from the Gnosis Safe and sent to the `to` address.
* `data`: This is literally some data that is sent with the transaction. It can be the function that should be called on the smart contract specified by the `to` address.
* `operation`: On Ethereum, there are different types of transactions. The Safe supports CALL (uint8 - `0`), DELEGATECALL (uint8 - `1`) and CREATE (uint8 - `2`).
* `safeTxGas`: This is the minimum amount of gas that is provided for the Safe transaction. In case of CALL and DELEGATECALL this is also the maximum available gas (gas limit).
* `baseGas`: This is the amount of gas that is independent of the specific Safe transactions, but used for general things such as signature checks and the base transaction fee. `safeTxGas` and `baseGas` combined are comparable to the gas limit of a regular transaction.
* `gasPrice`: The gas price sets the exchange rate between gas and ether for the refund. Setting the gas price to 0 means that no refund is paid out.
* `gasToken`: For regular Ethereum transactions, gas is paid in ether, always. The Gnosis Safe enables users to pay in ERC20 tokens or ether. The desired token is specified here. If 0x0 then Ether is used. Gas costs are calculated by `(dataGas + txGas) * gasPrice` and are deducted from the Gnosis Safe and sent to the `refundReceiver`.
* `refundReceiver`: The refund does not necessarily have to go to the account submitting the transaction but can be paid out to any account specified here. If set to 0, tx.origin will be used. For transaction paid by your client with Rockside, you should put your forwarder address here.
* `signatures`: All parameters are hashed and signed by all owners of the Gnosis Safe up to the specified threshold. A list of hex encoded signatures is expected (execTransaction expects that the signatures are sorted by owner address. This is required to easily validate no confirmation duplicates exist)

For more details see [Gnosis documentation](https://docs.gnosis.io/safe/docs/contracts_tx_execution/)

Then run

```
node user.js USER_PRIVATEKEY SAFE_ADDRESS SAFE_TX
```

This will return an hexa string which represent the signed safe tx

### Forward the transaction

Now, we can call the backend with this data

```
curl --request POST 'http://localhost:8000/forward' \
--header 'Content-Type: application/json' \
--data '{
  "to": SAFE_ADDRESS,
  "data": SIGNED_SAFE_TX
}'
```

This will return a trackingId that you use as it follows

```
curl --request GET 'http://localhost:8000/tx/{TRACKING_ID}'
```

And it's done, you made a transaction for a Gnosis Safe Wallet through Rockside

### Batch transaction

Gnosis require an other contract to process batched transaction. This contract is called `MultiSend`, you have to find its address [here](https://github.com/gnosis/safe-contracts/tree/v1.1.1/.openzeppelin) or deploy it yourself.

Then prepare your transactions as follow

```
'{
  "operation": ...,
  "to": ...,
  "value": ...,
  "data": ...,
}'
```

Then run

```
node batch.js TX1 TX2
```

This will give the data to use for the safe transaction. You can create the gnosis transaction now. Use the same logic described above to create a safe tx, but set the  `to` to `MultiSend` address.

And finaly the user can sign this transaction and you can forward it.
