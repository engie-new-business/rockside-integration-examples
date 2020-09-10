### Configuration

#### Gnosis Safe contracts

First you need to find the addresses of the `GnosisSafeMasterCopy` and `GnosisSafeProxyFactory` deployed on your network. You can find the list of the supported network [here](https://github.com/gnosis/safe-contracts/tree/v1.1.1/.openzeppelin). The default value used in this script are contract deployed by Rockside team on ropsten. If you don't find your network you can still [deploy those smart contracts yourself](https://github.com/gnosis/safe-contracts#deploy).

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

Once your tx is mined, you should have something like that

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

Take the last 40 character from the field data, that's the deployed Gnosis Safe address (well not exactly, it's a proxy in reality but this doesn't change much and is way cheaper)

### Fund the Gnosis Safe

If you want don't want to pay the gas for your clients they must fund their gnosis safe.

### Prepare the gnosis transaction

First request the relay params

```
curl --request GET 'http://localhost:8000/relay/{gnosis}/params'
```

The you must choose a speed and the required relayer.

Then create the safe tx

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
* `nonce`: Gnosis nonce.
* `signatures`: All parameters are hashed and signed by all owners of the Gnosis Safe up to the specified threshold. A list of hex encoded signatures is expected (execTransaction expects that the signatures are sorted by owner address. This is required to easily validate no confirmation duplicates exist)

For more details see [Gnosis documentation](https://docs.gnosis.io/safe/docs/contracts_tx_execution/)

Now set `gasPrice` and `refundReceiver` to the `gasPrice` and the relayer of the speed choose earlier. Moreover youd need to give a good value to `safeTxGas`.

Then run

```
node user.js USER_PRIVATEKEY SAFE_ADDRESS SAFE_TX
```

This will return an hexa string which represent the signed safe tx

### Forward the transaction

Now, we can call the backend with this data

```
curl --request POST 'http://localhost:8000/relay/{gnosis}' \
--header 'Content-Type: application/json' \
--data '{
  "speed": SPEED,
  "data": SIGNED_SAFE_TX
}'
```

This will return a trackingId that you use as it follows

```
curl --request GET 'http://localhost:8000/tx/{TRACKING_ID}'
```

And it's done, you made a transaction for a Gnosis Safe Wallet through Rockside
