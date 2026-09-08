"use client"

import Image from "next/image"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { motion } from "motion/react"
import { useEffect, useRef, useState } from "react"

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

const CARD_WIDTH_RATIO = 0.82
const CARD_GAP_PX = 12

function VariantCarousel({
  variants,
  selectedVariantId,
  onVariantChange,
}: {
  variants: StyleVariantOption[]
  selectedVariantId: string | null
  onVariantChange: (variantId: string | null) => void
}) {
  const selectedIndex = selectedVariantId
    ? variants.findIndex((variant) => variant.id === selectedVariantId)
    : -1
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : 0
  )
  const viewportRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    if (selectedIndex >= 0) {
      setActiveIndex(selectedIndex)
      return
    }
    setActiveIndex(0)
  }, [selectedIndex, variants])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    function updateWidth() {
      if (!viewport) return
      setViewportWidth(viewport.clientWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const activeVariant = variants[activeIndex] ?? variants[0]
  if (!activeVariant) return null

  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex < variants.length - 1
  const cardWidth =
    viewportWidth > 0 ? viewportWidth * CARD_WIDTH_RATIO : undefined
  const slideOffset =
    viewportWidth > 0
      ? activeIndex * (viewportWidth * CARD_WIDTH_RATIO + CARD_GAP_PX)
      : 0

  function goToIndex(index: number) {
    if (index < 0 || index >= variants.length) return
    setActiveIndex(index)
  }

  if (variants.length === 1) {
    return (
      <VariantCard
        variant={activeVariant}
        isSelected={selectedVariantId === activeVariant.id}
        isActive
        onSelect={() => onVariantChange(activeVariant.id)}
      />
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative">
        <div ref={viewportRef} className="overflow-hidden">
          <motion.div
            className="flex"
            style={{ gap: CARD_GAP_PX }}
            animate={{ x: -slideOffset }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {variants.map((variant, index) => {
              const isActive = index === activeIndex
              return (
                <div
                  key={variant.id}
                  className="shrink-0"
                  style={{ width: cardWidth ?? `${CARD_WIDTH_RATIO * 100}%` }}
                >
                  <VariantCard
                    variant={variant}
                    isSelected={selectedVariantId === variant.id}
                    isActive={isActive}
                    dimmed={!isActive}
                    onSelect={() => {
                      if (!isActive) {
                        goToIndex(index)
                        return
                      }
                      onVariantChange(variant.id)
                    }}
                  />
                </div>
              )
            })}
          </motion.div>
        </div>

        <div
          className="pointer-events-none absolute top-0 left-0 aspect-square"
          style={{ width: cardWidth ?? `${CARD_WIDTH_RATIO * 100}%` }}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Previous variant"
            disabled={!canGoPrev}
            className="pointer-events-auto absolute top-1/2 left-2 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-40"
            onClick={() => goToIndex(activeIndex - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Next variant"
            disabled={!canGoNext}
            className="pointer-events-auto absolute top-1/2 size-9 -translate-y-1/2 rounded-full bg-white/90 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-40"
            style={{ left: `calc(100% + ${CARD_GAP_PX}px)` }}
            onClick={() => goToIndex(activeIndex + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {variants.map((variant, index) => (
          <button
            key={variant.id}
            type="button"
            aria-label={`Show ${variant.name}`}
            aria-current={activeIndex === index}
            className={cn(
              "size-1.5 rounded-full transition-all",
              activeIndex === index
                ? "w-4 bg-rose-800"
                : "bg-zinc-400/50 hover:bg-zinc-500/70"
            )}
            onClick={() => goToIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

function VariantCard({
  variant,
  isSelected,
  isActive,
  dimmed = false,
  onSelect,
}: {
  variant: StyleVariantOption
  isSelected: boolean
  isActive: boolean
  dimmed?: boolean
  onSelect: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="lg"
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "h-auto w-full overflow-hidden rounded-lg p-0 text-left whitespace-normal transition-[opacity,transform] duration-300",
        isSelected
          ? "bg-rose-800 text-white ring-2 ring-rose-800 hover:bg-rose-800/90 hover:text-white"
          : "border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15",
        dimmed && "opacity-55"
      )}
      onClick={onSelect}
    >
      <span className="flex w-full flex-col">
        {variant.imageSrc ? (
          <span className="relative aspect-square w-full overflow-hidden bg-muted">
            <Image
              src={variant.imageSrc}
              alt={variant.name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 82vw, 360px"
            />
          </span>
        ) : (
          <span className="flex aspect-square w-full items-center justify-center bg-muted/60 text-sm text-muted-foreground">
            No image
          </span>
        )}
        <span className="px-3 py-2.5 font-medium">{variant.name}</span>
      </span>
    </Button>
  )
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
                  ? "rounded-lg bg-rose-800 text-white hover:bg-rose-800/90 hover:text-white aria-expanded:bg-rose-800 aria-expanded:text-white"
                  : "rounded-lg border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"
              )}
              onClick={() => selectCategory(category.id)}
            >
              <span className="font-medium text-inherit">{category.name}</span>
            </Button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              )}
            >
              <div className="overflow-hidden">
                <div className="pt-2">
                  {category.variants.length === 0 ? (
                    <p className="px-2 py-1 text-sm text-muted-foreground">
                      No variants available.
                    </p>
                  ) : (
                    <VariantCarousel
                      variants={category.variants}
                      selectedVariantId={selectedVariantId}
                      onVariantChange={onVariantChange}
                    />
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
