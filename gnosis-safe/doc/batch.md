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
