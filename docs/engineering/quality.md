# Quality

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

Quality is technical evidence: required checks, quality endpoint, CI
Quality Gate. It is not GxP validation.

Generated products expose `GET /api/v1/quality` and run quality tests in
CI. The Data Product page shows Quality metadata and the latest GitHub
Actions result.

Failed gates: [Read CI failures](../how-to/ci-failure.md).
