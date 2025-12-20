'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AudioPlayerProps {
  src: string
  className?: string
}

export function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const animationFrameRef = useRef<number>()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [animationTime, setAnimationTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => setCurrentTime(audio.currentTime)
    const updateDuration = () => {
      setDuration(audio.duration)
      setIsLoading(false)
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Animate waveform when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    const animate = () => {
      setAnimationTime(prev => prev + 0.1)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Generate waveform bars
  const numBars = 40
  const bars = Array.from({ length: numBars }, (_, i) => {
    if (!isPlaying) {
      // Static waveform when paused
      const progress = i / numBars
      const height = Math.max(4, 20 * (0.3 + Math.sin(progress * Math.PI * 4) * 0.7))
      return { height, delay: 0 }
    }
    
    // Animated waveform when playing
    const progress = i / numBars
    const waveOffset = (animationTime + progress * 2) % (Math.PI * 2)
    const height = Math.max(4, 20 + Math.sin(waveOffset) * 15 + Math.sin(waveOffset * 2) * 8)
    const delay = i * 0.05
    return { height, delay }
  })

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          disabled={isLoading}
          className="h-10 w-10"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="relative h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-end justify-center gap-1">
            {/* Progress bar overlay */}
            <div
              className="absolute top-0 left-0 h-full bg-blue-500/10 pointer-events-none rounded-lg"
              style={{ width: `${progress}%` }}
            />
            
            {/* Waveform bars */}
            {bars.map((bar, i) => (
              <div
                key={i}
                className="bg-blue-500 dark:bg-blue-400 rounded-t"
                style={{
                  width: '3px',
                  height: `${bar.height}px`,
                  animationName: isPlaying ? 'waveform' : 'none',
                  animationDuration: '0.6s',
                  animationTimingFunction: 'ease-in-out',
                  animationIterationCount: isPlaying ? 'infinite' : '1',
                  animationDelay: `${bar.delay}s`,
                  transformOrigin: 'bottom',
                }}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <Volume2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
      </div>
    </div>
  )
}

