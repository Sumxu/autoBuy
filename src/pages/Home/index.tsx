import "./index.scss";
import React, { useEffect, useState } from "react";
import config from "@/config/config";
import abi from "@/Contract/ABI/abi.json" with {type: "json"};
import { ethers } from "ethers";
import { Input, Button, Space, Switch } from 'antd-mobile'
const Home: React.FC = () => {
  //动态绑定配置项
  const [configObject, setConfigObject] = useState<any>(config);
  //动态绑定定时任务

  const [robotRunning, setRobotRunning] = useState<boolean>(false);
  const timerRef = React.useRef<any>(null);
  const monitor_contract = "0x4b263e8c60f47decF76BD05B5001c753cd63e35F";
  const provider = new ethers.JsonRpcProvider(configObject.url, 56);
  let nextWalletIndex = 0;
  const [logs, setLogs] = useState<string[]>([]);
  async function checkAndApprove(wallet) {
    const USDT = new ethers.Contract(
      "0x55d398326f99059fF775485246999027B3197955",
      [
        "function approve(address to,uint256 amount)",
        "function allowance(address,address) view returns(uint256)",
      ],
      wallet
    );
    const amount = await USDT.allowance(wallet.address, monitor_contract);
    if (amount < 20000000000000000000000n) {
      appendLog(
        "USDT授权额度不足,需要增加USDT授权",
        wallet.address,
        amount / 1000000000000000000n,
        200000n
      );
      const tx = await USDT.approve(
        monitor_contract,
        200000000000000000000000n
      );
      await tx.wait();
      appendLog("USDT授权授权成功", wallet.address, 200000n);
    }
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 封装日志方法
  const appendLog = (...msg: any[]) => {
    const text = msg.map(m => (typeof m === "object" ? JSON.stringify(m) : m)).join(" ");
     // 最新日志放在最前面
  setLogs(prev => [text, ...prev]);
  };
  const buyLog = {};

  async function doLogs() {
    const privateKey = configObject.wallets[nextWalletIndex];

    const wallet = new ethers.Wallet(privateKey, provider);

    await checkAndApprove(wallet);

    const contract = new ethers.Contract(monitor_contract, abi, wallet);

    const length = await contract.getSellOrderLength();

    appendLog("全网订单簿数量:   " + length);

    for (let i = 0n; i < length; i++) {
      const result = await contract.sellOrders(i);

      const id = result[0]; //订单ID
      const from = result[1]; //发起地址
      const price = result[2]; //订单价格

      const amount = result[4]; //订单数量
      const timestamp = Number(result[5]); //下单时间
      const isMarket = result[7]; //是否是做市订单
      const to = result[8]; //是否指定交易对象

      if (buyLog[id]) {
        continue;
      }

      const orderTime = new Date(timestamp * 1000);
      const amountFormat = ethers.formatEther(amount);

      appendLog(
        "发现新的订单  订单ID: %s,发起地址: %s,订单价格:%s,订单数量:%s,做市商订单:%s,指定地址:%s,下单时间:%s,",
        id,
        from,
        ethers.formatEther(price),
        amountFormat,
        isMarket ? "是" : "否",
        to,
        orderTime
      );

      if (amountFormat > configObject.maxAmount || amountFormat < configObject.minAmount) {
        appendLog(
          "发现新的订单  订单ID: %s,不符合数量要求，当前:%d ,最小 %d ,最大：%d ",
          id,
          amountFormat,
          configObject.minAmount,
          configObject.maxAmount
        );
        buyLog[id] = true;
        continue;

      }
      const now = parseInt((new Date().getTime() / 1000).toFixed(0));
      const interval = isMarket ? configObject.bizInterval : configObject.marketInterval;
      let delayS = interval - (now - timestamp);

      delayS = delayS > 0 ? delayS : 0;

      if (isMarket || to !== "0x0000000000000000000000000000000000000000") {
        //管理单
        appendLog("发现做市商订单,延迟购买:", id, amountFormat, delayS);
        nextWalletIndex++;
        if (nextWalletIndex >= configObject.wallets.length) {
          nextWalletIndex = 0;
        }
        setTimeout(() => {
          buy(wallet.address, contract, id, amount, isMarket);
        }, delayS * 1000);
      } else {
        appendLog("发现普通市场订单,延迟秒购买:", id, amountFormat, delayS);
        nextWalletIndex++;
        if (nextWalletIndex >= configObject.wallets.length) {
          nextWalletIndex = 0;
        }
        setTimeout(() => {
          buy(wallet.address, contract, id, amount, isMarket);
        }, delayS * 1000);
      }

      buyLog[id] = true;
    }
  }

  async function buy(singerAddress, contract, id, amount, isMarket) {
    try {
      //      initUser();
      appendLog(
        isMarket
          ? "做市商订单开始购买: id %d 数量：%d 发起地址: %s "
          : "普通订单开始购买: id %d 数量：%d 发起地址: %s ",
        id,
        amount,
        singerAddress
      );
      const tx = await contract.buy(id, amount);
      await tx.wait();
    } catch (e) {
      try {
        await delay(1500);
        appendLog(
          isMarket
            ? "做市商订单购买失败,重试购买:"
            : "普通订单购买失败,重试购买:",
          id,
          amount
        );
        const tx = await contract.buy(id, amount);
        await tx.wait();
      } catch (e) {
        appendLog(
          isMarket
            ? "做市商订单重试购买失败,结束:"
            : "普通订单重试购买失败,结束:",
          id,
          amount,
          e.reason
        );
      }
    }
  }
  //initUser();
  async function startup(isRunning) {
    if (timerRef.current) return; // 避免重复开启
    appendLog("机器人开始启动...");
    appendLog("配置项...",configObject);
    for (let i = 0; i < configObject.wallets.length; i++) {
      appendLog(
        "读取到执行钱包...  %s",
        new ethers.Wallet(configObject.wallets[i]).address
      );
    }

    appendLog("机器人开始启动...", isRunning);
    timerRef.current = setInterval(async () => {
      if (!isRunning) return; // 双保险
      try {
        await doLogs();
      } catch (e) {
        appendLog("执行出现错误：", e);
      }
    }, 5000);
  }
  const stopRobot = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    appendLog("机器人已停止。");
  };
  // 更新字段
  const updateField = (key: string, value: string) => {
    setConfigObject((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // 更新钱包
  const updateWallet = (index: number, value: string) => {
    const newWallets = [...configObject.wallets];
    newWallets[index] = value;
    setConfigObject((prev) => ({ ...prev, wallets: newWallets }));
  };

  // 新增钱包
  const addWallet = () => {
    setConfigObject((prev) => ({
      ...prev,
      wallets: [...prev.wallets, ""],
    }));
  };

  const handleUpdateConfig = async () => {
    appendLog("开始更新配置...");
    stopRobot()
    // 1. 先关闭机器人（如果正在运行）
    if (robotRunning) {
      appendLog("正在关闭机器人以应用新配置...");
      // 清除定时器
      setRobotRunning(false);
    }
    try {
     //更新configObject
      setConfigObject(prev => ({ ...prev }));
      appendLog("配置已更新:", configObject);
      // 3. 重新启动机器人
      appendLog("正在重新启动机器人...");
      startup(true);
      setRobotRunning(true);
      appendLog("机器人已重新运行 ✔");
    } catch (e) {
      appendLog("更新配置失败：", e);
    }
  };
  const switchChange = (val: boolean) => {
    setRobotRunning(val);
    if (val) {
      appendLog("机器人已开启，开始监听订单...");
      startup(val);
    } else {
      appendLog("机器人已关闭，停止监控。");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }
  useEffect(() => {

  }, []);
  return (
    <div className="home-page-box">
      <div style={{ padding: 8 }}>
        <h1 className="Title">动态配置</h1>
        <Space direction="vertical" style={{ width: "100%" }}>
          <h3>做市订单延迟购买间隔(秒)</h3>
          <Input
            value={configObject.bizInterval}
            onChange={(v) => updateField("bizInterval", v)}
            placeholder="做市订单延迟购买间隔(秒)"
          />
          <h3>普通市场订单延迟购买间隔(秒)</h3>
          <Input
            value={configObject.marketInterval}
            onChange={(v) => updateField("marketInterval", v)}
            placeholder="普通市场订单延迟购买间隔(秒)"
          />
          <h3>最低成交额度</h3>
          <Input
            value={configObject.minAmount}
            onChange={(v) => updateField("minAmount", v)}
            placeholder="最低成交额度"
          />
          <h3>最大成交额度</h3>
          <Input
            value={configObject.maxAmount}
            onChange={(v) => updateField("maxAmount", v)}
            placeholder="最大成交额度"
          />
          <h3>RPC Url</h3>
          <Input
            value={configObject.url}
            onChange={(v) => updateField("url", v)}
            placeholder="RPC Url"
          />
          <h4>钱包列表</h4>
          {configObject.wallets.map((w, idx) => (
            <Space key={idx} align="center" style={{ width: "100%" }}>
              <Input
                value={w}
                onChange={(v) => updateWallet(idx, v)}
                placeholder={`钱包地址 ${idx + 1}`}
                className="inputWalletsOption"
              />

              <Button
                color="danger"
                size="small"
                className="delBtn"
                onClick={() => {
                  const newWallets = configObject.wallets.filter(
                    (_, index) => index !== idx
                  );
                  setConfigObject((prev) => ({ ...prev, wallets: newWallets }));
                }}
              >
                删除
              </Button>
            </Space>
          ))}
          <Button color="primary" onClick={addWallet}>
            + 新增钱包
          </Button>

          <div className="fixedBottom">
            <Button
              color="success"
              className="fixedBottomBtn"
              onClick={handleUpdateConfig}
              style={{ marginTop: 16 }}
              
            >
              更新配置
            </Button>
          </div>
          <h3>是否开启机器人</h3>
          <Switch uncheckedText='关'
           checked={robotRunning}
          checkedText='开' onChange={(val) => switchChange(val)} />
          <h3>运行日志</h3>
          <div className="log-content" id="logBox">
            {logs.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </Space>
      </div>
    </div>
  );
};
export default Home;
