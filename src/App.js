import "./App.css";
import { useWeb3React } from "@web3-react/core";
import Web3 from "web3";
import { useEffect, useState } from "react";
import { ERC20 } from "./contract/ERC20";
import { WETH } from "./contract/WETH";
import { injected, walletConnectConnector } from "./utils";
import { Modal, Table } from "antd";
import { user } from "./services/userInfo";
import {
  ContractCallContext,
  ContractCallResults,
  Multicall,
} from "ethereum-multicall";

function App() {
  const { account, chainId, connector, activate, library } = useWeb3React();
  const [balance, setBlance] = useState(0);
  const [isApproved, setIsApproved] = useState(false);
  const [isModalVisibleStake, setIsModalVisibleStake] = useState(false);
  const [isModalVisibleWithDraw, setIsModalVisibleWithDraw] = useState(false);
  const [weth, setWeth] = useState("");
  const [amount, setAmount] = useState("");
  const [totalSupplyWeth, setTotalSupplyWeth] = useState(0);
  const [histories, setHistories] = useState([]);

  const columns = [
    {
      title: "Action",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
    },
  ];

  const connectInjectedConnector = () => {
    activate(injected);
    localStorage.setItem("CONNECTED", "METAMASK");
  };

  const connectWalletConnectConnector = () => {
    activate(walletConnectConnector, undefined, true).catch((e) =>
      console.log("ee", e)
    );
    localStorage.setItem("CONNECTED", "WALLETCONNECT");
  };

  const showModal = () => {
    setIsModalVisibleStake(true);
  };

  const showModalW = () => {
    setIsModalVisibleWithDraw(true);
  };

  const handleCancel = () => {
    setIsModalVisibleStake(false);
  };

  const handleCancelWithDraw = () => {
    setIsModalVisibleWithDraw(false);
  };


  const convertNumber = (number) => {
    const web3 = new Web3(library.provider);
    return +web3.utils.fromWei(number);
  };

  const convertHexNumber = (number) => {
    const web3 = new Web3(library.provider);
    return +convertNumber(web3.utils.toBN(number).toString());
  };

   const convertMulticallData = (data) => {
     return data.callsReturnContext[0].returnValues[0].hex;
   };

  const getBalance = async () => {
    const web3 = new Web3(library.provider);
    const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });
    const contractCallContext = [
      {
        reference: "totalSupply",
        contractAddress: WETH.Address,
        abi: ERC20.ABI,
        calls: [
          {
            reference: "totalSupply",
            methodName: "totalSupply",
            methodParameters: [],
          },
        ],
      },
      {
        reference: "balanceAccount",
        contractAddress: WETH.Address,
        abi: ERC20.ABI,
        calls: [
          {
            reference: "balanceAccount",
            methodName: "balanceOf",
            methodParameters: [account],
          },
        ],
      },
    ];

    try {
      const results = await multicall.call(contractCallContext);
      if (results && results.results) {
        setTotalSupplyWeth( convertHexNumber(convertMulticallData(results.results.balanceAccount)));
        setBlance( convertHexNumber(convertMulticallData(results.results.balanceAccount)));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getStaticInfo = async () => {
    await getBalance();
  };

  const deposit = async () => {
    const web3 = new Web3(library.provider);
    const wethContract = new web3.eth.Contract(ERC20.ABI, WETH.Address);
    await wethContract.methods
      .deposit()
      .send({ value: web3.utils.toWei(weth), from: account });
    setIsModalVisibleStake(false);
    getStaticInfo();
    getUserHistory();
  };

  const withDraw = async () => {
    const web3 = new Web3(library.provider);
    const wethContract = new web3.eth.Contract(WETH.ABI, WETH.Address);
    await wethContract.methods
      .withdraw(web3.utils.toWei(amount))
      .send({ from: account });
    setIsModalVisibleWithDraw(false);
    getStaticInfo();
    getUserHistory();
  };

  const handleApproved = async () => {
    const web3 = new Web3(library.provider);
    const wethContract = new web3.eth.Contract(WETH.ABI, WETH.Address);
    await wethContract.methods
      .approve(account, web3.utils.toWei(balance.toString()))
      .send({ from: account });
    setIsApproved(true);
  };

  function handleChangeWeth(event) {
    const weth = event.target.value;
    setWeth(weth);
  }

  function handleChangeAmount(event) {
    const amount = event.target.value;
    setAmount(amount);
  }

  useEffect(() => {
    checkConnect();
  }, [account]);

  async function getUserHistory(account) {
    const histories = await user.getHistory(account.toLowerCase());
    setHistories(histories.data.userHistories);
  }

  const checkConnect = async () => {
    if (!account) {
      const connected = localStorage.getItem("CONNECTED");
      if (connected === "METAMASK") {
        const isAuthorized = await injected.isAuthorized();
        if (isAuthorized) {
          activate(injected);
        }
      }
      if (connected === "WALLETCONNET") {
        activate(walletConnectConnector);
      }
      return;
    }
    getStaticInfo();
    getUserHistory(account);
  };

  return (
    <div className="App">
      <div style={{ marginTop: "4rem" }}>
        {account ? (
          <>
            {" "}
            <h1>Account: {account} </h1>
            <h2>Balance: {balance} WETH</h2>
            <h2>Token Earn: 0 DD2</h2>
            <h2>Your Stake: 0 WETH</h2>
            <h2>Total Stake: {totalSupplyWeth} WETH</h2>
            <button onClick={showModal}>Harvest</button>
            <Modal
              footer={null}
              title="Stake"
              visible={isModalVisibleStake}
              onCancel={handleCancel}
            >
              <input onChange={handleChangeWeth} />
              <p>Your Balance: {balance} WETH</p>
              <button onClick={deposit}>Stake</button>
            </Modal>
            <Modal
              footer={null}
              title="WithDraw"
              visible={isModalVisibleWithDraw}
              onCancel={handleCancelWithDraw}
            >
              <input onChange={handleChangeAmount} />
              <p>Your Balance: {balance} WETH</p>
              <button onClick={withDraw}>WithDraw</button>
            </Modal>
            {!isApproved ? (
              <button onClick={handleApproved}>Approved</button>
            ) : (
              <>
                <button onClick={showModal}>Deposit</button>
                <button onClick={showModalW}>WithDraw WETH</button>
              </>
            )}
            <Table dataSource={histories} columns={columns} />
          </>
        ) : (
          <>
            <button onClick={connectInjectedConnector}>Connect Metamask</button>
            <br />
            <button
              style={{ marginTop: "3rem" }}
              onClick={connectWalletConnectConnector}
            >
              Connect WalletConnect
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
