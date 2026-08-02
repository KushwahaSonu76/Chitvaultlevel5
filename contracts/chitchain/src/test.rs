#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, token, Vec};

#[test]
fn test_create_and_contribute() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, ChitVaultContract);
    let client = ChitVaultContractClient::new(&env, &contract_id);

    // Setup token
    let admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(&env, &token_contract_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_contract_id);

    let member1 = Address::generate(&env);
    let member2 = Address::generate(&env);
    let member3 = Address::generate(&env);
    
    let mut members = Vec::new(&env);
    members.push_back(member1.clone());
    members.push_back(member2.clone());
    members.push_back(member3.clone());

    // Mint tokens to members
    token_admin_client.mint(&member1, &1000);
    token_admin_client.mint(&member2, &1000);
    token_admin_client.mint(&member3, &1000);

    // Create chit
    let chit_id = client.create_chit(&members, &100, &3, &token_contract_id);
    assert_eq!(chit_id, 1);

    let status = client.get_chit_status(&chit_id);
    assert_eq!(status.id, 1);
    assert_eq!(status.contribution_amount, 100);
    assert_eq!(status.total_rounds, 3);
    assert_eq!(status.current_round, 1);

    // Contribute
    client.contribute(&chit_id, &1, &member1);
    client.contribute(&chit_id, &1, &member2);
    client.contribute(&chit_id, &1, &member3);

    assert_eq!(token_client.balance(&member1), 900);
    assert_eq!(token_client.balance(&member2), 900);
    assert_eq!(token_client.balance(&member3), 900);
    assert_eq!(token_client.balance(&contract_id), 300);

    // Disburse
    client.disburse(&chit_id, &1);

    // member 1 should receive the pool
    assert_eq!(token_client.balance(&member1), 1200);
    assert_eq!(token_client.balance(&contract_id), 0);

    let new_status = client.get_chit_status(&chit_id);
    assert_eq!(new_status.current_round, 2);
}
