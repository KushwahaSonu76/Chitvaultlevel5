import React, { createContext, useContext, useState, useEffect } from 'react';
import { StellarWalletsKit, Networks } from '@creit.tech/stellar-wallets-kit';
import { defaultModules } from '@creit.tech/stellar-wallets-kit/modules/utils';
import posthog from 'posthog-js';

interface WalletContextType {
  address: string | null;
  kit: typeof StellarWalletsKit;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  kit: StellarWalletsKit,
  connect: async () => {},
  disconnect: () => {},
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    StellarWalletsKit.init({
      network: Networks.TESTNET,
      selectedWalletId: 'freighter',
      modules: defaultModules(),
    });
    
    // Check if there is an active address in storage
    StellarWalletsKit.getAddress()
      .then(({ address }) => setAddress(address))
      .catch(() => {});
  }, []);

  const connect = async () => {
    try {
      const { address: userAddress } = await StellarWalletsKit.authModal();
      setAddress(userAddress);
      posthog.capture('wallet_connected', { address: userAddress });
      posthog.identify(userAddress);
    } catch (e) {
      console.error('Wallet connection failed', e);
    }
  };

  const disconnect = async () => {
    try {
      await StellarWalletsKit.disconnect();
      setAddress(null);
      posthog.capture('wallet_disconnected');
      posthog.reset();
    } catch (e) {
      console.error('Disconnect failed', e);
    }
  };

  return (
    <WalletContext.Provider value={{ address, kit: StellarWalletsKit, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
