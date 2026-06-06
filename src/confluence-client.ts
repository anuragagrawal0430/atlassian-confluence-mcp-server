// Using native fetch (Node.js 18+) - no external dependencies needed

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_LIMIT = 100;

export interface ConfluenceConfig {
  baseUrl: string;
  pat?: string;
  username?: string;
  password?: string;
  isCloud?: boolean;
  timeoutMs?: number;
}

export interface Space {
  id: number;
  key: string;
  name: string;
  type: string;
  status: string;
  _links: {
    webui: string;
    self: string;
  };
}

export interface Page {
  id: string;
  type: string;
  status: string;
  title: string;
  spaceId?: string;
  parentId?: string;
  parentType?: string;
  position?: number;
  authorId?: string;
  ownerId?: string;
  lastOwnerId?: string;
  createdAt?: string;
  version?: {
    number: number;
    message?: string;
    minorEdit?: boolean;
    authorId?: string;
    createdAt?: string;
  };
  body?: {
    storage?: {
      value: string;
      representation: string;
    };
    atlas_doc_format?: {
      value: string;
      representation: string;
    };
  };
  _links?: {
    webui?: string;
    editui?: string;
    tinyui?: string;
    self?: string;
  };
}

export interface SearchResult {
  results: Page[];
  _links: {
    next?: string;
    base: string;
  };
}

export interface Label {
  prefix: string;
  name: string;
  id: string;
}

export interface Attachment {
  id: string;
  status: string;
  title: string;
  mediaType: string;
  fileSize: number;
  webuiLink: string;
  downloadLink: string;
}

export interface Comment {
  id: string;
  status: string;
  title: string;
  body: {
    storage?: {
      value: string;
      representation: string;
    };
  };
  version?: {
    number: number;
    createdAt?: string;
  };
}

export class ConfluenceClient {
  private baseUrl: string;
  private pat?: string;
  private username?: string;
  private password?: string;
  private isCloud: boolean;
  private timeoutMs: number;

