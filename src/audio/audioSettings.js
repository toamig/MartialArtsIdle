/**
 * Audio settings persistence.
 *
 * Stored separately from the main save (mai_save) so it survives a save wipe,
 * matching the same pattern used for language preference (mai_lang).
 */

const AUDIO_KEY = 'mai_audio';

export const DEFAULT_SETTINGS = {
  masterVol:   0.8,
  bgmVol:      0.6,
  sfxVol:      1.0,
  masterMuted: false,
  bgmMuted:    false,
  sfxMuted:    false,
};

export function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveAudioSettings(settings) {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  } catch {
    // Storage quota exceeded or private browsing — silently ignore.
  }
}
