import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export const Route = createFileRoute('/api/admin/stats/')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const { userRoles } = await import('@libs/database/constants')
          const { db } = await import('@libs/database')
          const { user } = await import('@libs/database/schema/user')
          const { order, orderStatus } = await import('@libs/database/schema/order')
          const { eq, and, sql } = await import('drizzle-orm')

          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id || session.user.role !== userRoles.ADMIN) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const now = new Date()
          const currentDayOfMonth = now.getDate()

          const today = new Date(now)
          today.setHours(0, 0, 0, 0)

          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          thisMonthStart.setHours(0, 0, 0, 0)

          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          lastMonthStart.setHours(0, 0, 0, 0)

          const lastMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, currentDayOfMonth, 23, 59, 59)

          const [orderAgg] = await db.select({
            totalRevenue: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                THEN CAST(${order.amount} AS DECIMAL)
                ELSE 0 END
              ), 0)
            `,
            todayRevenue: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${today}
                THEN CAST(${order.amount} AS DECIMAL)
                ELSE 0 END
              ), 0)
            `,
            thisMonthRevenue: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${thisMonthStart}
                THEN CAST(${order.amount} AS DECIMAL)
                ELSE 0 END
              ), 0)
            `,
            lastMonthRevenue: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${lastMonthStart}
                  AND ${order.createdAt} <= ${lastMonthSameDay}
                THEN CAST(${order.amount} AS DECIMAL)
                ELSE 0 END
              ), 0)
            `,
            todayOrders: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${today}
                THEN 1 ELSE 0 END
              ), 0)
            `,
            thisMonthOrders: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${thisMonthStart}
                THEN 1 ELSE 0 END
              ), 0)
            `,
            lastMonthOrders: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${order.status} = ${orderStatus.PAID}
                  AND ${order.createdAt} >= ${lastMonthStart}
                  AND ${order.createdAt} <= ${lastMonthSameDay}
                THEN 1 ELSE 0 END
              ), 0)
            `,
          }).from(order)

          const [userAgg] = await db.select({
            thisMonthUsers: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${user.createdAt} >= ${thisMonthStart}
                THEN 1 ELSE 0 END
              ), 0)
            `,
            todayUsers: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${user.createdAt} >= ${today}
                THEN 1 ELSE 0 END
              ), 0)
            `,
            lastMonthUsers: sql<number>`
              COALESCE(SUM(
                CASE WHEN ${user.createdAt} >= ${lastMonthStart}
                  AND ${user.createdAt} <= ${lastMonthSameDay}
                THEN 1 ELSE 0 END
              ), 0)
            `,
          }).from(user)

          const thisMonthRevenueValue = Number(orderAgg.thisMonthRevenue) || 0
          const lastMonthRevenueValue = Number(orderAgg.lastMonthRevenue) || 0
          const thisMonthUsersValue = Number(userAgg.thisMonthUsers) || 0
          const lastMonthUsersValue = Number(userAgg.lastMonthUsers) || 0
          const thisMonthOrdersValue = Number(orderAgg.thisMonthOrders) || 0
          const lastMonthOrdersValue = Number(orderAgg.lastMonthOrders) || 0

          return Response.json({
            revenue: { total: Number(orderAgg.totalRevenue) || 0 },
            customers: { new: thisMonthUsersValue },
            orders: { new: thisMonthOrdersValue },
            todayData: {
              revenue: Number(orderAgg.todayRevenue) || 0,
              newUsers: Number(userAgg.todayUsers) || 0,
              orders: Number(orderAgg.todayOrders) || 0,
            },
            monthData: {
              revenue: thisMonthRevenueValue,
              newUsers: thisMonthUsersValue,
              orders: thisMonthOrdersValue,
            },
            lastMonthData: {
              revenue: lastMonthRevenueValue,
              newUsers: lastMonthUsersValue,
              orders: lastMonthOrdersValue,
            },
            growthRates: {
              revenue: calculateGrowthRate(thisMonthRevenueValue, lastMonthRevenueValue),
              users: calculateGrowthRate(thisMonthUsersValue, lastMonthUsersValue),
              orders: calculateGrowthRate(thisMonthOrdersValue, lastMonthOrdersValue),
            },
          })
        } catch (error) {
          console.error('Error fetching admin stats:', error)
          return new Response('Internal Server Error', { status: 500 })
        }
      }),
    },
  },
})
