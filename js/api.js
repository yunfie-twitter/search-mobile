/**
 * Wholphin Search API Client (改善版)
 * @see https://api.p2pear.asia/
 */

const API_BASE_URL = 'https://api.p2pear.asia';
const DEFAULT_TIMEOUT = 30000; // 30秒
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1秒

/**
 * バリデーション定数
 * @readonly
 */
const VALIDATION = {
  PAGE_MIN: 1,
  PAGE_MAX: 10,
  SAFESEARCH_MIN: 0,
  SAFESEARCH_MAX: 2,
  QUERY_MAX_LENGTH: 1000,
  ALLOWED_LANGUAGES: ['ja', 'en']
};

/**
 * 検索タイプ
 * @readonly
 * @enum {string}
 */
const SearchType = {
  WEB: 'web',
  IMAGE: 'image',
  SUGGEST: 'suggest',
  VIDEO: 'video',
  NEWS: 'news',
  PANEL: 'panel'
};

/**
 * セーフサーチレベル
 * @readonly
 * @enum {number}
 */
const SafeSearchLevel = {
  DISABLED: 0,
  MODERATE: 1,
  STRICT: 2
};

/**
 * 言語コード
 * @readonly
 * @enum {string}
 */
const Language = {
  JAPANESE: 'ja',
  ENGLISH: 'en'
};

/**
 * APIエラークラス
 */
class WholphinAPIError extends Error {
  /**
   * @param {string} message - エラーメッセージ
   * @param {number|null} status - HTTPステータスコード
   * @param {*} details - エラー詳細
   * @param {boolean} [isRetryable=false] - リトライ可能かどうか
   */
  constructor(message, status, details, isRetryable = false) {
    super(message);
    this.name = 'WholphinAPIError';
    this.status = status;
    this.details = details;
    this.isRetryable = isRetryable;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Wholphin Search API Client
 */
class WholphinAPI {
  /**
   * @param {string} [baseUrl] - APIベースURL
   * @param {Object} [options] - クライアントオプション
   * @param {number} [options.timeout=30000] - タイムアウト時間(ミリ秒)
   * @param {number} [options.maxRetries=3] - 最大リトライ回数
   * @param {boolean} [options.enableRetry=true] - リトライを有効にするか
   */
  constructor(baseUrl = API_BASE_URL, options = {}) {
    this._validateUrl(baseUrl);
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : MAX_RETRY_ATTEMPTS;
    this.enableRetry = options.enableRetry !== false;
  }

  /**
   * URLの妥当性を検証
   * @private
   * @param {string} url - 検証するURL
   * @throws {WholphinAPIError} 不正なURL
   */
  _validateUrl(url) {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol');
      }
    } catch (error) {
      throw new WholphinAPIError(
        `Invalid base URL: ${error.message}`,
        null,
        error
      );
    }
  }

