import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnchorFormLayoutProps {
  sections: { id: string; title: string }[]
  children: React.ReactNode
}

export function AnchorFormLayout({ sections, children }: AnchorFormLayoutProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    )

    for (const section of sections) {
      const el = document.getElementById(section.id)
      if (el) observerRef.current.observe(el)
    }

    return () => observerRef.current?.disconnect()
  }, [sections])

  function handleClick(id: string) {
    setActiveId(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex gap-8">
      <nav className="sticky top-20 h-fit w-48 shrink-0 space-y-1">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleClick(section.id)}
            className={cn(
              'block w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
              activeId === section.id
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {section.title}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
