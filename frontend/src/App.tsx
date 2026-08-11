import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { WalletProvider, useWallet } from './lib/wallet/WalletContext';
import { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateChit from './pages/CreateChit';
import ViewChit from './pages/ViewChit';
import posthog from 'posthog-js'
import * as Sentry from "@sentry/react";
import { LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
// Initialize Analytics (Requires real env variables for production)
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  });
}

// Initialize Sentry
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost", /^https:\/\/yourserver\.io\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

const Navigation = () => {
  const { address, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      const fetchBalance = async () => {
        try {
          const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
          const account = await server.loadAccount(address);
          const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native')?.balance;
          if (nativeBalance) {
            setBalance(parseFloat(nativeBalance).toFixed(2));
          }
        } catch (error) {
          console.error("Error fetching balance:", error);
        }
      };
      fetchBalance();
      const interval = setInterval(fetchBalance, 15000);
      return () => clearInterval(interval);
    } else {
      setBalance(null);
    }
  }, [address]);


  return (
    <nav className="bg-[#140E28] border-b border-[#8B85A7]/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
         <div className="flex justify-between h-16">
           <div className="flex">
             <Link to="/" className="flex-shrink-0 flex items-center">
               <span className="text-2xl font-bold bg-gradient-to-r from-[#6366F1] to-[#A855F7] bg-clip-text text-transparent">ChitVault</span>
             </Link>
             <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
               <Link to="/dashboard" className="border-transparent text-[#8B85A7] hover:border-[#6366F1] hover:text-[#F5F3FF] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                 Dashboard
               </Link>
               <Link to="/create" className="border-transparent text-[#8B85A7] hover:border-[#6366F1] hover:text-[#F5F3FF] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                 Create Group
               </Link>
             </div>
           </div>
           <div className="flex items-center">
             {address ? (
               <div className="flex items-center space-x-4">
                 {balance && (
                   <span className="text-sm font-semibold text-[#6366F1] bg-[#6366F1]/10 px-3 py-1 rounded-full border border-[#6366F1]/20">
                     {balance} XLM
                   </span>
                 )}
                 <span 
                   onClick={() => {
                     navigator.clipboard.writeText(address);
                     alert("Wallet address copied to clipboard!");
                   }}
                   className="text-sm text-[#F5F3FF] bg-[#140E28] border border-[#8B85A7]/20 px-3 py-1 rounded-full cursor-pointer hover:bg-[#140E28]/80 transition-colors"
                   title="Click to copy address"
                 >
                   {address.slice(0, 4)}...{address.slice(-4)}
                 </span>
                 <button
                   onClick={disconnect}
                   className="text-[#8B85A7] hover:text-[#F5F3FF] p-2"
                   title="Disconnect"
                 >
                   <LogOut size={20} />
                 </button>
               </div>
             ) : (
               <button
                 onClick={connect}
                 className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:opacity-90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
               >
                 Connect Wallet
               </button>
             )}
           </div>
         </div>
       </div>
     </nav>
   );
 };
 
 function App() {
   return (
     <WalletProvider>
       <Router>
         <div className="min-h-screen bg-[#080510] text-[#F5F3FF] flex flex-col">
           {/* Global Feedback Banner */}
           <div className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] text-white text-center py-2 px-4 text-sm font-medium">
             🚀 Help us reach Level 5!{' '}
             <a 
               href="https://docs.google.com/forms/d/1Kp_zkG56EDysinfOlHi5ZHyLMhuaiQIhEAOibGx5oMw/viewform" 
               target="_blank" 
               rel="noopener noreferrer" 
               className="underline font-bold hover:text-gray-200 transition-colors"
             >
               Share your feedback in this 1-min form
             </a>
           </div>
           <Navigation />
           <Toaster position="top-right" />
           <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
             <Routes>
               <Route path="/" element={<Landing />} />
               <Route path="/dashboard" element={<Dashboard />} />
               <Route path="/create" element={<CreateChit />} />
               <Route path="/chit/:id" element={<ViewChit />} />
             </Routes>
           </main>
         </div>
       </Router>
     </WalletProvider>
   );
 }

export default App;
