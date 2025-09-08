import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
}

export default function AudioPlayer({ audioUrl, className = "" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };
  
  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.volume = value[0];
    setVolume(value[0]);
  };
  
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg ${className}`}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
      />
      
      {/* Bouton Play/Pause */}
      <Button
        onClick={togglePlay}
        size="sm"
        className="w-10 h-10 p-0 rounded-full bg-orange-500 hover:bg-orange-600 text-white"
        data-testid="button-audio-play"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </Button>
      
      {/* Barre de progression */}
      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
          {formatTime(currentTime)}
        </span>
        
        <Slider
          value={[currentTime]}
          onValueChange={handleSeek}
          max={duration || 100}
          step={1}
          className="flex-1"
          disabled={!duration}
        />
        
        <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
          {formatTime(duration)}
        </span>
      </div>
      
      {/* Contrôle du volume */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <Slider
          value={[volume]}
          onValueChange={handleVolumeChange}
          max={1}
          step={0.1}
          className="w-20"
        />
      </div>
    </div>
  );
}