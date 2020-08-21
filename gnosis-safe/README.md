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
node main.js
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

### Prepare a gnosis transaction

The client will have to craft the transaction for the Gnosis Safe and sign it. You can help him with that but his privateKey should never be in your hand.

```
curl --request POST 'http://localhost:8000/deploy' \
  --header 'Content-Type: application/json' \
  --data '{
  	"owner": CLIENT_ADDRESS
  }'
```
