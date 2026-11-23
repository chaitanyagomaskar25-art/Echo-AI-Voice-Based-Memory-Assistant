/**
 * Semantic Embedding Service
 * Generates vector embeddings for memory text and computes cosine similarities.
 * Supports OpenAI embeddings (text-embedding-3-small) when API key is set,
 * and high-dimensional semantic vector projections for offline / local mode.
 */

class EmbeddingService {
  constructor() {
    this.vectorDimension = 128;
  }

  /**
   * Generate vector embedding for a piece of text
   * @param {string} text
   * @returns {Promise<number[]>} Array of floating point numbers
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Array(this.vectorDimension).fill(0);
    }

    const clean = text.trim();
    const openaiKey = process.env.OPENAI_API_KEY;

    // 1. If OpenAI API key is present, use OpenAI text-embedding-3-small
    if (openaiKey && openaiKey.startsWith('sk-')) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: clean,
            dimensions: this.vectorDimension,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data[0]?.embedding) {
            return this.normalizeVector(data.data[0].embedding);
          }
        }
      } catch (err) {
        console.warn(`[EmbeddingService] OpenAI embeddings error: ${err.message}. Using semantic vector projection.`);
      }
    }

    // 2. High-Dimensional Semantic Projection Vector (Local / Offline mode)
    return this.generateSemanticVector(clean);
  }

  /**
   * Generates a normalized semantic projection vector based on n-grams,
   * vocabulary hashing, and category concept distributions.
   */
  generateSemanticVector(text) {
    const vector = new Array(this.vectorDimension).fill(0);
    const lower = text.toLowerCase();
    const tokens = lower.match(/\b[a-z0-9_-]{2,}\b/g) || [];

    // Concept anchors mapped to specific vector dimensions
    const conceptClusters = [
      { words: ['decision', 'decide', 'agreed', 'chose', 'conclusion', 'resolved', 'finalized'], dim: 4 },
      { words: ['idea', 'concept', 'startup', 'feature', 'product', 'design', 'business', 'innovate'], dim: 12 },
      { words: ['exam', 'study', 'course', 'preparation', 'learn', 'lecture', 'notes', 'paper', 'attention'], dim: 20 },
      { words: ['task', 'todo', 'promise', 'complete', 'finish', 'deadline', 'due', 'submit', 'deliverable'], dim: 28 },
      { words: ['where', 'place', 'put', 'keys', 'passport', 'drawer', 'car', 'parked', 'location', 'desk'], dim: 36 },
      { words: ['health', 'doctor', 'clinic', 'medicine', 'prescription', 'appointment', 'blood', 'vitamin'], dim: 44 },
      { words: ['work', 'meeting', 'sprint', 'client', 'falcon', 'architecture', 'standup', 'team'], dim: 52 },
      { words: ['personal', 'walk', 'routine', 'sleep', 'morning', 'mindfulness', 'habit'], dim: 60 },
      { words: ['yesterday', 'today', 'tomorrow', 'week', 'last', 'tuesday', 'friday', 'sunday'], dim: 68 },
    ];

    // 1. Boost concept clusters
    conceptClusters.forEach(({ words, dim }) => {
      words.forEach((w) => {
        if (lower.includes(w)) {
          vector[dim] += 2.5;
          vector[(dim + 1) % this.vectorDimension] += 1.8;
          vector[(dim + 2) % this.vectorDimension] += 1.2;
        }
      });
    });

    // 2. Hash tokens and bigrams across the vector space
    tokens.forEach((token, idx) => {
      let hash = 0;
      for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
      }
      const dim = Math.abs(hash) % this.vectorDimension;
      vector[dim] += 1.0;

      // Bigram projection
      if (idx > 0) {
        const bigram = `${tokens[idx - 1]}_${token}`;
        let biHash = 0;
        for (let j = 0; j < bigram.length; j++) {
          biHash = (biHash << 5) - biHash + bigram.charCodeAt(j);
          biHash |= 0;
        }
        const biDim = Math.abs(biHash) % this.vectorDimension;
        vector[biDim] += 1.4;
      }
    });

    return this.normalizeVector(vector);
  }

  /**
   * Computes cosine similarity between two normalized vectors
   * Range: 0.0 to 1.0 (clamped)
   */
  cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
      return 0;
    }

    const minLen = Math.min(vecA.length, vecB.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    const similarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1.0, similarity));
  }

  /**
   * L2 Normalization of vector
   */
  normalizeVector(vec) {
    const sumSquares = vec.reduce((sum, val) => sum + val * val, 0);
    const norm = Math.sqrt(sumSquares);
    if (norm === 0) return vec;
    return vec.map((val) => val / norm);
  }
}

module.exports = new EmbeddingService();
