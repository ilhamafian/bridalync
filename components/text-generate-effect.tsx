"use client"

import { motion, stagger, useAnimate } from "motion/react"
import * as React from "react"
import { cn } from "@/lib/utils"

type TextGenerateEffectProps = Omit<React.ComponentProps<"div">, "children"> & {
  words: string
  filter?: boolean
  duration?: number
  staggerDelay?: number
}

function TextGenerateEffect({
  ref,
  words,
  className,
  filter = true,
  duration = 0.5,
  staggerDelay = 0.2,
  ...props
}: TextGenerateEffectProps) {
  const localRef = React.useRef<HTMLDivElement>(null)
  React.useImperativeHandle(ref as any, () => localRef.current as HTMLDivElement)

  const [scope, animate] = useAnimate()
  const lines = React.useMemo(
    () => words.split("\n").map((line) => line.split(" ").filter(Boolean)),
    [words],
  )

  React.useEffect(() => {
    if (scope.current) {
      animate(
        "span",
        {
          opacity: 1,
          filter: filter ? "blur(0px)" : "none",
        },
        {
          duration,
          delay: stagger(staggerDelay),
        },
      )
    }
  }, [animate, duration, filter, scope, staggerDelay])

  return (
    <div
      className={cn("font-bold", className)}
      data-slot="text-generate-effect"
      ref={localRef}
      {...(props as any)}
    >
      <motion.div ref={scope} className="flex flex-col">
        {lines.map((lineWords, lineIdx) => (
          <div key={`line-${lineIdx}`}>
            {lineWords.map((word, idx) => (
              <motion.span
                className="opacity-0 will-change-transform will-change-opacity will-change-filter"
                key={`${lineIdx}-${word}-${idx}`}
                style={{
                  filter: filter ? "blur(10px)" : "none",
                }}
              >
                {word}{" "}
              </motion.span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export { TextGenerateEffect, type TextGenerateEffectProps }
export default TextGenerateEffect
