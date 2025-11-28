export default function DashboardSkeleton() {
  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-8">
      {/* Comparison Card Skeleton */}
      <div className="h-32 bg-gray-200 rounded-xl" />

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Chart Placeholder */}
        <div className="lg:col-span-4 bg-gray-200 rounded-xl h-[500px]" />

        {/* Metrics Placeholder */}
        <div className="lg:col-span-3 space-y-4">
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
          <div className="h-24 bg-gray-200 rounded-xl" />
        </div>

        {/* Order Sheet Placeholder */}
        <div className="lg:col-span-5 bg-gray-200 rounded-xl h-[500px]" />
      </div>

      {/* Backtest Chart Skeleton */}
      <div className="bg-gray-200 rounded-xl h-[400px]" />
    </div>
  )
}
