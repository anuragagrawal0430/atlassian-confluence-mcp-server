# Contributing

We welcome contributions to the Atlassian Confluence MCP Server! This document provides guidelines for contributors.

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server.git
   cd atlassian-confluence-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Confluence credentials
   ```

4. **Run in development mode**
   ```bash
   npm run dev
   ```

## Making Changes

### Branching
- Create a feature branch from `main`
- Use descriptive branch names: `feature/cloud-auth`, `fix/cql-escaping`, etc.

### Code Style
- Follow TypeScript best practices
- Keep code DRY and well-documented
- Add input validation for any new user inputs

### Testing
- Test with both Confluence Cloud and Server/Data Center if possible
- Verify authentication works for both PAT and Basic Auth
- Test edge cases and error handling

## Pull Requests

### Before Submitting
1. **Run the build**
   ```bash
   npm run build
   ```

2. **Update documentation** if needed:
   - README.md for new features
   - CHANGELOG.md for user-facing changes

3. **Ensure CI passes** on your branch

### PR Description
Include:
- Clear description of the change
- Why it's needed
- How it was tested
- Confluence version(s) tested against (Cloud / Server / DC)
- Any breaking changes

## Reporting Issues

When reporting bugs, please include:
- Steps to reproduce
- Expected vs actual behavior
- Confluence version (Cloud / Server / Data Center)
- Authentication method used (PAT / Basic)
- Environment details (Node.js version, OS)

## Security

- Do NOT commit credentials or API tokens
- Report security vulnerabilities privately via GitHub's "Report a vulnerability" feature
- See [SECURITY.md](SECURITY.md) for details

## Release Process

Releases are automated through GitHub Actions:
1. Update version in `package.json` and `CHANGELOG.md`
2. Create a GitHub Release with the new version tag
3. GitHub Actions will automatically publish to npm

## Areas for Contribution

- **Additional Confluence features**: blogs, attachments upload, space management
- **Error handling**: Better error messages, retry logic
- **Performance**: Caching, batch operations
- **Documentation**: Examples, tutorials, troubleshooting
- **Testing**: Unit tests, integration tests

## Questions

Feel free to open an issue for questions before starting work on a contribution.

Thank you for contributing! 🎉
