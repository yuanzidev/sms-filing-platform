import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ImageLightboxProps {
  src: string | null
  alt?: string
  onClose: () => void
}

export function ImageLightbox({
  src,
  alt = '大图查看',
  onClose,
}: ImageLightboxProps) {
  return (
    <Dialog
      open={!!src}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className='flex h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none items-center justify-center border-0 bg-black/85 p-0 shadow-none sm:max-w-none'
      >
        <DialogTitle className='sr-only'>图片预览</DialogTitle>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='absolute top-4 right-4 z-10 text-white hover:bg-white/20'
          onClick={onClose}
          aria-label='关闭大图'
        >
          <X className='h-6 w-6' />
        </Button>
        {src && (
          <img
            src={src}
            alt={alt}
            className='max-h-[90vh] max-w-[90vw] rounded object-contain'
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
