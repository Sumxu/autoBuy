const config = {
  wallets: [
    "",
    "",
  ],
  bizInterval: 86400, //做市订单延迟购买间隔，秒数		86400 一天
  marketInterval: 307, //普通市场订单延迟购买间隔，秒数  300秒 5分钟
  minAmount: 1, //最低成交额度
  maxAmount: 10000, //最大成交额度
  url: "https://bsc.blockrazor.xyz/1915635065170173952",
};

export default config;
