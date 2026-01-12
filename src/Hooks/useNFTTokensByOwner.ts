import { useCallback } from "react";
import { ethers } from "ethers";
import EnvManager from "@/config/EnvManager";
import config from "@/config/config";

interface NFTCall {
  contractAddress: string;
  abi: any; // 每个合约可传不同 ABI
  params?: any[];
}
/**
 * 支持动态 ABI 的 NFT multicall（ethers v6）
 */
export const useNFTMulticall = () => {
  const fetch = useCallback(async (methodName: string, calls: NFTCall[]) => {
    try {
      // ✅ v6：BrowserProvider
        const provider = new ethers.JsonRpcProvider(config.url, 56);
      
      // multicall 合约
      const multicallContract = new ethers.Contract(
        EnvManager.multiCallToken,
        [
          "function aggregate(tuple(address target, bytes callData)[] calls) view returns (uint256 blockNumber, bytes[] returnData)",
        ],
        provider
      );

      // 构造 callData（动态 ABI）
      const callDataArray = calls.map(
        ({ contractAddress, abi, params = [] }) => {
          const iface = new ethers.Interface(abi);
          const callData = iface.encodeFunctionData(methodName, params);
          return {
            target: contractAddress,
            callData,
          };
        }
      );

      // 调用 multicall
      const [, returnData]: [bigint, string[]] =
        await multicallContract.aggregate(callDataArray);

      // 解码返回值
      const results = returnData.map((data, i) => {
        const { abi } = calls[i];
        const iface = new ethers.Interface(abi);
        const decoded = iface.decodeFunctionResult(methodName, data);
        // 单返回值直接取
        return decoded.length === 1 ? decoded[0] : decoded;
      });

      return { success: true, data: results };
    } catch (err: any) {
      console.error(err);
      return {
        success: false,
        error: err?.message || "Multicall failed",
      };
    }
  }, []);

  return { fetch };
};
