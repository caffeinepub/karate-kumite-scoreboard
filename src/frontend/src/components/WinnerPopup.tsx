import React from 'react';

interface WinnerPopupProps {
  isOpen: boolean;
  winnerSide: 'Ao' | 'Aka' | null;
  winnerName: string;
  onClose: () => void;
}

export default function WinnerPopup({ isOpen, winnerSide, winnerName, onClose }: WinnerPopupProps) {
  if (!isOpen || !winnerSide) return null;

  const isAo = winnerSide === 'Ao';

  return (
    <button
      type="button"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
        width: '100%',
        height: '100%',
      }}
      onClick={onClose}
    >
      <div
        style={{
          borderRadius: 16,
          padding: '40px 60px',
          textAlign: 'center',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          border: `4px solid ${isAo ? '#93C5FD' : '#FCA5A5'}`,
          backgroundColor: isAo ? '#1D4ED8' : '#B91C1C',
          maxWidth: 512,
          width: '90%',
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: 4, textTransform: 'uppercase' }}>
          Winner
        </div>
        <div style={{ color: '#FFFFFF', fontSize: 72, fontWeight: 900, lineHeight: 1, marginBottom: 12 }}>
          {winnerSide}
        </div>
        {winnerName && (
          <div style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{winnerName}</div>
        )}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{ marginTop: 16, padding: '12px 32px', backgroundColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', fontWeight: 700, fontSize: 18, borderRadius: 9999, border: 'none', cursor: 'pointer' }}
        >
          Dismiss
        </button>
      </div>
    </button>
  );
}