  /**
   * 検索パラメータをバリデーション
   * @private
   * @param {Object} options - 検索オプション
   * @throws {WholphinAPIError} バリデーションエラー
   */
  _validateSearchParams(options) {
    const errors = [];

    // クエリのバリデーション
    if (!options.q) {
      errors.push('Search query (q) is required');
    } else if (typeof options.q !== 'string') {
      errors.push('Search query must be a string');
    } else if (options.q.trim() === '') {
      errors.push('Search query cannot be empty');
    } else if (options.q.length > VALIDATION.QUERY_MAX_LENGTH) {
      errors.push(`Search query exceeds maximum length of ${VALIDATION.QUERY_MAX_LENGTH}`);
    }

    // ページ番号のバリデーション
    if (options.page !== undefined) {
      if (!Number.isInteger(options.page)) {
        errors.push('Page must be an integer');
      } else if (options.page < VALIDATION.PAGE_MIN || options.page > VALIDATION.PAGE_MAX) {
        errors.push(`Page must be between ${VALIDATION.PAGE_MIN} and ${VALIDATION.PAGE_MAX}`);
      }
    }

    // セーフサーチのバリデーション
    if (options.safesearch !== undefined) {
      if (!Number.isInteger(options.safesearch)) {
        errors.push('Safesearch must be an integer');
      } else if (options.safesearch < VALIDATION.SAFESEARCH_MIN || options.safesearch > VALIDATION.SAFESEARCH_MAX) {
        errors.push(`Safesearch must be between ${VALIDATION.SAFESEARCH_MIN} and ${VALIDATION.SAFESEARCH_MAX}`);
      }
    }

    // 言語コードのバリデーション
    if (options.lang !== undefined) {
      if (typeof options.lang !== 'string') {
        errors.push('Language must be a string');
      } else if (!VALIDATION.ALLOWED_LANGUAGES.includes(options.lang)) {
        errors.push(`Language must be one of: ${VALIDATION.ALLOWED_LANGUAGES.join(', ')}`);
      }
    }

    // 検索タイプのバリデーション
    if (options.type !== undefined) {
      const validTypes = Object.values(SearchType);
      if (!validTypes.includes(options.type)) {
        errors.push(`Type must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new WholphinAPIError(
        'Validation failed',
        null,
        { errors }
      );
    }
  }

  /**
   * URLクエリパラメータを構築
   * @private
   * @param {Object} params - パラメータオブジェクト
   * @returns {string} クエリ文字列
   */
  _buildQueryString(params) {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    return filtered.length > 0 ? `?${filtered.join('&')}` : '';
  }

  /**
   * リトライ可能なエラーかどうかを判定
   * @private
   * @param {Error} error - エラーオブジェクト
   * @param {number|null} status - HTTPステータスコード
   * @returns {boolean} リトライ可能かどうか
   */
  _isRetryableError(error, status) {
    // ネットワークエラー
    if (!status) return true;
    
    // サーバーエラー、レート制限、サービス利用不可
    const retryableStatuses = [408, 429, 500, 502, 503, 504];
    return retryableStatuses.includes(status);
  }

  /**
   * リトライ遅延を計算(エクスポネンシャルバックオフ)
   * @private
   * @param {number} attempt - リトライ試行回数(0始まり)
   * @returns {number} 遅延時間(ミリ秒)
   */
  _calculateRetryDelay(attempt) {
    // ジッターを追加してThundering Herd問題を回避
    const jitter = Math.random() * 1000;
    return RETRY_DELAY_BASE * Math.pow(2, attempt) + jitter;
  }

  /**
   * 遅延を実行
   * @private
   * @param {number} ms - 遅延時間(ミリ秒)
   * @returns {Promise<void>}
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * タイムアウト付きフェッチ
   * @private
   * @param {string} url - リクエストURL
   * @param {Object} options - フェッチオプション
   * @param {number} timeout - タイムアウト時間(ミリ秒)
   * @returns {Promise<Response>} レスポンス
   * @throws {WholphinAPIError} タイムアウトエラー
   */
  async _fetchWithTimeout(url, options, timeout) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new WholphinAPIError(
          `Request timeout after ${timeout}ms`,
          null,
          error,
          true // タイムアウトはリトライ可能
        );
      }
      throw error;
    }
  }

  /**
   * APIリクエストを実行(リトライ機能付き)
   * @private
   * @param {string} endpoint - エンドポイントパス
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Object>} レスポンスデータ
   * @throws {WholphinAPIError} APIエラー
   */
  async _request(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}${this._buildQueryString(params)}`;
    let lastError;

    const maxAttempts = this.enableRetry ? this.maxRetries : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await this._fetchWithTimeout(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'WholphinAPI/1.0'
          }
        }, this.timeout);

        if (!response.ok) {
          let errorDetails;
          const contentType = response.headers.get('content-type');
          
          try {
            if (contentType && contentType.includes('application/json')) {
              errorDetails = await response.json();
            } else {
              errorDetails = await response.text();
            }
          } catch {
            errorDetails = 'Unable to parse error response';
          }

          const isRetryable = this._isRetryableError(null, response.status);
          const error = new WholphinAPIError(
            `API request failed: ${response.status} ${response.statusText}`,
            response.status,
            errorDetails,
            isRetryable
          );

          // リトライ不可能なエラーは即座にthrow
          if (!isRetryable || attempt === maxAttempts - 1) {
            throw error;
          }

          lastError = error;
          // 次のリトライ前に待機
          await this._delay(this._calculateRetryDelay(attempt));
          continue;
        }

        // 成功時
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new WholphinAPIError(
            'Invalid response format: expected JSON',
            response.status,
            await response.text()
          );
        }

        return await response.json();

      } catch (error) {
        // WholphinAPIErrorの場合はそのままthrow(既に処理済み)
        if (error instanceof WholphinAPIError) {
          if (!error.isRetryable || attempt === maxAttempts - 1) {
            throw error;
          }
          lastError = error;
        } else {
          // その他のエラー(ネットワークエラーなど)
          const networkError = new WholphinAPIError(
            `Network error: ${error.message}`,
            null,
            error,
            true // ネットワークエラーはリトライ可能
          );

          if (attempt === maxAttempts - 1) {
            throw networkError;
          }
          lastError = networkError;
        }

        // 次のリトライ前に待機
        await this._delay(this._calculateRetryDelay(attempt));
      }
    }

    // すべてのリトライが失敗
    throw lastError;
  }

  /**
   * 検索を実行
   * @param {Object} options - 検索オプション
   * @param {string} options.q - 検索ワード (必須)
   * @param {number} [options.page=1] - ページ番号 (1-10)
   * @param {string} [options.type='web'] - 検索タイプ
   * @param {number} [options.safesearch=0] - セーフサーチレベル (0-2)
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} 検索結果
   * @throws {WholphinAPIError} APIエラー
   */
  async search(options) {
    // バリデーション実行
    this._validateSearchParams(options);

    const params = {
      q: options.q.trim(), // 前後の空白を削除
      page: options.page,
      type: options.type,
      safesearch: options.safesearch,
      lang: options.lang
    };

    return await this._request('/search', params);
  }

  /**
   * Web検索
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {number} [options.page=1] - ページ番号
   * @param {number} [options.safesearch=0] - セーフサーチレベル
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} 検索結果
   */
  async searchWeb(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.WEB,
      ...options
    });
  }

  /**
   * 画像検索
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {number} [options.page=1] - ページ番号
   * @param {number} [options.safesearch=0] - セーフサーチレベル
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} 検索結果
   */
  async searchImages(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.IMAGE,
      ...options
    });
  }

  /**
   * 動画検索
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {number} [options.page=1] - ページ番号
   * @param {number} [options.safesearch=0] - セーフサーチレベル
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} 検索結果
   */
  async searchVideos(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.VIDEO,
      ...options
    });
  }

  /**
   * ニュース検索
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {number} [options.page=1] - ページ番号
   * @param {number} [options.safesearch=0] - セーフサーチレベル
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} 検索結果
   */
  async searchNews(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.NEWS,
      ...options
    });
  }

  /**
   * サジェスト取得
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} サジェスト結果
   */
  async getSuggestions(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.SUGGEST,
      ...options
    });
  }

  /**
   * パネル情報取得
   * @param {string} query - 検索ワード
   * @param {Object} [options] - 追加オプション
   * @param {string} [options.lang='ja'] - 言語コード
   * @returns {Promise<Object>} パネル情報
   */
  async getPanel(query, options = {}) {
    return await this.search({
      q: query,
      type: SearchType.PANEL,
      ...options
    });
  }
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  // Node.js環境
  module.exports = {
    WholphinAPI,
    WholphinAPIError,
    SearchType,
    SafeSearchLevel,
    Language
  };
} else if (typeof window !== 'undefined') {
  // ブラウザ環境
  window.WholphinAPI = WholphinAPI;
  window.WholphinAPIError = WholphinAPIError;
  window.SearchType = SearchType;
  window.SafeSearchLevel = SafeSearchLevel;
  window.Language = Language;
}
