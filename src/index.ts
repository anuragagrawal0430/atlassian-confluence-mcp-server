#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from './confluence-client.js';

dotenv.config();

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL;
const PAT = process.env.PAT;
const CONFLUENCE_USERNAME = process.env.CONFLUENCE_USERNAME;
const CONFLUENCE_PASSWORD = process.env.CONFLUENCE_PASSWORD;

if (!CONFLUENCE_BASE_URL) {
  console.error('Error: CONFLUENCE_BASE_URL environment variable is required');
  process.exit(1);
}

if (!PAT && (!CONFLUENCE_USERNAME || !CONFLUENCE_PASSWORD)) {
  console.error('Error: Either PAT or both CONFLUENCE_USERNAME and CONFLUENCE_PASSWORD are required');
  console.error('For Confluence Cloud: set CONFLUENCE_USERNAME (email) and PAT (API token)');
  console.error('For Server/Data Center: set PAT (personal access token)');
  process.exit(1);
}

const confluenceClient = new ConfluenceClient({
  baseUrl: CONFLUENCE_BASE_URL,
  pat: PAT,
  username: CONFLUENCE_USERNAME,
  password: CONFLUENCE_PASSWORD,
});

const server = new Server(
  {
    name: 'confluence-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ==================== TOOL DEFINITIONS ====================

const tools = [
  // Connection
  {
    name: 'confluence_test_connection',
    description: 'Test connection to Confluence API',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  // Spaces
  {
    name: 'confluence_get_spaces',
    description: 'List all spaces in Confluence',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of spaces to return (default: 25)',
        },
        start: {
          type: 'number',
          description: 'Starting index for pagination (default: 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'confluence_get_space',
    description: 'Get details of a specific space by key',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key (e.g., "DEV", "TEAM")',
        },
      },
      required: ['spaceKey'],
    },
  },
  {
    name: 'confluence_get_space_by_key',
    description: 'Get details of a specific space by key',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key (e.g., "DEV", "HR")',
        },
      },
      required: ['spaceKey'],
    },
  },
  // Pages
  {
    name: 'confluence_get_pages',
    description: 'List pages, optionally filtered by space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'Filter pages by space key (e.g., "DEV", "HR")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of pages to return (default: 25)',
        },
        start: {
          type: 'number',
          description: 'Starting index for pagination (default: 0)',
        },
      },
      required: [],
    },
  },
  {
    name: 'confluence_get_page',
    description: 'Get a specific page by ID',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        includeBody: {
          type: 'boolean',
          description: 'Include page body content (default: true)',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_by_title',
    description: 'Get a page by its title within a space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key (e.g., "DEV", "TEAM")',
        },
        title: {
          type: 'string',
          description: 'The page title',
        },
      },
      required: ['spaceKey', 'title'],
    },
  },
  {
    name: 'confluence_create_page',
    description: 'Create a new page in Confluence',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key where the page will be created (e.g., "DEV", "DOCS")',
        },
        title: {
          type: 'string',
          description: 'The page title',
        },
        body: {
          type: 'string',
          description: 'The page body content in Confluence storage format (XHTML)',
        },
        parentId: {
          type: 'string',
          description: 'Optional parent page ID for creating child pages',
        },
      },
      required: ['spaceKey', 'title', 'body'],
    },
  },
  {
    name: 'confluence_update_page',
    description: 'Update an existing page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to update',
        },
        title: {
          type: 'string',
          description: 'The new page title',
        },
        body: {
          type: 'string',
          description: 'The new page body content in Confluence storage format',
        },
        version: {
          type: 'number',
          description: 'The current version number of the page',
        },
      },
      required: ['pageId', 'title', 'body', 'version'],
    },
  },
  {
    name: 'confluence_delete_page',
    description: 'Delete a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to delete',
        },
      },
      required: ['pageId'],
    },
  },
  // Search
  {
    name: 'confluence_search',
    description: 'Search for content using CQL (Confluence Query Language)',
    inputSchema: {
      type: 'object',
      properties: {
        cql: {
          type: 'string',
          description: 'CQL query string (e.g., "type=page AND space=DEV")',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 25)',
        },
      },
      required: ['cql'],
    },
  },
  {
    name: 'confluence_search_pages',
    description: 'Search for pages by text content',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text to search for',
        },
        spaceKey: {
          type: 'string',
          description: 'Optional space key to limit search',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 25)',
        },
      },
      required: ['query'],
    },
  },
  // Labels
  {
    name: 'confluence_get_page_labels',
    description: 'Get labels attached to a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_add_page_label',
    description: 'Add a label to a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        label: {
          type: 'string',
          description: 'The label to add',
        },
      },
      required: ['pageId', 'label'],
    },
  },
  {
    name: 'confluence_delete_page_label',
    description: 'Remove a label from a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        labelName: {
          type: 'string',
          description: 'The label name to remove',
        },
      },
      required: ['pageId', 'labelName'],
    },
  },
  // Comments
  {
    name: 'confluence_get_page_comments',
    description: 'Get comments on a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_add_page_comment',
    description: 'Add a comment to a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        body: {
          type: 'string',
          description: 'The comment body in storage format',
        },
      },
      required: ['pageId', 'body'],
    },
  },
  // Attachments
  {
    name: 'confluence_get_page_attachments',
    description: 'Get attachments on a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_comment_attachments',
    description: 'Get attachments on a comment',
    inputSchema: {
      type: 'object',
      properties: {
        commentId: {
          type: 'string',
          description: 'The comment ID',
        },
      },
      required: ['commentId'],
    },
  },
  // Page Hierarchy
  {
    name: 'confluence_get_child_pages',
    description: 'Get child pages of a parent page',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: {
          type: 'string',
          description: 'The parent page ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 25)',
        },
      },
      required: ['parentId'],
    },
  },
  {
    name: 'confluence_get_page_ancestors',
    description: 'Get ancestor pages of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  // User
  {
    name: 'confluence_get_current_user',
    description: 'Get the current authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  // Version History
  {
    name: 'confluence_get_page_versions',
    description: 'Get version history of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of versions to return (default: 25)',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_get_page_version',
    description: 'Get a specific version of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        versionNumber: {
          type: 'number',
          description: 'The version number',
        },
      },
      required: ['pageId', 'versionNumber'],
    },
  },
  // Properties
  {
    name: 'confluence_get_page_properties',
    description: 'Get content properties of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  // Get Page by URL
  {
    name: 'confluence_get_page_by_url',
    description: 'Get a page by its Confluence URL (e.g., https://confluence.example.com/display/SPACE/Page+Title or ?pageId=12345)',
    inputSchema: {
      type: 'object',
      properties: {
        pageUrl: {
          type: 'string',
          description: 'The full Confluence page URL',
        },
      },
      required: ['pageUrl'],
    },
  },
  // Personal Space
  {
    name: 'confluence_get_personal_space_key',
    description: 'Get the personal space key for the current authenticated user',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'confluence_create_page_in_personal_space',
    description: 'Create a new page in the current user\'s personal space',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'The page title',
        },
        body: {
          type: 'string',
          description: 'The page body content in Confluence storage format (XHTML)',
        },
        parentId: {
          type: 'string',
          description: 'Optional parent page ID for creating child pages',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'confluence_create_private_space',
    description: 'Create a new private space viewable only by its creator',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the private space',
        },
        description: {
          type: 'string',
          description: 'Optional description for the space',
        },
      },
      required: ['name'],
    },
  },
  // Space Management
  {
    name: 'confluence_create_space',
    description: 'Create a new space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'Unique key for the space (e.g., "DEV", "DOCS")',
        },
        name: {
          type: 'string',
          description: 'Display name for the space',
        },
        description: {
          type: 'string',
          description: 'Optional description for the space',
        },
      },
      required: ['spaceKey', 'name'],
    },
  },
  {
    name: 'confluence_delete_space',
    description: 'Delete a space and all its content',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key to delete',
        },
      },
      required: ['spaceKey'],
    },
  },
  {
    name: 'confluence_get_space_homepage',
    description: 'Get the homepage of a space',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'The space key',
        },
      },
      required: ['spaceKey'],
    },
  },
  // Page Copy/Move
  {
    name: 'confluence_copy_page',
    description: 'Copy a page, optionally to a different space',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to copy',
        },
        destinationSpaceKey: {
          type: 'string',
          description: 'Optional destination space key (defaults to same space)',
        },
        newTitle: {
          type: 'string',
          description: 'Optional new title (defaults to "Copy of [original title]")',
        },
        parentId: {
          type: 'string',
          description: 'Optional parent page ID in the destination',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_move_page',
    description: 'Move a page to a different parent or space',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to move',
        },
        targetSpaceKey: {
          type: 'string',
          description: 'Optional target space key',
        },
        targetParentId: {
          type: 'string',
          description: 'Optional target parent page ID',
        },
      },
      required: ['pageId'],
    },
  },
  // Watchers
  {
    name: 'confluence_get_page_watchers',
    description: 'Get users watching a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_watch_page',
    description: 'Add current user as a watcher of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to watch',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_unwatch_page',
    description: 'Remove current user as a watcher of a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to unwatch',
        },
      },
      required: ['pageId'],
    },
  },
  // Permissions
  {
    name: 'confluence_get_page_permissions',
    description: 'Get page restrictions/permissions',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  {
    name: 'confluence_set_page_permissions',
    description: 'Set page restrictions/permissions. For Cloud, use accountId for users. For Server/DC, use name.',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
        restrictions: {
          type: 'array',
          description: 'Array of restriction objects with operation (read/update) and user/group restrictions',
          items: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['read', 'update'],
                description: 'The operation to restrict',
              },
              restrictions: {
                type: 'object',
                properties: {
                  user: {
                    type: 'array',
                    description: 'Users to restrict. Use accountId for Cloud, name for Server/DC.',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Username (Server/DC)' },
                        accountId: { type: 'string', description: 'Account ID (Cloud)' },
                      },
                    },
                  },
                  group: {
                    type: 'array',
                    items: { type: 'object', properties: { name: { type: 'string' } } },
                  },
                },
              },
            },
          },
        },
      },
      required: ['pageId', 'restrictions'],
    },
  },
  // Recently Modified
  {
    name: 'confluence_get_recently_modified',
    description: 'Get recently modified pages',
    inputSchema: {
      type: 'object',
      properties: {
        spaceKey: {
          type: 'string',
          description: 'Optional space key to filter by',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 25)',
        },
      },
      required: [],
    },
  },
  // Tasks
  {
    name: 'confluence_get_page_tasks',
    description: 'Get inline tasks from a page',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID',
        },
      },
      required: ['pageId'],
    },
  },
  // Export
  {
    name: 'confluence_export_page',
    description: 'Get export URL for a page (PDF or Word)',
    inputSchema: {
      type: 'object',
      properties: {
        pageId: {
          type: 'string',
          description: 'The page ID to export',
        },
        format: {
          type: 'string',
          enum: ['pdf', 'word'],
          description: 'Export format (default: pdf)',
        },
      },
      required: ['pageId'],
    },
  },
];

