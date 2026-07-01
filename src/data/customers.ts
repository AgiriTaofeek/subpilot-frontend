import {
	type SubscriptionStatus,
	subscriptions,
} from "#/data/subscriptions.ts";

export interface Customer {
	id: string;
	name: string;
	email: string;
	phone: string;
	cardBrand: string;
	cardLast4: string;
	cardExpiry: string;
	createdAt: string;
}

export function subscriptionsForCustomer(email: string) {
	return subscriptions.filter((s) => s.customerEmail === email);
}

export function subscriptionSummaryForCustomer(
	email: string,
): Array<{ status: SubscriptionStatus; count: number }> {
	const counts = new Map<SubscriptionStatus, number>();
	for (const s of subscriptionsForCustomer(email)) {
		counts.set(s.status, (counts.get(s.status) ?? 0) + 1);
	}
	return Array.from(counts.entries()).map(([status, count]) => ({
		status,
		count,
	}));
}

export function mostRecentSubscriptionUpdate(email: string): string | null {
	const subs = subscriptionsForCustomer(email);
	if (subs.length === 0) return null;
	return subs.reduce(
		(latest, s) =>
			new Date(s.updatedAt) > new Date(latest) ? s.updatedAt : latest,
		subs[0]?.updatedAt ?? null,
	);
}

export const customers: Customer[] = [
	{
		id: "cus_01",
		name: "Ada Eze",
		email: "ada.eze@example.com",
		phone: "+234 801 234 5678",
		cardBrand: "Visa",
		cardLast4: "4242",
		cardExpiry: "09/28",
		createdAt: "2026-01-15T09:00:00.000Z",
	},
	{
		id: "cus_02",
		name: "Femi Adekunle",
		email: "femi.adekunle@example.com",
		phone: "+234 802 345 6789",
		cardBrand: "Mastercard",
		cardLast4: "5454",
		cardExpiry: "03/27",
		createdAt: "2026-02-02T09:00:00.000Z",
	},
	{
		id: "cus_03",
		name: "Ngozi Okafor",
		email: "ngozi.okafor@example.com",
		phone: "+234 803 456 7890",
		cardBrand: "Verve",
		cardLast4: "1881",
		cardExpiry: "11/29",
		createdAt: "2026-03-10T09:00:00.000Z",
	},
	{
		id: "cus_04",
		name: "Tunde Bakare",
		email: "tunde.bakare@example.com",
		phone: "+234 804 567 8901",
		cardBrand: "Visa",
		cardLast4: "0192",
		cardExpiry: "07/28",
		createdAt: "2026-06-21T09:00:00.000Z",
	},
	{
		id: "cus_05",
		name: "Blessing Okoro",
		email: "blessing.okoro@example.com",
		phone: "+234 805 678 9012",
		cardBrand: "Mastercard",
		cardLast4: "8765",
		cardExpiry: "01/27",
		createdAt: "2026-01-28T09:00:00.000Z",
	},
	{
		id: "cus_06",
		name: "Chidi Nwosu",
		email: "chidi.nwosu@example.com",
		phone: "+234 806 789 0123",
		cardBrand: "Visa",
		cardLast4: "3344",
		cardExpiry: "05/29",
		createdAt: "2025-12-01T09:00:00.000Z",
	},
	{
		id: "cus_07",
		name: "Amaka Obi",
		email: "amaka.obi@example.com",
		phone: "+234 807 890 1234",
		cardBrand: "Verve",
		cardLast4: "2266",
		cardExpiry: "12/26",
		createdAt: "2025-09-01T09:00:00.000Z",
	},
	{
		id: "cus_08",
		name: "Ibrahim Sule",
		email: "ibrahim.sule@example.com",
		phone: "+234 808 901 2345",
		cardBrand: "Mastercard",
		cardLast4: "7711",
		cardExpiry: "08/28",
		createdAt: "2025-06-19T09:00:00.000Z",
	},
	{
		id: "cus_09",
		name: "Grace Umeh",
		email: "grace.umeh@example.com",
		phone: "+234 809 012 3456",
		cardBrand: "Visa",
		cardLast4: "9021",
		cardExpiry: "02/27",
		createdAt: "2025-11-10T09:00:00.000Z",
	},
	{
		id: "cus_10",
		name: "Emeka Chukwu",
		email: "emeka.chukwu@example.com",
		phone: "+234 810 123 4567",
		cardBrand: "Verve",
		cardLast4: "4409",
		cardExpiry: "10/28",
		createdAt: "2025-08-20T09:00:00.000Z",
	},
	{
		id: "cus_11",
		name: "Fatima Bello",
		email: "fatima.bello@example.com",
		phone: "+234 811 234 5678",
		cardBrand: "Visa",
		cardLast4: "6602",
		cardExpiry: "04/29",
		createdAt: "2026-04-04T09:00:00.000Z",
	},
	{
		id: "cus_12",
		name: "Segun Afolabi",
		email: "segun.afolabi@example.com",
		phone: "+234 812 345 6789",
		cardBrand: "Mastercard",
		cardLast4: "1123",
		cardExpiry: "06/27",
		createdAt: "2026-06-22T09:00:00.000Z",
	},
	{
		id: "cus_13",
		name: "Uche Eze",
		email: "uche.eze@example.com",
		phone: "+234 813 456 7890",
		cardBrand: "Verve",
		cardLast4: "8890",
		cardExpiry: "09/27",
		createdAt: "2026-01-29T09:00:00.000Z",
	},
	{
		id: "cus_14",
		name: "Kelechi Nwankwo",
		email: "kelechi.nwankwo@example.com",
		phone: "+234 814 567 8901",
		cardBrand: "Visa",
		cardLast4: "3018",
		cardExpiry: "02/28",
		createdAt: "2026-03-01T09:00:00.000Z",
	},
	{
		id: "cus_15",
		name: "Yusuf Balogun",
		email: "yusuf.balogun@example.com",
		phone: "+234 815 678 9012",
		cardBrand: "Mastercard",
		cardLast4: "5590",
		cardExpiry: "11/28",
		createdAt: "2026-06-29T09:00:00.000Z",
	},
	{
		id: "cus_16",
		name: "Chiamaka Eze",
		email: "chiamaka.eze@example.com",
		phone: "+234 816 789 0123",
		cardBrand: "Verve",
		cardLast4: "7734",
		cardExpiry: "05/28",
		createdAt: "2026-06-25T09:00:00.000Z",
	},
];
