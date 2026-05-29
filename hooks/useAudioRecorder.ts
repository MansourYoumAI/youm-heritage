'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { formatDuration } from '@/lib/utils'

// Limite d'enregistrement : 30 minutes
// (≈ 15 Mo en webm opus à 64 kbps, bien sous la limite Storage Supabase de 25 Mo)
export const MAX_RECORDING_SECONDS = 30 * 60

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped'

interface UseAudioRecorderReturn {
  state: RecorderState
  duration: number
  formattedDuration: string
  audioBlob: Blob | null
  audioUrl: string | null
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  pauseRecording: () => void
  resumeRecording: () => void
  resetRecording: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)

  function startTimer() {
    startTimeRef.current = Date.now() - duration * 1000
    timerRef.current = setInterval(() => {
      const d = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setDuration(d)
      // Auto-stop quand la limite est atteinte
      if (d >= MAX_RECORDING_SECONDS) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      }
    }, 500)
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setState('requesting')

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setState('stopped')
        stopTimer()
        // Libérer le micro
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      recorder.start(200) // collecte toutes les 200ms
      setState('recording')
      setDuration(0)
      startTimer()
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Accès au microphone refusé. Veuillez autoriser l\'accès dans les réglages.')
        } else if (err.name === 'NotFoundError') {
          setError('Aucun microphone détecté sur cet appareil.')
        } else {
          setError(`Erreur d'enregistrement : ${err.message}`)
        }
      }
      setState('idle')
    }
  }, [duration])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [state])

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause()
      setState('paused')
      stopTimer()
    }
  }, [state])

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume()
      setState('recording')
      startTimer()
    }
  }, [state])

  const resetRecording = useCallback(() => {
    stopTimer()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setError(null)
    setState('idle')
  }, [audioUrl])

  useEffect(() => {
    return () => {
      stopTimer()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [audioUrl])

  return {
    state,
    duration,
    formattedDuration: formatDuration(duration),
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
  }
}
