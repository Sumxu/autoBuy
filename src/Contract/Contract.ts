interface ContractItem {
  address: string;
  abi: any[]; // 或具体ABI类型
}
interface ContractMap {
  [key: string]: ContractItem;
}

const Contract: ContractMap = {
 
};
// 正式
export default Contract;
