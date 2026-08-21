import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const faqs = [
  {
    question: "What is a ROSCA?",
    answer: "ROSCA stands for Rotating Savings and Credit Association. It is a peer-to-peer banking system where a group of individuals agree to meet for a defined period in order to save and borrow together, a form of combined peer-to-peer banking and peer-to-peer lending."
  },
  {
    question: "How does ChitVault secure my funds?",
    answer: "ChitVault uses Soroban smart contracts on the Stellar network. When you contribute, your XLM is locked in a decentralized escrow. It can only be disbursed when all members have contributed for the round, completely eliminating the risk of a central organizer stealing the funds."
  },
  {
    question: "Do I need cryptocurrency to use ChitVault?",
    answer: "Yes, currently ChitVault operates on the Stellar Testnet using Testnet XLM. We plan to integrate fiat on-ramps and stablecoins (like USDC) in the future."
  },
  {
    question: "What happens if someone doesn't pay?",
    answer: "The smart contract will not disburse the pooled funds for that round until all members have made their required contribution. This strict rule ensures everyone pays their fair share."
  }
];

const FAQ = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="max-w-3xl mx-auto py-12 space-y-8 text-[#F5F3FF]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-[#F5F3FF] tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-lg text-[#8B85A7]">
          Everything you need to know about ChitVault and decentralized savings.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div key={idx} className="bg-[#140E28] rounded-xl border border-[#8B85A7]/20 overflow-hidden">
            <button 
              className="w-full flex justify-between items-center p-6 text-left focus:outline-none cursor-pointer"
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            >
              <h3 className="text-lg font-semibold">{faq.question}</h3>
              {openIdx === idx ? <ChevronUp className="text-[#6366F1]" /> : <ChevronDown className="text-[#8B85A7]" />}
            </button>
            {openIdx === idx && (
              <div className="p-6 pt-0 text-[#8B85A7] border-t border-[#8B85A7]/10 mt-2">
                {faq.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ;
