import { useQuery } from '@tanstack/react-query'
import { getCarrierDistribution } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
const COLORS = ['#3b82f6', '#ef4444', '#22c55e']

export function CarrierPieChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'carrier-dist'],
    queryFn: getCarrierDistribution,
  })

  const renderLabel = (entry: Record<string, unknown>) =>
    `${entry.carrier ?? ''} ${entry.count ?? ''}`

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">运营商分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-[250px] w-full rounded-full" />
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              加载失败，请稍后重试
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data ?? []}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="carrier"
                  label={renderLabel}
                >
                  {(data ?? []).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number, name: string) => [value, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