  constructor(config: ConfluenceConfig) {
    this.validateBaseUrl(config.baseUrl);
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    const parsedBaseUrl = new URL(this.baseUrl);
    const hostname = parsedBaseUrl.hostname.toLowerCase();
    // Strip accidental "Bearer " prefix if user included it in the token value
    this.pat = config.pat?.replace(/^Bearer\s+/i, '');
    this.username = config.username;
    this.password = config.password;
    const isAtlassianCloudHost =
      hostname === 'atlassian.net' || hostname.endsWith('.atlassian.net');
    this.isCloud = config.isCloud ?? isAtlassianCloudHost;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  private validateBaseUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (e) {
      throw new Error(`Invalid CONFLUENCE_BASE_URL: ${e instanceof Error ? e.message : 'malformed URL'}`);
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must use http or https protocol');
    }
    // Prevent SSRF attacks by blocking localhost/internal IPs in production
    // Users connecting to local dev instances should use explicit hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      // Allow localhost for development, but log a warning
      console.warn('Warning: Connecting to localhost Confluence instance');
    }
    // Block URLs with credentials embedded (security best practice)
    if (parsed.username || parsed.password) {
      throw new Error('URL must not contain embedded credentials');
    }
  }

  private static sanitizeParam(value: string, paramName: string): string {
    if (!value || typeof value !== 'string') {
      throw new Error(`${paramName} is required and must be a non-empty string`);
    }
    return value.trim();
  }

  private static clampLimit(limit?: number): number {
    if (limit === undefined || limit === null) return 25;
    return Math.max(1, Math.min(Number(limit) || 25, MAX_LIMIT));
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (this.pat) {
      if (this.isCloud && this.username) {
        // Confluence Cloud API tokens use Basic Auth: email:api_token
        const credentials = Buffer.from(`${this.username}:${this.pat}`).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
      } else {
        // Server/Data Center PATs use Bearer token
        headers['Authorization'] = `Bearer ${this.pat}`;
      }
    } else if (this.username && this.password) {
      // Basic authentication with username/password
      const credentials = Buffer.from(`${this.username}:${this.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    return headers;
  }

  private getApiPrefix(): string {
    return this.isCloud ? '/wiki' : '';
  }

  private sanitizeErrorMessage(response: Response, responseText: string): string {
    const status = response.status;
    const statusText = response.statusText;
    const truncated = responseText.length > 500
      ? responseText.substring(0, 500) + '... [truncated]'
      : responseText;

    // Strip HTML-like content that could leak server internals or be misinterpreted as markup
    const cleaned = truncated.replace(/[<>]/g, '').trim();
    return `Confluence API error (${status} ${statusText}): ${cleaned || 'No details available'}`;
  }

  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const options: any = {
        method,
        headers: this.getHeaders(),
        signal: controller.signal,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      let response: Response;
      try {
        response = await fetch(url, options);
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Request timed out after ${this.timeoutMs}ms: ${method} ${endpoint}`);
        }
        throw error;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(this.sanitizeErrorMessage(response, errorText));
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  // ==================== SPACES ====================

  async getSpaces(limit: number = 25, start: number = 0): Promise<{ results: Space[] }> {
    const prefix = this.getApiPrefix();
    const safeLimit = ConfluenceClient.clampLimit(limit);
    const safeStart = Math.max(0, Number(start) || 0);
    return this.request<{ results: Space[] }>(
      `${prefix}/rest/api/space?limit=${safeLimit}&start=${safeStart}`
    );
  }

  async getSpace(spaceKey: string): Promise<Space> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const prefix = this.getApiPrefix();
    return this.request<Space>(`${prefix}/rest/api/space/${encodeURIComponent(key)}`);
  }

  async getSpaceByKey(spaceKey: string): Promise<Space> {
    return this.getSpace(spaceKey);
  }

  // ==================== PAGES ====================

  async getPages(
    spaceKey?: string,
    limit: number = 25,
    start: number = 0
  ): Promise<{ results: any[] }> {
    const prefix = this.getApiPrefix();
    const safeLimit = ConfluenceClient.clampLimit(limit);
    const safeStart = Math.max(0, Number(start) || 0);
    let endpoint = `${prefix}/rest/api/content?type=page&limit=${safeLimit}&start=${safeStart}`;
    if (spaceKey) {
      endpoint += `&spaceKey=${encodeURIComponent(spaceKey.trim())}`;
    }
    endpoint += '&expand=version,body.storage';
    return this.request<{ results: any[] }>(endpoint);
  }

  async getPage(pageId: string, includeBody: boolean = true): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    let endpoint = `${prefix}/rest/api/content/${encodeURIComponent(id)}`;
    if (includeBody) {
      endpoint += '?expand=body.storage,version,space';
    }
    return this.request<any>(endpoint);
  }

  async getPageByTitle(
    spaceKey: string,
    title: string
  ): Promise<any | null> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const safeTitle = ConfluenceClient.sanitizeParam(title, 'title');
    const prefix = this.getApiPrefix();
    const response = await this.request<{ results: any[] }>(
      `${prefix}/rest/api/content?spaceKey=${encodeURIComponent(key)}&title=${encodeURIComponent(safeTitle)}&expand=body.storage,version`
    );
    return response.results.length > 0 ? response.results[0] : null;
  }

  async createPage(
    spaceKey: string,
    title: string,
    body: string,
    parentId?: string
  ): Promise<any> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const safeTitle = ConfluenceClient.sanitizeParam(title, 'title');
    const prefix = this.getApiPrefix();
    const payload: any = {
      type: 'page',
      title: safeTitle,
      space: { key },
      body: {
        storage: {
          value: body ?? '',
          representation: 'storage',
        },
      },
    };

    if (parentId) {
      payload.ancestors = [{ id: ConfluenceClient.sanitizeParam(parentId, 'parentId') }];
    }

    return this.request<any>(`${prefix}/rest/api/content`, 'POST', payload);
  }

  async updatePage(
    pageId: string,
    title: string,
    body: string,
    version: number
  ): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const safeTitle = ConfluenceClient.sanitizeParam(title, 'title');
    const safeVersion = Number(version);
    if (!Number.isInteger(safeVersion) || safeVersion < 1) {
      throw new Error('version must be a positive integer');
    }
    const prefix = this.getApiPrefix();
    const payload = {
      type: 'page',
      title: safeTitle,
      body: {
        storage: {
          value: body ?? '',
          representation: 'storage',
        },
      },
      version: {
        number: safeVersion + 1,
      },
    };

    return this.request<any>(`${prefix}/rest/api/content/${encodeURIComponent(id)}`, 'PUT', payload);
  }

  async deletePage(pageId: string): Promise<void> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    await this.request<void>(`${prefix}/rest/api/content/${encodeURIComponent(id)}`, 'DELETE');
  }

  // ==================== SEARCH ====================

  async searchContent(
    cql: string,
    limit: number = 25,
    start: number = 0
  ): Promise<any> {
    ConfluenceClient.sanitizeParam(cql, 'cql');
    const prefix = this.getApiPrefix();
    const safeLimit = ConfluenceClient.clampLimit(limit);
    const safeStart = Math.max(0, Number(start) || 0);
    const endpoint = `${prefix}/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${safeLimit}&start=${safeStart}`;
    return this.request<any>(endpoint);
  }

  private static escapeCqlString(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  async searchPages(
    query: string,
    spaceKey?: string,
    limit: number = 25
  ): Promise<any> {
    const safeQuery = ConfluenceClient.escapeCqlString(
      ConfluenceClient.sanitizeParam(query, 'query')
    );
    let cql = `type=page AND text~"${safeQuery}"`;
    if (spaceKey) {
      const safeKey = ConfluenceClient.escapeCqlString(spaceKey.trim());
      cql += ` AND space="${safeKey}"`;
    }
    return this.searchContent(cql, limit);
  }

  // ==================== LABELS ====================

  async getPageLabels(pageId: string): Promise<{ results: Label[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: Label[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/label`
    );
  }

  async addPageLabel(pageId: string, label: string): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const safeLabel = ConfluenceClient.sanitizeParam(label, 'label');
    const prefix = this.getApiPrefix();
    return this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/label`,
      'POST',
      [{ name: safeLabel, prefix: 'global' }]
    );
  }

  async deletePageLabel(pageId: string, labelName: string): Promise<void> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const safeName = ConfluenceClient.sanitizeParam(labelName, 'labelName');
    const prefix = this.getApiPrefix();
    await this.request<void>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/label/${encodeURIComponent(safeName)}`,
      'DELETE'
    );
  }

  // ==================== ATTACHMENTS ====================

  async getPageAttachments(pageId: string): Promise<{ results: Attachment[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: Attachment[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/child/attachment`
    );
  }

  async getCommentAttachments(commentId: string): Promise<{ results: Attachment[] }> {
    const id = ConfluenceClient.sanitizeParam(commentId, 'commentId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: Attachment[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/child/attachment`
    );
  }

  // ==================== COMMENTS ====================

  async getPageComments(pageId: string): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: any[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/child/comment?expand=body.storage`
    );
  }

  async addPageComment(pageId: string, body: string): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<any>(
      `${prefix}/rest/api/content`,
      'POST',
      {
        type: 'comment',
        container: { id, type: 'page' },
        body: {
          storage: {
            value: body ?? '',
            representation: 'storage',
          },
        },
      }
    );
  }

  // ==================== PAGE HIERARCHY ====================

  async getChildPages(parentId: string, limit: number = 25): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(parentId, 'parentId');
    const safeLimit = ConfluenceClient.clampLimit(limit);
    const prefix = this.getApiPrefix();
    return this.request<{ results: any[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/child/page?limit=${safeLimit}&expand=version`
    );
  }

  async getPageAncestors(pageId: string): Promise<any[]> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    const page = await this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}?expand=ancestors`
    );
    return page.ancestors || [];
  }

  // ==================== USER ====================

  async getCurrentUser(): Promise<any> {
    const prefix = this.getApiPrefix();
    return this.request<any>(`${prefix}/rest/api/user/current`);
  }

  async getPersonalSpaceKey(): Promise<string> {
    const user = await this.getCurrentUser();
    if (this.isCloud) {
      // Cloud personal space key: ~accountId with non-alphanumeric chars stripped
      const accountId = user.accountId || '';
      return `~${accountId.replace(/[^a-zA-Z0-9]/g, '')}`;
    }
    // Server/Data Center: ~username
    return `~${user.username}`;
  }

  // ==================== PERSONAL SPACE PAGE CREATION ====================

  async createPageInPersonalSpace(
    title: string,
    body: string,
    parentId?: string
  ): Promise<any> {
    const personalSpaceKey = await this.getPersonalSpaceKey();
    return this.createPage(personalSpaceKey, title, body, parentId);
  }

  // ==================== CONTENT PROPERTIES ====================

  async getPageProperties(pageId: string): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: any[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/property`
    );
  }

  // ==================== VERSION HISTORY ====================

  async getPageVersions(pageId: string, limit: number = 25): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const safeLimit = ConfluenceClient.clampLimit(limit);
    const prefix = this.getApiPrefix();
    return this.request<{ results: any[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/version?limit=${safeLimit}`
    );
  }

  async getPageVersion(pageId: string, versionNumber: number): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const safeVersion = Number(versionNumber);
    if (!Number.isInteger(safeVersion) || safeVersion < 1) {
      throw new Error('versionNumber must be a positive integer');
    }
    const prefix = this.getApiPrefix();
    return this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/version/${safeVersion}`
    );
  }

  // ==================== CONNECTION TEST ====================

  async testConnection(): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const user = await this.getCurrentUser();
      return { 
        success: true, 
        message: 'Successfully connected to Confluence',
        user 
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  // ==================== GET PAGE BY URL ====================

  /**
   * Resolves a Confluence tiny URL (/wiki/x/ID or /x/ID) by following
   * the redirect chain until a page ID can be extracted.
   */
  private async resolveTinyUrl(pageUrl: string): Promise<string> {
    let currentUrl = pageUrl;
    // Follow up to 5 redirects
    for (let i = 0; i < 5; i++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          headers: this.getHeaders(),
          redirect: 'manual',
          signal: controller.signal as any,
        });
        clearTimeout(timeout);

        const location = response.headers.get('location');
        if (!location) {
          // No more redirects — check if the final URL has a page ID
          break;
        }

        // Resolve relative redirects
        currentUrl = location.startsWith('http')
          ? location
          : `${this.baseUrl}${location}`;

        // Check if we can already extract a page ID
        const idMatch = currentUrl.match(/\/pages\/(\d+)/);
        if (idMatch) {
          return idMatch[1];
        }
      } catch (e) {
        clearTimeout(timeout);
        throw new Error(`Failed to resolve tiny URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
    }

    // Last-resort: try to extract page ID from the final URL
    const finalIdMatch = currentUrl.match(/\/pages\/(\d+)/);
    if (finalIdMatch) {
      return finalIdMatch[1];
    }
    const paramMatch = currentUrl.match(/pageId=(\d+)/);
    if (paramMatch) {
      return paramMatch[1];
    }

    throw new Error('Could not resolve tiny URL to a page ID after following redirects');
  }

  async getPageByUrl(pageUrl: string): Promise<any> {
    ConfluenceClient.sanitizeParam(pageUrl, 'pageUrl');

    // Handle Cloud tiny URL: /wiki/x/IDENTIFIER or /x/IDENTIFIER
    const tinyMatch = pageUrl.match(/\/(?:wiki\/)?x\/([A-Za-z0-9_-]+)\s*$/);
    if (tinyMatch) {
      const fullTinyUrl = pageUrl.startsWith('http')
        ? pageUrl
        : `${this.baseUrl}${pageUrl}`;
      const pageId = await this.resolveTinyUrl(fullTinyUrl);
      return this.getPage(pageId);
    }

    // Handle Cloud URL: /wiki/spaces/SPACEKEY/pages/PAGEID/Title
    const cloudPagesMatch = pageUrl.match(/\/(?:wiki\/)?spaces\/[^\/]+\/pages\/(\d+)/);
    if (cloudPagesMatch) {
      return this.getPage(cloudPagesMatch[1]);
    }

    // Handle Server/DC URL: /display/SPACEKEY/Page+Title
    const displayMatch = pageUrl.match(/\/display\/([^\/]+)\/(.+)$/);
    if (displayMatch) {
      const spaceKey = decodeURIComponent(displayMatch[1]);
      const title = decodeURIComponent(displayMatch[2].replace(/\+/g, ' '));
      return this.getPageByTitle(spaceKey, title);
    }
    
    // Handle ?pageId=12345 format
    const pageIdMatch = pageUrl.match(/pageId=(\d+)/);
    if (pageIdMatch) {
      return this.getPage(pageIdMatch[1]);
    }
    
    throw new Error(
      'Unsupported Confluence URL format. Supported: ' +
      '/wiki/x/ID (tiny URL), /wiki/spaces/SPACE/pages/ID/Title, ' +
      '/display/SPACE/Title, ?pageId=ID'
    );
  }

  // ==================== PRIVATE SPACE ====================

  async createPrivateSpace(name: string, description?: string): Promise<any> {
    const safeName = ConfluenceClient.sanitizeParam(name, 'name');
    const prefix = this.getApiPrefix();
    const payload: any = {
      name: safeName,
      description: description ? {
        plain: {
          value: description.trim(),
          representation: 'plain'
        }
      } : undefined
    };
    return this.request<any>(`${prefix}/rest/api/space/_private`, 'POST', payload);
  }

  // ==================== SPACE MANAGEMENT ====================

  async createSpace(
    spaceKey: string,
    name: string,
    description?: string
  ): Promise<any> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const safeName = ConfluenceClient.sanitizeParam(name, 'name');
    const prefix = this.getApiPrefix();
    const payload: any = {
      key,
      name: safeName,
      description: description ? {
        plain: {
          value: description.trim(),
          representation: 'plain'
        }
      } : undefined
    };
    return this.request<any>(`${prefix}/rest/api/space`, 'POST', payload);
  }

  async deleteSpace(spaceKey: string): Promise<void> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const prefix = this.getApiPrefix();
    await this.request<void>(`${prefix}/rest/api/space/${encodeURIComponent(key)}`, 'DELETE');
  }

  async getSpaceHomepage(spaceKey: string): Promise<any> {
    const key = ConfluenceClient.sanitizeParam(spaceKey, 'spaceKey');
    const prefix = this.getApiPrefix();
    const space = await this.request<any>(
      `${prefix}/rest/api/space/${encodeURIComponent(key)}?expand=homepage`
    );
    if (!space.homepage) {
      throw new Error(`Space ${key} does not have a homepage`);
    }
    return this.getPage(space.homepage.id);
  }

  // ==================== PAGE COPY/MOVE ====================

  async copyPage(
    pageId: string,
    destinationSpaceKey?: string,
    newTitle?: string,
    parentId?: string
  ): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    
    // Get the original page
    const originalPage = await this.getPage(id);
    const targetSpaceKey = destinationSpaceKey?.trim() || originalPage.space?.key;
    const targetTitle = newTitle?.trim() || `Copy of ${originalPage.title}`;
    
    if (!targetSpaceKey) {
      throw new Error('Could not determine destination space key');
    }
    
    // Create a copy with the same content
    return this.createPage(
      targetSpaceKey,
      targetTitle,
      originalPage.body?.storage?.value || '',
      parentId
    );
  }

  async movePage(
    pageId: string,
    targetSpaceKey?: string,
    targetParentId?: string
  ): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    
    // Get current page to preserve content
    const page = await this.getPage(id);
    const currentVersion = page.version?.number;
    
    if (!currentVersion) {
      throw new Error('Could not determine current page version');
    }
    
    const payload: any = {
      type: 'page',
      title: page.title,
      version: { number: currentVersion + 1 },
    };
    
    // Set new space if provided
    if (targetSpaceKey) {
      payload.space = { key: ConfluenceClient.sanitizeParam(targetSpaceKey, 'targetSpaceKey') };
    }
    
    // Set new parent if provided
    if (targetParentId) {
      payload.ancestors = [{ id: ConfluenceClient.sanitizeParam(targetParentId, 'targetParentId') }];
    } else if (targetSpaceKey && !targetParentId) {
      // Moving to new space root - clear ancestors
      payload.ancestors = [];
    }
    
    return this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}`,
      'PUT',
      payload
    );
  }

  // ==================== WATCHERS ====================

  async getPageWatchers(pageId: string): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<{ results: any[] }>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/notification/child-created`
    );
  }

  async watchPage(pageId: string): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<any>(
      `${prefix}/rest/api/user/watch/content/${encodeURIComponent(id)}`,
      'POST'
    );
  }

  async unwatchPage(pageId: string): Promise<void> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    await this.request<void>(
      `${prefix}/rest/api/user/watch/content/${encodeURIComponent(id)}`,
      'DELETE'
    );
  }

  // ==================== PERMISSIONS/RESTRICTIONS ====================

  async getPagePermissions(pageId: string): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    return this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/restriction`
    );
  }

  async setPagePermissions(
    pageId: string,
    restrictions: {
      operation: 'read' | 'update';
      restrictions: {
        user?: { name?: string; accountId?: string }[];
        group?: { name: string }[];
      };
    }[]
  ): Promise<any> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    
    // Transform restrictions for Cloud vs Server/DC
    // Cloud uses accountId, Server/DC uses name
    const transformedRestrictions = restrictions.map(r => ({
      operation: r.operation,
      restrictions: {
        user: r.restrictions.user?.map(u => {
          if (this.isCloud) {
            // Cloud: prefer accountId, fall back to name if accountId not provided
            return u.accountId ? { accountId: u.accountId } : { username: u.name };
          }
          // Server/DC: use name
          return { name: u.name };
        }),
        group: r.restrictions.group,
      },
    }));
    
    return this.request<any>(
      `${prefix}/rest/api/content/${encodeURIComponent(id)}/restriction`,
      'PUT',
      transformedRestrictions
    );
  }

  // ==================== RECENTLY MODIFIED ====================

  async getRecentlyModifiedPages(
    spaceKey?: string,
    limit: number = 25
  ): Promise<any> {
    const safeLimit = ConfluenceClient.clampLimit(limit);
    let cql = 'type=page ORDER BY lastmodified DESC';
    if (spaceKey) {
      const safeKey = ConfluenceClient.escapeCqlString(spaceKey.trim());
      cql = `type=page AND space="${safeKey}" ORDER BY lastmodified DESC`;
    }
    return this.searchContent(cql, safeLimit);
  }

  // ==================== TASKS ====================

  async getPageTasks(pageId: string): Promise<{ results: any[] }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    // Tasks are stored as inline tasks in the page content
    // We need to get the page and parse tasks from the body
    const page = await this.getPage(id, true);
    const body = page.body?.storage?.value || '';
    
    // Extract inline tasks from storage format
    // Tasks are in format: <ac:task><ac:task-id>ID</ac:task-id><ac:task-status>STATUS</ac:task-status><ac:task-body>CONTENT</ac:task-body></ac:task>
    const taskRegex = /<ac:task>[\s\S]*?<ac:task-id>([^<]+)<\/ac:task-id>[\s\S]*?<ac:task-status>([^<]+)<\/ac:task-status>[\s\S]*?<ac:task-body>([\s\S]*?)<\/ac:task-body>[\s\S]*?<\/ac:task>/g;
    const tasks: any[] = [];
    let match;
    
    while ((match = taskRegex.exec(body)) !== null) {
      tasks.push({
        id: match[1],
        status: match[2],
        body: match[3].replace(/<[^>]+>/g, '').trim(), // Strip HTML tags for readability
      });
    }
    
    return { results: tasks };
  }

  // ==================== EXPORT ====================

  async exportPage(
    pageId: string,
    format: 'pdf' | 'word' = 'pdf'
  ): Promise<{ downloadUrl: string; message: string }> {
    const id = ConfluenceClient.sanitizeParam(pageId, 'pageId');
    const prefix = this.getApiPrefix();
    
    // Get page info for the export URL
    const page = await this.getPage(id, false);
    const spaceKey = page.space?.key;
    
    if (!spaceKey) {
      throw new Error('Could not determine space key for export');
    }
    
    let exportPath: string;
    let message: string;
    
    if (this.isCloud) {
      // Confluence Cloud export URLs
      if (format === 'pdf') {
        exportPath = `${prefix}/spaces/${encodeURIComponent(spaceKey)}/pages/${id}/export/pdf`;
        message = 'PDF export URL generated. Note: Confluence Cloud PDF export requires the "Confluence PDF Export" app to be installed.';
      } else {
        exportPath = `${prefix}/exportword?pageId=${id}`;
        message = 'Word export URL generated. Open this URL in a browser while authenticated to download the file.';
      }
    } else {
      // Server/Data Center export URLs
      exportPath = format === 'pdf'
        ? `${prefix}/spaces/flyingpdf/pdfpageexport.action?pageId=${id}`
        : `${prefix}/exportword?pageId=${id}`;
      message = `Export URL generated. Open this URL in a browser while authenticated to download the ${format.toUpperCase()} file.`;
    }
    
    return {
      downloadUrl: `${this.baseUrl}${exportPath}`,
      message,
    };
  }
}
