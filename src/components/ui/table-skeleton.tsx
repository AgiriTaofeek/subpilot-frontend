import { Skeleton } from "#/components/ui/skeleton.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";

export function TableSkeleton({
	rows = 6,
	columns = 4,
}: {
	rows?: number;
	columns?: number;
}) {
	const rowKeys = Array.from({ length: rows }, (_, i) => `skeleton-row-${i}`);
	const columnKeys = Array.from(
		{ length: columns },
		(_, i) => `skeleton-column-${i}`,
	);

	return (
		<div className="overflow-hidden rounded-2xl border border-(--line) bg-(--surface-1)">
			<Table>
				<TableHeader>
					<TableRow className="border-(--line) hover:bg-transparent">
						{columnKeys.map((key) => (
							<TableHead key={key}>
								<Skeleton className="h-3 w-16 rounded-none" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{rowKeys.map((rowKey) => (
						<TableRow key={rowKey} className="border-(--line)">
							{columnKeys.map((colKey) => (
								<TableCell key={`${rowKey}-${colKey}`}>
									<Skeleton className="h-4 w-full max-w-32 rounded-none" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
