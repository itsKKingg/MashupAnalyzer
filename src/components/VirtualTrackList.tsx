import { useEffect, useRef, useState, useMemo } from 'react';
import { Track } from '../types/track';
import { TrackCard } from './TrackCard';

interface VirtualTrackListProps {
  tracks: Track[];
  onRemove: (id: string) => void;
  itemHeight?: number;
  overscan?: number;
}

export function VirtualTrackList({ 
  tracks, 
  onRemove,
  itemHeight = 280, // Approximate height of TrackCard
  overscan = 3 
}: VirtualTrackListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Update container height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(tracks.length, start + visibleCount + overscan * 2);
    const offset = start * itemHeight;

    return {
      startIndex: start,
      endIndex: end,
      offsetY: offset,
    };
  }, [scrollTop, containerHeight, itemHeight, overscan, tracks.length]);

  const visibleTracks = useMemo(() => {
    return tracks.slice(startIndex, endIndex);
  }, [tracks, startIndex, endIndex]);

  const totalHeight = tracks.length * itemHeight;

  // For small lists, use regular grid
  if (tracks.length <= 20) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="animate-slideUp"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TrackCard track={track} onRemove={onRemove} />
          </div>
        ))}
      </div>
    );
  }

  // Virtual scrolling for large lists
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto overflow-x-hidden"
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {visibleTracks.map((track) => (
              <TrackCard key={track.id} track={track} onRemove={onRemove} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}