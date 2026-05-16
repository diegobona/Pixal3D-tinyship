import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/admin/stats/monthly')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { userRoles } = await import('@libs/database/constants')
          const { db } = await import('@libs/database')
          const { order, orderStatus } = await import('@libs/database/schema/order')
          const { eq, gte, and, sql } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id || session.user.role !== userRoles.ADMIN) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const now = new Date()
          const monthlyData: Array<{ month: string; revenue: number; orders: number }> = []

          const acceptLang = request.headers.get('accept-language') || ''
          const isZh = acceptLang.includes('zh')

          const sixMonthsStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
          const rows = await db
            .select({
              monthKey: sql<string>`TO_CHAR(DATE_TRUNC('month', ${order.createdAt}), 'YYYY-MM')`,
              revenue: sql<number>`COALESCE(SUM(CAST(${order.amount} AS DECIMAL)), 0)`,
              orders: sql<number>`COUNT(*)`,
            })
            .from(order)
            .where(and(
              eq(order.status, orderStatus.PAID),
              gte(order.createdAt, sixMonthsStart),
            ))
            .groupBy(sql`DATE_TRUNC('month', ${order.createdAt})`)

          const monthlyMap = new Map(
            rows.map(row => [
              row.monthKey,
              {
                revenue: Number(row.revenue) || 0,
                orders: Number(row.orders) || 0,
              },
            ]),
          )

          for (let i = 5; i >= 0; i--) {
            const targetDate = new Date(now)
            targetDate.setMonth(targetDate.getMonth() - i)
            const monthKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
            const monthLabel = isZh
              ? `${targetDate.getMonth() + 1}月`
              : targetDate.toLocaleString('en-US', { month: 'short' })
            const monthData = monthlyMap.get(monthKey)

            monthlyData.push({
              month: monthLabel,
              revenue: monthData?.revenue ?? 0,
              orders: monthData?.orders ?? 0,
            })
          }

          return Response.json(monthlyData)
        } catch (error) {
          console.error('Error fetching monthly stats:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      }),
    },
  },
})
