/* =============================================================
   ATELIER SHOWCASE CARD
   Interactive 3D tilt, specular glare tracking, artisan stamp
   sheen, floating gold dust particles, and living horological motion.
   ============================================================= */
import { useRef, useState, useCallback, useEffect } from 'react';
import { ProductArt } from './primitives';

export default function AtelierCard() {
  const cardRef = useRef(null);
  const [coords, setCoords] = useState({ x: 50, y: 50, rx: 0, ry: 0, active: false });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Max rotation +/- 8 deg with smooth response
    const rotateX = -((y - centerY) / centerY) * 7.5;
    const rotateY = ((x - centerX) / centerX) * 7.5;

    setCoords({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
      rx: rotateX,
      ry: rotateY,
      active: true
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCoords({ x: 50, y: 50, rx: 0, ry: 0, active: false });
    setIsHovered(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  return (
    <div
      ref={cardRef}
      className={`story-split__media atelier-interactive-card ${isHovered ? 'is-hovered' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: coords.active
          ? `perspective(900px) rotateX(${coords.rx.toFixed(2)}deg) rotateY(${coords.ry.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`
          : 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        transition: coords.active ? 'transform 0.08s ease-out' : 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Specular Glare & Ambient Glow Follower */}
      <div
        className="atelier-card-glare"
        style={{
          background: coords.active
            ? `radial-gradient(circle at ${coords.x.toFixed(1)}% ${coords.y.toFixed(1)}%, rgba(255, 255, 255, 0.42) 0%, rgba(246, 234, 212, 0.18) 32%, transparent 65%)`
            : 'none',
          opacity: coords.active ? 1 : 0
        }}
      />

      {/* Floating Artisan Gold Dust Particles */}
      <div className="atelier-particles" aria-hidden="true">
        <span className="atelier-speck speck-1" />
        <span className="atelier-speck speck-2" />
        <span className="atelier-speck speck-3" />
        <span className="atelier-speck speck-4" />
        <span className="atelier-speck speck-5" />
      </div>

      {/* SVG Canvas with Astrolabe Animation */}
      <div className="atelier-art-container">
        <ProductArt shape="atelier" palette="gold" label="Geneva Atelier" className="art--tall" />
      </div>

      {/* Artisan Stamp Hallmark with Shimmer */}
      <div className="story-split__stamp atelier-stamp-animated" title="Geneva Atelier Hallmark, Est. 1911">
        <span className="stamp-sheen" aria-hidden="true" />
        Geneva<br />Atelier<br />1911
      </div>
    </div>
  );
}

