import { z } from "zod";

// Checkout validation schema used by the UI route and any backend order handling.
export const checkoutSchema = z.object({
  name: z.string().trim().min(2, "Required").max(100),
  phone: z.string().trim().min(6, "Required").max(30),
  email: z.string().trim().email("Invalid email").max(255),
  address: z.string().trim().min(6, "Required").max(500),
  payment: z.enum(["cod", "mobile"]),
});

export function getShippingCost(subtotal: number) {
  return subtotal > 50 || subtotal === 0 ? 0 : 5;
}

export function getOrderTotal(subtotal: number) {
  return subtotal + getShippingCost(subtotal);
}

export function createOrderNumber() {
  return "SE-" + Date.now().toString(36).toUpperCase().slice(-8);
}

export function parseCheckoutErrors(result: z.SafeParseReturnType<z.infer<typeof checkoutSchema>, z.infer<typeof checkoutSchema>>) {
  if (result.success) return {};
  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    errors[String(issue.path[0])] = issue.message;
  });
  return errors;
}
