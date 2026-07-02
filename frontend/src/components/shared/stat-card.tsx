import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: number | string
  icon?: React.ReactNode
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
