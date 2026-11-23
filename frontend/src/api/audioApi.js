import apiClient from './apiClient';

export const audioApi = {
  /**
   * Upload real voice recording to backend with progress callback
   */
  async uploadAudio({
    uri,
    duration = 0,
    transcript = '',
    title = '',
    category = '',
    language = 'en',
    saveImmediately = true,
    onUploadProgress,
  }) {
    const filename = uri.split('/').pop() || `recording-${Date.now()}.m4a`;
    const ext = filename.split('.').pop() || 'm4a';

    const formData = new FormData();
    formData.append('audio', {
      uri,
      name: filename,
      type: `audio/${ext === 'm4a' ? 'm4a' : ext === 'caf' ? 'x-caf' : 'wav'}`,
    });

    formData.append('duration', String(duration || 0));
    formData.append('saveImmediately', String(saveImmediately));
    formData.append('language', language || 'en');

    if (transcript && transcript.trim()) {
      formData.append('transcriptOverride', transcript.trim());
    }
    if (title && title.trim()) {
      formData.append('titleOverride', title.trim());
    }
    if (category && category.trim()) {
      formData.append('categoryOverride', category.trim());
    }

    return apiClient.post('/audio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      timeout: 45000,
    });
  },

  /**
   * Retry failed speech transcription for a memory
   */
  async retryTranscription(memoryId, language = 'en') {
    return apiClient.post(`/audio/retry-transcription/${memoryId}`, { language });
  },

  /**
   * Save edited transcript and trigger AI re-enrichment
   */
  async updateTranscript(memoryId, { transcript, title, category }) {
    return apiClient.put(`/audio/transcript/${memoryId}`, {
      transcript,
      title,
      category,
    });
  },
};

export default audioApi;
