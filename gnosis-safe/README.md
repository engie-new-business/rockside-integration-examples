# Rockside x GnosisSafe

## Introduction

Gnosis Safe is one of the best smart contract based wallet available on Ethereum. Fully tested, audited and trusted by the ecosystem.
It can manage all token standard and more, has a fully configurable multi-signature and compatible with all the client side wallets.
It's the perfect smart contract wallet for your client to manage their assets and enjoy the Rockside relayer.

The purpose of this repo is to provide a simple example on how to use GnosisSafe with Rockside.

## Process

### Configuration

#### Gnosis Safe contracts

First you need to find the addresses of the `GnosisSafeMasterCopy` and `GnosisSafeProxyFactory` deployed on your network. You can find the list of the supported network [here](https://github.com/gnosis/safe-contracts/tree/v1.1.1/.openzeppelin). If you don't find your network you can still deploy those two smart contract yourself.

#### Rockside

Then you need to create an admin key and deploy a forwarder for its address (doc [here](https://docs.rockside.io/rockside-api)).

You now you should be able to complete the env variables needed.

### Start the service

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

* `to`: destination of the transaction
* `value`: value to transfer
* `data`: data for the destination, for none set it to `0x`
* `operation`: way of sending the tx: call (`0`) or delegateCall (`1`). In most cases use call and be very careful using delegateCall  
* `safeTxGas`: gas for the internal transaction, can be set to `0` even with refund enable
* `baseGas`: gas used by gnosis itself (sig check, nonce, ...)
* `gasPrice`: max gas price used for the refund
* `gasToken`: token address for the refund, for eth set it to zero address
* `refundReceiver`: address which will receive the refund
* `nonce`: nonce of the gnosis safe

Then run

```
node front.js USER_PRIVATEKEY SAFE_ADDRESS SAFE_TX
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
