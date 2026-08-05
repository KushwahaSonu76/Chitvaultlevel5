import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWallet } from '../lib/wallet/WalletContext';
import { getChitStatus, contributeTx, disburseTx, getRoundContributions, CONTRACT_ID, type ChitStatus } from '../lib/contract/soroban';
import posthog from 'posthog-js';
import { submitFeedback } from '../lib/supabase';
import toast from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { Copy, Share2 } from 'lucide-react';

const ViewChit = () => {
  const { id } = useParams<{ id: string }>();
  const { address, kit } = useWallet();
  const [chit, setChit] = useState<ChitStatus | null>(null);
  const [contributions, setContributions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadChit();
      const intervalId = setInterval(loadChit, 10000);
      return () => clearInterval(intervalId);
    }
  }, [id]);

  const loadChit = async () => {
    try {
      setLoading(true);
      const chitId = parseInt(id!);
      const status = await getChitStatus(chitId);
      setChit(status);

      // Fetch actual contributions for current round
      try {
        const roundConts = await getRoundContributions(chitId, status.current_round);
        setContributions(roundConts);
      } catch (e) {
        console.error("Failed to load contributions status", e);
      }

      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load chit details.");
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!address || !kit || !chit) return;
    try {
      setActionLoading(true);
      setError('');
      
      const receipt = await contributeTx(kit, address, chit.id, chit.current_round);
      console.log("Contribute tx finalized on-chain:", receipt);
      
      posthog.capture('contribution_made', { chit_id: chit.id, round: chit.current_round });
      
      toast.success("Contribution successful on-chain!");
      loadChit(); // refresh
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Contribution failed.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async () => {
    if (!address || !kit || !chit) return;
    try {
      setActionLoading(true);
      setError('');
      
      const receipt = await disburseTx(kit, address, chit.id, chit.current_round);
      console.log("Disburse tx finalized on-chain:", receipt);
      
      posthog.capture('disbursement_triggered', { chit_id: chit.id, round: chit.current_round });
      
      toast.success("Disbursement successful! Round advanced on-chain.");
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      loadChit(); // refresh
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Disbursement failed.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 animate-pulse space-y-6">
        <div className="h-10 bg-[#140E28] rounded w-1/3"></div>
        <div className="h-40 bg-[#140E28] rounded w-full"></div>
      </div>
    );
  }

  if (!chit) {
    return <div className="text-center py-20 text-[#8B85A7]">Group not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-[#F5F3FF]">
      {!address && (
        <div className="bg-[#140E28] border border-[#8B85A7]/30 text-[#C084FC] px-4 py-3 rounded-lg flex items-center space-x-2">
          <span className="text-xl">👀</span>
          <span><strong>Preview Mode:</strong> You are viewing this group as a guest. Connect your wallet to join or contribute.</span>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <Link to="/dashboard" className="text-[#6366F1] hover:text-[#6366F1]/80 transition-colors text-sm font-medium mb-2 inline-flex items-center space-x-1">
            <span>&larr;</span> <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center space-x-4 mt-1">
            <h1 className="text-3xl font-bold text-[#F5F3FF]">Group #{chit.id}</h1>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Invite link copied!');
              }}
              className="text-[#8B85A7] hover:text-[#6366F1] transition-colors bg-[#140E28] p-2 rounded-full border border-[#8B85A7]/20 cursor-pointer"
              title="Copy Invite Link"
            >
              <Copy size={16} />
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('I just joined a secure trustless Savings Fund on @StellarOrg using ChitVault! 🚀 Join my group here:')}&url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B85A7] hover:text-blue-400 transition-colors bg-[#140E28] p-2 rounded-full border border-[#8B85A7]/20"
              title="Share to X"
            >
              <Share2 size={16} />
            </a>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={loadChit}
            disabled={actionLoading}
            className="bg-[#140E28] hover:bg-[#140E28]/80 text-[#F5F3FF] border border-[#8B85A7]/20 px-3 py-2 rounded-lg font-medium transition-colors text-sm flex items-center space-x-1 cursor-pointer"
            title="Refresh Group Data"
          >
            <span>🔄</span> <span>Refresh</span>
          </button>
          <div className="flex flex-col items-end min-w-[140px]">
            <div className="bg-[#6366F1]/10 text-[#6366F1] border border-[#6366F1]/20 px-4 py-1.5 rounded-lg font-medium mb-2 w-full text-center text-sm">
              Round {chit.current_round} of {chit.total_rounds}
            </div>
            <div className="w-full bg-[#140E28] border border-[#8B85A7]/20 rounded-full h-2">
              <div className="bg-gradient-to-r from-[#6366F1] to-[#A855F7] h-2 rounded-full transition-all duration-500" style={{ width: `${(chit.current_round / chit.total_rounds) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 text-red-400 p-4 rounded-lg border border-red-900/50">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#140E28] p-6 rounded-xl border border-[#8B85A7]/20 shadow-sm">
          <h3 className="text-lg font-bold text-[#F5F3FF] mb-4">Round Info</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8B85A7]">Contribution Amount:</span>
              <span className="font-bold text-[#F5F3FF]">{chit.contribution_amount / 10000000} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B85A7]">Total Pool:</span>
              <span className="font-bold text-[#F5F3FF]">{(chit.contribution_amount * chit.members.length) / 10000000} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8B85A7]">Recipient this round:</span>
              <span className="font-mono text-[#C084FC]">{chit.members[(chit.current_round - 1) % chit.members.length].slice(0, 8)}...</span>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-[#8B85A7]/10 space-y-3">
            <button
              onClick={handleContribute}
              disabled={actionLoading || !address || (address ? !!contributions[address] : false)}
              className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? 'Processing...' : (address && contributions[address] ? 'Already Contributed' : 'Make Contribution')}
            </button>
            <button
              onClick={handleDisburse}
              disabled={actionLoading || !address}
              className="w-full bg-[#080510] hover:bg-[#080510]/80 text-[#F5F3FF] font-medium py-2 rounded-lg transition-colors disabled:opacity-50 border border-[#8B85A7]/20 cursor-pointer"
            >
              Disburse & Advance Round
            </button>
          </div>
        </div>

        <div className="bg-[#140E28] p-6 rounded-xl border border-[#8B85A7]/20 shadow-sm">
          <h3 className="text-lg font-bold text-[#F5F3FF] mb-4">Members</h3>
          <ul className="space-y-3">
            {chit.members.map((m, idx) => {
              const hasPaid = !!contributions[m];
              return (
                <li key={idx} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-[#080510]/50">
                  <div className="flex items-center space-x-3">
                    <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${m}`} alt="avatar" className="w-8 h-8 rounded-full bg-[#080510] border border-[#8B85A7]/20 cursor-help" title={m} />
                    <span className="font-mono text-[#F5F3FF] flex items-center">
                      {m.slice(0, 6)}...{m.slice(-4)}
                      {m === address && <span className="ml-2 bg-[#6366F1]/20 text-[#6366F1] text-xs px-2 py-0.5 rounded-full font-semibold">You</span>}
                    </span>
                  </div>
                  <span className={hasPaid ? "text-green-400 font-medium text-xs font-semibold" : "text-amber-400 font-medium text-xs font-semibold"}>
                    {hasPaid ? 'Paid' : 'Pending'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      
      {/* Feedback Widget */}
      <div className="bg-[#140E28] p-6 rounded-xl border border-[#8B85A7]/20 shadow-sm mt-8">
        <h3 className="text-lg font-bold text-[#F5F3FF] mb-2">How was your experience?</h3>
        <p className="text-sm text-[#8B85A7] mb-4">Help us improve ChitVault by providing your feedback.</p>
        <textarea 
          className="w-full border border-[#8B85A7]/30 bg-[#080510] text-[#F5F3FF] rounded-lg p-3 text-sm mb-3 outline-none focus:border-[#6366F1]"
          placeholder="It was easy to use..."
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          disabled={feedbackSubmitting}
        />
        <button 
          className="bg-[#6366F1] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#6366F1]/90 disabled:opacity-50 cursor-pointer"
          onClick={async () => {
            if (!feedback.trim()) return;
            try {
              setFeedbackSubmitting(true);
              await submitFeedback(address || 'Anonymous', feedback);
              posthog.capture('feedback_submitted', { address, feedback });
              toast.success("Feedback successfully submitted!");
              setFeedback('');
            } catch (e) {
              console.error(e);
              toast.error("Failed to submit feedback.");
            } finally {
              setFeedbackSubmitting(false);
            }
          }}
          disabled={feedbackSubmitting || !feedback.trim()}
        >
          {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>

      <div className="text-center pt-4 border-t border-[#8B85A7]/10 mt-8">
        <a 
          href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-xs text-[#8B85A7] hover:text-[#F5F3FF] transition-colors inline-flex items-center space-x-1"
        >
          <span>🌐 Verify Contract on Stellar.Expert</span> <span>↗</span>
        </a>
      </div>
    </div>
  );
};

export default ViewChit;

// Fixed rpc.Account constructor crash
// Read real round contributions from smart contract
// Added group preview mode for unauthenticated users
// Integrated DiceBear avatars