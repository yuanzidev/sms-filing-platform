import { ColumnDef } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Edit, Trash2, UserCheck, UserX, Key } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCN } from '@/lib/time'
import { type User } from '@/lib/api/users'
import { DataTableColumnHeader } from './data-table-column-header'

interface ColumnActions {
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
  onEnable: (userId: string) => void
  onDisable: (userId: string) => void
  onResetPassword: (user: User) => void
}

/**
 * 用户表格列定义
 * 定义用户列表的显示列和操作
 */
export const columns = (actions: ColumnActions): ColumnDef<User>[] => [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    meta: {
      className: cn(
        'sticky md:table-cell left-0 z-10 rounded-tl',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted'
      ),
    },
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'username',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='用户名' />
    ),
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('username')}</div>
    ),
    meta: {
      className: cn(
        'drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)] lg:drop-shadow-none',
        'bg-background transition-colors duration-200 group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
        'sticky left-6 md:table-cell'
      ),
    },
    enableHiding: false,
  },
  {
    accessorKey: 'full_name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='姓名' />
    ),
    cell: ({ row }) => {
      const fullName = row.getValue('full_name') as string
      return <div>{fullName || '-'}</div>
    },
    meta: { className: 'w-36' },
  },
  {
    accessorKey: 'email',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='邮箱' />
    ),
    cell: ({ row }) => (
      <div className='w-fit text-nowrap'>{row.getValue('email')}</div>
    ),
  },
  {
    accessorKey: 'role',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='角色' />
    ),
    cell: ({ row }) => {
      const role = row.original.role
      return (
        <div className='flex items-center gap-x-2'>
          <span className='text-sm capitalize'>{role?.name || '-'}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      const role = row.original.role
      return value.includes(role?.name || '')
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='状态' />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const getBadgeVariant = (status: string) => {
        switch (status) {
          case 'active':
            return 'default'
          case 'inactive':
            return 'secondary'
          case 'suspended':
            return 'destructive'
          default:
            return 'outline'
        }
      }
      return (
        <div className='flex space-x-2'>
          <Badge variant={getBadgeVariant(status)} className='capitalize'>
            {status === 'active' ? '启用' : status === 'inactive' ? '禁用' : '暂停'}
          </Badge>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
    enableHiding: false,
    enableSorting: false,
  },
  {
    accessorKey: 'last_login',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='最后登录' />
    ),
    cell: ({ row }) => {
      const lastLogin = row.getValue('last_login') as string
      return (
        <div className='text-sm text-muted-foreground'>
          {formatCN(lastLogin)}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'created_at',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='创建时间' />
    ),
    cell: ({ row }) => {
      const createdAt = row.getValue('created_at') as string
      return (
        <div className='text-sm text-muted-foreground'>
          {formatCN(createdAt)}
        </div>
      )
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: '操作',
    cell: ({ row }) => {
      const user = row.original
      const isActive = user.status === 'active'

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' className='h-8 w-8 p-0'>
              <span className='sr-only'>打开菜单</span>
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={() => actions.onEdit(user)}>
              <Edit className='mr-2 h-4 w-4' />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => actions.onResetPassword(user)}>
              <Key className='mr-2 h-4 w-4' />
              重置密码
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {isActive ? (
              <DropdownMenuItem onClick={() => actions.onDisable(user.id)}>
                <UserX className='mr-2 h-4 w-4' />
                禁用
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => actions.onEnable(user.id)}>
                <UserCheck className='mr-2 h-4 w-4' />
                启用
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => actions.onDelete(user.id)}
              className='text-red-600'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
