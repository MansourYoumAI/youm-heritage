'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

interface LightboxProps {
  src: string
  alt: string
  onClose: () => void
}

export default function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEsc)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div
        className="max-w-[92vw] max-h-[92vh] cursor-default"
        onClick={e => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1600}
          className="max-h-[88vh] w-auto object-contain rounded-2xl"
          unoptimized
        />
      </div>
    </div>
  )
}
