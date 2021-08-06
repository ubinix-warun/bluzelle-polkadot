const {ApiPromise, Keyring, WsProvider} = require('@polkadot/api');
const {cryptoWaitReady} = require('@polkadot/util-crypto');
// const feedConfigs = require('./feeds.json');
const types = require('../substrate-node-template/types.json');

const PHRASE = 'entire material egg meadow latin bargain dutch coral blood melt acoustic thought';

// const {bluzelle} = require('bluzelle');

// https://github.com/bluzelle/curium/tree/aven_stargate/sdk/ts

// // {
// //   "height":"0",
// //   "result":
// //     {
// //       "address":"bluzelle1vcmnpsl5qd5jn0seaj5jlxzmakrdh0ta6dr2lt",
// //       "mnemonic":"depart find matter patient step resemble blade memory battle explain post small adult fiscal forum permit mango doctor thunder narrow behind crew chat feature"
// //     }
// //   }

// const config = {
//     mnemonic: "depart find matter patient step resemble blade memory battle explain post small adult fiscal forum permit mango doctor thunder narrow behind crew chat feature",
//     endpoint: "http://testnet.public.bluzelle.com:1317",
//     uuid: Date.now().toString()
// };

async function fundAccountIfNeeded(api, senderAccount, receiverAddress) {
    return new Promise(async (resolve) => {
        const balance = await api.query.system.account(receiverAddress);
        console.log(`Free balance of ${receiverAddress} is: ${balance.data.free}`);
        if (parseInt(balance.data.free) === 0) {
            await api.tx.balances.transfer(receiverAddress, 123456666000).signAndSend(senderAccount, async ({status}) => {
                if (status.isFinalized) {
                    console.log(`Account ${receiverAddress} funded`);
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}

async function registerOperatorIfNeeded(api, operatorAccount) {
  // Register the operator, this is supposed to be initiated once by the operator itself
  return new Promise(async (resolve) => {
    const operator = await api.query.bluzelle.operators(operatorAccount.address);
    if(operator.isFalse) {
        await api.tx.bluzelle.registerOperator().signAndSend(operatorAccount, async ({ status }) => {
          if (status.isFinalized) {
            console.log('Operator registered');
            resolve();
          }
        });
    } else {
      resolve();
    }
  });
}

async function main() {
    await cryptoWaitReady();

    // Connect to the local chain
    const wsProvider = new WsProvider('ws://192.168.10.217:9944');
    const api = await ApiPromise.create({
        provider: wsProvider,
        types
    });

    // Add an account, straight from mnemonic
    const keyring = new Keyring({type: 'sr25519'});


    const operatorAccount = keyring.addFromUri(PHRASE);
    console.log(`Using operator with address ${operatorAccount.address}`);
   
    const aliceAccount = keyring.addFromUri('//Alice');

    await fundAccountIfNeeded(api, aliceAccount, operatorAccount.address);

    const result = await api.query.example.result();
    console.log(`Result is currently ${result}`);

    // Listen for bluzelle.OracleRequest events
    api.query.system.events((events) => {
        events.forEach(({ event })  => {
          if (event.section == "bluzelle" && event.method == "OracleRequest") {
            const id = event.data[2].toString();
            const value = Math.floor(Math.random() * Math.floor(100));
            const result = api.createType('i128', value).toHex(true);
            // Respond to the request with a dummy result

            // Get Param => Send Bluzelle

            // Create and Value
            // Read => Result
            // Remove

            // Subscribe
            //  ... < Update


            api.tx.bluzelle.callback(parseInt(id), result).signAndSend(operatorAccount, async ({ events = [], status }) => {
                if (status.isFinalized) {
                  const updatedResult = await api.query.example.result();
                  console.log(`Result is now ${updatedResult}`);
                  process.exit();
                }
              });
            console.log(`Operator answered to request ${id} with ${value}`);
        }
      });
    });

    await registerOperatorIfNeeded(api, operatorAccount);

    // // Then simulate a call from alice
    // await api.tx.example.sendRequest(operatorAccount.address, "").signAndSend(aliceAccount);
    // console.log(`Request sent`);

    // (async () => {
    //   const bz = bluzelle(config);
  
    //   await bz.create("somekey", "somevalue", {'gas_price': 10})
    //   console.log(await bz.read("somekey"))
      
    // })();
  
}

main().catch(console.error)
