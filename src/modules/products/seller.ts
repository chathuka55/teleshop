import "server-only";
import {
  findSellerProduct,
  listProductFormOptions,
  listSellerProducts,
  listSellerStock,
} from "@/db/repositories/seller-product.repository";
import { requireRole } from "@/lib/auth/guards";
import type { ProductInput, ProductStatusInput, StockChangeInput } from "./schema";
import {
  addProductImageFor,
  changeStockFor,
  makeCoverImageFor,
  productStatusFor,
  removeProductImageFor,
  saveProductFor,
} from "./service";
import type {
  ProductActionResult,
  ProductFormOptionsDTO,
  SaveProductResult,
  SellerProductDTO,
  SellerProductSummaryDTO,
  StockRowDTO,
} from "./types";

/** Session-bound wrappers: requireRole("seller") admits approved shops only (sellerId set). */

const seller = async () => {
  const user = await requireRole("seller");
  return { user, sellerId: user.sellerId ?? "" };
};

export async function getProductFormOptions(): Promise<ProductFormOptionsDTO> {
  await requireRole("seller");
  return listProductFormOptions();
}

export async function listMyProducts(): Promise<SellerProductSummaryDTO[]> {
  return listSellerProducts((await seller()).sellerId);
}

export async function getMyProduct(id: string): Promise<SellerProductDTO | null> {
  const p = await findSellerProduct((await seller()).sellerId, id);
  if (!p) return null;
  const { updatedAt: _updatedAt, ...dto } = p;
  return dto;
}

export async function listMyStock(): Promise<StockRowDTO[]> {
  return listSellerStock((await seller()).sellerId);
}

export async function saveProduct(input: ProductInput, ip: string | null): Promise<SaveProductResult> {
  return saveProductFor((await seller()).user, input, { ip });
}

export async function changeProductStatus(
  input: ProductStatusInput,
  ip: string | null,
): Promise<ProductActionResult> {
  return productStatusFor((await seller()).user, input, { ip });
}

export async function addProductImage(
  id: string,
  file: File,
  ip: string | null,
): Promise<ProductActionResult> {
  return addProductImageFor((await seller()).user, id, file, { ip });
}

export async function removeProductImage(id: string, url: string): Promise<ProductActionResult> {
  return removeProductImageFor((await seller()).user, id, url);
}

export async function makeCoverImage(id: string, url: string): Promise<ProductActionResult> {
  return makeCoverImageFor((await seller()).user, id, url);
}

export async function changeStock(input: StockChangeInput, ip: string | null): Promise<ProductActionResult> {
  return changeStockFor((await seller()).user, input, { ip });
}
