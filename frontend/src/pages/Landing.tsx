import { Link } from 'react-router-dom';
import { useWallet } from '../lib/wallet/WalletContext';
import { ArrowRight, ShieldCheck, Users, RefreshCw } from 'lucide-react';

const Landing = () => {
  const { connect, address } = useWallet();

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-16">
      <div className="text-center max-w-3xl space-y-6">
        <h1 className="text-5xl font-extrabold text-[#F5F3FF] tracking-tight">
          Save Together, Trustlessly
        </h1>
        <p className="text-xl text-[#8B85A7]">
          ChitVault brings the traditional rotating savings and credit association (ROSCA) model to the blockchain. 
          No middleman. No risk of organizers running away with funds. Just secure, automated, and transparent savings.
        </p>
        <div className="flex justify-center space-x-4 pt-4">
          {address ? (
            <Link to="/dashboard" className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center">
              Go to Dashboard <ArrowRight className="ml-2" size={20} />
            </Link>
          ) : (
            <button onClick={connect} className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center cursor-pointer">
              Connect Wallet to Start <ArrowRight className="ml-2" size={20} />
            </button>
          )}
          <a href="#how-it-works" className="bg-[#140E28] hover:bg-[#140E28]/80 text-[#F5F3FF] border border-[#8B85A7]/20 px-8 py-3 rounded-xl font-semibold transition-all">
            Learn More
          </a>
        </div>
      </div>

      <div id="how-it-works" className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        <div className="bg-[#140E28] p-8 rounded-2xl shadow-sm border border-[#8B85A7]/20 flex flex-col items-center text-center space-y-4">
          <div className="bg-[#6366F1]/10 p-4 rounded-full text-[#6366F1]">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#F5F3FF]">Form a Group</h3>
          <p className="text-[#8B85A7]">Invite trusted members. Everyone agrees to contribute a fixed amount each month.</p>
        </div>
        <div className="bg-[#140E28] p-8 rounded-2xl shadow-sm border border-[#8B85A7]/20 flex flex-col items-center text-center space-y-4">
          <div className="bg-[#6366F1]/10 p-4 rounded-full text-[#6366F1]">
            <ShieldCheck size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#F5F3FF]">Secure Escrow</h3>
          <p className="text-[#8B85A7]">Funds are locked in a Soroban smart contract. Nobody can access them out of turn.</p>
        </div>
        <div className="bg-[#140E28] p-8 rounded-2xl shadow-sm border border-[#8B85A7]/20 flex flex-col items-center text-center space-y-4">
          <div className="bg-[#6366F1]/10 p-4 rounded-full text-[#6366F1]">
            <RefreshCw size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#F5F3FF]">Rotate & Payout</h3>
          <p className="text-[#8B85A7]">Each round, once everyone contributes, the full pooled amount is disbursed to one member automatically.</p>
        </div>
      </div>
      
      <div className="bg-[#140E28] text-white p-8 rounded-2xl max-w-3xl w-full text-center space-y-4 mt-12 border border-[#8B85A7]/20">
        <h2 className="text-2xl font-bold">New to Stellar?</h2>
        <p className="text-[#8B85A7]">
          ChitVault is currently running on the Stellar Testnet. You'll need the Freighter wallet extension and some testnet XLM.
        </p>
        <div className="flex justify-center space-x-4 pt-2">
          <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:text-[#C084FC] underline font-medium">Install Freighter</a>
          <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:text-[#C084FC] underline font-medium">Get Testnet XLM</a>
        </div>
      </div>
    </div>
  );
};

export default Landing;

// Guided tour implementation