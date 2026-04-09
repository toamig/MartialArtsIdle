import SpriteAnimator from '../components/SpriteAnimator';
import { useVFX } from '../components/VFXLayer';

const BASE = import.meta.env.BASE_URL;

function HomeScreen() {
  const { vfxLayer, spawnVFX } = useVFX();

  const handleTap = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    spawnVFX({
      type: 'hit',
      x,
      y,
      duration: 400,
      sprite: {
        src: `${BASE}sprites/hit-vfx.png`,
        frameWidth: 48,
        frameHeight: 48,
        frameCount: 4,
        fps: 12,
        scale: 1.5,
      },
    });

    spawnVFX({
      type: 'float-up',
      x: x + 10,
      y: y - 20,
      duration: 800,
      content: '+1',
    });
  };

  return (
    <div className="screen home-screen">
      <h1>Martial Arts Idle</h1>
      <p className="subtitle">Train. Fight. Ascend.</p>

      <div className="fighter-stage" onClick={handleTap}>
        {vfxLayer}
        <SpriteAnimator
          src={`${BASE}sprites/fighter-idle.png`}
          frameWidth={64}
          frameHeight={64}
          frameCount={6}
          fps={8}
          scale={3}
        />
        <p className="tap-hint">Tap the fighter!</p>
      </div>

      <div className="home-content">
        <div className="status-card">
          <h2>Welcome, Disciple</h2>
          <p>Your journey in the martial arts begins here. Train your body, sharpen your mind, and rise through the ranks.</p>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
