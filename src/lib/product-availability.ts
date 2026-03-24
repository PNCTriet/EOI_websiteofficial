export type ProductAvailability = "in_stock" | "coming_soon" | "out_of_stock";

export function isProductAvailability(
  value: string | null | undefined
): value is ProductAvailability {
  return (
    value === "in_stock" ||
    value === "coming_soon" ||
    value === "out_of_stock"
  );
}

export function isPurchasable(availability: ProductAvailability): boolean {
  return availability === "in_stock";
}

export function defaultAvailability(): ProductAvailability {
  return "in_stock";
}
