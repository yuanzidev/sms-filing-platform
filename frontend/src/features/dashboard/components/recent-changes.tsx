import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const recentChanges = [
  {
    time: '2026-07-02 14:30',
    enterprise: '深圳市速递科技有限公司',
    type: '新增报备',
  },
  {
    time: '2026-07-02 11:20',
    enterprise: '广州云端信息技术有限公司',
    type: '变更',
  },
  {
    time: '2026-07-01 16:45',
    enterprise: '北京创亿科技有限公司',
    type: '新增报备',
  },
  {
    time: '2026-07-01 09:30',
    enterprise: '上海智联网络技术有限公司',
    type: '授权到期',
  },
  {
    time: '2026-06-30 15:10',
    enterprise: '杭州天域通信科技有限公司',
    type: '变更',
  },
]

export function RecentChanges() {
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
            {recentChanges.map((change, index) => (
              <TableRow key={index}>
                <TableCell className="text-muted-foreground">
                  {change.time}
                </TableCell>
                <TableCell>{change.enterprise}</TableCell>
                <TableCell>{change.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
