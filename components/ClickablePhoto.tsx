'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from './Lightbox'
import { cn } from '@/lib/utils'

interface ClickablePhotoProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  imageClassName?: string
}

export default function ClickablePhoto({
  src,
  alt,
  width,
  height,
  className,
  imageClassName,
}: ClickablePhotoProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('cursor-zoom-in block', className)}
        aria-label="Voir la photo en grand"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn('w-full h-full object-cover', imageClassName)}
        />
      </button>
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  )
}
