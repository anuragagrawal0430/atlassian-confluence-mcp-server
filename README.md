# Atlassian Confluence MCP Server

[![CI](https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server/workflows/CI/badge.svg)](https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server/actions)
[![npm version](https://badge.fury.io/js/atlassian-confluence-mcp-server.svg)](https://badge.fury.io/js/atlassian-confluence-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/atlassian-confluence-mcp-server.svg)](https://www.npmjs.com/package/atlassian-confluence-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server** for **Atlassian Confluence** that lets AI assistants like **Claude** and **Windsurf** read, create, search, and manage Confluence wiki pages. Works with **Confluence Cloud**, **on-premise Server**, and **Data Center** deployments — connect your AI coding agent to your team's knowledge base in seconds via `npx`.

## Why atlassian-confluence-mcp-server?

- ✅ Only MCP server supporting **Cloud + Server + Data Center** in one package
- ✅ 28 tools — most comprehensive Confluence MCP available
- ✅ Zero config via `npx` — no install needed
- ✅ PAT, Basic Auth, and API token support
- ✅ Actively maintained with provenance-signed releases

## Features

- **Space Management** — List and inspect spaces
- **Page CRUD** — Create, read, update, and delete pages
- **Search** — Full CQL and text search
- **Labels** — Add, list, and remove page labels
- **Comments** — Read and post page comments
- **Attachments** — List page attachments
- **Page Hierarchy** — Navigate parent/child relationships
- **Version History** — Browse and inspect page versions
- **Personal Space** — Create pages in your personal space
- **URL Parsing** — Retrieve page content from a Confluence URL

## Prerequisites

- **Node.js 18+**
- A Confluence instance (Cloud or Server/Data Center 7.9+)
- Authentication credentials (PAT or username/password)

## Installation

### Via npx (no install required)

```bash
npx atlassian-confluence-mcp-server
```

### Global install

```bash
npm install -g atlassian-confluence-mcp-server
```

### From source

```bash
git clone https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server.git
cd atlassian-confluence-mcp-server
npm install
npm run build
```

## Configuration

All configuration is passed through **environment variables**. Never hard-code credentials.

| Variable | Required | Description |
|---|---|---|
| `CONFLUENCE_BASE_URL` | Yes | Root URL of your Confluence instance |
| `PAT` | See below | API token (Cloud) or Personal Access Token (Server/DC) |
| `CONFLUENCE_USERNAME` | Cloud only | Your Atlassian account email |
| `CONFLUENCE_PASSWORD` | Alt auth | Password or API token for Basic Auth |

### Confluence Cloud

Cloud API tokens are generated from your Atlassian account and require **both** your email and the token:

```env
CONFLUENCE_BASE_URL=https://your-site.atlassian.net
CONFLUENCE_USERNAME=you@example.com
PAT=your-api-token
```

1. Go to <https://id.atlassian.com/manage-profile/security/api-tokens>
2. Click **Create API token**, give it a label, and copy the value
3. Set `CONFLUENCE_USERNAME` to your Atlassian account email
4. Set `PAT` to the copied API token

### Confluence Server / Data Center (7.9+)

Server and Data Center instances use a Personal Access Token with **Bearer** authentication. Only the token is needed:

```env
CONFLUENCE_BASE_URL=https://confluence.example.com
PAT=your-personal-access-token
```

1. Navigate to **Profile > Settings > Personal Access Tokens**
2. Create a token with the required permissions
3. Copy the token value

### Basic Authentication (fallback)

For older Server versions without PAT support, use username/password:

```env
CONFLUENCE_BASE_URL=https://confluence.example.com
CONFLUENCE_USERNAME=your-username
CONFLUENCE_PASSWORD=your-password
```

## MCP Client Configuration

### Cloud (npx)

```json
{
  "mcpServers": {
    "confluence": {
      "command": "npx",
      "args": ["-y", "atlassian-confluence-mcp-server"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://your-site.atlassian.net",
        "CONFLUENCE_USERNAME": "you@example.com",
        "PAT": "your-api-token"
      }
    }
  }
}
```

### Server / Data Center (npx)

```json
{
  "mcpServers": {
    "confluence": {
      "command": "npx",
      "args": ["-y", "atlassian-confluence-mcp-server"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://confluence.example.com",
        "PAT": "your-personal-access-token"
      }
    }
  }
}
```

### Global install

```json
{
  "mcpServers": {
    "confluence": {
      "command": "atlassian-confluence-mcp-server",
      "env": {
        "CONFLUENCE_BASE_URL": "https://confluence.example.com",
        "PAT": "your-personal-access-token"
      }
    }
  }
}
```

### From source

```json
{
  "mcpServers": {
    "confluence": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "CONFLUENCE_BASE_URL": "https://confluence.example.com",
        "PAT": "your-personal-access-token"
      }
    }
  }
}
```

## Available Tools (28)

### Connection
| Tool | Description |
|------|-------------|
| `confluence_test_connection` | Test connection to Confluence API |

### Spaces
| Tool | Description |
|------|-------------|
| `confluence_get_spaces` | List all spaces |
| `confluence_get_space` | Get space details by key |
| `confluence_get_space_by_key` | Alias for `get_space` |

### Pages
| Tool | Description |
|------|-------------|
| `confluence_get_pages` | List pages, optionally filtered by space |
| `confluence_get_page` | Get page by ID |
| `confluence_get_page_by_title` | Get page by title within a space |
| `confluence_create_page` | Create a new page |
| `confluence_update_page` | Update an existing page |
| `confluence_delete_page` | Delete a page |

### Search
| Tool | Description |
|------|-------------|
| `confluence_search` | Search using CQL |
| `confluence_search_pages` | Search pages by text |

### Labels
| Tool | Description |
|------|-------------|
| `confluence_get_page_labels` | Get labels on a page |
| `confluence_add_page_label` | Add a label to a page |
| `confluence_delete_page_label` | Remove a label from a page |

### Comments
| Tool | Description |
|------|-------------|
| `confluence_get_page_comments` | Get comments on a page |
| `confluence_add_page_comment` | Add a comment to a page |

### Attachments
| Tool | Description |
|------|-------------|
| `confluence_get_page_attachments` | List attachments on a page |

### Page Hierarchy
| Tool | Description |
|------|-------------|
| `confluence_get_child_pages` | Get child pages of a parent |
| `confluence_get_page_ancestors` | Get ancestor pages |

### Version History
| Tool | Description |
|------|-------------|
| `confluence_get_page_versions` | Get page version history |
| `confluence_get_page_version` | Get a specific page version |

### Properties
| Tool | Description |
|------|-------------|
| `confluence_get_page_properties` | Get content properties of a page |

### User
| Tool | Description |
|------|-------------|
| `confluence_get_current_user` | Get current authenticated user |

### Utilities
| Tool | Description |
|------|-------------|
| `confluence_get_page_by_url` | Get page from a Confluence URL |

### Personal Space
| Tool | Description |
|------|-------------|
| `confluence_get_personal_space_key` | Get current user's personal space key |
| `confluence_create_page_in_personal_space` | Create page in personal space |
| `confluence_create_private_space` | Create a private space |

## Resources

| URI | Description |
|-----|-------------|
| `confluence://spaces` | List of all Confluence spaces |

## Example CQL Queries

```text
# Pages in a specific space
type=page AND space=TEAM

# Pages with a label
type=page AND label=documentation

# Recently modified pages
type=page AND lastModified > now("-7d")

# Title search
type=page AND title~"Meeting Notes"

# Pages created by current user
type=page AND creator=currentUser()
```

## Page Body Format

Pages use Confluence storage format (XHTML):

```html
<p>This is a paragraph.</p>
<h1>Heading 1</h1>
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
<ac:structured-macro ac:name="code">
  <ac:parameter ac:name="language">javascript</ac:parameter>
  <ac:plain-text-body><![CDATA[console.log("Hello");]]></ac:plain-text-body>
</ac:structured-macro>
```

## Security

- **Credentials** are read exclusively from environment variables — never hard-coded.
- **Input validation** — all user-supplied parameters are validated and sanitized before use.
- **CQL injection prevention** — user input interpolated into CQL queries is escaped.
- **URL path encoding** — all dynamic path segments are encoded with `encodeURIComponent`.
- **Request timeouts** — all HTTP requests have a 30-second timeout to prevent hanging.
- **Error sanitization** — API error responses are truncated and stripped of HTML before surfacing.
- **Pagination limits** — query limits are clamped to a safe maximum (100) to prevent abuse.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Security Policy

For security policies and vulnerability reporting, see [SECURITY.md](SECURITY.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a history of changes.

## License

[MIT](LICENSE)

## Acknowledgments

- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Atlassian Confluence REST API](https://developer.atlassian.com/server/confluence/confluence-rest-api-examples/)
