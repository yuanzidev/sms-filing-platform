import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Clock } from 'lucide-react'

export function PendingList() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats,
  })

  const incomplete = data?.incomplete ?? 0
  const expiringSoon = data?.expiring_soon ?? 0
  const allZero = incomplete === 0 && expiringSoon === 0

  if (allZero) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">待处理事项</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">暂无待处理事项</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">待处理事项</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {incomplete > 0 && (
            <li>
              <div className="flex items-center gap-3 rounded-md p-2 text-sm">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span>
                  <span className="font-medium">{incomplete}</span> 条报备资料不全，请及时补全
                </span>
              </div>
            </li>
          )}
          {expiringSoon > 0 && (
            <li>
              <div className="flex items-center gap-3 rounded-md p-2 text-sm">
                <Clock className="h-5 w-5 text-orange-500" />
                <span>
                  <span className="font-medium">{expiringSoon}</span> 条授权即将到期，请及时处理
                </span>
              </div>
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  )
}
