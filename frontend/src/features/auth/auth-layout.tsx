import { IconList } from '@tabler/icons-react'

interface Props {
  children: React.ReactNode
}

export default function AuthLayout({ children }: Props) {
  return (
    <div className='bg-primary-foreground container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full flex-col justify-center space-y-2 py-8 sm:w-[480px] sm:p-8'>
        <div className='mb-4 flex flex-col items-center justify-center'>
          <div className='flex items-center gap-2 mb-1'>
            <IconList className='h-8 w-8 text-primary' />
            <h1 className='text-2xl font-bold'>SMS Filing</h1>
          </div>
          <p className='text-muted-foreground text-sm'>SMS 报备管理平台</p>
        </div>
        {children}
      </div>
    </div>
  )
}
