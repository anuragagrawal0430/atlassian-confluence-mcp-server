# Atlassian Confluence MCP Server

[![CI](https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server/workflows/CI/badge.svg)](https://github.com/anuragagrawal0430/atlassian-confluence-mcp-server/actions)
[![npm version](https://badge.fury.io/js/atlassian-confluence-mcp-server.svg)](https://badge.fury.io/js/atlassian-confluence-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/atlassian-confluence-mcp-server.svg)](https://www.npmjs.com/package/atlassian-confluence-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An open-source **[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server** for **Atlassian Confluence** that lets AI assistants like **Claude** and **Windsurf** read, create, search, and manage Confluence wiki pages. Works with **Confluence Cloud**, **on-premise Server**, and **Data Center** deployments — connect your AI coding agent to your team's knowledge base in seconds via `npx`.

## Why atlassian-confluence-mcp-server?

- ✅ Only MCP server supporting **Cloud + Server + Data Center** in one package
- ✅ **47 tools** — most comprehensive Confluence MCP available
- ✅ Zero config via `npx` — no install needed
- ✅ PAT, Basic Auth, and API token support
- ✅ Actively maintained with provenance-signed releases

## Why use this instead of Atlassian's official MCP server?

| Feature | This package | Atlassian Official |
|---|---|---|
| Confluence Cloud | ✅ | ✅ |
| On-premise Server | ✅ | ❌ |
| Data Center | ✅ | ❌ |
| Zero config via npx | ✅ | ❌ |
| **47 tools** | ✅ | ~15 tools |
| Space management (create/delete) | ✅ | ❌ |
| Page copy/move | ✅ | ❌ |
| Watchers | ✅ | ❌ |
| Permissions/restrictions | ✅ | ❌ |
| Task extraction | ✅ | ❌ |
| Export (PDF/Word) | ✅ | ❌ |
| Open source | ✅ MIT | ✅ |
| Works offline/intranet | ✅ | ❌ |

## Features

- **Space Management** — Create, delete, list, and inspect spaces
- **Page CRUD** — Create, read, update, delete, copy, and move pages
- **Search** — Full CQL and text search, recently modified pages
- **Labels** — Add, list, and remove page labels
- **Comments** — Read and post page comments
- **Attachments** — List and upload page and comment attachments
- **Page Hierarchy** — Navigate parent/child relationships
- **Version History** — Browse and inspect page versions
- **Watchers** — View and manage page watchers
- **Permissions** — Get and set page restrictions
- **Tasks** — Extract inline tasks from pages
- **Export** — Generate PDF/Word export URLs
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
| `CONFLUENCE_READ_ONLY` | No | Defaults to `true`; set to `false` to allow mutating tools |
| `CONFLUENCE_ENABLE_DESTRUCTIVE_TOOLS` | No | Defaults to `false`; set to `true` to allow delete/permission mutation tools |
| `CONFLUENCE_ENABLED_TOOLS` | No | Optional comma-separated allowlist of tool names to expose |
| `CONFLUENCE_ALLOWED_SPACES` | No | Optional comma-separated allowlist of space keys for requests with `spaceKey`/`destinationSpaceKey` |
| `CONFLUENCE_ALLOW_INSECURE_HTTP` | No | Defaults to `false`; only allows `http://` for localhost/loopback when set to `true` |
| `CONFLUENCE_MAX_ATTACHMENT_BYTES` | No | Client-side max file size for `confluence_upload_attachment` in bytes (default: `52428800` / 50 MB). Confluence may still enforce a lower instance limit. |
| `CONFLUENCE_UPLOAD_ALLOWED_DIRS` | No | **Security:** Comma-separated allowlist of absolute directory paths from which file uploads are allowed. Empty by default (uploads disabled). |

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

### Security Controls (important)

The server now uses secure defaults to reduce prompt-injection blast radius and credential leakage risk:

- `CONFLUENCE_READ_ONLY=true` by default
  - Mutating tools are disabled unless you set `CONFLUENCE_READ_ONLY=false`.
- `CONFLUENCE_ENABLE_DESTRUCTIVE_TOOLS=false` by default
  - `confluence_delete_page`, `confluence_delete_space`, and `confluence_set_page_permissions` remain disabled unless explicitly enabled.
- `CONFLUENCE_ENABLED_TOOLS` (optional)
  - Restrict exposure to an explicit tool allowlist.
- `CONFLUENCE_ALLOWED_SPACES` (optional)
  - Restrict requests that include `spaceKey` / `destinationSpaceKey` to an approved set.
- `CONFLUENCE_ALLOW_INSECURE_HTTP=false` by default
  - HTTPS is required unless this is set to `true`.
  - Even when enabled, insecure HTTP is restricted to localhost/loopback only.
- `CONFLUENCE_MAX_ATTACHMENT_BYTES` (optional, default 50 MB)
  - Caps how large a host file `confluence_upload_attachment` will read before calling Confluence.
  - Independent of the instance "Attachment Maximum Size" admin setting (not exposed via public REST).
- `CONFLUENCE_UPLOAD_ALLOWED_DIRS` (optional, defaults to empty)
  - Explicitly restricts which host directories the MCP server is allowed to read files from when uploading attachments.
  - If not configured, file uploads from the host filesystem are entirely disabled.

Example (enable safe writes, keep destructive tools disabled):

```env
CONFLUENCE_READ_ONLY=false
CONFLUENCE_ENABLE_DESTRUCTIVE_TOOLS=false
```

Example (strict allowlist):

```env
CONFLUENCE_ENABLED_TOOLS=confluence_get_page,confluence_search_pages,confluence_get_page_body_chunk
```

Example (space-level allowlist):

```env
CONFLUENCE_ALLOWED_SPACES=ENG,SECURITY
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

## Available Tools (47)

Note: tool exposure depends on security configuration. With the default `CONFLUENCE_READ_ONLY=true`, mutating tools are intentionally hidden/blocked.

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
| `confluence_create_space` | Create a new space |
| `confluence_delete_space` | Delete a space and all its content |
| `confluence_get_space_homepage` | Get the homepage of a space |

### Pages
| Tool | Description |
|------|-------------|
| `confluence_get_pages` | List pages, optionally filtered by space |
| `confluence_get_page` | Get page by ID |
| `confluence_get_page_by_title` | Get page by title within a space |
| `confluence_create_page` | Create a new page |
| `confluence_update_page` | Update an existing page |
| `confluence_patch_page` | Server-side exact find/replace patch for large pages |
| `confluence_replace_page_range` | Replace middle range using offsets or line numbers |
| `confluence_append_to_page` | Append or prepend content server-side |
| `confluence_get_page_body_chunk` | Read large page body in offset/length chunks |
| `confluence_delete_page` | Delete a page |
| `confluence_copy_page` | Copy a page, optionally to a different space |
| `confluence_move_page` | Move a page to a different parent or space |

### Search
| Tool | Description |
|------|-------------|
| `confluence_search` | Search using CQL |
| `confluence_search_pages` | Search pages by text |
| `confluence_get_recently_modified` | Get recently modified pages |

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
| `confluence_get_comment_attachments` | List attachments on a comment |
| `confluence_upload_attachment` | Upload/upsert a local file as a page or comment attachment |

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

### Watchers
| Tool | Description |
|------|-------------|
| `confluence_get_page_watchers` | Get users watching a page |
| `confluence_watch_page` | Add current user as a watcher |
| `confluence_unwatch_page` | Remove current user as a watcher |

### Permissions
| Tool | Description |
|------|-------------|
| `confluence_get_page_permissions` | Get page restrictions/permissions |
| `confluence_set_page_permissions` | Set page restrictions/permissions |

### Tasks
| Tool | Description |
|------|-------------|
| `confluence_get_page_tasks` | Extract inline tasks from a page |

### Export
| Tool | Description |
|------|-------------|
| `confluence_export_page` | Get export URL for a page (PDF or Word) |

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

### Editing Very Large Pages

When a page body is very large (for example hundreds of KB), avoid sending the full body through `confluence_update_page`.

Recommended workflow:

1. Use `confluence_get_page_body_chunk` to inspect the relevant part of the page.
2. Use one of:
   - `confluence_patch_page` for exact find/replace edits.
   - `confluence_replace_page_range` for replacing a specific middle range.
   - `confluence_append_to_page` for incremental append/prepend updates.

Notes:

- Offset-based range replacement is the most reliable mode for storage XHTML.
- Line-based replacement requires actual newline characters in the stored body.
- These tools still perform a full Confluence update under the hood, but the full body remains server-side.

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
