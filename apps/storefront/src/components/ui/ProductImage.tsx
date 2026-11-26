'use client'

import React, { useState, useEffect } from 'react'
import Image, { type ImageProps } from 'next/image'

export const GARMENT_PLACEHOLDER_SRC = '/images/placeholder-garment.svg'

export interface ProductImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src?: string | null
  fallbackSrc?: string
  /**
   * Applies `object-cover object-top` by default so model heads are never clipped in portrait frames.
   * Set to false for non-portrait banners or `object-contain` lightboxes.
   */
  portrait?: boolean
}

export function ProductImage({
  src,
  alt,
  fallbackSrc = GARMENT_PLACEHOLDER_SRC,
  portrait = true,
  className = '',
  ...rest
}: ProductImageProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  const trimmedSrc = typeof src === 'string' ? src.trim() : ''
  const useFallback = !trimmedSrc || hasError
  const effectiveSrc = useFallback ? fallbackSrc : trimmedSrc
  const isSvg = useFallback || effectiveSrc.toLowerCase().endsWith('.svg')

  const objectPositionClass = portrait
    ? 'object-cover object-top'
    : 'object-cover'

  return (
    <Image
      {...rest}
      src={effectiveSrc}
      alt={alt || 'Maison TG garment'}
      unoptimized={rest.unoptimized ?? isSvg}
      onError={() => {
        if (!hasError) setHasError(true)
      }}
      className={`${objectPositionClass} ${className}`.trim()}
    />
  )
}
