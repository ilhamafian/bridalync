"use client"

import Image from "next/image"
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { useLocale } from "@/components/LocaleProvider"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type StyleVariantOption = {
  id: string
  name: string
  price: number
  deposit: number
  /** Styles have at most one; looks up to five. */
  imageSrcs: string[]
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
  emptyMessage?: string
  /** `carousel` = swipe between variants (styles); `rows` = one row per variant, swipe between its photos (looks). */
  layout?: "carousel" | "rows"
}

const CARD_WIDTH_RATIO = 0.82
const CARD_GAP_PX = 12

const selectedCardClassName =
  "bg-rose-800 text-white ring-2 ring-rose-800 hover:bg-rose-800/90 hover:text-white"
const glassCardClassName =
  "border-transparent bg-white/30 shadow-sm ring-1 ring-white/60 backdrop-blur-sm hover:bg-white/40 hover:text-foreground dark:bg-white/10 dark:ring-white/15 dark:hover:bg-white/15"

/**
 * Peeking card carousel: native scroll-snap swipe (same idea as dashboard
 * CardCarousel) or the arrows / dots. Tapping a side card brings it into
 * view; tapping the active card calls `onActivate`.
 */
function SwipeCarousel<T>({
  items,
  getKey,
  initialIndex = 0,
  onActivate,
  renderItem,
  labels,
  lightDots = false,
}: {
  /** White dots, for carousels on a dark (selected) background. */
  lightDots?: boolean
  items: T[]
  getKey: (item: T) => string
  initialIndex?: number
  onActivate: (index: number) => void
  renderItem: (
    item: T,
    state: { isActive: boolean; onClick: () => void }
  ) => ReactNode
  labels: {
    previous: string
    next: string
    dot: (item: T, index: number) => string
  }
}) {
  const clampedInitial = Math.min(
    Math.max(initialIndex, 0),
    Math.max(items.length - 1, 0)
  )
  const [activeIndex, setActiveIndex] = useState(clampedInitial)
  const activeIndexRef = useRef(activeIndex)
  const trackRef = useRef<HTMLDivElement>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const suppressClickRef = useRef(false)
  const programmaticScrollRef = useRef(false)
  const scrollInitKeyRef = useRef<string | null>(null)

  activeIndexRef.current = activeIndex

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    function updateWidth() {
      if (!track) return
      setViewportWidth(track.clientWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(track)
    return () => observer.disconnect()
  }, [items.length])

  // Position the track once the viewport is measured, and again after resize
  // (card width is a % of the viewport, so scrollLeft must be recalculated).
  useEffect(() => {
    const track = trackRef.current
    if (!track || viewportWidth <= 0 || items.length <= 1) return

    const initKey = `${items.length}:${clampedInitial}:${getKey(items[0]!)}`
    const isFirstLayout = scrollInitKeyRef.current !== initKey
    scrollInitKeyRef.current = initKey

    const index = isFirstLayout ? clampedInitial : activeIndexRef.current
    programmaticScrollRef.current = true
    track.scrollTo({
      left: index * (viewportWidth * CARD_WIDTH_RATIO + CARD_GAP_PX),
      behavior: "auto",
    })
    if (isFirstLayout) setActiveIndex(clampedInitial)
    const timer = window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 50)
    return () => window.clearTimeout(timer)
    // getKey is stable enough per call site; items[0] identity is covered by initKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on size / item set
  }, [viewportWidth, clampedInitial, items.length])

  if (items.length === 0) return null

  if (items.length === 1) {
    return (
      <>{renderItem(items[0]!, { isActive: true, onClick: () => onActivate(0) })}</>
    )
  }

  const canGoPrev = activeIndex > 0
  const canGoNext = activeIndex < items.length - 1
  const cardWidth =
    viewportWidth > 0 ? viewportWidth * CARD_WIDTH_RATIO : undefined

  function slideStep() {
    const track = trackRef.current
    if (!track) return 0
    return track.clientWidth * CARD_WIDTH_RATIO + CARD_GAP_PX
  }

  function goToIndex(index: number) {
    const track = trackRef.current
    if (!track || index < 0 || index >= items.length) return
    const step = slideStep()
    if (step <= 0) return
    programmaticScrollRef.current = true
    track.scrollTo({ left: index * step, behavior: "smooth" })
    setActiveIndex(index)
    window.setTimeout(() => {
      programmaticScrollRef.current = false
    }, 450)
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    const step = slideStep()
    if (step <= 0) return
    const index = Math.min(
      Math.max(Math.round(track.scrollLeft / step), 0),
      items.length - 1
    )
    setActiveIndex((current) => {
      if (index === current) return current
      if (!programmaticScrollRef.current) {
        suppressClickRef.current = true
        window.setTimeout(() => {
          suppressClickRef.current = false
        }, 80)
      }
      return index
    })
  }

  function handleItemClick(index: number) {
    if (suppressClickRef.current) return
    if (index !== activeIndex) {
      goToIndex(index)
      return
    }
    onActivate(index)
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onClickCapture={(event) => {
            if (!suppressClickRef.current) return
            event.stopPropagation()
            event.preventDefault()
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain touch-pan-x"
          style={{ gap: CARD_GAP_PX }}
        >
          {items.map((item, index) => {
            const isActive = index === activeIndex
            return (
              <div
                key={getKey(item)}
                className={cn(
                  "shrink-0 snap-start transition-opacity duration-300",
                  !isActive && "opacity-55"
                )}
                style={{ width: cardWidth ?? `${CARD_WIDTH_RATIO * 100}%` }}
              >
                {renderItem(item, {
                  isActive,
                  onClick: () => handleItemClick(index),
                })}
              </div>
            )
          })}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{ width: cardWidth ?? `${CARD_WIDTH_RATIO * 100}%` }}
        >
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={labels.previous}
            disabled={!canGoPrev}
            className="pointer-events-auto absolute top-1/2 left-2 size-9 -translate-y-1/2 rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-40"
            onClick={() => goToIndex(activeIndex - 1)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={labels.next}
            disabled={!canGoNext}
            className="pointer-events-auto absolute top-1/2 size-9 -translate-y-1/2 rounded-full bg-white/90 text-zinc-900 shadow-sm backdrop-blur-sm hover:bg-white disabled:opacity-40"
            style={{ left: `calc(100% + ${CARD_GAP_PX}px)` }}
            onClick={() => goToIndex(activeIndex + 1)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {items.map((item, index) => (
          <button
            key={getKey(item)}
            type="button"
            aria-label={labels.dot(item, index)}
            aria-current={activeIndex === index}
            className={cn(
              "size-1.5 rounded-full transition-all",
              activeIndex === index
                ? lightDots
                  ? "w-4 bg-white"
                  : "w-4 bg-rose-800"
                : lightDots
                  ? "bg-white/40 hover:bg-white/70"
                  : "bg-zinc-400/50 hover:bg-zinc-500/70"
            )}
            onClick={() => goToIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}

/** Styles: one card per variant, swiped between. */
function VariantCarousel({
  variants,
  selectedVariantId,
  onVariantChange,
}: {
  variants: StyleVariantOption[]
  selectedVariantId: string | null
  onVariantChange: (variantId: string | null) => void
}) {
  const { t, format } = useLocale()
  const selectedIndex = variants.findIndex(
    (variant) => variant.id === selectedVariantId
  )

  return (
    <SwipeCarousel
      items={variants}
      getKey={(variant) => variant.id}
      initialIndex={selectedIndex}
      onActivate={(index) => onVariantChange(variants[index]!.id)}
      labels={{
        previous: t.previousVariant,
        next: t.nextVariant,
        dot: (variant) => format(t.showVariant, { name: variant.name }),
      }}
      renderItem={(variant, { isActive, onClick }) => (
        <button
          type="button"
          aria-pressed={selectedVariantId === variant.id}
          aria-current={isActive ? "true" : undefined}
          className={cn(
            buttonVariants({ variant: "ghost", size: "lg" }),
            "h-auto w-full flex-col items-stretch overflow-hidden rounded-lg p-0 text-left whitespace-normal",
            selectedVariantId === variant.id
              ? selectedCardClassName
              : glassCardClassName
          )}
          onClick={onClick}
        >
          {variant.imageSrcs[0] ? (
            <span className="relative aspect-square w-full overflow-hidden bg-muted">
              <Image
                src={variant.imageSrcs[0]}
                alt={variant.name}
                fill
                draggable={false}
                className="pointer-events-none object-cover"
                sizes="(max-width: 448px) 82vw, 360px"
              />
            </span>
          ) : null}
          <span className="px-3 py-2.5 font-medium">{variant.name}</span>
        </button>
      )}
    />
  )
}

/** Looks: the variant's own row, its photos swiped between. */
function VariantPhotoRow({
  variant,
  isSelected,
  onSelect,
}: {
  variant: StyleVariantOption
  isSelected: boolean
  onSelect: () => void
}) {
  const { t, format } = useLocale()

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg p-3 transition-colors",
        isSelected ? selectedCardClassName : glassCardClassName
      )}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        className="flex items-center justify-between gap-3 text-left font-medium"
        onClick={onSelect}
      >
        <span>{variant.name}</span>
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded-full ring-1",
            isSelected ? "bg-white text-rose-800 ring-white" : "ring-current/40"
          )}
        >
          {isSelected ? <CheckIcon className="size-3.5" /> : null}
        </span>
      </button>

      {variant.imageSrcs.length > 0 ? (
        <SwipeCarousel
          items={variant.imageSrcs}
          getKey={(src) => src}
          onActivate={onSelect}
          lightDots={isSelected}
          labels={{
            previous: t.previousPhoto,
            next: t.nextPhoto,
            dot: (_, index) =>
              format(t.showVariantImage, {
                index: index + 1,
                name: variant.name,
              }),
          }}
          renderItem={(src, { onClick }) => (
            <button
              type="button"
              className="relative block aspect-square w-full overflow-hidden rounded-md bg-muted"
              onClick={onClick}
            >
              <Image
                src={src}
                alt={variant.name}
                fill
                draggable={false}
                className="pointer-events-none object-cover"
                sizes="(max-width: 448px) 75vw, 340px"
              />
            </button>
          )}
        />
      ) : null}
    </div>
  )
}

export function BookingStylePicker({
  categories,
  selectedCategoryId,
  selectedVariantId,
  onCategoryChange,
  onVariantChange,
  emptyMessage,
  layout = "carousel",
}: BookingStylePickerProps) {
  const { t } = useLocale()
  const didAutoOpenRef = useRef(false)

  // Styles open the first category on mount only, so collapsing it afterwards sticks.
  // Looks start collapsed so clients see every category first.
  useEffect(() => {
    if (layout === "rows") return
    if (didAutoOpenRef.current || categories.length === 0) return
    didAutoOpenRef.current = true
    if (selectedCategoryId === null) onCategoryChange(categories[0]!.id)
  }, [layout, categories, selectedCategoryId, onCategoryChange])

  if (categories.length === 0) {
    return (
      <p className="mx-auto w-full max-w-xs px-4 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t.noStylesAvailable}
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
                      {t.noVariantsAvailable}
                    </p>
                  ) : layout === "rows" ? (
                    <div className="flex flex-col gap-3">
                      {category.variants.map((variant) => (
                        <VariantPhotoRow
                          key={variant.id}
                          variant={variant}
                          isSelected={selectedVariantId === variant.id}
                          onSelect={() => onVariantChange(variant.id)}
                        />
                      ))}
                    </div>
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
