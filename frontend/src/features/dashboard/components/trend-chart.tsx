import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getDashboardTrends } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TrendChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: () => getDashboardTrends(30),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>近30日报备趋势</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-[300px]'>
          {isLoading ? (
            <div className='flex h-full items-center justify-center'>
              <Skeleton className='h-[250px] w-full' />
            </div>
          ) : isError ? (
            <div className='text-muted-foreground flex h-full items-center justify-center text-sm'>
              加载失败，请稍后重试
            </div>
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart
                data={data ?? []}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray='3 3' className='stroke-muted' />
                <XAxis
                  dataKey='date'
                  tick={{ fontSize: 12 }}
                  tickFormatter={(val: string | number) => {
                    const str = String(val)
                    return str.length >= 7 ? str.slice(5) : str
                  }}
                  className='text-muted-foreground'
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  className='text-muted-foreground'
                />
                <Tooltip
                  labelFormatter={(val: string) => val}
                  formatter={(value: number) => [value, '报备数']}
                />
                <Bar
                  dataKey='count'
                  fill='var(--primary)'
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
