import { useState } from 'react';
import { useWallet } from '../lib/wallet/WalletContext';
import { createChitTx } from '../lib/contract/soroban';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';

const CreateChit = () => {
  const { address, kit } = useWallet();
  const navigate = useNavigate();
  
  const [amount, setAmount] = useState('');
  const [members, setMembers] = useState<string[]>(['']); // Array of dynamic input strings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddMember = () => {
    setMembers([...members, '']);
  };

  const handleRemoveMember = (index: number) => {
    const updated = members.filter((_, i) => i !== index);
    setMembers(updated);
  };

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...members];
    updated[index] = value;
    setMembers(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !kit) return;
    
    setError('');
    setLoading(true);

    try {
      // Filter out empty entries and trim
      const filteredMembers = members.map(m => m.trim()).filter(m => m.length > 0);
      
      // Ensure creator is in the members list
      if (!filteredMembers.includes(address)) {
        filteredMembers.unshift(address);
      }

      if (filteredMembers.length < 2) {
        throw new Error("You need to invite at least 1 other member to form a group.");
      }

      // Pre-validation of address formats to prevent failed blockchain simulations
      for (const m of filteredMembers) {
        if (!/^[GC][A-Z2-7]{55}$/.test(m)) {
          throw new Error(`Invalid Stellar Address format: "${m.slice(0, 8)}...". It must be a valid 56-character public key starting with G or C.`);
        }
      }

      const numAmount = parseFloat(amount) * 10000000;
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error("Please enter a valid amount.");
      }

      // Hardcoded testnet XLM token address for MVP
      const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';

      // Submit & Sign via Freighter (actually sends transaction to Testnet)
      const receipt = await createChitTx(kit, address, filteredMembers, numAmount, filteredMembers.length, tokenAddress);
      console.log("Transaction finalized on-chain:", receipt);
      
      posthog.capture('chit_created', { members_count: filteredMembers.length, amount: numAmount });
      alert("Chit Group successfully created on-chain!");
      
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the group.');
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-800">Please connect your wallet to create a group.</h2>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-[#140E28] p-8 rounded-xl border border-[#8B85A7]/20 shadow-sm">
      <h1 className="text-3xl font-bold text-[#F5F3FF] mb-2">Create a Savings Group</h1>
      <p className="text-[#8B85A7] mb-8">Form a new trustless savings group. You'll be the first member (Member #1).</p>

      {error && (
        <div className="bg-red-950/50 text-red-400 p-4 rounded-lg mb-6 border border-red-900/50 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#8B85A7] mb-1">Contribution Amount (XLM)</label>
          <input
            type="number"
            min="1"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-[#8B85A7]/30 bg-[#080510] text-[#F5F3FF] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none"
            placeholder="e.g. 200 XLM"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#8B85A7] mb-1">Invite Members</label>
          <p className="text-xs text-[#8B85A7] mb-3">You will be automatically added as Member #1 ({address.slice(0, 6)}...{address.slice(-4)}).</p>
          
          <div className="space-y-3">
            {members.map((member, index) => (
              <div key={index} className="flex gap-2 items-center">
                <span className="text-sm font-bold text-[#8B85A7] w-24">Member #{index + 2}:</span>
                <input
                  type="text"
                  required
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  className="flex-1 border border-[#8B85A7]/30 bg-[#080510] text-[#F5F3FF] rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#6366F1] focus:border-[#6366F1] outline-none font-mono text-sm"
                  placeholder="G..."
                />
                {members.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(index)}
                    className="text-red-400 hover:text-red-300 p-2 text-sm font-semibold cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddMember}
            className="mt-4 text-sm text-[#C084FC] hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            + Add Another Member
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || !amount || parseFloat(amount) <= 0 || members.some(m => !m.trim())}
          className="w-full bg-gradient-to-r from-[#6366F1] to-[#A855F7] hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center disabled:opacity-50 mt-8 cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="animate-pulse">Creating via Smart Contract...</span>
          ) : (
            'Deploy Group to Soroban'
          )}
        </button>
      </form>
    </div>
  );
};

export default CreateChit;
