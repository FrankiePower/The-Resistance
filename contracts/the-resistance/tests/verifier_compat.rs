use soroban_sdk::{testutils::Ledger, Bytes, Env};
use std::{fs, path::Path};
use ultrahonk_soroban_verifier::{UltraHonkVerifier, PROOF_BYTES};

fn find_artifact_path(rel: &str) -> Option<String> {
    let candidates = [rel, &format!("../../{rel}"), &format!("../../../{rel}")];
    for c in candidates {
        if Path::new(c).exists() {
            return Some(c.to_string());
        }
    }
    None
}

#[test]
#[ignore = "Diagnostic test: requires artifacts matching ultrahonk_soroban_verifier PROOF_BYTES/VK layout"]
fn current_circuit_artifacts_verify() -> Result<(), String> {
    let env = Env::default();
    env.ledger().set_protocol_version(25);

    let vk_path = find_artifact_path("circuits/target/vk")
        .ok_or_else(|| "missing circuits/target/vk".to_string())?;
    let proof_path = find_artifact_path("circuits/target/proof")
        .ok_or_else(|| "missing circuits/target/proof".to_string())?;
    let public_inputs_path = find_artifact_path("circuits/target/public_inputs")
        .ok_or_else(|| "missing circuits/target/public_inputs".to_string())?;

    let vk = Bytes::from_slice(&env, &fs::read(vk_path).map_err(|e| e.to_string())?);
    let proof = Bytes::from_slice(&env, &fs::read(proof_path).map_err(|e| e.to_string())?);
    let public_inputs =
        Bytes::from_slice(&env, &fs::read(public_inputs_path).map_err(|e| e.to_string())?);

    if proof.len() as usize != PROOF_BYTES {
        return Err(format!(
            "proof length mismatch: got {}, expected {}",
            proof.len(),
            PROOF_BYTES
        ));
    }

    let verifier = UltraHonkVerifier::new(&env, &vk).map_err(|e| format!("{e:?}"))?;
    verifier
        .verify(&proof, &public_inputs)
        .map_err(|e| format!("{e:?}"))?;
    Ok(())
}
