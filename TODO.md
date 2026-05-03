# TODO

## Infrastructure & Setup

- [x] Set up PostgreSQL with auto-initializing schema
- [x] Connect to Supabase (dev + uat)
- [x] Multi-environment config (dev, uat, prod)
- [x] Cloudinary integration for image and video uploads
- [x] Swagger/OpenAPI documentation
- [x] Global error handler and 404 handler
- [x] Rate limiting middleware
- [ ] Decide whether `uat` will use sandbox SMTP or real SMTP
- [ ] Add `.env` documentation for required variables

## Auth

- [x] Register with email verification
- [x] Login with JWT access + refresh token
- [x] Refresh token flow
- [x] Logout with token invalidation
- [x] Email verification end-to-end
- [x] Resend verification email
- [x] Forgot password and reset password flow
- [x] Fix one-active-verification-token persistence rule
- [x] Role-based authorization middleware
- [ ] Decide final password policy for production
- [ ] Decide whether refresh tokens should be hashed in the database
- [ ] Add auth audit logging for sensitive events

## Users

- [x] Get and update customer profile
- [x] Address management (create, update, delete)
- [x] Default shipping and billing address selection

## Catalog

- [x] Categories module with parent-child support
- [x] Products module with pagination
- [x] Product variants (SKU, size, color, material, price, compare_at_price)
- [x] Product images support
- [x] Product attributes (generic key-value)
- [x] Wire Cloudinary upload into product image endpoints
- [x] Add product search (full-text)
- [x] Add product filters (price, size, color, category)
- [x] Add sort options (price, newest, popularity)

## Cart

- [x] Create cart table in database
- [x] Create cart items table
- [x] POST /api/cart/items — add item to cart
- [x] GET /api/cart — get current user's cart
- [x] PUT /api/cart/items/:id — update quantity
- [x] DELETE /api/cart/items/:id — remove item
- [x] DELETE /api/cart — clear cart
- [x] Handle out-of-stock validation on add

## Orders

- [x] Create orders table
- [x] Create order_items table
- [x] POST /api/orders — place order from cart
- [x] GET /api/orders — list user's orders
- [x] GET /api/orders/:id — get order details
- [x] Add order status flow (pending → confirmed → shipped → delivered → cancelled)
- [x] Send order confirmation email

## Inventory

- [ ] Add inventory tracking on order placement
- [ ] Add stock reservation strategy during checkout
- [ ] Handle oversell prevention
- [ ] Low stock warnings for admin

## Payments

- [ ] Choose payment provider (Stripe recommended)
- [ ] Add payment initiation API
- [ ] Add payment callback/webhook handling
- [ ] Add payment status persistence (orders_payments table)
- [ ] Handle payment failure and retry

## Coupons & Discounts

- [ ] Create coupons table
- [ ] POST /api/cart/coupon — apply coupon
- [ ] Discount calculation logic (percentage, fixed, free shipping)
- [ ] Coupon expiry and usage limits

## Wishlist

- [ ] Create wishlist table
- [ ] POST /api/wishlist — add product
- [ ] GET /api/wishlist — get user's wishlist
- [ ] DELETE /api/wishlist/:id — remove item

## Reviews & Ratings

- [ ] Create product_reviews table
- [ ] POST /api/products/:id/reviews — submit review
- [ ] GET /api/products/:id/reviews — list reviews
- [ ] Average rating on product listing

## Admin

- [ ] Admin product management (create, update, delete, bulk)
- [ ] Admin category management (delete)
- [ ] Admin order management (view all, update status)
- [ ] Admin user management (list, edit role, deactivate)
- [ ] Sales and inventory reports

## Documentation

- [ ] Keep Swagger docs updated for every new API
- [ ] Re-export `docs/openapi.json` after API changes
- [ ] Add `.env.example` file with all required variables
