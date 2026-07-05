import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { PAGE_SIZE_OPTIONS, type PageSize } from "#/lib/pagination-sizes.ts";

export function PageSizeSelect({
	value,
	onChange,
}: {
	value: PageSize;
	onChange: (value: PageSize) => void;
}) {
	return (
		<div className="flex items-center gap-2 text-sm text-(--ink-3)">
			<span className="hidden sm:inline">Rows per page</span>
			<Select
				value={String(value)}
				onValueChange={(next) => onChange(Number(next) as PageSize)}
			>
				<SelectTrigger
					size="sm"
					className="w-18 rounded-md border-(--line) bg-(--surface) px-2 text-xs"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{PAGE_SIZE_OPTIONS.map((size) => (
						<SelectItem key={size} value={String(size)}>
							{size}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
