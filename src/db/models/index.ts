/** Every model, in dependency order. Used by migrations, `pnpm db:indexes` and tests. */
import { AccountModel } from "./account.model";
import { AddressModel } from "./address.model";
import { AuditLogModel } from "./audit-log.model";
import { BrandModel } from "./brand.model";
import { CartModel } from "./cart.model";
import { CategoryModel } from "./category.model";
import { CounterModel } from "./counter.model";
import { CourierModel } from "./courier.model";
import { InventoryModel } from "./inventory.model";
import { OrderEventModel } from "./order-event.model";
import { OrderModel } from "./order.model";
import { PasswordResetModel } from "./password-reset.model";
import { PaymentModel } from "./payment.model";
import { PayoutModel } from "./payout.model";
import { ProductModel } from "./product.model";
import { ReviewModel } from "./review.model";
import { SellerModel } from "./seller.model";
import { SettingsModel } from "./settings.model";
import { UserModel } from "./user.model";
import { VerificationTokenModel } from "./verification-token.model";
import { WishlistModel } from "./wishlist.model";

export const allModels = [
  SettingsModel,
  CourierModel,
  CounterModel,
  AuditLogModel,
  UserModel,
  AccountModel,
  VerificationTokenModel,
  PasswordResetModel,
  SellerModel,
  CategoryModel,
  BrandModel,
  ProductModel,
  InventoryModel,
  ReviewModel,
  AddressModel,
  CartModel,
  WishlistModel,
  OrderModel,
  OrderEventModel,
  PaymentModel,
  PayoutModel,
] as const;

export {
  AccountModel,
  AddressModel,
  AuditLogModel,
  BrandModel,
  CartModel,
  CategoryModel,
  CounterModel,
  CourierModel,
  InventoryModel,
  OrderEventModel,
  OrderModel,
  PasswordResetModel,
  PaymentModel,
  PayoutModel,
  ProductModel,
  ReviewModel,
  SellerModel,
  SettingsModel,
  UserModel,
  VerificationTokenModel,
  WishlistModel,
};
