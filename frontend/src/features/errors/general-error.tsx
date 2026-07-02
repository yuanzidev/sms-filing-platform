import { useNavigate, useRouter } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface GeneralErrorProps extends React.HTMLAttributes<HTMLDivElement> {
  minimal?: boolean
  error?: Error
  reset?: () => void
}

export default function GeneralError({
  className,
  minimal = false,
  error,
  reset,
}: GeneralErrorProps) {
  const navigate = useNavigate()
  const { history } = useRouter()

  const errorMessage = error?.message || ''

  return (
    <div className={cn('h-svh w-full', className)}>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        {!minimal && (
          <h1 className='text-[7rem] leading-tight font-bold'>500</h1>
        )}
        <span className='font-medium'>Oops! Something went wrong {`:')`}</span>
        <p className='text-muted-foreground text-center'>
          We apologize for the inconvenience. <br /> Please try again later.
        </p>
        {errorMessage && (
          <div className='mt-4 max-w-lg rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950'>
            <p className='text-sm font-medium text-red-600 dark:text-red-400'>
              错误信息:
            </p>
            <pre className='mt-1 max-h-40 overflow-auto text-xs text-red-500 whitespace-pre-wrap'>
              {errorMessage}
            </pre>
          </div>
        )}
        {!minimal && (
          <div className='mt-6 flex gap-4'>
            {reset && (
              <Button variant='outline' onClick={reset}>
                Retry
              </Button>
            )}
            <Button variant='outline' onClick={() => history.go(-1)}>
              Go Back
            </Button>
            <Button onClick={() => navigate({ to: '/' })}>Back to Home</Button>
          </div>
        )}
      </div>
    </div>
  )
}
