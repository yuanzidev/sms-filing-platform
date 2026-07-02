import { carrierDistribution } from '@/lib/mock/data/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">运营商分布</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={carrierDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="count"
                nameKey="carrier"
                label={(entry: any) =>
                  `${entry.carrier} ${entry.count}`
                }
              >
                {carrierDistribution.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
