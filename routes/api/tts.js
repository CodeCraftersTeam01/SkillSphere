const express = require('express');
const router = express.Router();
const https = require('https');

const KOKORO_TTS_BASE_URL = process.env.KOKORO_TTS_API_URL || 'https://arjnln-kokoro-tts-api.hf.space';

// All supported voices from Bilingual Edge-TTS API
const SUPPORTED_VOICES = [
  {
    id: 'id-female',
    name: 'id-female',
    label: 'Bahasa Indonesia (Wanita)',
    language: 'id-ID',
    gender: 'female',
    description: 'Suara alami wanita Indonesia yang ramah dan jernih untuk materi pelajaran.',
  },
  {
    id: 'id-male',
    name: 'id-male',
    label: 'Bahasa Indonesia (Pria)',
    language: 'id-ID',
    gender: 'male',
    description: 'Suara pria Indonesia yang tenang dan formal untuk penjelasan teknis.',
  },
  {
    id: 'en-female',
    name: 'en-female',
    label: 'English (Female)',
    language: 'en-US',
    gender: 'female',
    description: 'Clear, articulate female voice for English courses and global terminology.',
  },
  {
    id: 'en-male',
    name: 'en-male',
    label: 'English (Male)',
    language: 'en-US',
    gender: 'male',
    description: 'Deep, engaging male voice for technical narrations in English.',
  },
  {
    id: 'multi-female',
    name: 'multi-female',
    label: 'Multilingual (Female / Natural)',
    language: 'multilingual',
    gender: 'female',
    description: 'Suara wanita multibahasa dengan intonasi adaptif untuk materi campuran.',
  },
  {
    id: 'multi-male',
    name: 'multi-male',
    label: 'Multilingual (Male / Expressive)',
    language: 'multilingual',
    gender: 'male',
    description: 'Suara pria multibahasa untuk bacaan kurikulum dan kode teknis.',
  },
];

/**
 * Clean text for natural speech synthesis (strip markdown, HTML, code tags)
 */
function cleanTextForSpeech(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/<[^>]*>/g, ' ') // Strip HTML
    .replace(/```[\s\S]*?```/g, ' [Blok Kode Teknis] ') // Strip multi-line code
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
    .replace(/[#*_~>]/g, '') // Markdown symbols
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Call Kokoro / Bilingual Edge-TTS API on Hugging Face
 */
function fetchEdgeTtsAudio(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const targetUrl = new URL(`${KOKORO_TTS_BASE_URL}/v1/audio/speech`);

    const options = {
      method: 'POST',
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname + targetUrl.search,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            statusCode: res.statusCode,
            contentType: res.headers['content-type'] || 'audio/mpeg',
            buffer,
          });
        } else {
          let errorText = buffer.toString('utf8');
          try {
            const parsed = JSON.parse(errorText);
            errorText = parsed.detail || parsed.message || errorText;
          } catch (e) {}
          reject(new Error(`Edge-TTS API Error (${res.statusCode}): ${errorText}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Koneksi ke server Edge-TTS melebihi batas waktu (timeout).'));
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * GET /api/tts/voices
 * Lists all 6 available Edge-TTS voices with full metadata
 */
router.get('/voices', (req, res) => {
  return res.json({
    success: true,
    message: 'Daftar seluruh suara Edge-TTS Bilingual berhasil dimuat.',
    data: {
      provider: 'Bilingual Edge-TTS (Hugging Face)',
      endpoint: `${KOKORO_TTS_BASE_URL}/v1/audio/speech`,
      defaultVoice: 'id-female',
      voices: SUPPORTED_VOICES,
      speedRange: { min: -50, max: 50, default: 0, unit: '%' },
      pitchRange: { min: -50, max: 50, default: 0, unit: 'Hz' },
    },
  });
});

/**
 * POST /api/tts/speak
 * Generates and streams MP3 audio directly from the Edge-TTS API
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, input, voice = 'id-female', speed = 0, pitch = 0 } = req.body;
    const rawContent = input || text;

    if (!rawContent || typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teks untuk disuarakan tidak boleh kosong.',
      });
    }

    if (rawContent.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Panjang teks melebihi batas maksimal 5000 karakter.',
      });
    }

    const cleanedText = cleanTextForSpeech(rawContent);

    // Validate voice against supported voices list
    const matchedVoice = SUPPORTED_VOICES.find((v) => v.id === voice) || SUPPORTED_VOICES[0];

    const ttsPayload = {
      input: cleanedText,
      voice: matchedVoice.id,
      speed: Number(speed) || 0,
      pitch: Number(pitch) || 0,
    };

    const audioResult = await fetchEdgeTtsAudio(ttsPayload);

    res.setHeader('Content-Type', audioResult.contentType);
    res.setHeader('Content-Length', audioResult.buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(audioResult.buffer);
  } catch (error) {
    console.error('❌ [TTS API Error]:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Gagal membuat audio Edge-TTS. Sistem akan beralih ke suara bawaan peramban.',
      error: error.message,
    });
  }
});

/**
 * POST /api/tts/synthesize
 * Fallback metadata endpoint for segment timings & text cleaning
 */
router.post('/synthesize', (req, res) => {
  try {
    const { text, voice = 'id-female', speed = 0 } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Teks untuk dibacakan tidak boleh kosong.',
      });
    }

    const cleanedText = cleanTextForSpeech(text);
    const matchedVoice = SUPPORTED_VOICES.find((v) => v.id === voice) || SUPPORTED_VOICES[0];

    const segments = cleanedText
      .split(/(?<=[.?!;:\n])\s+/)
      .filter((s) => s.trim().length > 0)
      .map((seg, idx) => ({
        index: idx + 1,
        text: seg.trim(),
        approxDurationMs: Math.max(800, Math.round((seg.split(' ').length / 2.5) * 1000)),
      }));

    return res.json({
      success: true,
      message: 'Teks berhasil diproses.',
      data: {
        voice: matchedVoice,
        cleanedText,
        totalSegments: segments.length,
        segments,
        audioStreamUrl: '/api/tts/speak',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses sintesis teks.',
      error: error.message,
    });
  }
});

/**
 * POST /api/tts/material-reader
 * Formats full course lessons and summaries for audio playback
 */
router.post('/material-reader', (req, res) => {
  try {
    const { title, description, content, voice = 'id-female' } = req.body;

    if (!title && !description && !content) {
      return res.status(400).json({
        success: false,
        message: 'Mohon sertakan judul atau konten materi kursus.',
      });
    }

    const blocks = [];
    if (title) blocks.push({ type: 'title', text: `Materi Pelajaran: ${cleanTextForSpeech(title)}.` });
    if (description) blocks.push({ type: 'overview', text: `Ringkasan: ${cleanTextForSpeech(description)}.` });
    if (content) blocks.push({ type: 'body', text: cleanTextForSpeech(content) });

    const fullNarration = blocks.map((b) => b.text).join(' ');
    const matchedVoice = SUPPORTED_VOICES.find((v) => v.id === voice) || SUPPORTED_VOICES[0];

    return res.json({
      success: true,
      message: 'Narasi materi berhasil disiapkan.',
      data: {
        voice: matchedVoice,
        blocks,
        fullNarration,
        estimatedMinutes: Math.max(1, Math.round(fullNarration.split(' ').length / 130)),
        audioStreamUrl: '/api/tts/speak',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Gagal memformat narasi materi.',
      error: error.message,
    });
  }
});

module.exports = router;
