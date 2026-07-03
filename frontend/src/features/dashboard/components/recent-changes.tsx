import { useQuery } from '@tanstack/react-query'
import { getRecentChanges } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function RecentChanges() {
  const { data } = useQuery({
    queryKey: ['dashboard', 'recent-changes'],
    queryFn: () => getRecentChanges(10),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">最近变更</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>时间</TableHead>
              <TableHead>企业名称</TableHead>
              <TableHead>类型</TableHead>
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
              data.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-muted-foreground">{record.created_at}</TableCell>
                  <TableCell>{record.qualification_info?.enterprise_name ?? '-'}</TableCell>
                  <TableCell>{record.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
