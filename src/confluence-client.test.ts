import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfluenceClient } from './confluence-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ConfluenceClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor and URL validation', () => {
    it('should accept valid https URL', () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });
      expect(client).toBeDefined();
    });

    it('should accept valid http URL', () => {
      const client = new ConfluenceClient({
        baseUrl: 'http://confluence.example.com',
        pat: 'test-token',
      });
      expect(client).toBeDefined();
    });

    it('should strip trailing slash from baseUrl', () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com/',
        pat: 'test-token',
      });
      expect(client).toBeDefined();
    });

    it('should reject invalid URL', () => {
      expect(() => new ConfluenceClient({
        baseUrl: 'not-a-valid-url',
        pat: 'test-token',
      })).toThrow('Invalid CONFLUENCE_BASE_URL');
    });

    it('should reject URL with embedded credentials', () => {
      expect(() => new ConfluenceClient({
        baseUrl: 'https://user:pass@confluence.example.com',
        pat: 'test-token',
      })).toThrow('URL must not contain embedded credentials');
    });

    it('should reject non-http/https URL', () => {
      expect(() => new ConfluenceClient({
        baseUrl: 'ftp://confluence.example.com',
        pat: 'test-token',
      })).toThrow('URL must use http or https protocol');
    });

    it('should strip Bearer prefix from PAT if included', () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'Bearer my-token',
      });
      expect(client).toBeDefined();
    });

    it('should detect Atlassian Cloud from hostname', () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'test-token',
        username: 'user@example.com',
      });
      expect(client).toBeDefined();
    });
  });

  describe('getSpaces', () => {
    it('should fetch spaces with default pagination', async () => {
      const mockResponse = {
        results: [
          { id: 1, key: 'DEV', name: 'Development', type: 'global', status: 'current' }
        ]
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getSpaces();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].key).toBe('DEV');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/space?limit=25&start=0',
        expect.any(Object)
      );
    });

    it('should clamp limit to maximum 100', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getSpaces(500);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/space?limit=100&start=0',
        expect.any(Object)
      );
    });

    it('should use /wiki prefix for Cloud instances', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'test-token',
        username: 'user@example.com',
      });

      await client.getSpaces();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://mycompany.atlassian.net/wiki/rest/api/space?limit=25&start=0',
        expect.any(Object)
      );
    });
  });

  describe('getSpace', () => {
    it('should fetch a specific space by key', async () => {
      const mockSpace = { id: 1, key: 'DEV', name: 'Development', type: 'global', status: 'current' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSpace),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getSpace('DEV');
      expect(result.key).toBe('DEV');
    });

    it('should throw error for empty spaceKey', async () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await expect(client.getSpace('')).rejects.toThrow('spaceKey is required');
    });

    it('should URL-encode spaceKey', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getSpace('MY SPACE');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/space/MY%20SPACE',
        expect.any(Object)
      );
    });
  });

  describe('getPage', () => {
    it('should fetch page with body by default', async () => {
      const mockPage = { id: '123', title: 'Test Page', type: 'page' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockPage),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPage('123');
      expect(result.id).toBe('123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123?expand=body.storage,version,space',
        expect.any(Object)
      );
    });

    it('should fetch page without body when includeBody is false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getPage('123', false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123',
        expect.any(Object)
      );
    });
  });

  describe('createPage', () => {
    it('should create a page with required fields', async () => {
      const mockCreatedPage = { id: '456', title: 'New Page', type: 'page' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockCreatedPage),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.createPage('DEV', 'New Page', '<p>Content</p>');
      expect(result.title).toBe('New Page');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"New Page"'),
        })
      );
    });

    it('should create a page with parentId', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.createPage('DEV', 'Child Page', '<p>Content</p>', '123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content',
        expect.objectContaining({
          body: expect.stringContaining('"ancestors":[{"id":"123"}]'),
        })
      );
    });
  });

  describe('updatePage', () => {
    it('should update a page with incremented version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.updatePage('123', 'Updated Title', '<p>New content</p>', 5);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"number":6'),
        })
      );
    });

    it('should reject invalid version number', async () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await expect(client.updatePage('123', 'Title', 'Body', 0)).rejects.toThrow(
        'version must be a positive integer'
      );
    });
  });

  describe('deletePage', () => {
    it('should delete a page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.deletePage('123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('searchPages', () => {
    it('should search pages with CQL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.searchPages('test query');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cql=type%3Dpage%20AND%20text~%22test%20query%22'),
        expect.any(Object)
      );
    });

    it('should escape special characters in search query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.searchPages('test "with quotes"');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test%20%5C%22with%20quotes%5C%22'),
        expect.any(Object)
      );
    });

    it('should filter by spaceKey when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.searchPages('query', 'DEV');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('space%3D%22DEV%22'),
        expect.any(Object)
      );
    });
  });

  describe('labels', () => {
    it('should get page labels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [{ name: 'test-label', prefix: 'global' }] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPageLabels('123');
      expect(result.results).toHaveLength(1);
    });

    it('should add a label to a page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.addPageLabel('123', 'new-label');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123/label',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"name":"new-label"'),
        })
      );
    });
  });

  describe('getPageByUrl', () => {
    it('should parse Cloud pages URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '12345' }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'test-token',
        username: 'user@example.com',
      });

      await client.getPageByUrl('https://mycompany.atlassian.net/wiki/spaces/DEV/pages/12345/Test');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/content/12345'),
        expect.any(Object)
      );
    });

    it('should parse Server display URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [{ id: '123' }] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getPageByUrl('https://confluence.example.com/display/DEV/Test+Page');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('spaceKey=DEV'),
        expect.any(Object)
      );
    });

    it('should parse pageId query parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '99999' }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getPageByUrl('https://confluence.example.com/pages/viewpage.action?pageId=99999');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rest/api/content/99999'),
        expect.any(Object)
      );
    });

    it('should reject unsupported URL format', async () => {
      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await expect(client.getPageByUrl('https://example.com/unknown/format')).rejects.toThrow(
        'Unsupported Confluence URL format'
      );
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Page not found'),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await expect(client.getPage('nonexistent')).rejects.toThrow('Confluence API error (404 Not Found)');
    });

    it('should handle timeout', async () => {
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
        timeoutMs: 100,
      });

      await expect(client.getSpaces()).rejects.toThrow('Request timed out');
    });

    it('should sanitize HTML in error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('<html lang="en"><body>Error details with <script>alert("xss")</script></body></html>'),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      try {
        await client.getSpaces();
      } catch (error) {
        expect((error as Error).message).not.toContain('<');
        expect((error as Error).message).not.toContain('>');
      }
    });
  });

  describe('testConnection', () => {
    it('should return success when connection works', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ username: 'testuser' }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.testConnection();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Successfully connected to Confluence');
    });

    it('should return failure when connection fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Invalid credentials'),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'invalid-token',
      });

      const result = await client.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });

  describe('authentication headers', () => {
    it('should use Bearer token for Server/DC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'my-pat-token',
      });

      await client.getSpaces();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-pat-token',
          }),
        })
      );
    });

    it('should use Basic auth for Cloud with username and PAT', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'api-token',
        username: 'user@example.com',
      });

      await client.getSpaces();
      const expectedAuth = `Basic ${Buffer.from('user@example.com:api-token').toString('base64')}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });

    it('should use Basic auth with username and password', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        username: 'admin',
        password: 'secret',
      });

      await client.getSpaces();
      const expectedAuth = `Basic ${Buffer.from('admin:secret').toString('base64')}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });
  });

  describe('createSpace', () => {
    it('should create a space with required fields', async () => {
      const mockSpace = { id: 1, key: 'NEW', name: 'New Space' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSpace),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.createSpace('NEW', 'New Space');
      expect(result.key).toBe('NEW');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/space',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"key":"NEW"'),
        })
      );
    });

    it('should create a space with description', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.createSpace('NEW', 'New Space', 'A description');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('A description'),
        })
      );
    });
  });

  describe('deleteSpace', () => {
    it('should delete a space', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.deleteSpace('OLD');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/space/OLD',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('getSpaceHomepage', () => {
    it('should get space homepage', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ key: 'DEV', homepage: { id: '123' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: '123', title: 'Home' }),
        });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getSpaceHomepage('DEV');
      expect(result.id).toBe('123');
    });

    it('should throw if space has no homepage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ key: 'DEV' }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await expect(client.getSpaceHomepage('DEV')).rejects.toThrow('does not have a homepage');
    });
  });

  describe('copyPage', () => {
    it('should copy a page to same space', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: '123',
            title: 'Original',
            space: { key: 'DEV' },
            body: { storage: { value: '<p>Content</p>' } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: '456', title: 'Copy of Original' }),
        });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.copyPage('123');
      expect(result.title).toBe('Copy of Original');
    });

    it('should copy a page to different space with new title', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: '123',
            title: 'Original',
            space: { key: 'DEV' },
            body: { storage: { value: '<p>Content</p>' } },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: '789' }),
        });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.copyPage('123', 'PROD', 'New Title');
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"title":"New Title"'),
        })
      );
    });
  });

  describe('movePage', () => {
    it('should move a page to new parent', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: '123',
            title: 'Page',
            version: { number: 5 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: '123' }),
        });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.movePage('123', undefined, '999');
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://confluence.example.com/rest/api/content/123',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"ancestors":[{"id":"999"}]'),
        })
      );
    });

    it('should move a page to new space', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            id: '123',
            title: 'Page',
            version: { number: 3 },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.movePage('123', 'NEWSPACE');
      expect(mockFetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"space":{"key":"NEWSPACE"}'),
        })
      );
    });
  });

  describe('watchers', () => {
    it('should get page watchers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [{ username: 'user1' }] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPageWatchers('123');
      expect(result.results).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123/notification/child-created',
        expect.any(Object)
      );
    });

    it('should watch a page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.watchPage('123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/user/watch/content/123',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should unwatch a page', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.unwatchPage('123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/user/watch/content/123',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('permissions', () => {
    it('should get page permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ read: { restrictions: {} } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPagePermissions('123');
      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123/restriction',
        expect.any(Object)
      );
    });

    it('should set page permissions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const restrictions = [
        { operation: 'read' as const, restrictions: { user: [{ name: 'admin' }] } },
      ];
      await client.setPagePermissions('123', restrictions);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://confluence.example.com/rest/api/content/123/restriction',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"operation":"read"'),
        })
      );
    });
  });

  describe('getRecentlyModifiedPages', () => {
    it('should get recently modified pages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getRecentlyModifiedPages();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('ORDER%20BY%20lastmodified%20DESC'),
        expect.any(Object)
      );
    });

    it('should filter by space', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ results: [] }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      await client.getRecentlyModifiedPages('DEV');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('space%3D%22DEV%22'),
        expect.any(Object)
      );
    });
  });

  describe('getPageTasks', () => {
    it('should extract tasks from page content', async () => {
      const pageWithTasks = {
        id: '123',
        body: {
          storage: {
            value: `<p>Some content</p>
              <ac:task>
                <ac:task-id>1</ac:task-id>
                <ac:task-status>incomplete</ac:task-status>
                <ac:task-body>First task</ac:task-body>
              </ac:task>
              <ac:task>
                <ac:task-id>2</ac:task-id>
                <ac:task-status>complete</ac:task-status>
                <ac:task-body>Second task</ac:task-body>
              </ac:task>`,
          },
        },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(pageWithTasks),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPageTasks('123');
      expect(result.results).toHaveLength(2);
      expect(result.results[0].id).toBe('1');
      expect(result.results[0].status).toBe('incomplete');
      expect(result.results[1].status).toBe('complete');
    });

    it('should return empty array when no tasks', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '123', body: { storage: { value: '<p>No tasks</p>' } } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.getPageTasks('123');
      expect(result.results).toHaveLength(0);
    });
  });

  describe('exportPage', () => {
    it('should generate PDF export URL for Server/DC', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '123', space: { key: 'DEV' } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.exportPage('123', 'pdf');
      expect(result.downloadUrl).toContain('pdfpageexport');
      expect(result.downloadUrl).toContain('pageId=123');
    });

    it('should generate PDF export URL for Cloud', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '123', space: { key: 'DEV' } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'test-token',
        username: 'user@example.com',
      });

      const result = await client.exportPage('123', 'pdf');
      expect(result.downloadUrl).toContain('/spaces/DEV/pages/123/export/pdf');
      expect(result.message).toContain('Confluence PDF Export');
    });

    it('should generate Word export URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '123', space: { key: 'DEV' } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.exportPage('123', 'word');
      expect(result.downloadUrl).toContain('exportword');
      expect(result.downloadUrl).toContain('pageId=123');
    });

    it('should default to PDF format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: '123', space: { key: 'DEV' } }),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const result = await client.exportPage('123');
      expect(result.downloadUrl).toContain('pdfpageexport');
    });
  });

  describe('setPagePermissions Cloud vs Server', () => {
    it('should use accountId for Cloud users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://mycompany.atlassian.net',
        pat: 'test-token',
        username: 'user@example.com',
      });

      const restrictions = [
        { operation: 'read' as const, restrictions: { user: [{ accountId: '5b10ac8d' }] } },
      ];
      await client.setPagePermissions('123', restrictions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"accountId":"5b10ac8d"'),
        })
      );
    });

    it('should use name for Server/DC users', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      const client = new ConfluenceClient({
        baseUrl: 'https://confluence.example.com',
        pat: 'test-token',
      });

      const restrictions = [
        { operation: 'read' as const, restrictions: { user: [{ name: 'admin' }] } },
      ];
      await client.setPagePermissions('123', restrictions);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"name":"admin"'),
        })
      );
    });
  });
});
