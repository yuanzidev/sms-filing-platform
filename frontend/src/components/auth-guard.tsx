import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { isLoggedIn, isLoggedInSync } from '@/hooks/use-auth'

interface AuthGuardProps {
    children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
    const navigate = useNavigate()
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        let cancelled = false
        isLoggedIn().then(ok => {
            if (!cancelled && !ok) {
                navigate({ to: '/sign-in' })
            }
            if (!cancelled) {
                setChecked(true)
            }
        })
        return () => { cancelled = true }
    }, [navigate])

    if (!checked && !isLoggedInSync()) {
        return null
    }

    if (!checked) {
        return null
    }

    return <>{children}</>
}
