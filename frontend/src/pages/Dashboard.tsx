import { useState, useEffect } from 'react';
import { useWallet } from '../lib/wallet/WalletContext';
import { Link } from 'react-router-dom';
import { getMemberChits } from '../lib/contract/soroban';

const Dashboard = () => {
  const { address } = useWallet();
  const [chits, setChits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [showTour, setShowTour] = useState(() => {
    return localStorage.getItem('hasSeenTour') !== 'true';
  });

  const dismissTour = () => {
    localStorage.setItem('hasSeenTour', 'true');
    setShowTour(false);
  };

  useEffect(() => {
    if (address) {
      setLoading(true);
      getMemberChits(address)
        .then(res => {
          setChits(res);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [address]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold text-gray-800">Please connect your wallet</h2>
        <p className="text-gray-600 mt-2">You need to connect your Freighter wallet to view your dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative text-[#F5F3FF]">
      {showTour && (
        <div className="bg-[#140E28] p-6 rounded-xl border-2 border-[#6366F1] shadow-lg mb-8 relative">
          <button 
            onClick={dismissTour}
            className="absolute top-4 right-4 text-[#8B85A7] hover:text-[#F5F3FF] cursor-pointer"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold text-[#F5F3FF] mb-2">👋 Welcome to ChitVault!</h2>
          <p className="text-[#8B85A7] mb-4">You're connected and ready to go. Here is how it works:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#080510] p-4 rounded-lg border border-[#8B85A7]/10">
              <span className="font-bold text-[#6366F1]">1. Get Testnet XLM</span>
              <p className="text-sm text-[#8B85A7] mt-1">Make sure you have Testnet XLM in your Freighter wallet to pay for contributions and fees.</p>
            </div>
            <div className="bg-[#080510] p-4 rounded-lg border border-[#8B85A7]/10">
              <span className="font-bold text-[#6366F1]">2. Join or Create</span>
              <p className="text-sm text-[#8B85A7] mt-1">Create a new Savings Group or ask a friend for a link to join theirs.</p>
            </div>
            <div className="bg-[#080510] p-4 rounded-lg border border-[#8B85A7]/10">
              <span className="font-bold text-[#6366F1]">3. Contribute</span>
              <p className="text-sm text-[#8B85A7] mt-1">Contribute your share each round and get disbursed when it's your turn!</p>
            </div>
          </div>
          <button 
            onClick={dismissTour}
            className="bg-[#6366F1] text-white px-6 py-2 rounded-lg font-medium hover:bg-[#6366F1]/90 cursor-pointer"
          >
            Got it, let's start!
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#F5F3FF]">My Savings Groups</h1>
        <Link to="/create" className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Create New Group
        </Link>
      </div>

      {chits.length > 0 && (
        <div className="flex space-x-4 border-b border-[#8B85A7]/20">
          <button
            onClick={() => setActiveTab('active')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'active' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent text-[#8B85A7] hover:text-[#F5F3FF]'
            }`}
          >
            Active Groups
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'completed' ? 'border-[#6366F1] text-[#6366F1]' : 'border-transparent text-[#8B85A7] hover:text-[#F5F3FF]'
            }`}
          >
            Completed Groups
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[#140E28] p-6 rounded-xl border border-[#8B85A7]/20 shadow-sm animate-pulse space-y-4">
              <div className="h-6 bg-[#080510] rounded w-1/3"></div>
              <div className="h-4 bg-[#080510] rounded w-1/2"></div>
              <div className="h-10 bg-[#080510] rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      ) : chits.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chits.filter(chit => {
            const isCompleted = chit.current_round >= chit.total_rounds;
            return activeTab === 'active' ? !isCompleted : isCompleted;
          }).map(chit => (
            <div key={chit.id} className="bg-[#140E28] p-6 rounded-xl border border-[#8B85A7]/20 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#F5F3FF]">Group #{chit.id}</h3>
                <span className={
                  chit.current_round >= chit.total_rounds
                    ? "bg-[#080510] text-[#8B85A7] text-xs px-2 py-1 rounded-full font-semibold border border-[#8B85A7]/20"
                    : "bg-[#6366F1]/10 text-[#6366F1] text-xs px-2 py-1 rounded-full font-semibold border border-[#6366F1]/20"
                }>
                  {chit.current_round >= chit.total_rounds ? 'Completed' : 'Active'}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B85A7]">Monthly Contribution:</span>
                  <span className="font-medium text-[#F5F3FF]">{chit.contribution_amount / 10000000} XLM</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#8B85A7]">Progress:</span>
                  <span className="font-medium text-[#F5F3FF]">Round {chit.current_round} of {chit.total_rounds}</span>
                </div>
              </div>
              <Link to={`/chit/${chit.id}`} className="w-full block text-center bg-[#080510] hover:bg-[#080510]/80 text-[#6366F1] font-medium py-2 rounded-lg transition-colors border border-[#8B85A7]/20">
                View Details
              </Link>
            </div>
          ))}
          {chits.filter(chit => {
            const isCompleted = chit.current_round >= chit.total_rounds;
            return activeTab === 'active' ? !isCompleted : isCompleted;
          }).length === 0 && (
            <div className="col-span-full py-10 text-center text-[#8B85A7]">
              No {activeTab} groups found.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#140E28] p-12 rounded-xl border border-[#8B85A7]/20 text-center space-y-4 flex flex-col items-center">
          <div className="bg-[#080510] p-4 rounded-full mb-2 border border-[#8B85A7]/10">
            <span className="text-4xl">📭</span>
          </div>
          <h3 className="text-xl font-medium text-[#F5F3FF]">No groups</h3>
          <p className="text-[#8B85A7] max-w-md mx-auto mb-2">You aren't a member of any savings groups yet. Create a new one or ask a friend for an invite link.</p>
          <div className="flex space-x-4 mt-2">
            <Link to="/create" className="bg-[#6366F1] hover:bg-[#6366F1]/90 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
              Create First Group
            </Link>
            <a href="https://laboratory.stellar.org/#account-creator?network=test" target="_blank" rel="noopener noreferrer" className="bg-[#140E28] hover:bg-[#140E28]/80 text-[#F5F3FF] border border-[#8B85A7]/20 px-6 py-2.5 rounded-lg font-medium transition-colors inline-flex items-center">
              Get Testnet XLM
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
