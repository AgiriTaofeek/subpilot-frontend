import { CheckCircleIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "#/components/ui/button.tsx";
import { resolvePortalToken } from "#/data/portal.ts";

export const Route = createFileRoute("/portal/$token/card-updated")({
	component: PortalCardUpdatedPage,
	head: () => ({ meta: [{ title: "Card updated | SubPilot" }] }),
});

const AUTO_REDIRECT_MS = 8000;

function PortalCardUpdatedPage() {
	const { token } = Route.useParams();
	const navigate = useNavigate();
	const [cardInfo, setCardInfo] = useState<{
		brand: string;
		last4: string;
	} | null>(null);
	const [refetchFailed, setRefetchFailed] = useState(false);

	// Simulate refetching the portal subscription to confirm the updated card.
	useEffect(() => {
		const timer = setTimeout(() => {
			const context = resolvePortalToken(token);
			if (context) {
				setCardInfo({ brand: context.cardBrand, last4: context.cardLast4 });
			} else {
				setRefetchFailed(true);
			}
		}, 400);
		return () => clearTimeout(timer);
	}, [token]);

	useEffect(() => {
		const redirectTimer = setTimeout(() => {
			navigate({ to: "/portal/$token", params: { token } });
		}, AUTO_REDIRECT_MS);

		function cancelRedirect() {
			clearTimeout(redirectTimer);
		}

		window.addEventListener("pointerdown", cancelRedirect);
		window.addEventListener("keydown", cancelRedirect);
		window.addEventListener("focus", cancelRedirect, true);

		return () => {
			clearTimeout(redirectTimer);
			window.removeEventListener("pointerdown", cancelRedirect);
			window.removeEventListener("keydown", cancelRedirect);
			window.removeEventListener("focus", cancelRedirect, true);
		};
	}, [navigate, token]);

	return (
		<div className="flex flex-col items-center gap-4 py-10 text-center">
			<CheckCircleIcon className="size-10 text-(--brand)" weight="fill" />
			<div className="flex flex-col gap-1">
				<h1 className="text-xl font-semibold tracking-tight text-(--ink)">
					Card updated
				</h1>
				<p className="m-0 text-sm text-(--ink-3)">
					Your next billing will use the updated card.
				</p>
				{cardInfo && !refetchFailed && (
					<p className="m-0 text-sm text-(--ink-2)">
						New card on file: {cardInfo.brand} •••• {cardInfo.last4}
					</p>
				)}
			</div>
			<div className="flex w-full max-w-xs flex-col gap-3">
				<Button
					asChild
					className="w-full border-0 bg-(--brand) text-(--brand-fg) hover:bg-(--brand)/90"
				>
					<Link to="/portal/$token" params={{ token }}>
						Back to subscription
					</Link>
				</Button>
				<Link
					to="/portal/$token/invoices"
					params={{ token }}
					className="text-sm font-medium text-(--brand) hover:underline"
				>
					View invoices
				</Link>
			</div>
		</div>
	);
}
