const {ApiPromise, Keyring, WsProvider} = require('@polkadot/api');
const {cryptoWaitReady} = require('@polkadot/util-crypto');
// const feedConfigs = require('./feeds.json');
const types = require('../substrate-node-template/types.json');
const tuple = require('fdb-tuple')

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
        console.log(`\nReceived ${events.length} events:`);
        events.forEach(({ event })  => { 

          const types = event.typeDef;

          // Show what we are busy with
          console.log(`\t${event.section}:${event.method}:: ...`);
          console.log(`\t\t${event.meta.documentation.toString()}`);

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

            event.data.forEach((data, index) => {
              console.log(`\t\t\t${index} ${types[index].type}: ${data.toString()}`);
              if(index == 5) {
                // console.log(new Buffer.from(data).toJSON());
                // console.log(data.toJSON());
                // console.log(new Buffer.from(data));
                // var temp = JSON.parse(data.toString());
                // console.log(temp)
                // console.log(new Uint8Array(data).toString());
                // console.log(JSON.parse(new Uint8Array(data)));
                // get,https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD,path,DRAW.ETH.USD.PRICE,times,100000000
                // console.log(tuple.unpack(new Buffer.from(data)))

                // get,https://min-api.cryptocompare.com/data/pricemultifull?fsyms=ETH&tsyms=USD,path,DRAW.ETH.USD.PRICE,times,100000000
                // 0x 0c 676574 
                //    2501 68747470733a2f2f6d696e2d6170692e63727970746f636f6d706172652e636f6d2f646174612f70726963656d756c746966756c6c3f6673796d733d45544
                //    8267473796d733d5553441070617468445241572e4554482e5553442e50524943451474696d657324313030303030303030

              }
              if(index == 6) {
                console.log("\t\t\t\t" +new Buffer.from(data).toString());
              }
            });
            

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

    // Then simulate a call from alice
    await api.tx.example.sendRequest(operatorAccount.address, "").signAndSend(aliceAccount);
    console.log(`Request sent`);

    // (async () => {
    //   const bz = bluzelle(config);
  
    //   await bz.create("somekey", "somevalue", {'gas_price': 10})
    //   console.log(await bz.read("somekey"))
      
    // })();
  
}

main().catch(console.error)