// ==================== TOOL HANDLERS ====================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Connection
      case 'confluence_test_connection':
        result = await confluenceClient.testConnection();
        break;

      // Spaces
      case 'confluence_get_spaces':
        result = await confluenceClient.getSpaces(
          args?.limit as number,
          args?.start as number
        );
        break;

      case 'confluence_get_space':
        result = await confluenceClient.getSpace(args?.spaceKey as string);
        break;

      case 'confluence_get_space_by_key':
        result = await confluenceClient.getSpaceByKey(args?.spaceKey as string);
        break;

      // Pages
      case 'confluence_get_pages':
        result = await confluenceClient.getPages(
          args?.spaceKey as string,
          args?.limit as number,
          args?.start as number
        );
        break;

      case 'confluence_get_page':
        result = await confluenceClient.getPage(
          args?.pageId as string,
          args?.includeBody as boolean ?? true
        );
        break;

      case 'confluence_get_page_by_title':
        result = await confluenceClient.getPageByTitle(
          args?.spaceKey as string,
          args?.title as string
        );
        break;

      case 'confluence_create_page':
        result = await confluenceClient.createPage(
          args?.spaceKey as string,
          args?.title as string,
          args?.body as string,
          args?.parentId as string
        );
        break;

      case 'confluence_update_page':
        result = await confluenceClient.updatePage(
          args?.pageId as string,
          args?.title as string,
          args?.body as string,
          args?.version as number
        );
        break;

      case 'confluence_delete_page':
        await confluenceClient.deletePage(args?.pageId as string);
        result = { success: true, message: 'Page deleted successfully' };
        break;

      // Search
      case 'confluence_search':
        result = await confluenceClient.searchContent(
          args?.cql as string,
          args?.limit as number
        );
        break;

      case 'confluence_search_pages':
        result = await confluenceClient.searchPages(
          args?.query as string,
          args?.spaceKey as string,
          args?.limit as number
        );
        break;

      // Labels
      case 'confluence_get_page_labels':
        result = await confluenceClient.getPageLabels(args?.pageId as string);
        break;

      case 'confluence_add_page_label':
        result = await confluenceClient.addPageLabel(
          args?.pageId as string,
          args?.label as string
        );
        break;

      case 'confluence_delete_page_label':
        await confluenceClient.deletePageLabel(
          args?.pageId as string,
          args?.labelName as string
        );
        result = { success: true, message: 'Label removed successfully' };
        break;

      // Comments
      case 'confluence_get_page_comments':
        result = await confluenceClient.getPageComments(args?.pageId as string);
        break;

      case 'confluence_add_page_comment':
        result = await confluenceClient.addPageComment(
          args?.pageId as string,
          args?.body as string
        );
        break;

      // Attachments
      case 'confluence_get_page_attachments':
        result = await confluenceClient.getPageAttachments(args?.pageId as string);
        break;

      case 'confluence_get_comment_attachments':
        result = await confluenceClient.getCommentAttachments(args?.commentId as string);
        break;

      // Page Hierarchy
      case 'confluence_get_child_pages':
        result = await confluenceClient.getChildPages(
          args?.parentId as string,
          args?.limit as number
        );
        break;

      case 'confluence_get_page_ancestors':
        result = await confluenceClient.getPageAncestors(args?.pageId as string);
        break;

      // User
      case 'confluence_get_current_user':
        result = await confluenceClient.getCurrentUser();
        break;

      // Version History
      case 'confluence_get_page_versions':
        result = await confluenceClient.getPageVersions(
          args?.pageId as string,
          args?.limit as number
        );
        break;

      case 'confluence_get_page_version':
        result = await confluenceClient.getPageVersion(
          args?.pageId as string,
          args?.versionNumber as number
        );
        break;

      // Properties
      case 'confluence_get_page_properties':
        result = await confluenceClient.getPageProperties(args?.pageId as string);
        break;

      // Get Page by URL
      case 'confluence_get_page_by_url':
        result = await confluenceClient.getPageByUrl(args?.pageUrl as string);
        break;

      // Personal Space
      case 'confluence_get_personal_space_key':
        result = { personalSpaceKey: await confluenceClient.getPersonalSpaceKey() };
        break;

      case 'confluence_create_page_in_personal_space':
        result = await confluenceClient.createPageInPersonalSpace(
          args?.title as string,
          args?.body as string,
          args?.parentId as string
        );
        break;

      case 'confluence_create_private_space':
        result = await confluenceClient.createPrivateSpace(
          args?.name as string,
          args?.description as string
        );
        break;

      // Space Management
      case 'confluence_create_space':
        result = await confluenceClient.createSpace(
          args?.spaceKey as string,
          args?.name as string,
          args?.description as string
        );
        break;

      case 'confluence_delete_space':
        await confluenceClient.deleteSpace(args?.spaceKey as string);
        result = { success: true, message: 'Space deleted successfully' };
        break;

      case 'confluence_get_space_homepage':
        result = await confluenceClient.getSpaceHomepage(args?.spaceKey as string);
        break;

      // Page Copy/Move
      case 'confluence_copy_page':
        result = await confluenceClient.copyPage(
          args?.pageId as string,
          args?.destinationSpaceKey as string,
          args?.newTitle as string,
          args?.parentId as string
        );
        break;

      case 'confluence_move_page':
        result = await confluenceClient.movePage(
          args?.pageId as string,
          args?.targetSpaceKey as string,
          args?.targetParentId as string
        );
        break;

      // Watchers
      case 'confluence_get_page_watchers':
        result = await confluenceClient.getPageWatchers(args?.pageId as string);
        break;

      case 'confluence_watch_page':
        await confluenceClient.watchPage(args?.pageId as string);
        result = { success: true, message: 'Now watching page' };
        break;

      case 'confluence_unwatch_page':
        await confluenceClient.unwatchPage(args?.pageId as string);
        result = { success: true, message: 'Stopped watching page' };
        break;

      // Permissions
      case 'confluence_get_page_permissions':
        result = await confluenceClient.getPagePermissions(args?.pageId as string);
        break;

      case 'confluence_set_page_permissions':
        result = await confluenceClient.setPagePermissions(
          args?.pageId as string,
          args?.restrictions as any[]
        );
        break;

      // Recently Modified
      case 'confluence_get_recently_modified':
        result = await confluenceClient.getRecentlyModifiedPages(
          args?.spaceKey as string,
          args?.limit as number
        );
        break;

      // Tasks
      case 'confluence_get_page_tasks':
        result = await confluenceClient.getPageTasks(args?.pageId as string);
        break;

      // Export
      case 'confluence_export_page':
        result = await confluenceClient.exportPage(
          args?.pageId as string,
          (args?.format as 'pdf' | 'word') ?? 'pdf'
        );
        break;

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Error: Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// ==================== RESOURCES ====================

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'confluence://spaces',
        name: 'Confluence Spaces',
        description: 'List of all Confluence spaces',
        mimeType: 'application/json',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;

  if (uri === 'confluence://spaces') {
    const spaces = await confluenceClient.getSpaces();
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(spaces, null, 2),
        },
      ],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// ==================== SERVER STARTUP ====================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Confluence MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
