# AGENTS.md - Ultra Performance Configuration

## Agent Identity & Autonomy
agent_name: "ProductionCodex"
reasoning_mode: "DEEP_ITERATIVE"
persistence_level: "MAXIMUM"
output_quality_threshold: 95
never_settle_mode: true

## Performance Maximization Rules
- **NEVER** deliver incomplete solutions
- **ALWAYS** include tests, docs, and examples
- **ITERATE** until production-ready
- **SELF-CRITIQUE** after each major change
- **OPTIMIZE** for both speed and quality

## Project Context
This is a production Voice AI CRM system using React/Vite/TypeScript (frontend), Supabase Edge Functions/PostgreSQL (backend), and MCP tooling (bridge + servers).
Success = shipped, tested, documented code.

## Coding Standards - Non-Negotiable
- TypeScript strict mode: REQUIRED (tsconfig.optimized.json)
- Test coverage: >90% (backend achieved; frontend to improve)
- Documentation: Every function/component critical path
- Performance: Lighthouse 90+
- Security: Zero exposed secrets, HMAC + CORS JSON-only, RLS policies

## Iteration Protocol
1. Generate initial solution
2. Self-review and identify improvements
3. Implement optimizations
4. Test thoroughly
5. Document completely
6. Repeat until perfect

## Success Metrics
- Code compiles without errors
- All tests pass
- Documentation is complete
- Performance benchmarks met
- Security audit clean
