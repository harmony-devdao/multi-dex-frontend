import { Contract, ethers } from 'ethers';
import * as React from 'react';
import './style.css';

// These codes are written for development purposes only.

const TOKEN_LIST = [
  {
    name: '1USDC',
    address: '0x985458E523dB3d53125813eD68c274899e9DfAb4',
    decimals: '6',
  },
  {
    name: 'WONE',
    address: '0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a',
    decimals: '18',
  },
  {
    name: '1ETH',
    address: '0x6983d1e6def3690c4d616b13597a09e6193ea013',
    decimals: '18',
  },
];

enum DEX_CONTRACTS {
  SUSHI,
  VIPER,
  OKX,
  UNISWAP,
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
  'function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline ) external returns (uint[] memory amounts)',
];

const TOKEN_ERC_SWAP_ABI = [
  'function approve(address spender, uint value) external returns (bool)',
];

enum SELECTED_TOKEN {
  FROM_ADDRESS,
  TO_ADDRESS,
}

export default function App() {
  if (!(window as any).ethereum) {
    alert('You need to install metamask to use HelloSwap!');
    return null;
  }

  const provider = new ethers.providers.Web3Provider(
    (window as any).ethereum,
    'any'
  );

  const [selectedDex, setSelectedDex] = React.useState(DEX_CONTRACTS.SUSHI);
  const [walletAddress, setWalletAddress] = React.useState<String | null>(null);

  const [fromAddress, setFromAddress] = React.useState(TOKEN_LIST[0].address);
  const [toAddress, setToAddress] = React.useState(TOKEN_LIST[1].address);

  const [fromAmount, setFromAmount] = React.useState<string>('');
  const [toAmount, setToAmount] = React.useState<string>('');

  const [isConnected, setIsConnected] = React.useState<boolean>(false);

  const [isApproved, setIsApproved] = React.useState<boolean>(false);

  let [dexContract, setDexContract] = React.useState(null);

  const onConnectClicked = () => {
    provider?.send('eth_requestAccounts', []).then((accounts: string[]) => {
      setWalletAddress(accounts[0]);
    });
  };

  const getSwapQuote = React.useCallback(
    (amount, path) => {
      const { decimals } = TOKEN_LIST.find(
        (token) => token.address === path[0]
      );
      const amountIn = ethers.utils.parseUnits(amount, decimals);

      const tx = dexContract?.getAmountsOut(amountIn, path);
      tx?.then((quotes) => {
        return quotes.map((quote) => quote.toString());
      })
        .then((response) => {
          const { decimals } = TOKEN_LIST.find(
            (token) => token.address === path[1]
          );
          const amount = ethers.utils
            .formatUnits(response[1], decimals)
            .toString();
          setToAmount(amount);
        })
        .catch(console.error);
    },
    [dexContract]
  );

  const onDexSelected = (dex) =>
    React.useCallback(() => {
      setSelectedDex(dex);
      getSwapQuote(fromAmount, [fromAddress, toAddress]);
    }, [fromAddress, fromAmount, selectedDex, toAddress]);

  const onAmountChange = React.useCallback(
    (e) => {
      setFromAmount(e.target.value);
      if (parseInt(e.target.value)) {
        const amountIn = e.target.value;
        getSwapQuote(amountIn, [fromAddress, toAddress]);
      } else {
        setToAmount('');
      }
    },
    [fromAddress, toAddress, getSwapQuote]
  );

  const onTokenSelected = React.useCallback(
    (selection) => (e) => {
      if (selection === SELECTED_TOKEN.FROM_ADDRESS) {
        setFromAddress(e.target.value);
        getSwapQuote(fromAmount, [e.target.value, toAddress]);
      } else if (selection === SELECTED_TOKEN.TO_ADDRESS) {
        setToAddress(e.target.value);
        getSwapQuote(fromAmount, [fromAddress, e.target.value]);
      }
    },
    [fromAddress, fromAmount, toAddress]
  );

  const onApproveClicked = React.useCallback(() => {
    const { decimals } = TOKEN_LIST.find(
      (token) => token.address === fromAddress
    );
    const amountApprove = ethers.utils.parseUnits(fromAmount, decimals);
    const tokenContract = new Contract(
      fromAddress,
      TOKEN_ERC_SWAP_ABI,
      provider.getSigner()
    );
    const tx = tokenContract.approve(walletAddress, amountApprove);
    tx.then((response) => {
      console.log(response);
      setIsApproved(true);
    }).catch(console.error);
  }, [fromAmount, fromAddress, walletAddress]);

  const onSwapSubmit = React.useCallback(
    (e) => {
      e.preventDefault();
      const { decimals: fromDecimals } = TOKEN_LIST.find(
        (token) => token.address === fromAddress
      );
      const { decimals: toDecimals } = TOKEN_LIST.find(
        (token) => token.address === toAddress
      );
      const amountFrom = ethers.utils.parseUnits(fromAmount, fromDecimals);
      const amountTo = ethers.utils.parseUnits(toAmount, toDecimals);
      const amountOutMin = amountTo.sub(amountTo.mul(15).div(100));

      const tx = dexContract.swapExactTokensForTokens(
        amountFrom,
        amountOutMin,
        [fromAddress, toAddress],
        walletAddress,
        (Date.now() + 1000) * 60 * 10
      );
      tx.then((response) => {
        alert('Swap executed successfully');
        console.log(response);
      }).catch(console.error);
    },
    [fromAddress, toAddress, fromAmount, toAmount, dexContract, walletAddress]
  );

  React.useEffect(() => {
    setIsConnected(walletAddress !== null);
  }, [walletAddress]);

  React.useEffect(() => {
    setDexContract(() => {
      return new Contract(
        DEX_LIST[selectedDex].address,
        DEX_ERC_SWAP_ABI,
        provider.getSigner()
      );
    });
  }, [isConnected, selectedDex]);

  return (
    <div className="content">
      <header>
        <div className="top-bar" role="alert">
          {!walletAddress && (
            <span>🚫 &nbsp;You're not connected, connect wallet</span>
          )}
          {walletAddress && <span>✅ &nbsp;Connected {walletAddress} :)</span>}
          <button disabled={isConnected} onClick={onConnectClicked}>
            Connect wallet
          </button>
        </div>
        <h1>Hello Swap!</h1>
        <p>This is a simplified Multi-DEX running Sushi, Viper, OKX.</p>
      </header>
      <main>
        <ul>
          <li>These codes are written for development purposes only.</li>
          <li>ETH &lt;=&gt; USDC not working on Viper</li>
          <li>
            View on <a href="https://github.com/toniton/hello-swap">Github</a>
          </li>
        </ul>
        <form onSubmit={onSwapSubmit}>
          <div className="button-group">
            {Object.keys(DEX_LIST).map((dexKey) => (
              <button
                key={dexKey}
                type="button"
                onClick={onDexSelected(dexKey)}
                className={`
                  small outline 
                  ${
                    isConnected && selectedDex.toString() === dexKey
                      ? 'active'
                      : ''
                  }
                `}
                disabled={walletAddress === null}
              >
                {DEX_LIST[dexKey].name}
              </button>
            ))}
          </div>
          <fieldset>
            <legend>From Token</legend>
            <div className="input-group">
              <input
                name="fromAmount"
                autoComplete="off"
                autoCorrect="off"
                type="text"
                placeholder="0"
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
                    disabled={token.address === toAddress}
                  >
                    {token.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <button
            className="outline small"
            disabled={walletAddress === null || isApproved}
            type="button"
            onClick={onApproveClicked}
          >
            Approve
          </button>
          {isApproved && <span>✅ </span>}
          <fieldset>
            <legend>To Token</legend>
            <div className="input-group">
              <input
                name="toAmount"
                autoComplete="off"
                autoCorrect="off"
                type="text"
                readOnly={true}
                placeholder="0"
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
                    disabled={token.address === fromAddress}
                  >
                    {token.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <button disabled={walletAddress === null} type="submit">
            Swap
          </button>
          <p>
            <small className="background-text-color">
              Powered by: {DEX_LIST[selectedDex].name}
            </small>
          </p>
        </form>
      </main>
    </div>
  );
}
