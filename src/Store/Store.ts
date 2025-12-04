import { create } from 'zustand';

interface UserAddressState {
    address: string;
    setAddress: (address: string) => void;
}

interface ChainState {
    chain: string;
    setChain: (chain: string) => void;
}

// 创建 钱包地址 store
export const userAddress = create<UserAddressState>((set) => ({
    address: "",
    setAddress: (address: string) => set({ address }),
}));

// 创建 链ID store
export const userChainId = create<ChainState>((set) => ({
    chain: "",
    setChain: (chain: string) => set({ chain }),
}));