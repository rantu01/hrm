'use client'

import * as React from "react"

const Popover = ({ children }) => {
  return <div>{children}</div>
}

const PopoverTrigger = ({ children }) => {
  return <>{children}</>
}

const PopoverContent = React.forwardRef(
  ({ className, align = "center", sideOffset = 4, ...props }, ref) => (
    <div
      ref={ref}
      className="z-50 w-72 rounded-md border bg-white p-4 shadow-md"
      {...props}
    />
  )
)
PopoverContent.displayName = "PopoverContent"

export { Popover, PopoverTrigger, PopoverContent }
