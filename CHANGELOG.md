# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Large-page editing support with server-side body mutation tools:
  - `confluence_patch_page` for exact find/replace operations
  - `confluence_replace_page_range` for middle-range replacement via offsets or line numbers
  - `confluence_append_to_page` for append/prepend updates
  - `confluence_get_page_body_chunk` for chunked body reads with offset metadata
- Optimistic locking support for large-page edit tools via optional `expectedVersion`
- Range safety check via optional `expectedText` in range replacement

### Changed
- Updated page tool descriptions to direct large-body workflows toward server-side patch/range/chunk tools

## [1.0.0] - 2026-03-21

### Added
- Full Confluence Cloud and Server/Data Center support
- PAT authentication (Bearer for Server/DC, Basic for Cloud)
- Basic authentication fallback for older Server versions
- 28 MCP tools: spaces, pages, search, labels, comments, attachments, hierarchy, versions, properties, user info
- Tiny URL resolution for Cloud (/wiki/x/ID format)
- Personal space page creation and management
- Input validation and CQL injection prevention
- Request timeout (30s) and error sanitization
- npx support for zero-install usage
- Comprehensive documentation with Cloud vs Server/DC examples
- Security hardening (no source maps, sanitized errors, validated inputs)

### Security
- Credentials read exclusively from environment variables
- All user inputs validated and sanitized
- CQL queries escaped to prevent injection
- URL path encoding for dynamic segments
- Error messages truncated and HTML-stripped
- Pagination limits clamped to safe maximums

### Documentation
- Updated README with Cloud vs Server/DC configuration
- Clear authentication examples for both platforms
- MCP client configuration examples
- Security section explaining safeguards

### Added
- GitHub Actions CI/CD workflows
- Renamed package to `atlassian-confluence-mcp-server`
- Automated npm publishing on GitHub releases
- Contributing guidelines
- Security policy
- Changelog (this file)
