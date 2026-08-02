#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, Vec, Map
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Chit(u32),
    MemberHistory(Address),
    NextChitId,
    Contributions(u32, u32), // (chit_id, round) -> Map<Address, bool>
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChitStatus {
    pub id: u32,
    pub members: Vec<Address>,
    pub contribution_amount: i128,
    pub total_rounds: u32,
    pub current_round: u32,
    pub token: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Contribution {
    pub chit_id: u32,
    pub round: u32,
    pub amount: i128,
}

#[contract]
pub struct ChitVaultContract;

#[contractimpl]
impl ChitVaultContract {
    /// Creates a new chit group.
    pub fn create_chit(
        env: Env,
        members: Vec<Address>,
        contribution_amount: i128,
        total_rounds: u32,
        token: Address,
    ) -> u32 {
        if members.len() == 0 {
            panic!("Members list cannot be empty");
        }
        if total_rounds == 0 {
            panic!("Total rounds must be > 0");
        }
        if contribution_amount <= 0 {
            panic!("Contribution amount must be > 0");
        }

        let mut next_id: u32 = env.storage().instance().get(&DataKey::NextChitId).unwrap_or(1);
        
        let chit = ChitStatus {
            id: next_id,
            members: members.clone(),
            contribution_amount,
            total_rounds,
            current_round: 1,
            token,
        };

        env.storage().instance().set(&DataKey::Chit(next_id), &chit);
        env.storage().instance().set(&DataKey::NextChitId, &(next_id + 1));
        
        // Initialize contribution tracking for round 1
        let empty_contributions: Map<Address, bool> = Map::new(&env);
        env.storage().instance().set(&DataKey::Contributions(next_id, 1), &empty_contributions);

        next_id
    }

    /// Contributes the monthly amount to the escrow.
    pub fn contribute(env: Env, chit_id: u32, round: u32, member: Address) {
        member.require_auth();

        let chit: ChitStatus = env.storage().instance().get(&DataKey::Chit(chit_id)).expect("Chit not found");
        
        if chit.current_round != round {
            panic!("Invalid round");
        }
        if !chit.members.contains(&member) {
            panic!("Not a member of this chit");
        }

        let mut contributions: Map<Address, bool> = env.storage().instance()
            .get(&DataKey::Contributions(chit_id, round))
            .unwrap_or(Map::new(&env));

        if contributions.contains_key(member.clone()) {
            panic!("Already contributed for this round");
        }

        // Transfer funds from member to contract
        let token_client = token::Client::new(&env, &chit.token);
        token_client.transfer(&member, &env.current_contract_address(), &chit.contribution_amount);

        // Record contribution
        contributions.set(member.clone(), true);
        env.storage().instance().set(&DataKey::Contributions(chit_id, round), &contributions);

        // Add to member history
        let mut history: Vec<Contribution> = env.storage().persistent()
            .get(&DataKey::MemberHistory(member.clone()))
            .unwrap_or(Vec::new(&env));
        
        history.push_back(Contribution {
            chit_id,
            round,
            amount: chit.contribution_amount,
        });
        
        env.storage().persistent().set(&DataKey::MemberHistory(member), &history);
    }

    /// Disburse funds for the round to the appropriate recipient and advance round.
    pub fn disburse(env: Env, chit_id: u32, round: u32) {
        let mut chit: ChitStatus = env.storage().instance().get(&DataKey::Chit(chit_id)).expect("Chit not found");
        
        if chit.current_round != round {
            panic!("Invalid round");
        }

        let contributions: Map<Address, bool> = env.storage().instance()
            .get(&DataKey::Contributions(chit_id, round))
            .unwrap_or(Map::new(&env));

        // Check if all members have contributed
        for member in chit.members.clone() {
            if !contributions.contains_key(member) {
                panic!("Not all members have contributed yet");
            }
        }

        // Determine recipient based on rotation (0-indexed)
        // round 1 goes to member 0, round 2 goes to member 1, etc.
        let recipient_idx = (round - 1) % chit.members.len();
        let recipient = chit.members.get(recipient_idx).unwrap();

        // Transfer the pooled amount to the recipient
        let pooled_amount = chit.contribution_amount * (chit.members.len() as i128);
        let token_client = token::Client::new(&env, &chit.token);
        token_client.transfer(&env.current_contract_address(), &recipient, &pooled_amount);

        // Advance to next round if not finished
        if chit.current_round < chit.total_rounds {
            chit.current_round += 1;
            env.storage().instance().set(&DataKey::Chit(chit_id), &chit);
            
            // Initialize contributions for next round
            let empty_contributions: Map<Address, bool> = Map::new(&env);
            env.storage().instance().set(&DataKey::Contributions(chit_id, chit.current_round), &empty_contributions);
        } else {
            // Chit complete, could clean up state here if desired
            env.storage().instance().set(&DataKey::Chit(chit_id), &chit);
        }
    }

    /// Read the current status of the chit group.
    pub fn get_chit_status(env: Env, chit_id: u32) -> ChitStatus {
        env.storage().instance().get(&DataKey::Chit(chit_id)).expect("Chit not found")
    }

    /// Check which members have contributed in a given round.
    pub fn get_round_contributions(env: Env, chit_id: u32, round: u32) -> Map<Address, bool> {
        env.storage().instance()
            .get(&DataKey::Contributions(chit_id, round))
            .unwrap_or(Map::new(&env))
    }

    /// Read history of contributions for a specific member.
    pub fn get_member_history(env: Env, address: Address) -> Vec<Contribution> {
        env.storage().persistent()
            .get(&DataKey::MemberHistory(address))
            .unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
