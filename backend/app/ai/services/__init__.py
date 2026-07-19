"""
AI capability services.

A "service" here is a thin, domain-facing function that composes a context
builder + the orchestrator + a response schema for one capability, keeping route
handlers and business logic free of AI plumbing.

Today the domain analyzers already play this role and now call the orchestrator:

    * app.llm.analyzer.analyze_resume        → Capability.RESUME_ANALYSIS
    * app.llm.match_analyzer.analyze_match    → Capability.JOB_MATCHING

Future capability services (interview generation, candidate comparison, resume
summarization) will live here as the corresponding features are built, following
the same pattern: build context → orchestrator.run(capability, variables, schema).
"""
