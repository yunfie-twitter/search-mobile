/**
 * Wholphin Search API Client
 * @see https://api.p2pear.asia/
 */

const API_BASE_URL = 'https://api.p2pear.asia';

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
  constructor(message, status, details) {
    super(message);
    this.name = 'WholphinAPIError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Wholphin Search API Client
 */
class WholphinAPI {
  /**
   * @param {string} baseUrl - APIベースURL
   */
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
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
   * APIリクエストを実行
   * @private
   * @param {string} endpoint - エンドポイントパス
   * @param {Object} params - クエリパラメータ
   * @returns {Promise<Object>} レスポンスデータ
   * @throws {WholphinAPIError} APIエラー
   */
  async _request(endpoint, params = {}) {
    const url = `${this.baseUrl}${endpoint}${this._buildQueryString(params)}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorDetails;
        try {
          errorDetails = await response.json();
        } catch {
          errorDetails = await response.text();
        }
        throw new WholphinAPIError(
          `API request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorDetails
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof WholphinAPIError) {
        throw error;
      }
      throw new WholphinAPIError(
        `Network error: ${error.message}`,
        null,
        error
      );
    }
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
    if (!options || !options.q) {
      throw new WholphinAPIError('Search query (q) is required', null, null);
    }

    const params = {
      q: options.q,
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
