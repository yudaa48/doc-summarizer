// src/components/ui/alert.jsx
import * as React from "react"

const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    {...props}
    className={`
      rounded-lg border p-4 
      ${variant === 'destructive' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-900'}
      ${className}
    `}
  />
))
Alert.displayName = "Alert"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    {...props}
    className={`text-sm [&_p]:leading-relaxed ${className}`}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription }