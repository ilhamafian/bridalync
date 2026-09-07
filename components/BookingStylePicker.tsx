"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type StyleVariantOption = {
  id: string
  name: string
  price: number
  deposit: number
  imageSrc?: string
}

export type StyleCategoryOption = {
  id: string
  name: string
  variants: StyleVariantOption[]
}

type BookingStylePickerProps = {
  categories: StyleCategoryOption[]
  selectedCategoryId: string | null
  selectedVariantId: string | null
  onCategoryChange: (categoryId: string | null) => void
  onVariantChange: (variantId: string | null) => void
}

export function BookingStylePicker({
  categories,
  selectedCategoryId,
  selectedVariantId,
  onCategoryChange,
  onVariantChange,
}: BookingStylePickerProps) {
  if (categories.length === 0) {
    return (
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        No styles available.
      </p>
    )
  }

  function selectCategory(categoryId: string) {
    if (selectedCategoryId === categoryId) {
      onCategoryChange(null)
      onVariantChange(null)
      return
    }
    onCategoryChange(categoryId)
    onVariantChange(null)
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {categories.map((category) => {
        const isOpen = selectedCategoryId === category.id
        const hasOtherOpen =
          selectedCategoryId !== null && selectedCategoryId !== category.id

        return (
          <div
            key={category.id}
            className={cn(
              "rounded-lg transition-opacity duration-200",
              hasOtherOpen && "opacity-45"
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="lg"
              aria-expanded={isOpen}
              className={cn(
                "h-auto min-h-10 w-full justify-start px-4 py-3 text-left whitespace-normal",
                isOpen
                  ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white"
                  : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
              )}
              onClick={() => selectCategory(category.id)}
            >
              <span className="font-medium">{category.name}</span>
            </Button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col gap-2 pt-2">
                  {category.variants.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      No variants available.
                    </p>
                  ) : (
                    category.variants.map((variant) => {
                      const isSelected = selectedVariantId === variant.id
                      return (
                        <Button
                          key={variant.id}
                          type="button"
                          variant="ghost"
                          size="lg"
                          className={cn(
                            "h-auto w-full overflow-hidden rounded-lg p-0 text-left whitespace-normal",
                            isSelected
                              ? "bg-rose-800 text-white ring-2 ring-rose-800 hover:bg-rose-800/90 hover:text-white"
                              : "border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
                          )}
                          onClick={() => onVariantChange(variant.id)}
                        >
                          <span className="flex w-full flex-col">
                            {variant.imageSrc ? (
                              <span className="relative aspect-4/3 w-full overflow-hidden bg-muted">
                                <Image
                                  src={variant.imageSrc}
                                  alt={variant.name}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 448px) 100vw, 448px"
                                />
                              </span>
                            ) : (
                              <span className="flex aspect-4/3 w-full items-center justify-center bg-muted/60 text-sm text-muted-foreground">
                                No image
                              </span>
                            )}
                            <span className="px-3 py-2.5 font-medium">
                              {variant.name}
                            </span>
                          </span>
                        </Button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
