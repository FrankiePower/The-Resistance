# Future Ideas & Plans

## Stellar ZK SDK (Post-Resistance)

### The Idea
Build "Garaga for Stellar" - a developer toolkit that makes ZK app deployment easy:
- Verifier contract generator (vk.json → Soroban contract)
- Proof serializer (bb output → Soroban bytes)
- CLI tool (`stellar-zk deploy`)
- JS SDK for browser proof generation
- Documentation & examples

### Reality Check
- X-Ray Games built working ZK apps WITHOUT any SDK
- They just did it manually (verifier contract, byte conversions, etc.)
- An SDK saves time but doesn't enable new capabilities
- Only valuable if multiple ZK projects emerge on Stellar

### If Building This
1. Finish The Resistance first - proves the concept
2. Extract reusable components (verifier, utils)
3. Package as SDK if there's ecosystem demand
4. Apply for SDF grant with working examples

### Estimated Effort
- 6-8 weeks full-time
- Verifier template: 2 weeks
- CLI tooling: 2 weeks
- JS SDK: 2 weeks
- Docs & examples: 2 weeks

### Decision
**Defer until after The Resistance is complete.**
Build the game first, then evaluate whether to generalize the tooling.

---

## Other Ideas

(Add future ideas here)
