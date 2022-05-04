import { Contract, ethers } from 'ethers';
import * as React from 'react';
import './style.css';

// These codes are written for development purposes only.

const TOKEN_LIST = [
  {
    name: '1USDC',
    address: '0x985458e523db3d53125813ed68c274899e9dfab4',
  },
  {
    name: 'WONE',
    address: '0xcf664087a5bb0237a0bad6742852ec6c8d69a27a',
  },
  {
    name: '1ETH',
    address: '0x6983d1e6def3690c4d616b13597a09e6193ea013',
  },
];

enum DEX_CONTRACTS {
  SUSHI,
  VIPER,
  OKX,
}

const DEX_LIST = {
  [DEX_CONTRACTS.SUSHI]: {
    name: 'Sushi',
    address: '0x1b02da8cb0d097eb8d57a175b88c7d8b47997506',
  },
  [DEX_CONTRACTS.VIPER]: {
    name: 'Viper',
    address: '0xf012702a5f0e54015362cbca26a26fc90aa832a3',
  },
  [DEX_CONTRACTS.OKX]: { name: 'OKX', address: '' },
};

const DEX_ERC_SWAP_ABI = [
  'function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline ) external returns (uint[] memory amounts)',
];

enum SELECTED_TOKEN {
  FROM_ADDRESS,
  TO_ADDRESS,
}

export default function App() {
  const provider: ethers.providers.Web3Provider =
    new ethers.providers.Web3Provider((window as any).ethereum, 'any');
  const [selectedDex, setSelectedDex] = React.useState(DEX_CONTRACTS.SUSHI);
  const [walletAddress, setWalletAddress] = React.useState<String | null>(null);

  const [fromAddress, setFromAddress] = React.useState(TOKEN_LIST[0].address);
  const [toAddress, setToAddress] = React.useState(TOKEN_LIST[1].address);

  const [fromAmount, setFromAmount] = React.useState<string>('0');
  const [toAmount, setToAmount] = React.useState<string>('0');

  const [isConnected, setIsConnected] = React.useState<boolean>(false);

  let [dexContract, setDexContract] = React.useState(null);

  const onDexSelected = (dex) => () => {
    setSelectedDex(dex);
  };

  const getSwapQuote = (amountIn, path) => {
    const tx = dexContract?.getAmountsOut(amountIn, path);
    tx.then((quotes) => {
      return quotes.map((quote) => quote.toString());
    })
      .then((response) => {
        setToAmount(response[1]);
      })
      .catch(console.error);
  };

  const onAmountChange = (e) => {
    setFromAmount(e.target.value);
    const amount = e.target.value === '' ? 0 : parseFloat(e.target.value);
    const amountIn = ethers.BigNumber.from(amount);
    getSwapQuote(amountIn, [fromAddress, toAddress]);
  };

  const onTokenSelected = (selection) => (e) => {
    console.log(selection, e);
    console.log(e.target.value);
    const amountIn = ethers.BigNumber.from(fromAmount);
    if (selection === SELECTED_TOKEN.FROM_ADDRESS) {
      setFromAddress(e.target.value);
      getSwapQuote(amountIn, [e.target.value, toAddress]);
    } else if (selection === SELECTED_TOKEN.TO_ADDRESS) {
      setToAddress(e.target.value);
      getSwapQuote(amountIn, [fromAddress, e.target.value]);
    }
  };

  const onSwapSubmit = (e) => {
    e.preventDefault();
    const tx =
      dexContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        fromAmount,
        toAmount,
        [fromAddress, toAddress],
        walletAddress,
        Date.now() + 1000 * 60 * 10
      );
    tx.then((response) => {
      setToAmount(response[0].toString());
    }).catch(console.error);
  };

  const onConnectClicked = () => {
    provider?.send('eth_requestAccounts', []).then((accounts: string[]) => {
      setWalletAddress(accounts[0]);
    });
  };

  React.useEffect(() => {
    setIsConnected(walletAddress !== null);
  }, [walletAddress]);

  React.useEffect(() => {
    setDexContract(
      new Contract(
        DEX_LIST[selectedDex].address,
        DEX_ERC_SWAP_ABI,
        provider.getSigner()
      )
    );
  }, [selectedDex]);

  return (
    <div>
      <button onClick={onConnectClicked}>Connect wallet</button>
      <h1>Hello Swap!</h1>
      <p>
        {!walletAddress && <span>You're not connected, connect wallet</span>}
        {walletAddress && <span>Connected {walletAddress} :)</span>}
      </p>
      <ul>
        <li>ETH &lt;=&gt; USDC not working on Viper</li>
      </ul>
      <div>
        {Object.keys(DEX_LIST).map((dexKey) => (
          <button
            key={dexKey}
            onClick={onDexSelected(dexKey)}
            style={{
              backgroundColor:
                selectedDex.toString() === dexKey ? 'yellow' : null,
            }}
            disabled={walletAddress === null}
          >
            {DEX_LIST[dexKey].name}
          </button>
        ))}
      </div>
      <form onSubmit={onSwapSubmit}>
        <fieldset>
          <legend>From Token</legend>
          <input
            name="fromAmount"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            type="text"
            // pattern="^[0-9]*[.,]?[0-9]*$"
            placeholder="0.0"
            minLength={1}
            maxLength={79}
            spellCheck={false}
            onChange={onAmountChange}
            value={fromAmount}
            disabled={!isConnected}
          />
          <select
            value={fromAddress}
            disabled={!isConnected}
            onChange={onTokenSelected(SELECTED_TOKEN.FROM_ADDRESS)}
          >
            {TOKEN_LIST.map((token) => (
              <option
                key={token.address}
                value={token.address}
                selected={token.address === fromAddress}
                disabled={token.address === toAddress}
              >
                {token.name}
              </option>
            ))}
          </select>
        </fieldset>
        <fieldset>
          <legend>To Token</legend>
          <input
            name="toAmount"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            type="text"
            readOnly={true}
            pattern="^[0-9]*[.,]?[0-9]*$"
            placeholder="0.0"
            minLength={1}
            maxLength={79}
            spellCheck={false}
            value={toAmount}
            disabled={!isConnected}
          />
          <select
            disabled={!isConnected}
            value={toAddress}
            onChange={onTokenSelected(SELECTED_TOKEN.TO_ADDRESS)}
          >
            {TOKEN_LIST.map((token) => (
              <option
                key={token.address}
                value={token.address}
                selected={token.address === toAddress}
                disabled={token.address === fromAddress}
              >
                {token.name}
              </option>
            ))}
          </select>
        </fieldset>
        <button disabled={walletAddress === null} type="submit">
          Swap
        </button>
      </form>
    </div>
  );
}
