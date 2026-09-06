"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type StyleCategoryOption = {
  id: string
  name: string
}

export type StyleVariantOption = {
  id: string
  name: string
  price: number
  deposit: number
  imageSrc?: string
}

type BookingStylePickerProps = {
  mode: "category"
  categories: StyleCategoryOption[]
  selectedCategoryId: string | null
  onCategoryChange: (categoryId: string) => void
} | {
  mode: "variant"
  variants: StyleVariantOption[]
  selectedVariantId: string | null
  onVariantChange: (variantId: string) => void
}

export function BookingStylePicker(props: BookingStylePickerProps) {
  if (props.mode === "category") {
    const { categories, selectedCategoryId, onCategoryChange } = props

    if (categories.length === 0) {
      return (
        <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
          No styles available.
        </p>
      )
    }

    return (
      <div className="flex w-full flex-col gap-2">
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category.id
          return (
            <Button
              key={category.id}
              type="button"
              variant="ghost"
              size="lg"
              className={cn(
                "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal",
                isSelected
                  ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                  : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
              )}
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="font-medium">{category.name}</span>
            </Button>
          )
        })}
      </div>
    )
  }

  const { variants, selectedVariantId, onVariantChange } = props

  if (variants.length === 0) {
    return (
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        No variants available.
      </p>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {variants.map((variant) => {
        const isSelected = selectedVariantId === variant.id
        return (
          <Button
            key={variant.id}
            type="button"
            variant="ghost"
            size="lg"
            className={cn(
              "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal",
              isSelected
                ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
            )}
            onClick={() => onVariantChange(variant.id)}
          >
            <span className="flex w-full items-center gap-3">
              {variant.imageSrc && (
                <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={variant.imageSrc}
                    alt={variant.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </span>
              )}
              <span className="min-w-0 flex-1 font-medium">{variant.name}</span>
            </span>
          </Button>
        )
      })}
    </div>
  )
}
