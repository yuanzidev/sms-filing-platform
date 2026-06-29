import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/system/accounts')({
  component: SystemAccounts,
})

function SystemAccounts() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">账户管理</h1>
      <p>账户管理页面开发中...</p>
    </div>
  )
}