import { useQuery } from '@tanstack/react-query'
import { getRecentChanges } from '@/lib/api/dashboard'
import { formatCN } from '@/lib/time'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function RecentChanges() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'recent-changes'],
    queryFn: () => getRecentChanges(10),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近变更</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : isError ? (
          <div className="py-8 text-center text-sm text-muted-foreground">加载失败，请稍后重试</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>任务名称</TableHead>
                <TableHead>端口数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data || data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    暂无变更记录
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{formatCN(item.created_at)}</TableCell>
                    <TableCell>{item.task_name}</TableCell>
                    <TableCell>{item.port_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
