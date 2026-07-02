import { Skeleton } from "#/components/ui/skeleton.tsx";
import { TableSkeleton } from "#/components/ui/table-skeleton.tsx";

const CARD_KEYS = ["card-1", "card-2", "card-3", "card-4"];

export function PageSkeleton() {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-7 w-48 rounded-none" />
				<Skeleton className="h-4 w-72 rounded-none" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{CARD_KEYS.map((key) => (
					<Skeleton key={key} className="h-24 rounded-none" />
				))}
			</div>
			<Skeleton className="h-64 rounded-none" />
		</div>
	);
}

export function ListPageSkeleton({ columns = 4 }: { columns?: number }) {
	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex flex-col gap-2">
				<Skeleton className="h-7 w-48 rounded-none" />
				<Skeleton className="h-4 w-72 rounded-none" />
			</div>
			<TableSkeleton columns={columns} />
		</div>
	);
}
