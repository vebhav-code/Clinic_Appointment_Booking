import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-sm)', style }) {
  return (
    <span
      className="skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

export function DoctorCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} aria-busy="true">
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Skeleton width="56px" height="56px" borderRadius="var(--radius-full)" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Skeleton width="65%" height="20px" />
          <Skeleton width="45%" height="16px" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Skeleton width="80px" height="24px" borderRadius="var(--radius-full)" />
        <Skeleton width="110px" height="24px" borderRadius="var(--radius-full)" />
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="90px" height="22px" />
        <Skeleton width="120px" height="44px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}

export function DoctorHeaderSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }} aria-busy="true">
      <Skeleton width="80px" height="80px" borderRadius="var(--radius-full)" />
      <div style={{ flex: 1, minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <Skeleton width="50%" height="28px" />
        <Skeleton width="30%" height="18px" />
        <Skeleton width="85%" height="16px" style={{ marginTop: '0.5rem' }} />
        <Skeleton width="75%" height="16px" />
      </div>
    </div>
  );
}

export function SlotChipsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} aria-busy="true">
      <div>
        <Skeleton width="120px" height="20px" style={{ marginBottom: '0.75rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.6rem' }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="44px" borderRadius="var(--radius-md)" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton width="120px" height="20px" style={{ marginBottom: '0.75rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.6rem' }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height="44px" borderRadius="var(--radius-md)" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }} aria-busy="true">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton width="140px" height="20px" />
        <Skeleton width="85px" height="26px" borderRadius="var(--radius-full)" />
      </div>
      <Skeleton width="60%" height="22px" />
      <Skeleton width="40%" height="16px" />
      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="110px" height="44px" borderRadius="var(--radius-md)" />
        <Skeleton width="90px" height="44px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}

export function QueueRowSkeleton() {
  return (
    <div
      className="card"
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
      aria-busy="true"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '220px' }}>
        <Skeleton width="44px" height="44px" borderRadius="var(--radius-full)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <Skeleton width="140px" height="18px" />
          <Skeleton width="100px" height="14px" />
        </div>
      </div>
      <Skeleton width="90px" height="20px" />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Skeleton width="100px" height="44px" borderRadius="var(--radius-md)" />
        <Skeleton width="90px" height="44px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}

export function AvailabilityFormSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} aria-busy="true">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Skeleton width="100px" height="22px" />
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Skeleton width="120px" height="44px" borderRadius="var(--radius-md)" />
            <Skeleton width="20px" height="16px" />
            <Skeleton width="120px" height="44px" borderRadius="var(--radius-md)" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;

