'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Heart, ImageOff } from 'lucide-react'
import type { ClothingItem } from '@/lib/wardrobe-types'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CategoryIcon } from '@/lib/category-icons'

interface ClothingItemCardProps {
  item: ClothingItem
}

export function ClothingItemCard({ item }: ClothingItemCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      href={`/wardrobe/${item.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-muted">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff size={24} className="text-muted-foreground/40" />
          </div>
        ) : (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        )}
        {item.isFavourite && (
          <span className="absolute top-2 right-2 p-1 rounded-full bg-background/80 backdrop-blur-sm">
            <Heart size={14} className="fill-rose-500 text-rose-500" />
          </span>
        )}
        {item.status === 'DRAFT' && (
          <span className="absolute top-2 left-2">
            <Badge variant="muted" className="text-[10px]">Draft</Badge>
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="font-medium text-sm text-foreground truncate">{item.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <CategoryIcon category={item.category} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground truncate">{item.category}</p>
        </div>
      </div>
    </Link>
  )
}
