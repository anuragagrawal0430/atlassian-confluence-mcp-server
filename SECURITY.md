# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✅        |

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

### How to Report

1. **GitHub Security Advisory (Preferred)**
   - Use GitHub's "Report a vulnerability" feature
   - This provides a private, secure way to disclose issues

2. **Email (Alternative)**
   - Email the maintainer directly
   - Include "Security Vulnerability" in the subject line

### What to Include

- Detailed description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Any suggested fixes or mitigations

### Response Timeline

- **Initial response**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix timeline**: Depends on severity and complexity

### Security Best Practices

This project follows these security practices:

#### Credential Management
- All credentials read from environment variables only
- No hardcoded secrets in source code
- Credentials never logged or exposed in error messages

#### Input Validation
- All user inputs are validated and sanitized
- CQL queries are escaped to prevent injection
- URL parameters are properly encoded

#### Error Handling
- Error messages are sanitized to prevent information leakage
- Stack traces are not exposed to users
- API responses are truncated and HTML-stripped

#### Dependencies
- Dependencies are kept up to date
- Security vulnerabilities are monitored
- Minimal dependency footprint

## Security Features

- **Request timeouts** (30s) to prevent hanging
- **Input validation** on all parameters
- **CQL injection prevention** through escaping
- **URL path encoding** for dynamic segments
- **Error sanitization** to prevent server info leakage
- **Pagination limits** to prevent abuse

## Coordinated Disclosure

We follow coordinated disclosure principles:
- Reporters are given time to disclose
- Fixes are released before public disclosure
- Credit is given to reporters (if desired)

## Security Questions

For security-related questions or concerns, please use the private reporting methods above.
