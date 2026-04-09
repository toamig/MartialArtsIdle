import SpriteAnimator from '../components/SpriteAnimator';
import RealmProgressBar from '../components/RealmProgressBar';
import { useVFX } from '../components/VFXLayer';

const BASE = import.meta.env.BASE_URL;

function HomeScreen({ cultivation }) {
  const {
    realmName,
    nextRealmName,
    qi,
    cost,
    progress,
    boosting,
    maxed,
    startBoost,
    stopBoost,
  } = cultivation;

  const { vfxLayer, spawnVFX } = useVFX();

  const handlePointerDown = (e) => {
    e.preventDefault();
    startBoost();

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    spawnVFX({
      type: 'burst',
      x,
      y,
      duration: 600,
    });
  };

  const handlePointerUp = () => {
    stopBoost();
  };

  return (
    <div className="screen home-screen">
      <h1>Martial Arts Idle</h1>
      <p className="subtitle">{maxed ? 'You have reached the Peak!' : `${realmName}`}</p>

      <div className="cultivation-layout">
        <RealmProgressBar
          progress={progress}
          currentRealm={realmName}
          nextRealm={nextRealmName}
          qi={qi}
          cost={cost}
          boosting={boosting}
        />

        <div
          className={`fighter-stage ${boosting ? 'stage-boosted' : ''}`}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {vfxLayer}
          <SpriteAnimator
            src={`${BASE}sprites/fighter-meditate.png`}
            frameWidth={64}
            frameHeight={64}
            frameCount={6}
            fps={boosting ? 12 : 6}
            scale={3}
          />
          <div className={`boost-label${boosting ? '' : ' boost-label-hidden'}`}>3x Cultivation!</div>
          <p className="tap-hint">
            {maxed ? 'Peak Achieved' : 'Hold to cultivate faster'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomeScreen;
