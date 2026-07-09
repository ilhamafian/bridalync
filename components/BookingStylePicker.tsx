"use client"

import Image from "next/image"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatRm } from "@/utils/booking/pricing"
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
        <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
          <CardContent className="pt-(--card-spacing) text-center text-sm text-muted-foreground">
            No styles available.
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
        <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
          {categories.map((category) => (
            <Button
              key={category.id}
              type="button"
              variant={selectedCategoryId === category.id ? "default" : "outline"}
              size="lg"
              className={cn(
                "h-auto min-h-14 w-full justify-start px-3 py-2 text-left whitespace-normal"
              )}
              onClick={() => onCategoryChange(category.id)}
            >
              <span className="font-medium">{category.name}</span>
            </Button>
          ))}
        </CardContent>
      </Card>
    )
  }

  const { variants, selectedVariantId, onVariantChange } = props

  if (variants.length === 0) {
    return (
      <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
        <CardContent className="pt-(--card-spacing) text-center text-sm text-muted-foreground">
          No variants available.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full min-w-72 [--card-spacing:--spacing(6)] sm:min-w-80">
      <CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            type="button"
            variant={selectedVariantId === variant.id ? "default" : "outline"}
            size="lg"
            className={cn(
              "h-auto min-h-14 w-full justify-start px-3 py-2 text-left whitespace-normal"
            )}
            onClick={() => onVariantChange(variant.id)}
          >
            <span className="flex w-full items-center gap-3">
              {variant.imageSrc && (
                <span className="relative size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={variant.imageSrc}
                    alt={variant.name}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </span>
              )}
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span>{variant.name}</span>
              </span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
