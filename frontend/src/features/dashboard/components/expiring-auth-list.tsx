import { useQuery } from '@tanstack/react-query'
import { getExpiringAuths } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'

export function ExpiringAuthList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'expiring-auths'],
    queryFn: () => getExpiringAuths(30),
  })

  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    return iso.slice(0, 10)
  }

  const daysUntil = (iso: string | null) => {
    if (!iso) return null
    const diff = new Date(iso).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">即将到期授权</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载失败</div>
        ) : !data || data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
            暂无即将到期的授权
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((item) => {
              const days = daysUntil(item.auth_end_date)
              return (
                <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {item.main_port_number || item.sub_port_number || '-'}
                      </span>
                      <Badge variant="outline" className="shrink-0">{item.carrier}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.province || ''} · 到期: {formatDate(item.auth_end_date)}
                    </div>
                  </div>
                  {days !== null && (
                    <Badge variant={days <= 7 ? 'destructive' : days <= 14 ? 'default' : 'secondary'} className="shrink-0 ml-2">
                      {days <= 0 ? '已到期' : `剩余 ${days} 天`}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
