const VFX_KEY       = 'mai_vfx';
const RENDERING_KEY = 'mai_rendering';

export function loadGraphics() {
  return {
    vfxEnabled:    localStorage.getItem(VFX_KEY)       !== 'off',
    renderingMode: localStorage.getItem(RENDERING_KEY) ?? 'auto',
  };
}

export function applyGraphics({ vfxEnabled, renderingMode }) {
  document.documentElement.classList.toggle('vfx-disabled',         !vfxEnabled);
  document.documentElement.classList.toggle('rendering-pixelated',  renderingMode === 'pixelated');
}

export function saveGraphics({ vfxEnabled, renderingMode }) {
  localStorage.setItem(VFX_KEY,       vfxEnabled    ? 'on' : 'off');
  localStorage.setItem(RENDERING_KEY, renderingMode);
}
