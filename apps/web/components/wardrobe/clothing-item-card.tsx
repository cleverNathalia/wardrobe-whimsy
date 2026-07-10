'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import type { ClothingItem } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ClothingItemCardProps {
  item: ClothingItem
}

export function ClothingItemCard({ item }: ClothingItemCardProps) {
  return (
    <Link
      href={`/wardrobe/${item.id}`}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-muted">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
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
        <p className="text-xs text-muted-foreground truncate mt-0.5">{item.category}</p>
      </div>
    </Link>
  )
}
