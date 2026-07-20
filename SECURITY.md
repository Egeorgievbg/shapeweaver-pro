# Security policy

## Supported branch

Security fixes target `main` and the current release branch.

## Reporting

Report security issues privately to the repository owner. Do not open a public issue containing credentials, private endpoints, personal data or exploitable details.

## Architecture requirements

- Browsers must not read SQLite directly.
- Administrative access uses the same-origin server gateway.
- Administrative sessions use signed HttpOnly cookies.
- State-changing administrative requests require the expected CSRF header.
- Upstream credentials remain server-side.
- Uploaded files require format, size and content validation.
- External asset fetching must use an allowlist and network protections.
- Public errors must not expose stack traces or server configuration.

## Demo mode

The SQLite demonstration environment is read-only and contains no production records. Demo access values are local-only and must not be reused in deployed environments.

## Dependency and build policy

- Use frozen dependency installation in CI.
- Review dependency updates separately.
- Keep CI permissions read-only unless a narrowly scoped release action requires otherwise.
- Do not merge when build, lint, manifest or database integrity checks fail.
